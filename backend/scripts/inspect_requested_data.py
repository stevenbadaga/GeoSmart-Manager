from __future__ import annotations

import json
import math
import re
from collections import Counter
from pathlib import Path
from typing import Any

import geopandas as gpd
import pyogrio
import rasterio
from pypdf import PdfReader
from pyproj import CRS


ROOT = Path(__file__).resolve().parents[2]
REQUESTED_DATA_DIR = ROOT / "Requested Data"
BACKEND_DIR = ROOT / "backend"
JSON_REPORT_PATH = BACKEND_DIR / "data_analysis_report.json"
MARKDOWN_REPORT_PATH = ROOT / "DATA_ANALYSIS_REPORT.md"

EXPECTED_MASTERPLAN_CODES = [
    "R1",
    "R1A",
    "R1B",
    "R2",
    "R3",
    "R4",
    "C1",
    "C3",
    "C4",
    "A1",
    "A2",
    "W1A",
    "W1B",
    "W2",
    "W3",
    "W4",
    "W5",
    "WB",
    "T",
    "U",
    "B1",
    "B2",
    "B3",
    "B4",
]

PDF_ZONE_TOKENS = [
    "R1",
    "R1A",
    "R1B",
    "R2",
    "R3",
    "R4",
    "C1",
    "C3",
    "C4",
    "A1",
    "A2",
    "W1A",
    "W1B",
    "W2",
    "W3",
    "W4",
    "W5",
    "WB",
    "B1",
    "B2",
    "B3",
    "B4",
    "Slope",
]


def round_float(value: Any, digits: int = 3) -> Any:
    if isinstance(value, float):
        if math.isfinite(value):
            return round(value, digits)
        return None
    return value


def clean_value(value: Any) -> Any:
    if value is None:
        return None
    if hasattr(value, "item"):
        return clean_value(value.item())
    if isinstance(value, (str, int, bool)):
        return value
    if isinstance(value, float):
        return round_float(value)
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def normalize_bounds(bounds: Any) -> list[float] | None:
    if not bounds:
        return None
    return [round_float(float(value)) for value in bounds]


def summarize_vector(path: Path) -> dict[str, Any]:
    info = pyogrio.read_info(path)
    crs_text = info.get("crs")
    epsg = None
    if crs_text:
        try:
            epsg = CRS.from_user_input(crs_text).to_epsg()
        except Exception:
            epsg = None

    sample = gpd.read_file(path, rows=3)
    geometry_types = sorted({str(value) for value in sample.geom_type.dropna().unique().tolist()})
    field_names = [str(name) for name in info.get("fields", [])]
    field_types = []
    ogr_types = info.get("ogr_types", [])
    dtypes = info.get("dtypes", [])
    for index, name in enumerate(field_names):
        field_types.append(
            {
                "name": name,
                "ogr_type": clean_value(ogr_types[index]) if index < len(ogr_types) else None,
                "dtype": clean_value(dtypes[index]) if index < len(dtypes) else None,
            }
        )

    samples = []
    for _, row in sample.drop(columns="geometry", errors="ignore").iterrows():
        entry = {}
        for key, value in row.items():
            entry[str(key)] = clean_value(value)
        samples.append(entry)

    return {
        "type": "vector",
        "path": str(path.relative_to(ROOT)),
        "file_name": path.name,
        "layer_name": clean_value(info.get("layer_name")),
        "driver": clean_value(info.get("driver")),
        "feature_count": int(info.get("features", 0)),
        "geometry_type": clean_value(info.get("geometry_type")),
        "geometry_type_samples": geometry_types,
        "crs": clean_value(crs_text),
        "epsg": epsg,
        "encoding": clean_value(info.get("encoding")),
        "bounding_box": normalize_bounds(info.get("total_bounds")),
        "field_names": field_names,
        "field_types": field_types,
        "sample_records": samples,
        "loaded_successfully": True,
    }


def summarize_raster(path: Path) -> dict[str, Any]:
    with rasterio.open(path) as src:
        crs = src.crs.to_string() if src.crs else None
        epsg = src.crs.to_epsg() if src.crs else None
        band_indexes = list(src.indexes)
        data_sample = src.read(1, masked=True, out_shape=(min(src.height, 512), min(src.width, 512)))
        valid_values = data_sample.compressed()
        stats = None
        if valid_values.size:
            stats = {
                "min": round_float(float(valid_values.min())),
                "max": round_float(float(valid_values.max())),
                "mean": round_float(float(valid_values.mean())),
            }

        return {
            "type": "raster",
            "path": str(path.relative_to(ROOT)),
            "file_name": path.name,
            "driver": src.driver,
            "width": src.width,
            "height": src.height,
            "band_count": src.count,
            "bands": band_indexes,
            "dtypes": [str(dtype) for dtype in src.dtypes],
            "crs": crs,
            "epsg": epsg,
            "bounding_box": normalize_bounds(src.bounds),
            "resolution": normalize_bounds(src.res),
            "nodata": clean_value(src.nodata),
            "sample_statistics": stats,
            "loaded_successfully": True,
        }


