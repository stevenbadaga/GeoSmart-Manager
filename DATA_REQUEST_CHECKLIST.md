# GeoSmart-Manager – Government Data Request Checklist

Use this template when requesting datasets from National Land Authority (or similar agencies) to power subdivision compliance and planning.

## Core datasets (high priority)
1) **Zoning / Land-use (Master Plan) polygons**
   - CRS: EPSG:4326 preferred
   - Attributes: zone code, permitted uses, FAR/coverage limits, height limits, setbacks if available

2) **Cadastral / Parcel boundaries**
   - Current legal parcels; include parcel IDs/UPIs
   - CRS and currency/last update date

3) **Road centerlines and Right-of-Way widths**
   - Attributes: road class, official ROW width, surface type

4) **Administrative boundaries**
   - District, sector, cell, village; include names and codes

5) **Hydrology & Flood**
   - Rivers/streams, lakes, wetlands; flood zones or return-period extents if available

6) **Protected / Restricted areas**
   - Conservation areas, easements, utility corridors, no-build buffers

7) **Utility networks**
   - Water, sewer, stormwater, power (lines & substations), telecom ducts if available

8) **Building footprints**
   - With height/floors if available

## Helpful for site feasibility
9) **Topography / Elevation**
   - Contours or DEM; include resolution and vertical datum

10) **Soils / Geotechnical suitability**
    - Any soil classes, bearing capacity, landslide susceptibility

## Request details to include
- **Format**: GeoPackage, GeoJSON, or Shapefile; CRS stated (prefer EPSG:4326)
- **Metadata**: currency/last update, accuracy, source, usage/licensing terms
- **Attribution fields**: codes/names for zones, admin units, parcel IDs
- **Change log**: how often layers are updated and how to receive updates

## Why we need them (talking points)
- Ensures RLMUA compliance checks (setbacks, use, parcel size, boundary alignment)
- Avoids conflicts with protected areas, utilities, and hydrology
- Speeds approvals by validating against authoritative data
- Improves infrastructure planning (roads/utilities) and risk avoidance (flood/steep slopes)

## Contact / follow-up
- Provide your project name, intended use (planning/compliance automation), and preferred delivery method (secure download, S3, email link, or drive).
