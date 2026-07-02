# GIS Data Analysis Report

Generated from `Requested Data`.

## Executive Summary
- Vector layers inspected: `9`
- Raster layers inspected: `1`
- PDF documents inspected: `1`
- Load errors: `0`

## Key Findings
- Kigali parcels loaded successfully with `560275` features.
- Parcel UPI values are not unique: `3742` features share `1829` duplicate UPI values.
- Kigali masterplan loaded successfully with `2310` features and `25` distinct `zone_code` values.
- Masterplan zone codes present: `A1, C1, C3, I1, P1, P2, P3B, P3C, PA, PF1, PF2, PF3, PF5, R1, R1A, R1B, R2, R3, R4, T, U, W2, W3, W4, W5`
- Expected zone codes missing from the current masterplan layer: `C4, A2, W1A, W1B, WB, B1, B2, B3, B4`
- Building footprints loaded successfully with `134197` polygon features.
- DEM raster is readable in CRS/EPSG `21036` with resolution `[30.93, 30.93]`.

## Parcel Layer
- Path: `Requested Data\KIGALI CITY 11.06.2026\KIGALI_CITY_11.06.shp`
- Non-empty UPI count: `560275`
- Top status values: `{'Actual': 555345, 'Provisional': 4930}`
- Top accuracy values: `{'C': 559388, 'A': 887}`
- Administrative fields present: `province, district, sector, cell, village`

## Masterplan Layer
- Path: `Requested Data\Kigali Masterplan\Kigali_Masterplan.shp`
- Top general land-use classes: `{'Forest and Open Spaces': 1238, 'Residential': 384, 'Agriculture': 302, 'Commercial': 248, 'Wetlands': 63, 'Public Facility': 38, 'Public Utility': 14, 'Industrial': 12, 'Public Administration': 6, 'Transportation': 5}`
- Expected zone codes present: `R1, R1A, R1B, R2, R3, R4, C1, C3, A1, W2, W3, W4, W5, T, U`

## Building Footprints
- Path: `Requested Data\Building Footprint\Building_Footprints.shp`
- Confidence distribution sample: `{'0': 134197}`

## DEM
- Path: `Requested Data\DEM_30\DEM30.img`
- Bounding box: `[-57027.824, 9667134.206, 277726.78, 9889427.594]`

## Vector Layers

### Cell_Boundary.shp
- Path: `Requested Data\Administrative Boundaries\Cell_Boundary.shp`
- Feature count: `2147`
- Geometry type: `Polygon Z`
- CRS/EPSG: `unknown`
- Bounding box: `[373412.747, 4685981.857, 600013.095, 4884186.853]`
- Fields: `OBJECTID_1, Code_cell_, SUM_Popula, SUM_Househ, Code_Prov, Province, code_Dist, District, Code_Sect, Sector_1, Cellule_1, Prov_Enlgi, Shape_Leng, Shape_Area`

### District_Boundary.shp
- Path: `Requested Data\Administrative Boundaries\District_Boundary.shp`
- Feature count: `30`
- Geometry type: `Polygon Z`
- CRS/EPSG: `unknown`
- Bounding box: `[373412.747, 4685981.857, 600013.095, 4884186.853]`
- Fields: `Province, District, Prov_Engl, Area`

### Province_Boundary.shp
- Path: `Requested Data\Administrative Boundaries\Province_Boundary.shp`
- Feature count: `5`
- Geometry type: `Polygon Z`
- CRS/EPSG: `unknown`
- Bounding box: `[373412.747, 4685981.857, 600013.095, 4884186.853]`
- Fields: `Province, Prov_Engl, Area`

### Sector_Boundary.shp
- Path: `Requested Data\Administrative Boundaries\Sector_Boundary.shp`
- Feature count: `415`
- Geometry type: `Polygon Z`
- CRS/EPSG: `unknown`
- Bounding box: `[373412.747, 4685981.857, 600013.095, 4884186.853]`
- Fields: `OBJECTID_1, SUM_Popula, SUM_Househ, Province, District, Code_Sect_, Sector, Prov_Engl, ProvName, Shape_Leng, Shape_Area, Area`

