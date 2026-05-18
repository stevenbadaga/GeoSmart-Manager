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
    """Heuristic subdivision: shrink by setbacks, then slice along longest axis."""
    if parent.area < min_lot_size:
        return []

    # Apply setbacks (negative buffer shrinks polygon)
    shrunken = parent.buffer(-max(front_setback, side_setback))
    if shrunken.is_empty:
        return []

    # Align to longest edge of min bounding rectangle
    min_rect = shrunken.minimum_rotated_rectangle
    rect_coords = list(min_rect.exterior.coords)
    edge_lengths = [
        LineString([rect_coords[i], rect_coords[i + 1]]).length for i in range(4)
    ]
    longest_idx = edge_lengths.index(max(edge_lengths))
    p1, p2 = rect_coords[longest_idx], rect_coords[longest_idx + 1]
    angle = math.degrees(math.atan2(p2[1] - p1[1], p2[0] - p1[0]))

    aligned = affinity.rotate(shrunken, -angle, origin="centroid")
    minx, miny, maxx, maxy = aligned.bounds
    width = maxx - minx
    height = maxy - miny

    # Strip width ensures min lot size and leaves room for roads
    strip_width = max(min_lot_size / max(height, 1e-9), _road_buffer_width(road_width))
    num_strips = max(1, int(width // strip_width))

    lots = []
    current_x = minx
    for _ in range(num_strips):
        next_x = min(maxx, current_x + strip_width)
        cut = LineString([(next_x, miny), (next_x, maxy)])
        pieces = split(aligned, cut)
        aligned = pieces.geoms[0]
        right_piece = pieces.geoms[1] if len(pieces.geoms) > 1 else None

        if right_piece and right_piece.area >= min_lot_size:
            road_clear = right_piece.buffer(-_road_buffer_width(road_width) / 2)
            if not road_clear.is_empty and road_clear.area >= min_lot_size:
                lots.append(road_clear)

        current_x = next_x

    # Rotate back and clip to parent (safety)
    rotated = [affinity.rotate(lot, angle, origin="centroid") for lot in lots]
    clipped = [
        lot.intersection(parent) for lot in rotated if not lot.is_empty and lot.is_valid
    ]
    return [lot for lot in clipped if lot.area >= min_lot_size]


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