def summarize_pdf(path: Path) -> dict[str, Any]:
    reader = PdfReader(str(path))
    page_text_lengths = []
    zone_page_hits: dict[str, list[int]] = {}
    all_text_parts = []

    for index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        all_text_parts.append(text)
        page_text_lengths.append(len(text))
        if text:
            for token in PDF_ZONE_TOKENS:
                pattern = re.compile(rf"(?<![A-Z0-9]){re.escape(token)}(?![A-Z0-9])", re.IGNORECASE)
                if pattern.search(text):
                    zone_page_hits.setdefault(token, []).append(index)

    all_text = "\n".join(all_text_parts)
    preview = re.sub(r"\s+", " ", all_text[:2000]).strip()
    return {
        "type": "pdf",
        "path": str(path.relative_to(ROOT)),
        "file_name": path.name,
        "page_count": len(reader.pages),
        "extractable_text_characters": len(all_text),
        "non_empty_pages": sum(1 for value in page_text_lengths if value > 0),
        "zone_token_pages": zone_page_hits,
        "text_preview": preview,
        "loaded_successfully": True,
    }


def top_counter(series: Any, limit: int = 10) -> dict[str, int]:
    counter = Counter()
    for value in series:
        key = str(value).strip() if value is not None and str(value).strip() else "NULL"
        counter[key] += 1
    return dict(counter.most_common(limit))


def build_key_layer_summary() -> dict[str, Any]:
    parcels_path = REQUESTED_DATA_DIR / "KIGALI CITY 11.06.2026" / "KIGALI_CITY_11.06.shp"
    masterplan_path = REQUESTED_DATA_DIR / "Kigali Masterplan" / "Kigali_Masterplan.shp"
    buildings_path = REQUESTED_DATA_DIR / "Building Footprint" / "Building_Footprints.shp"
    dem_path = REQUESTED_DATA_DIR / "DEM_30" / "DEM30.img"

    parcels = gpd.read_file(
        parcels_path,
        columns=["objectid", "upi", "status", "accuracy", "province", "district", "sector", "cell", "village"],
    )
    parcels["upi_norm"] = parcels["upi"].fillna("").astype(str).str.strip()
    populated_upi = parcels[parcels["upi_norm"] != ""]
    duplicate_upi_mask = populated_upi.duplicated("upi_norm", keep=False)

    masterplan = gpd.read_file(masterplan_path, columns=["zone_code", "gen_lu", "zoning", "phasing"])
    masterplan_codes = sorted(masterplan["zone_code"].dropna().astype(str).str.strip().unique().tolist())

    buildings = gpd.read_file(buildings_path, columns=["confidence", "area_in_me", "full_plus_"])

    with rasterio.open(dem_path) as src:
        dem_crs = src.crs.to_string() if src.crs else None
        dem_epsg = src.crs.to_epsg() if src.crs else None
        dem_bounds = normalize_bounds(src.bounds)
        dem_resolution = normalize_bounds(src.res)

    return {
        "parcels": {
            "path": str(parcels_path.relative_to(ROOT)),
            "feature_count": int(len(parcels)),
            "non_empty_upi_count": int(len(populated_upi)),
            "duplicate_upi_feature_count": int(duplicate_upi_mask.sum()),
            "duplicate_upi_value_count": int(populated_upi.loc[duplicate_upi_mask, "upi_norm"].nunique()),
            "top_status_values": top_counter(parcels["status"]),
            "top_accuracy_values": top_counter(parcels["accuracy"]),
            "admin_fields_present": [field for field in ["province", "district", "sector", "cell", "village"] if field in parcels.columns],
        },
        "masterplan": {
            "path": str(masterplan_path.relative_to(ROOT)),
            "feature_count": int(len(masterplan)),
            "zone_codes": masterplan_codes,
            "zone_code_count": int(len(masterplan_codes)),
            "top_general_land_use": top_counter(masterplan["gen_lu"], limit=12),
            "expected_codes_present": [code for code in EXPECTED_MASTERPLAN_CODES if code in masterplan_codes],
            "expected_codes_missing": [code for code in EXPECTED_MASTERPLAN_CODES if code not in masterplan_codes],
        },
        "building_footprints": {
            "path": str(buildings_path.relative_to(ROOT)),
            "feature_count": int(len(buildings)),
            "top_confidence_values": top_counter(buildings["confidence"]),
        },
        "dem": {
            "path": str(dem_path.relative_to(ROOT)),
            "crs": dem_crs,
            "epsg": dem_epsg,
            "bounding_box": dem_bounds,
            "resolution": dem_resolution,
            "readable": True,
        },
    }


