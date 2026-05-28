from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import geopandas as gpd
import pandas as pd
import rasterio
import shapely
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[2]
REQUESTED_DATA_DIR = ROOT / "Requested Data"
BACKEND_DIR = ROOT / "backend"
DATA_DIR = BACKEND_DIR / "data"
SQLITE_PATH = DATA_DIR / "geosmart_gis.sqlite"

PARCELS_PATH = REQUESTED_DATA_DIR / "Kigali 05.22.2026" / "Kigali_Parcels.shp"
MASTERPLAN_PATH = REQUESTED_DATA_DIR / "Kigali Masterplan" / "Kigali_Masterplan.shp"
BUILDINGS_PATH = REQUESTED_DATA_DIR / "Building Footprint" / "Building_Footprints.shp"
ADMIN_DIR = REQUESTED_DATA_DIR / "Administrative Boundaries"
DEM_PATH = REQUESTED_DATA_DIR / "DEM_30" / "DEM30.img"
PDF_PATH = next(REQUESTED_DATA_DIR.glob("*.pdf"))

WGS84 = "EPSG:4326"
KIGALI_LABELS = {"Umujyi wa Kigali", "Kigali City", "Kigali Town"}


@dataclass(frozen=True)
class RuleSeed:
    zone_code: str
    display_name: str
    category: str
    subdivision_status: str
    minimum_lot_size_sqm: float | None
    maximum_lot_size_sqm: float | None
    allowed_uses: list[str]
    prohibited_uses: list[str]
    development_strategy: str
    subdivision_guidance: str
    restriction_summary: str
    review_reason: str | None
    source_pages: list[int]


