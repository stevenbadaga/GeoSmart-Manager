# GeoSmart Manager Subdivision Demo Validation Report

Date: May 18, 2026

## Objective
Validate the new GeoSmart Manager subdivision module using mock Rwanda-style GIS data before loading official datasets from NLA or other agencies.

## Demo Scenario
- Project: `Brave Project`
- Parent parcel UPI: `1/01/02/03/0001`
- Proposed land use: `RESIDENTIAL`
- Area tolerance: `5 sqm`
- Proposal geometry:
  - `4` subdivision plots
  - `1` access servitude

## Validation Rules Tested
The module checked whether:
- all proposed plots are inside the parent parcel;
- total proposed area matches the parent parcel area;
- each plot meets the minimum zoning plot size;
- each plot has road access or a connected access servitude;
- no plot overlaps wetlands, river buffers, protected areas, road reserves, or other restricted zones;
- proposed land use matches the applicable zoning rule;
- proposed plots do not overlap each other.

## Initial Result
The first validation run failed on `ROAD_ACCESS`.

Observed behavior:
- parcel containment passed;
- area balance passed;
- minimum plot size passed;
- constraint overlap passed;
- land-use match passed;
- plot overlap passed;
- road access failed for all four plots.

## Root Cause
The mock `ACCESS_SERVITUDE` line in the demo GeoJSON stopped slightly short of the road reserve, so the validation engine did not count it as connected road access.

Original coordinate:

```json
"coordinates": [[30.1150, -1.9560], [30.1150, -1.9540]]
```

## Fix Applied
The access servitude start point was updated so it touches the road reserve.

Updated coordinate:

```json
"coordinates": [[30.1150, -1.9561], [30.1150, -1.9540]]
```

Permanent source fix:
- [backend/src/main/java/rw/venus/geosmartmanager/service/MockSubdivisionLayerFactory.java](/C:/Users/Badaga/Desktop/Final year Project 25961/System/backend/src/main/java/rw/venus/geosmartmanager/service/MockSubdivisionLayerFactory.java:70)

## Final Result
After validating with the corrected servitude geometry:
- overall status became `PASS`;
- all rule checks passed;
- all four plots passed road access;
- the new validation history entries were stored successfully.

Observed successful runs:
- `Run #53` - `PASS`
- `Run #54` - `PASS`

## Conclusion
The subdivision validation module is working correctly.

The earlier failure was caused by a mock-data alignment issue, not by a defect in the validation logic. After correcting the access servitude geometry, the module successfully validated the full proposal and stored the results in validation history.

## Project Significance
This confirms that GeoSmart Manager can:
- support parcel-based subdivision validation using demo GIS layers;
- identify real planning/access issues before submission;
- store repeatable and auditable validation results;
- remain ready for future import of official GeoJSON, Shapefile, and GeoPackage datasets.
