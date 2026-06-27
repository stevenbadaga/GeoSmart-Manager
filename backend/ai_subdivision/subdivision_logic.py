"""Subdivision geometry utilities for GeoSmart AI backend."""

from typing import List
import math

from shapely.geometry import Polygon, LineString
from shapely import affinity
from shapely.ops import split
from pyproj import Transformer

from sqlalchemy import create_engine, Table, Column, Integer, MetaData
from sqlalchemy.dialects.postgresql import JSONB
from geoalchemy2 import Geometry

# Identity transformer placeholder: swap out when ingesting non-4326 data
_transformer_to_4326 = Transformer.from_crs("EPSG:4326", "EPSG:4326", always_xy=True)


def normalize_to_epsg4326(geom: Polygon) -> Polygon:
    """Ensure coordinates are stored as EPSG:4326 (noop for already-4326)."""
    xs, ys = zip(*geom.exterior.coords)
    tx, ty = _transformer_to_4326.transform(xs, ys)
    return Polygon(zip(tx, ty))


def _road_buffer_width(road_width: float) -> float:
    return max(road_width, 0.01)


def subdivide_polygon(
    parent: Polygon,
    min_lot_size: float = 300.0,
    road_width: float = 6.0,
    front_setback: float = 3.0,
    side_setback: float = 2.0,
) -> List[Polygon]:
    """Improved area-based sweep-line subdivision for connected plots."""
    if parent.area < min_lot_size:
        return []

    # Align to longest edge of min rotated rectangle
    min_rect = parent.minimum_rotated_rectangle
    rect_coords = list(min_rect.exterior.coords)
    edge_lengths = [
        LineString([rect_coords[i], rect_coords[i + 1]]).length for i in range(4)
    ]
    longest_idx = edge_lengths.index(max(edge_lengths))
    p1, p2 = rect_coords[longest_idx], rect_coords[longest_idx + 1]
    angle = math.degrees(math.atan2(p2[1] - p1[1], p2[0] - p1[0]))

    aligned = affinity.rotate(parent, -angle, origin="centroid")
    minx, miny, maxx, maxy = aligned.bounds
    
    total_area = aligned.area
    num_lots = max(1, int(total_area // min_lot_size))
    
    # Cumulative area sweep to find split points
    steps = 100
    step_size = (maxx - minx) / steps
    cumulative_areas = [0.0]
    for i in range(1, steps + 1):
        x = minx + i * step_size
        box = Polygon([(minx, miny), (x, miny), (x, maxy), (minx, maxy)])
        intersection = aligned.intersection(box)
        cumulative_areas.append(intersection.area if not intersection.is_empty else cumulative_areas[-1])
        
    target_area = total_area / num_lots
    split_points = []
    for i in range(1, num_lots):
        target = i * target_area
        j = 0
        while j < steps and cumulative_areas[j+1] < target:
            j += 1
        
        # Linear interpolation for better precision
        x_base = minx + j * step_size
        a_low = cumulative_areas[j]
        a_high = cumulative_areas[j+1]
        a_diff = a_high - a_low
        ratio = (target - a_low) / a_diff if a_diff > 0 else 0
        split_points.append(x_base + ratio * step_size)
        
    boundaries = [minx] + split_points + [maxx]
    lots = []
    for i in range(len(boundaries) - 1):
        box = Polygon([(boundaries[i], miny), (boundaries[i+1], miny), (boundaries[i+1], maxy), (boundaries[i], maxy)])
        intersection = aligned.intersection(box)
        if not intersection.is_empty:
            if intersection.geom_type == 'MultiPolygon':
                for p in intersection.geoms:
                    if p.area > 1.0:
                        lots.append(p)
            else:
                if intersection.area > 1.0:
                    lots.append(intersection)

    # Rotate back and clip
    rotated = [affinity.rotate(lot, angle, origin="centroid") for lot in lots]
    return [lot for lot in rotated if lot.area >= 1.0]


def evaluate_efficiency(parent: Polygon, lots: List[Polygon]) -> float:
    """Simple efficiency score: balance used area and lot density."""
    if not lots or parent.area <= 0:
        return 0.0
    used_area = sum(l.area for l in lots)
    waste_ratio = max(parent.area - used_area, 0) / parent.area
    density_score = len(lots) / max(parent.area, 1e-9)
    score = 0.7 * (1 - waste_ratio) + 0.3 * min(density_score * 1e4, 1)
    return round(score, 3)


# --- PostGIS persistence (optional) -------------------------------------------------

def _engine():
    # Replace DSN with your credentials
    return create_engine("postgresql+psycopg2://user:password@localhost:5432/geosmart")


def persist_subdivision(name: str, lots: List[Polygon]) -> None:
    """Persist generated lots into PostGIS (Polygon, SRID 4326)."""
    engine = _engine()
    metadata = MetaData()
    subdivisions = Table(
        "subdivisions",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("name", JSONB),
        Column("geom", Geometry("POLYGON", srid=4326)),
    )
    metadata.create_all(engine)

    records = [{"name": name, "geom": f"SRID=4326;{lot.wkt}"} for lot in lots]
    with engine.begin() as conn:
        if records:
            conn.execute(subdivisions.insert(), records)