def discover_files() -> dict[str, list[Path]]:
    return {
        "vectors": sorted(REQUESTED_DATA_DIR.rglob("*.shp")),
        "rasters": sorted(REQUESTED_DATA_DIR.rglob("*.img")),
        "pdfs": sorted(REQUESTED_DATA_DIR.rglob("*.pdf")),
    }


def generate_report() -> dict[str, Any]:
    files = discover_files()
    vectors = []
    rasters = []
    pdfs = []
    errors = []

    for path in files["vectors"]:
        try:
            vectors.append(summarize_vector(path))
        except Exception as exc:
            errors.append({"path": str(path.relative_to(ROOT)), "error": str(exc)})
            vectors.append(
                {
                    "type": "vector",
                    "path": str(path.relative_to(ROOT)),
                    "file_name": path.name,
                    "loaded_successfully": False,
                    "error": str(exc),
                }
            )

    for path in files["rasters"]:
        try:
            rasters.append(summarize_raster(path))
        except Exception as exc:
            errors.append({"path": str(path.relative_to(ROOT)), "error": str(exc)})
            rasters.append(
                {
                    "type": "raster",
                    "path": str(path.relative_to(ROOT)),
                    "file_name": path.name,
                    "loaded_successfully": False,
                    "error": str(exc),
                }
            )

    for path in files["pdfs"]:
        try:
            pdfs.append(summarize_pdf(path))
        except Exception as exc:
            errors.append({"path": str(path.relative_to(ROOT)), "error": str(exc)})
            pdfs.append(
                {
                    "type": "pdf",
                    "path": str(path.relative_to(ROOT)),
                    "file_name": path.name,
                    "loaded_successfully": False,
                    "error": str(exc),
                }
            )

    return {
        "generated_at": __import__("datetime").datetime.utcnow().isoformat() + "Z",
        "requested_data_root": str(REQUESTED_DATA_DIR.relative_to(ROOT)),
        "summary": {
            "vector_layer_count": len(vectors),
            "raster_layer_count": len(rasters),
            "pdf_count": len(pdfs),
            "error_count": len(errors),
        },
        "key_layers": build_key_layer_summary(),
        "vector_layers": vectors,
        "raster_layers": rasters,
        "pdf_documents": pdfs,
        "errors": errors,
    }


def markdown_for_vector(layer: dict[str, Any]) -> list[str]:
    lines = [f"### {layer['file_name']}"]
    if not layer.get("loaded_successfully"):
        lines.append(f"- Status: failed to load (`{layer.get('error', 'unknown error')}`)")
        return lines

    lines.extend(
        [
            f"- Path: `{layer['path']}`",
            f"- Feature count: `{layer['feature_count']}`",
            f"- Geometry type: `{layer['geometry_type']}`",
            f"- CRS/EPSG: `{layer['epsg'] or 'unknown'}`",
            f"- Bounding box: `{layer['bounding_box']}`",
            f"- Fields: `{', '.join(layer['field_names'])}`",
        ]
    )
    return lines


def markdown_for_raster(layer: dict[str, Any]) -> list[str]:
    lines = [f"### {layer['file_name']}"]
    if not layer.get("loaded_successfully"):
        lines.append(f"- Status: failed to load (`{layer.get('error', 'unknown error')}`)")
        return lines

    lines.extend(
        [
            f"- Path: `{layer['path']}`",
            f"- Raster size: `{layer['width']} x {layer['height']}`",
            f"- Bands: `{layer['band_count']}`",
            f"- CRS/EPSG: `{layer['epsg'] or 'unknown'}`",
            f"- Resolution: `{layer['resolution']}`",
            f"- Bounding box: `{layer['bounding_box']}`",
            f"- Sample statistics: `{layer['sample_statistics']}`",
        ]
    )
    return lines