### Village_Boundary.shp
- Path: `Requested Data\Administrative Boundaries\Village_Boundary.shp`
- Feature count: `14815`
- Geometry type: `Polygon Z`
- CRS/EPSG: `unknown`
- Bounding box: `[373412.747, 4685981.857, 600013.095, 4884186.853]`
- Fields: `OBJECTID_1, Code_vill_, SUM_Popula, SUM_Househ, Zones_Code, EA_Code, Code_Prov, Province, code_Dist, District, Code_Sect, Sector_1, Code_cell_, Cellule_1, Code_vill1, Population, Household, Shape_Leng, Shape_Area, Status, Prov_Enlgi, Prov_ID, District_I, Sect_ID1, Sect_ID2, Cell_ID1, Cell_ID2, Village_ID, Village__1, Prov_name, Village, Shape_Le_1, Shape_Ar_1, Vill_ID`

### Building_Footprints.shp
- Path: `Requested Data\Building Footprint\Building_Footprints.shp`
- Feature count: `134197`
- Geometry type: `Polygon`
- CRS/EPSG: `4326`
- Bounding box: `[29.978, -2.067, 30.082, -1.867]`
- Fields: `latitude, longitude, area_in_me, confidence, full_plus_`

### Kigali_Parcels.shp
- Path: `Requested Data\Kigali 05.22.2026\Kigali_Parcels.shp`
- Feature count: `101981`
- Geometry type: `Polygon Z`
- CRS/EPSG: `unknown`
- Bounding box: `[497499.053, 4770536.947, 509641.211, 4793586.773]`
- Fields: `OBJECTID_1, parcel_num, village, province, district, sector, cell, cell_code, upi, change_id, start_date, end_date, status, transactio, accuracy, area_in_we, x, y, village_co, globalid, st_area_sh, st_length_, Shape_Leng, Shape_Area`

### KIGALI_CITY_11.06.shp
- Path: `Requested Data\KIGALI CITY 11.06.2026\KIGALI_CITY_11.06.shp`
- Feature count: `560275`
- Geometry type: `Polygon`
- CRS/EPSG: `unknown`
- Bounding box: `[457996.318, 4770096.523, 530828.409, 4835579.743]`
- Fields: `objectid, parcel_num, village, province, district, sector, cell, cell_code, upi, change_id, start_date, end_date, status, transactio, accuracy, area_in_we, x, y, village_co, globalid, st_area_sh, st_length_`

### Kigali_Masterplan.shp
- Path: `Requested Data\Kigali Masterplan\Kigali_Masterplan.shp`
- Feature count: `2310`
- Geometry type: `Polygon Z`
- CRS/EPSG: `unknown`
- Bounding box: `[497499.053, 4770495.333, 509660.041, 4793602.772]`
- Fields: `zone_code, area_ha, gen_lu, zoning, phasing, globalid, Shape_Leng, Shape_Le_1, Shape_Area`

## Raster Layers

### DEM30.img
- Path: `Requested Data\DEM_30\DEM30.img`
- Raster size: `10823 x 7187`
- Bands: `1`
- CRS/EPSG: `21036`
- Resolution: `[30.93, 30.93]`
- Bounding box: `[-57027.824, 9667134.206, 277726.78, 9889427.594]`
- Sample statistics: `{'min': 627.0, 'max': 5089.0, 'mean': 1561.3}`

## PDF Documents

### Land_Use_Plans_Zoning_Regulations_-_Guiding_tool_for_the_implementation_of_land_use_plans_in_Rwanda_.pdf
- Path: `Requested Data\Land_Use_Plans_Zoning_Regulations_-_Guiding_tool_for_the_implementation_of_land_use_plans_in_Rwanda_.pdf`
- Pages: `97`
- Non-empty extractable pages: `96`
- Extracted text characters: `164703`
- Detected zoning tokens: `A1, A2, B1, B2, B3, B4, C1, C3, C4, R1, R1A, R1B, R2, R3, R4, Slope, W1A, W1B, W2, W3, W4, W5, WB`
