"""FastAPI service for AI-assisted land subdivision.

Run locally:
    uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from shapely.geometry import shape, mapping
from shapely.geometry.base import BaseGeometry

from subdivision_logic import (
    normalize_to_epsg4326,
    subdivide_polygon,
    evaluate_efficiency,
    persist_subdivision,
)


class SubdivideRequest(BaseModel):
    polygon: Dict[str, Any] = Field(..., description="GeoJSON Polygon geometry")
    min_lot_size: float = Field(300.0, description="Minimum lot size (sqm)")
    road_width: float = Field(6.0, description="Internal access road width (m)")
    front_setback: float = Field(3.0, description="Front setback (m)")
    side_setback: float = Field(2.0, description="Side setback (m)")
    save: bool = Field(False, description="Persist results to PostGIS if true")
    name: Optional[str] = Field(None, description="Optional subdivision name")


class SubdivideResponse(BaseModel):
    lots_geojson: Dict[str, Any]
    efficiency_score: float
    metadata: Dict[str, Any]


app = FastAPI(title="GeoSmart Subdivision API", version="0.1.0")

# CORS for Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _load_polygon(geojson_obj: Dict[str, Any]) -> BaseGeometry:
    try:
        geom = shape(geojson_obj)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=400, detail=f"Invalid GeoJSON polygon: {exc}")
    if geom.geom_type != "Polygon":
        raise HTTPException(status_code=400, detail="Only GeoJSON Polygon is supported.")
    return geom


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/subdivide", response_model=SubdivideResponse)
def subdivide(req: SubdivideRequest):
    parent = _load_polygon(req.polygon)
    parent = normalize_to_epsg4326(parent)

    lots = subdivide_polygon(
        parent=parent,
        min_lot_size=req.min_lot_size,
        road_width=req.road_width,
        front_setback=req.front_setback,
        side_setback=req.side_setback,
    )

    efficiency = evaluate_efficiency(parent, lots)

    if req.save:
        persist_subdivision(req.name or "unnamed_subdivision", lots)

    return SubdivideResponse(
        lots_geojson={
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": mapping(lot),
                    "properties": {"id": idx},
                }
                for idx, lot in enumerate(lots)
            ],
        },
        efficiency_score=efficiency,
        metadata={
            "lot_count": len(lots),
            "min_lot_size": req.min_lot_size,
            "road_width": req.road_width,
            "setbacks": {
                "front": req.front_setback,
                "side": req.side_setback,
            },
        },
    )