RULE_SEEDS = [
    RuleSeed(
        "R1",
        "Low Density Residential",
        "Residential",
        "ALLOWED",
        300.0,
        500.0,
        ["Single family houses", "Home occupation", "R1A-compatible uses"],
        ["Apartments", "Industrial uses", "Major infrastructure"],
        "Individual plot development, land subdivision, estate development without gated estates above 1 ha.",
        "New lots below 300 sqm should be treated under R1A regulations. Use 300-500 sqm as the default subdivision envelope.",
        "Residential subdivision is allowed, but compact growth is encouraged and low-density expansion is limited.",
        None,
        [14, 15],
    ),
    RuleSeed(
        "R1A",
        "Low Density Residential Densification",
        "Residential",
        "ALLOWED",
        None,
        300.0,
        ["Single family houses", "Semi-detached houses", "Apartments", "Townhouses", "Row houses", "Home occupation"],
        ["Industrial uses", "Major infrastructure"],
        "Individual plot development, land pooling, land subdivision, estate development.",
        "The regulation specifies a 300 sqm maximum lot size but no clear minimum lot size in the extracted text.",
        "Use max-lot checks directly; treat any minimum-lot decision as review-based.",
        "Minimum lot size is not explicit in the extracted regulation text.",
        [16, 17],
    ),
    RuleSeed(
        "R1B",
        "Rural Residential",
        "Residential",
        "ALLOWED",
        None,
        150.0,
        ["Single family houses", "Multifamily houses", "Apartments", "Townhouses", "Row houses", "Home occupation"],
        ["Industrial uses", "Major infrastructure"],
        "Compact rural settlement, land pooling, and land subdivision.",
        "150 sqm maximum applies to row housing or single-family units; multifamily or apartments are density-driven.",
        "Subdivision is possible but should avoid fragmentation of productive rural land.",
        "Housing typology affects how the 150 sqm cap should be applied.",
        [18, 19],
    ),
    RuleSeed(
        "R2",
        "Medium Density Residential Improvement",
        "Residential",
        "NEEDS_REVIEW",
        None,
        200.0,
        ["Row housing", "Apartments", "Home occupation", "Accessory residential units"],
        ["Industrial uses", "Major infrastructure", "Single family residential developments"],
        "Infrastructure retrofitting, infill development, land pooling, urban renewal.",
        "Rowhouse plots cap at 200 sqm; apartment projects are density-driven and require case-specific review.",
        "Use this as an improvement or redevelopment zone, not a simple by-right parcel split.",
        "Development strategy and density standards are more important than a single lot size threshold.",
        [20, 21],
    ),
    RuleSeed(
        "R3",
        "Medium Density Residential Expansion",
        "Residential",
        "NEEDS_REVIEW",
        None,
        150.0,
        ["Row houses", "Apartments", "Multifamily houses", "Accessory residential units", "Home occupation"],
        ["Single family houses that do not meet affordability criteria", "Industrial uses", "Major infrastructure"],
        "Land pooling, sites and services, incremental higher-intensity housing.",
        "Use 100 sqm as the cap for incremental single-family housing and 150 sqm for row housing where typology is known.",
        "R3 is intended for structured expansion and affordability-led schemes, so simple parcel splitting needs review.",
        "Lot size depends on housing type and affordability requirements.",
        [22, 23],
    ),
    RuleSeed(
        "R4",
        "High Density Residential",
        "Residential",
        "NEEDS_REVIEW",
        750.0,
        None,
        ["High density residential", "Home occupation", "R2 typologies on plots below 750 sqm"],
        ["Industrial uses", "Major infrastructure"],
        "Land pooling, project documents and designs, physical plan, sites and services.",
        "Treat 750 sqm as the minimum lot size for true R4 development; smaller sites fall back to R2 typologies.",
        "R4 requires planned project documentation and should not be treated as routine parcel splitting.",
        "Detailed project design is mandatory for R4 assessment.",
        [24, 25, 26],
    ),
    RuleSeed(
        "C1",
        "Mixed Use Commercial",
        "Commercial",
        "NEEDS_REVIEW",
        None,
        None,
        ["Commercial", "Restaurants", "Offices above first floor", "Residential", "Home occupation"],
        ["Large scale commercial complex", "Industrial uses", "Major infrastructure"],
        "Individual plot development and land pooling.",
        "Lot size is project-dependent; assess by urban design, access, and mixed-use fit rather than a fixed parcel size.",
        "Subdivision may be possible but requires design review for access, frontage, and mixed-use form.",
        "The regulation states lot size depends on the project to be developed.",
        [27, 28, 29],
    ),
    RuleSeed(
        "C3",
        "City Commercial",
        "Commercial",
        "NEEDS_REVIEW",
        None,
        None,
        ["C1-compatible uses", "Shopping centers", "Offices", "Hotels", "Apartments", "Entertainment"],
        ["Major industrial uses", "Major infrastructure installations"],
        "Individual plot development, land pooling, optional downzone to C1.",
        "Use project review; no numeric lot size is given in the extracted text.",
        "Commercial subdivision is design-led and should be checked against access, frontage, and corridor context.",
        "Lot size is project-dependent and corridor conditions matter.",
        [29, 30, 31, 33, 34],
    ),
    RuleSeed(
        "C4",
        "Regional Commercial",
        "Commercial",
        "NEEDS_REVIEW",
        None,
        None,
        ["Regional commercial and mixed commercial uses"],
        ["Unspecified in extracted pages; treat incompatible heavy uses as prohibited until reviewed"],
        "Regional-center planning with grouped activities and strong vehicular access.",
        "Treat as project-based review only; no usable lot-size threshold was extracted.",
        "This zone is meant for planned commercial centers near regional transportation access.",
        "The extracted text is descriptive but not yet normalized into fixed lot-size rules.",
        [32],
    ),
    RuleSeed(
        "A1",
        "Agriculture",
        "Agriculture",
        "NEEDS_REVIEW",
        None,
        None,
        ["Agricultural uses", "Rural community development after land pooling in suitable locations"],
        ["Urban fragmentation of viable agricultural land"],
        "Protect farmland and prevent fragmentation.",
        "Routine subdivision should be treated cautiously; any residential conversion needs explicit planning review.",
        "Agricultural land should not be fragmented without a clear land-pooling or rural compact-development rationale.",
        "The zone is protective rather than subdivision-oriented.",
        [59],
    ),
    RuleSeed(
        "A2",
        "Livestock",
        "Agriculture",
        "NEEDS_REVIEW",
        None,
        None,
        ["Agro-forestry", "Livestock farming", "Livestock facilities", "Temporary farm store"],
        ["Industrial uses", "Commercial uses", "Public facilities", "Major infrastructure"],
        "Case-specific husbandry and site management review.",
        "Treat subdivision as review-based because livestock suitability depends on scale, topography, and management practice.",
        "Livestock zoning is explicitly described as not being a one-size-fits-all regulation.",
        "Site-specific operational review is required.",
        [60],
    ),
    RuleSeed(
        "W1A",
        "Wetland Protected",
        "Wetland",
        "NOT_RECOMMENDED",
        None,
        None,
        ["Research"],
        ["Agriculture", "Industrial uses", "Residential uses", "Commercial uses", "Public facilities"],
        "Protection only.",
        "No subdivision should be considered compliant inside a protected wetland.",
        "Protected wetland area with 20 m buffer requirement.",
        None,
        [61, 62],
    ),
    RuleSeed(
        "W1B",
        "Wetland Unprotected",
        "Wetland",
        "NEEDS_REVIEW",
        None,
        None,
        ["Agriculture", "Fish farming", "Recreation", "Ecotourism", "Research", "Energy generation"],
        ["Industrial uses", "Residential uses", "Commercial uses", "Public facilities"],
        "Approval by review panel required.",
        "Treat all subdivision inside W1B as review-only and apply the 20 m wetland buffer.",
        "Wetland buffer of 20 m remains in force, and review-panel approval is required.",
        None,
        [62, 63],
    ),
    RuleSeed(
        "W2",
        "Wetland Rehabilitation",
        "Wetland",
        "NOT_RECOMMENDED",
        None,
        None,
        ["Restoration-supporting ancillary uses only"],
        ["Uses conflicting with wetland rehabilitation"],
        "Re-establish the wetland ecosystem.",
        "Any subdivision overlapping W2 should be treated as not recommended.",
        "Rehabilitation zone prioritizes ecological restoration and removal of conflicting structures.",
        None,
        [63, 64],
    ),
    RuleSeed(
        "W3",
        "Wetland Sustainable Exploitation",
        "Wetland",
        "NEEDS_REVIEW",
        None,
        None,
        ["Sustainable agriculture and ancillary wetland-compatible uses"],
        ["Unsustainable or obstructive development"],
        "Sustainable use with EIA-aligned controls.",
        "Treat subdivision as review-only; wetland-compatible uses and access arrangements must be checked carefully.",
        "Roads and utilities may be permissible, but the wetland regime still governs the site.",
        None,
        [64, 65],
    ),
    RuleSeed(
        "W4",
        "Wetland Conservation",
        "Wetland",
        "NOT_RECOMMENDED",
        None,
        None,
        ["Conservation-supporting ancillary uses"],
        ["Direct damaging development and wastewater discharge"],
        "Conserve intact wetland ecosystems.",
        "Subdivision inside W4 should be treated as not recommended.",
        "Conservation wetland areas are intended to remain protected.",
        None,
        [65, 66],
    ),
    RuleSeed(
        "W5",
        "Wetland Recreational",
        "Wetland",
        "NEEDS_REVIEW",
        None,
        None,
        ["Recreation", "Eco-tourism", "Open-space-compatible ancillary uses"],
        ["Habitable or environmentally harmful structures"],
        "Public recreational transformation with wetland-sensitive infrastructure.",
        "Treat subdivision as review-only and keep hydrology-sensitive conditions in view.",
        "Wetland recreation zones remain environmentally constrained despite public-space potential.",
        None,
        [66, 67],
    ),
    RuleSeed(
        "WB",
        "Water Body",
        "Water Body",
        "NOT_RECOMMENDED",
        None,
        None,
        ["Fishing", "Fish farming", "Inland water transport", "Tourism", "Boating"],
        ["Industrial use", "Residential use", "Commercial use waste discharges"],
        "Conservation and sustainable use of waterbodies.",
        "Routine land subdivision within WB should be treated as not recommended.",
        "Waterbody areas are protected and several developments require review-panel approval.",
        None,
        [67, 68],
    ),
    RuleSeed(
        "T",
        "Transportation",
        "Transportation",
        "NEEDS_REVIEW",
        None,
        None,
        ["Transport infrastructure", "Parking", "Depots", "Telecommunication lines", "Water network", "Electrical infrastructure"],
        ["Major industrial uses", "Major residential uses"],
        "Government or authority-led transport infrastructure review.",
        "Treat subdivision in T zones as review-only and only claim preliminary access checks.",
        "Transport-zone development requires review by OSC and infrastructure agencies.",
        None,
        [68, 69],
    ),
    RuleSeed(
        "U",
        "Utility",
        "Utility",
        "NEEDS_REVIEW",
        None,
        None,
        ["Water infrastructure", "Power plants and stations", "Treatment plants", "ICT and telecommunication infrastructure"],
        ["Major industrial uses", "Major commercial uses", "Residential uses in electrical utility zones"],
        "Infrastructure authority review.",
        "Treat subdivision in U zones as review-only and warn that utilities may sterilize part of the site.",
        "Utility-zone development requires agency review and is not a routine private subdivision context.",
        None,
        [70],
    ),
    RuleSeed(
        "B1",
        "Wetland Buffer",
        "Buffer",
        "NOT_RECOMMENDED",
        None,
        None,
        ["Only wetland-compatible low-impact uses in unprotected contexts"],
        ["Industrial uses", "Commercial uses", "Public facilities"],
        "Buffer protection.",
        "Treat any overlapping subdivision as not recommended unless the affected area is clearly excluded from developable land.",
        "Wetland buffers supersede underlying zoning and require environmental review.",
        None,
        [71],
    ),
    RuleSeed(
        "B2",
        "Water Body Buffer",
        "Buffer",
        "NOT_RECOMMENDED",
        None,
        None,
        ["Fruit trees", "Agroforestry", "Shrubs and grasses"],
        ["Industrial uses", "Residential uses", "Commercial uses", "Public facilities", "Major infrastructure"],
        "Buffer protection around rivers and lakes.",
        "Treat waterbody buffers as not recommended for routine subdivision.",
        "Ministerial-order buffers of 50 m for lakes and 10/5/2 m for rivers apply.",
        None,
        [72],
    ),
    RuleSeed(
        "B3",
        "National Park Buffer",
        "Buffer",
        "NOT_RECOMMENDED",
        None,
        None,
        ["Tourism", "Biodiversity conservation", "Forest use"],
        ["Incompatible permanent urban development"],
        "Protected-area buffer management.",
        "Subdivision requires special protected-area review and should not be treated as routine compliant development.",
        "National-park buffers are governed by park-specific law.",
        None,
        [72],
    ),
    RuleSeed(
        "B4",
        "Protected Area And Other Buffer",
        "Buffer",
        "NOT_RECOMMENDED",
        None,
        None,
        ["Forests", "Green spaces", "Recreational parks"],
        ["Permanent structures", "Industrial uses", "Residential uses", "Commercial uses", "Public facilities"],
        "Risk-sensitive and environmentally sensitive buffer protection.",
        "Only very limited low-impact conditional uses should be considered, and subdivision should be treated as not recommended.",
        "Development is restricted to at most 10% of the plot area or 500 sqm, whichever is less.",
        None,
        [72, 73, 74],
    ),
    RuleSeed(
        "P3B",
        "Forest Zone",
        "Forest And Open Space",
        "NOT_RECOMMENDED",
        None,
        None,
        ["Forest and open-space functions"],
        ["Routine parcel development"],
        "Protection of forest/open-space areas.",
        "Treat overlaps as a strong restriction and keep developable plots outside this zone.",
        "Forest/open-space zoning should be preserved in a preliminary planner.",
        None,
        [13],
    ),
    RuleSeed(
        "P3C",
        "Steep Slopes Over 30 Percent",
        "Slope Overlay",
        "NEEDS_REVIEW",
        None,
        None,
        ["Conditional eco-tourism, parks, open space, limited R1-compatible uses where specifically reviewed"],
        ["Unreviewed greenfield development"],
        "Detailed investigation and geotechnical review required.",
        "Treat any overlap as a slope warning and escalate to review; do not call it automatically compliant.",
        "The slope overlay explicitly says development above 30% is generally discouraged and subject to detailed investigation.",
        None,
        [13, 83, 84],
    ),
]