def markdown_for_pdf(doc: dict[str, Any]) -> list[str]:
    lines = [f"### {doc['file_name']}"]
    if not doc.get("loaded_successfully"):
        lines.append(f"- Status: failed to load (`{doc.get('error', 'unknown error')}`)")
        return lines

    lines.extend(
        [
            f"- Path: `{doc['path']}`",
            f"- Pages: `{doc['page_count']}`",
            f"- Non-empty extractable pages: `{doc['non_empty_pages']}`",
            f"- Extracted text characters: `{doc['extractable_text_characters']}`",
            f"- Detected zoning tokens: `{', '.join(sorted(doc['zone_token_pages'].keys()))}`",
        ]
    )
    return lines


def write_markdown(report: dict[str, Any]) -> None:
    key_layers = report["key_layers"]
    parcels = key_layers["parcels"]
    masterplan = key_layers["masterplan"]
    buildings = key_layers["building_footprints"]
    dem = key_layers["dem"]

    lines = [
        "# GIS Data Analysis Report",
        "",
        f"Generated from `{report['requested_data_root']}`.",
        "",
        "## Executive Summary",
        f"- Vector layers inspected: `{report['summary']['vector_layer_count']}`",
        f"- Raster layers inspected: `{report['summary']['raster_layer_count']}`",
        f"- PDF documents inspected: `{report['summary']['pdf_count']}`",
        f"- Load errors: `{report['summary']['error_count']}`",
        "",
        "## Key Findings",
        f"- Kigali parcels loaded successfully with `{parcels['feature_count']}` features.",
        f"- Parcel UPI values are not unique: `{parcels['duplicate_upi_feature_count']}` features share `{parcels['duplicate_upi_value_count']}` duplicate UPI values.",
        f"- Kigali masterplan loaded successfully with `{masterplan['feature_count']}` features and `{masterplan['zone_code_count']}` distinct `zone_code` values.",
        f"- Masterplan zone codes present: `{', '.join(masterplan['zone_codes'])}`",
        f"- Expected zone codes missing from the current masterplan layer: `{', '.join(masterplan['expected_codes_missing']) or 'none'}`",
        f"- Building footprints loaded successfully with `{buildings['feature_count']}` polygon features.",
        f"- DEM raster is readable in CRS/EPSG `{dem['epsg'] or dem['crs']}` with resolution `{dem['resolution']}`.",
        "",
        "## Parcel Layer",
        f"- Path: `{parcels['path']}`",
        f"- Non-empty UPI count: `{parcels['non_empty_upi_count']}`",
        f"- Top status values: `{parcels['top_status_values']}`",
        f"- Top accuracy values: `{parcels['top_accuracy_values']}`",
        f"- Administrative fields present: `{', '.join(parcels['admin_fields_present'])}`",
        "",
        "## Masterplan Layer",
        f"- Path: `{masterplan['path']}`",
        f"- Top general land-use classes: `{masterplan['top_general_land_use']}`",
        f"- Expected zone codes present: `{', '.join(masterplan['expected_codes_present'])}`",
        "",
        "## Building Footprints",
        f"- Path: `{buildings['path']}`",
        f"- Confidence distribution sample: `{buildings['top_confidence_values']}`",
        "",
        "## DEM",
        f"- Path: `{dem['path']}`",
        f"- Bounding box: `{dem['bounding_box']}`",
        "",
        "## Vector Layers",
        "",
    ]

    for layer in report["vector_layers"]:
        lines.extend(markdown_for_vector(layer))
        lines.append("")

    lines.extend(["## Raster Layers", ""])
    for layer in report["raster_layers"]:
        lines.extend(markdown_for_raster(layer))
        lines.append("")

    lines.extend(["## PDF Documents", ""])
    for doc in report["pdf_documents"]:
        lines.extend(markdown_for_pdf(doc))
        lines.append("")

    if report["errors"]:
        lines.extend(["## Errors", ""])
        for error in report["errors"]:
            lines.append(f"- `{error['path']}`: `{error['error']}`")
        lines.append("")

    MARKDOWN_REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    if not REQUESTED_DATA_DIR.exists():
        raise FileNotFoundError(f"Requested Data directory not found: {REQUESTED_DATA_DIR}")

    report = generate_report()
    JSON_REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=True), encoding="utf-8")
    write_markdown(report)
    print(f"Wrote JSON report to {JSON_REPORT_PATH}")
    print(f"Wrote markdown report to {MARKDOWN_REPORT_PATH}")


if __name__ == "__main__":
    main()