def ensure_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(SQLITE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA synchronous=NORMAL")
    return connection


def create_tables(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        DROP TABLE IF EXISTS parcels;
        DROP TABLE IF EXISTS masterplan_zones;
        DROP TABLE IF EXISTS administrative_boundaries;
        DROP TABLE IF EXISTS building_footprints;
        DROP TABLE IF EXISTS zoning_rules;
        DROP TABLE IF EXISTS subdivision_proposals;
        DROP TABLE IF EXISTS compliance_reports;
        DROP TABLE IF EXISTS layer_status;

        CREATE TABLE parcels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_object_id TEXT,
            upi TEXT,
            upi_normalized TEXT,
            parcel_num TEXT,
            province TEXT,
            district TEXT,
            sector TEXT,
            cell TEXT,
            village TEXT,
            cell_code TEXT,
            status TEXT,
            accuracy TEXT,
            globalid TEXT,
            official_area_sqm REAL,
            calc_area_sqm REAL,
            centroid_lon REAL,
            centroid_lat REAL,
            min_lon REAL,
            min_lat REAL,
            max_lon REAL,
            max_lat REAL,
            geometry_geojson TEXT
        );

        CREATE TABLE masterplan_zones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_feature_id TEXT,
            zone_code TEXT,
            gen_lu TEXT,
            zoning TEXT,
            phasing TEXT,
            globalid TEXT,
            area_ha REAL,
            min_lon REAL,
            min_lat REAL,
            max_lon REAL,
            max_lat REAL,
            geometry_geojson TEXT
        );

        CREATE TABLE administrative_boundaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            boundary_level TEXT,
            source_feature_id TEXT,
            code_value TEXT,
            name TEXT,
            province TEXT,
            district TEXT,
            sector TEXT,
            cell TEXT,
            village TEXT,
            min_lon REAL,
            min_lat REAL,
            max_lon REAL,
            max_lat REAL,
            geometry_geojson TEXT
        );

        CREATE TABLE building_footprints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_feature_id TEXT,
            latitude REAL,
            longitude REAL,
            area_attr_sqm REAL,
            confidence INTEGER,
            plus_code TEXT,
            calc_area_sqm REAL,
            min_lon REAL,
            min_lat REAL,
            max_lon REAL,
            max_lat REAL,
            geometry_geojson TEXT
        );

        CREATE TABLE zoning_rules (
            zone_code TEXT PRIMARY KEY,
            display_name TEXT,
            category TEXT,
            subdivision_status TEXT,
            minimum_lot_size_sqm REAL,
            maximum_lot_size_sqm REAL,
            allowed_uses_json TEXT,
            prohibited_uses_json TEXT,
            development_strategy TEXT,
            subdivision_guidance TEXT,
            restriction_summary TEXT,
            review_reason TEXT,
            source_pages_json TEXT,
            source_excerpt TEXT
        );

        CREATE TABLE subdivision_proposals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parcel_id INTEGER NOT NULL,
            parent_upi TEXT NOT NULL,
            proposed_land_use TEXT,
            proposal_geojson TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE compliance_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            proposal_id INTEGER NOT NULL,
            parcel_id INTEGER NOT NULL,
            parent_upi TEXT NOT NULL,
            recommendation TEXT NOT NULL,
            overall_status TEXT NOT NULL,
            report_json TEXT NOT NULL,
            report_markdown TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE layer_status (
            layer_key TEXT PRIMARY KEY,
            source_path TEXT NOT NULL,
            feature_count INTEGER,
            geometry_type TEXT,
            crs TEXT,
            epsg INTEGER,
            min_lon REAL,
            min_lat REAL,
            max_lon REAL,
            max_lat REAL,
            loaded_successfully INTEGER NOT NULL,
            fields_json TEXT,
            notes TEXT
        );

        CREATE INDEX idx_parcels_upi_normalized ON parcels(upi_normalized);
        CREATE INDEX idx_parcels_bbox ON parcels(min_lon, min_lat, max_lon, max_lat);
        CREATE INDEX idx_masterplan_zone_code ON masterplan_zones(zone_code);
        CREATE INDEX idx_masterplan_bbox ON masterplan_zones(min_lon, min_lat, max_lon, max_lat);
        CREATE INDEX idx_admin_level ON administrative_boundaries(boundary_level);
        CREATE INDEX idx_admin_bbox ON administrative_boundaries(min_lon, min_lat, max_lon, max_lat);
        CREATE INDEX idx_buildings_bbox ON building_footprints(min_lon, min_lat, max_lon, max_lat);
        """
    )
    connection.commit()


def bbox_tuple(geometry: Any) -> tuple[float, float, float, float]:
    minx, miny, maxx, maxy = geometry.bounds
    return float(minx), float(miny), float(maxx), float(maxy)


def as_text(value: Any) -> str | None:
    if value is None:
        return None
    if pd.isna(value):
        return None
    return str(value)


def as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except Exception:
        pass
    try:
        return float(value)
    except Exception:
        return None


def iter_batches(items: Iterable[tuple[Any, ...]], size: int = 1000) -> Iterable[list[tuple[Any, ...]]]:
    batch: list[tuple[Any, ...]] = []
    for item in items:
        batch.append(item)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


def execute_batches(connection: sqlite3.Connection, sql: str, rows: Iterable[tuple[Any, ...]], batch_size: int = 1000) -> None:
    for batch in iter_batches(rows, size=batch_size):
        connection.executemany(sql, batch)
    connection.commit()


def to_wgs84(dataframe: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    if dataframe.crs is None:
        raise ValueError("Input GeoDataFrame has no CRS")
    if str(dataframe.crs).upper() == WGS84:
        return dataframe.copy()
    return dataframe.to_crs(WGS84)


def filter_kigali_admin(dataframe: gpd.GeoDataFrame, level: str) -> gpd.GeoDataFrame:
    frame = dataframe.copy()
    possible_columns = ["Province", "Prov_Engl", "Prov_Enlgi", "Prov_name"]
    if level == "province":
        return frame[frame["Province"].isin(["Umujyi wa Kigali"])]
    for column in possible_columns:
        if column in frame.columns:
            mask = frame[column].fillna("").astype(str).isin(KIGALI_LABELS)
            if mask.any():
                return frame[mask]
    return frame


def build_parcels(connection: sqlite3.Connection) -> None:
    gdf = gpd.read_file(PARCELS_PATH)
    wgs84 = to_wgs84(gdf)

    def rows() -> Iterable[tuple[Any, ...]]:
        for row in wgs84.itertuples(index=False):
            geometry = row.geometry
            centroid = geometry.centroid
            min_lon, min_lat, max_lon, max_lat = bbox_tuple(geometry)
            official_area = as_float(getattr(row, "st_area_sh", None)) or as_float(getattr(row, "Shape_Area", None))
            yield (
                as_text(getattr(row, "OBJECTID_1", None)),
                as_text(getattr(row, "upi", None)),
                as_text(getattr(row, "upi", None)).strip().lower() if as_text(getattr(row, "upi", None)) else None,
                as_text(getattr(row, "parcel_num", None)),
                as_text(getattr(row, "province", None)),
                as_text(getattr(row, "district", None)),
                as_text(getattr(row, "sector", None)),
                as_text(getattr(row, "cell", None)),
                as_text(getattr(row, "village", None)),
                as_text(getattr(row, "cell_code", None)),
                as_text(getattr(row, "status", None)),
                as_text(getattr(row, "accuracy", None)),
                as_text(getattr(row, "globalid", None)),
                official_area,
                official_area,
                float(centroid.x),
                float(centroid.y),
                min_lon,
                min_lat,
                max_lon,
                max_lat,
                shapely.to_geojson(geometry),
            )

    execute_batches(
        connection,
        """
        INSERT INTO parcels (
            source_object_id, upi, upi_normalized, parcel_num, province, district, sector, cell, village,
            cell_code, status, accuracy, globalid, official_area_sqm, calc_area_sqm, centroid_lon, centroid_lat,
            min_lon, min_lat, max_lon, max_lat, geometry_geojson
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows(),
    )


def build_masterplan(connection: sqlite3.Connection) -> None:
    gdf = gpd.read_file(MASTERPLAN_PATH)
    wgs84 = to_wgs84(gdf)

    def rows() -> Iterable[tuple[Any, ...]]:
        for row in wgs84.itertuples(index=False):
            min_lon, min_lat, max_lon, max_lat = bbox_tuple(row.geometry)
            yield (
                as_text(getattr(row, "globalid", None)),
                as_text(getattr(row, "zone_code", None)),
                as_text(getattr(row, "gen_lu", None)),
                as_text(getattr(row, "zoning", None)),
                as_text(getattr(row, "phasing", None)),
                as_text(getattr(row, "globalid", None)),
                as_float(getattr(row, "area_ha", None)),
                min_lon,
                min_lat,
                max_lon,
                max_lat,
                shapely.to_geojson(row.geometry),
            )

    execute_batches(
        connection,
        """
        INSERT INTO masterplan_zones (
            source_feature_id, zone_code, gen_lu, zoning, phasing, globalid, area_ha,
            min_lon, min_lat, max_lon, max_lat, geometry_geojson
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows(),
    )


def admin_name_and_code(level: str, row: Any) -> tuple[str | None, str | None, str | None, str | None, str | None, str | None]:
    if level == "province":
        return as_text(getattr(row, "Province", None)), as_text(getattr(row, "Province", None)), None, None, None, None
    if level == "district":
        return as_text(getattr(row, "District", None)), as_text(getattr(row, "District", None)), as_text(getattr(row, "Province", None)), None, None, None
    if level == "sector":
        return as_text(getattr(row, "Sector", None)), as_text(getattr(row, "Code_Sect_", None)), as_text(getattr(row, "Province", None)), as_text(getattr(row, "District", None)), None, None
    if level == "cell":
        return as_text(getattr(row, "Cellule_1", None)), as_text(getattr(row, "Code_cell_", None)), as_text(getattr(row, "Province", None)), as_text(getattr(row, "District", None)), as_text(getattr(row, "Sector_1", None)), None
    if level == "village":
        return as_text(getattr(row, "Village", None)), as_text(getattr(row, "Vill_ID", None)), as_text(getattr(row, "Province", None)), as_text(getattr(row, "District", None)), as_text(getattr(row, "Sector_1", None)), as_text(getattr(row, "Cellule_1", None))
    raise ValueError(f"Unsupported admin level {level}")


def build_admin_boundaries(connection: sqlite3.Connection) -> None:
    configs = [
        ("province", ADMIN_DIR / "Province_Boundary.shp"),
        ("district", ADMIN_DIR / "District_Boundary.shp"),
        ("sector", ADMIN_DIR / "Sector_Boundary.shp"),
        ("cell", ADMIN_DIR / "Cell_Boundary.shp"),
        ("village", ADMIN_DIR / "Village_Boundary.shp"),
    ]

    for level, path in configs:
        gdf = gpd.read_file(path)
        kigali = filter_kigali_admin(gdf, level)
        wgs84 = to_wgs84(kigali)

        def rows() -> Iterable[tuple[Any, ...]]:
            for row in wgs84.itertuples(index=False):
                min_lon, min_lat, max_lon, max_lat = bbox_tuple(row.geometry)
                name, code_value, province, district, sector, cell = admin_name_and_code(level, row)
                village = name if level == "village" else None
                yield (
                    level,
                    as_text(getattr(row, "OBJECTID_1", None)) or as_text(getattr(row, "District", None)) or as_text(getattr(row, "Province", None)),
                    code_value,
                    name,
                    province,
                    district,
                    sector,
                    cell,
                    village,
                    min_lon,
                    min_lat,
                    max_lon,
                    max_lat,
                    shapely.to_geojson(row.geometry),
                )

        execute_batches(
            connection,
            """
            INSERT INTO administrative_boundaries (
                boundary_level, source_feature_id, code_value, name, province, district, sector, cell, village,
                min_lon, min_lat, max_lon, max_lat, geometry_geojson
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows(),
        )


def build_buildings(connection: sqlite3.Connection) -> None:
    gdf = gpd.read_file(BUILDINGS_PATH)
    wgs84 = to_wgs84(gdf)

    def rows() -> Iterable[tuple[Any, ...]]:
        for index, row in enumerate(wgs84.itertuples(index=False), start=1):
            min_lon, min_lat, max_lon, max_lat = bbox_tuple(row.geometry)
            area_attr = as_float(getattr(row, "area_in_me", None))
            yield (
                str(index),
                as_float(getattr(row, "latitude", None)),
                as_float(getattr(row, "longitude", None)),
                area_attr,
                int(as_float(getattr(row, "confidence", None)) or 0),
                as_text(getattr(row, "full_plus_", None)),
                area_attr,
                min_lon,
                min_lat,
                max_lon,
                max_lat,
                shapely.to_geojson(row.geometry),
            )

    execute_batches(
        connection,
        """
        INSERT INTO building_footprints (
            source_feature_id, latitude, longitude, area_attr_sqm, confidence, plus_code, calc_area_sqm,
            min_lon, min_lat, max_lon, max_lat, geometry_geojson
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows(),
    )


def extract_pdf_pages() -> dict[int, str]:
    reader = PdfReader(str(PDF_PATH))
    page_text: dict[int, str] = {}
    for page_number in range(1, len(reader.pages) + 1):
        text = reader.pages[page_number - 1].extract_text() or ""
        page_text[page_number] = " ".join(text.split())
    return page_text


def excerpt_from_pages(page_text: dict[int, str], pages: list[int]) -> str:
    parts = []
    for page in pages:
        text = page_text.get(page, "")
        if text:
            parts.append(text[:1200])
    return "\n\n".join(parts)[:6000]


def build_zoning_rules(connection: sqlite3.Connection) -> None:
    page_text = extract_pdf_pages()

    masterplan = gpd.read_file(MASTERPLAN_PATH, columns=["zone_code", "gen_lu", "zoning"])
    masterplan_codes = sorted(masterplan["zone_code"].dropna().astype(str).str.strip().unique().tolist())
    seeded_codes = {seed.zone_code for seed in RULE_SEEDS}
    rules = list(RULE_SEEDS)

    for code in masterplan_codes:
        if code in seeded_codes:
            continue
        subset = masterplan[masterplan["zone_code"].astype(str).str.strip() == code]
        zoning_name = subset["zoning"].dropna().astype(str).iloc[0] if not subset["zoning"].dropna().empty else code
        gen_lu = subset["gen_lu"].dropna().astype(str).iloc[0] if not subset["gen_lu"].dropna().empty else "Unclassified"
        status = "NEEDS_REVIEW"
        if code.startswith("P"):
            status = "NOT_RECOMMENDED"
        rules.append(
            RuleSeed(
                code,
                zoning_name,
                gen_lu,
                status,
                None,
                None,
                [gen_lu],
                [],
                "Fallback rule generated from Kigali masterplan attributes.",
                "This zone exists in the masterplan layer but has not yet been fully normalized from the zoning PDF.",
                f"Use {code} as a review trigger until its regulation text is manually normalized.",
                "Fallback generated from masterplan because no dedicated rule seed was prepared yet.",
                [],
            )
        )

    execute_batches(
        connection,
        """
        INSERT INTO zoning_rules (
            zone_code, display_name, category, subdivision_status, minimum_lot_size_sqm, maximum_lot_size_sqm,
            allowed_uses_json, prohibited_uses_json, development_strategy, subdivision_guidance, restriction_summary,
            review_reason, source_pages_json, source_excerpt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            (
                rule.zone_code,
                rule.display_name,
                rule.category,
                rule.subdivision_status,
                rule.minimum_lot_size_sqm,
                rule.maximum_lot_size_sqm,
                json.dumps(rule.allowed_uses, ensure_ascii=True),
                json.dumps(rule.prohibited_uses, ensure_ascii=True),
                rule.development_strategy,
                rule.subdivision_guidance,
                rule.restriction_summary,
                rule.review_reason,
                json.dumps(rule.source_pages),
                excerpt_from_pages(page_text, rule.source_pages),
            )
            for rule in rules
        ),
    )


def build_layer_status(connection: sqlite3.Connection) -> None:
    admin_files = {
        "province_boundaries": ADMIN_DIR / "Province_Boundary.shp",
        "district_boundaries": ADMIN_DIR / "District_Boundary.shp",
        "sector_boundaries": ADMIN_DIR / "Sector_Boundary.shp",
        "cell_boundaries": ADMIN_DIR / "Cell_Boundary.shp",
        "village_boundaries": ADMIN_DIR / "Village_Boundary.shp",
    }
    vector_files = {
        "parcels": PARCELS_PATH,
        "masterplan": MASTERPLAN_PATH,
        "building_footprints": BUILDINGS_PATH,
        **admin_files,
    }

    rows: list[tuple[Any, ...]] = []
    for layer_key, path in vector_files.items():
        frame = gpd.read_file(path, rows=3)
        frame_wgs84 = to_wgs84(frame)
        bounds = bbox_tuple(frame_wgs84.geometry.union_all())
        rows.append(
            (
                layer_key,
                str(path.relative_to(ROOT)),
                int(len(gpd.read_file(path, ignore_geometry=True))),
                ",".join(sorted(frame.geom_type.dropna().astype(str).unique().tolist())),
                str(frame.crs),
                frame_wgs84.crs.to_epsg() if frame_wgs84.crs else None,
                bounds[0],
                bounds[1],
                bounds[2],
                bounds[3],
                1,
                json.dumps([str(column) for column in frame.columns if column != "geometry"]),
                None,
            )
        )

    with rasterio.open(DEM_PATH) as src:
        bounds = src.bounds
        rows.append(
            (
                "dem",
                str(DEM_PATH.relative_to(ROOT)),
                1,
                "raster",
                src.crs.to_string() if src.crs else None,
                src.crs.to_epsg() if src.crs else None,
                float(bounds.left),
                float(bounds.bottom),
                float(bounds.right),
                float(bounds.top),
                1,
                json.dumps({"width": src.width, "height": src.height, "resolution": list(src.res)}),
                "DEM is readable, but planner checks currently use masterplan steep-slope zones until DEM-derived slope polygons are added.",
            )
        )

    rows.append(
        (
            "zoning_pdf",
            str(PDF_PATH.relative_to(ROOT)),
            1,
            "document",
            None,
            None,
            None,
            None,
            None,
            None,
            1,
            json.dumps({"pages": len(PdfReader(str(PDF_PATH)).pages)}),
            "Source document for zoning rules imported into SQLite.",
        )
    )

    execute_batches(
        connection,
        """
        INSERT INTO layer_status (
            layer_key, source_path, feature_count, geometry_type, crs, epsg, min_lon, min_lat, max_lon, max_lat,
            loaded_successfully, fields_json, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        rows,
        batch_size=200,
    )


def main() -> None:
    ensure_dirs()
    if SQLITE_PATH.exists():
        SQLITE_PATH.unlink()

    connection = connect()
    try:
        create_tables(connection)
        build_parcels(connection)
        build_masterplan(connection)
        build_admin_boundaries(connection)
        build_buildings(connection)
        build_zoning_rules(connection)
        build_layer_status(connection)
    finally:
        connection.close()

    print(f"Built GIS cache at {SQLITE_PATH}")


if __name__ == "__main__":
    main()
