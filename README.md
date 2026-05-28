# GeoSmart Manager

## Project Overview

GeoSmart Manager is an AI-assisted land subdivision planning and zoning compliance system for Rwanda, with the first implementation focused on Kigali.

The system helps land surveyors, students, planners, and landowners perform a preliminary check before submitting a subdivision proposal for official review. It does not approve land subdivisions officially. Instead, it identifies possible planning risks using available GIS data such as parcels, zoning, administrative boundaries, building footprints, and terrain-related constraints.

The main goal is to answer this question:

```text
Does a proposed subdivision appear reasonable and compliant enough to proceed to professional or official review?
```

## Important Disclaimer

```text
This is a preliminary planning and compliance check only. It does not replace official approval by NLA, District One Stop Centre, Irembo, or a licensed land surveyor.
```

## Student and Project Context

```text
Student: Irankunda Badaga Steven
Student ID: 25961
Project: Final Year Project
System: GeoSmart Manager
Country focus: Rwanda
City focus: Kigali
Partner context: Land surveying and planning workflows
```

## Main Problem Addressed

Land subdivision planning requires checking many spatial and regulatory conditions. A proposed subdivision may fail because:

- proposed plots are outside the parent parcel;
- proposed plots overlap each other;
- the subdivision does not balance with the parent parcel area;
- plots are too small or too large for the applicable zoning rule;
- the parcel is in agriculture, wetland, slope, buffer, utility, transport, or protected zones;
- proposed boundaries cut through existing buildings;
- road access cannot be confirmed;
- the parent parcel crosses multiple masterplan zones.

GeoSmart Manager brings these checks into one demo-ready digital workflow.

## Real GIS Data Used

The system uses real data from the local `Requested Data` folder.

```text
Requested Data/
  Administrative Boundaries/
  Building Footprint/
  DEM_30/
  Kigali 05.22.2026/
  Kigali Masterplan/
  Land_Use_Plans_Zoning_Regulations_...pdf
```

### 1. Kigali Parcels

Used for:

- UPI search;
- parent parcel selection;
- parcel geometry;
- parcel area;
- administrative location;
- parcel status and accuracy where available.

Important note:

```text
UPI is not assumed to be unique. If duplicate UPI values exist, the system handles parcel selection using the parcel record ID and geometry.
```

### 2. Kigali Masterplan

Used for:

- zoning overlay;
- zoning category detection;
- restricted and constraint zone detection;
- steep-slope masterplan zone screening;
- transportation-zone based preliminary access screening.

Example zone codes detected in the supplied layer include:

```text
A1, C1, C3, I1, P1, P2, P3B, P3C, PA, PF1, PF2, PF3, PF5,
R1, R1A, R1B, R2, R3, R4, T, U, W2, W3, W4, W5
```

### 3. Zoning Regulations PDF

The zoning regulations PDF is used to create machine-readable zoning rules in the backend cache.

Examples of rule categories loaded:

```text
R1, R1A, R1B, R2, R3, R4
C1, C3, C4
A1, A2
W1A, W1B, W2, W3, W4, W5
WB
T
U
B1, B2, B3, B4
Forest and open space zones
Slope and steep-slope restrictions
```

Some rule codes are available in the PDF but do not have explicit geometries in the supplied Kigali Masterplan shapefile. The system reports this limitation clearly in generated reports.

### 4. Administrative Boundaries

Used for:

- Province;
- District;
- Sector;
- Cell;
- Village.

These values are shown automatically after selecting a parcel.

### 5. Building Footprints

Used for:

- checking whether proposed subdivision boundaries split existing buildings;
- warning when proposed plots conflict with existing structures.

### 6. DEM_30

The DEM raster is detected and readable. In this first implementation, final slope compliance uses the Kigali Masterplan steep-slope zone, especially `P3C`, while DEM-derived slope polygons are listed as a future improvement.

## System Architecture

GeoSmart Manager has three running services.

```text
FastAPI AI Subdivision Service
Port: 8000
Path: backend/ai_subdivision

Spring Boot Backend API
Port: 8080
Path: backend

React Frontend
Port: 5173
Path: frontend
```

## Technologies Used

```text
Frontend: React, Vite, Leaflet, Leaflet Draw, Turf.js
Backend API: Java, Spring Boot
AI/GIS helper service: Python, FastAPI
GIS processing: GeoPandas, Shapely, PyProj, Rasterio, PyPDF
Local GIS cache: SQLite
Authentication: JWT
```

## Implemented Subdivision Workflow

The implemented workflow is:

1. User opens the Subdivision Planner.
2. User searches for a parent parcel by UPI.
3. System displays matching parcel records.
4. User selects the correct parcel.
5. System displays parcel information:

```text
UPI
Parcel area
Province
District
Sector
Cell
Village
Parcel status
Parcel accuracy
```

6. System intersects the parcel with Kigali Masterplan zoning.
7. System displays zoning categories and applicable rules.
8. User draws proposed subdivision polygons or uploads/pastes GeoJSON.
9. System runs compliance checks.
10. System generates a subdivision compliance report.

## Compliance Checks Implemented

The first implementation checks:

- parent parcel exists;
- parent parcel geometry is valid;
- proposed plots stay inside the parent parcel;
- total proposed plot area compared with parent parcel area;
- proposed plots do not overlap each other;
- zoning category from Kigali Masterplan;
- lot-size rule checks where explicit rules exist;
- restricted zone overlap;
- steep-slope masterplan zone overlap;
- building footprint split warnings;
- preliminary road access using transportation zones;
- generated recommendation:

```text
Likely compliant
Needs review
Not recommended
```

## Backend API Endpoints Added

```text
GET  /api/layers/status
GET  /api/parcels/search?upi=
GET  /api/parcels/{id}
GET  /api/parcels/{id}/zoning
GET  /api/parcels/{id}/context
POST /api/subdivision/check
POST /api/subdivision/report
```

## Data Inspection and GIS Cache

Before using the subdivision module, the real GIS data is inspected and converted into a local query cache.

Generated files:

```text
DATA_ANALYSIS_REPORT.md
backend/data_analysis_report.json
backend/data/geosmart_gis.sqlite
```

The inspection report includes:

- layer name;
- number of features;
- geometry type;
- CRS;
- field names;
- bounding box;
- loading status;
- DEM metadata;
- PDF text/rule detection status.

## How to Run the System in VS Code Command Prompt

Use Windows Command Prompt inside VS Code. Open three separate terminal tabs.

If VS Code opens PowerShell by default:

```text
Terminal dropdown > Select Default Profile > Command Prompt
Terminal dropdown > Command Prompt
```

### Step 1. Build or Refresh GIS Cache

Run this once before testing, or when the GIS data changes:

```bat
cd /d "C:\Users\Badaga\Desktop\Final year Project 25961\System"
backend\ai_subdivision\.python311\python.exe backend\scripts\inspect_requested_data.py
backend\ai_subdivision\.python311\python.exe backend\scripts\build_gis_cache.py
```

Expected output:

```text
Wrote JSON report...
Wrote markdown report...
Built GIS cache...
```

### Step 2. Start FastAPI Service

Terminal 1:

```bat
cd /d "C:\Users\Badaga\Desktop\Final year Project 25961\System\backend\ai_subdivision"
run_dev.cmd
```

Test:

```text
http://127.0.0.1:8000/health
http://127.0.0.1:8000/docs
```

### Step 3. Start Spring Boot Backend

Terminal 2:

```bat
cd /d "C:\Users\Badaga\Desktop\Final year Project 25961\System\backend"
set JAVA_HOME=
mvnw.cmd spring-boot:run
```

Use `mvnw.cmd`, not `mvn`, because Maven is provided through the project wrapper.

Test:

```text
http://localhost:8080/api/health
```

### Step 4. Start React Frontend

Terminal 3:

```bat
cd /d "C:\Users\Badaga\Desktop\Final year Project 25961\System\frontend"
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## Login Details

Use this demo account:

```text
Email: surveyor@geomart.rw
Password: GeoSmart@2026
```

Other available accounts may include:

```text
admin@geomart.rw
manager@geomart.rw
engineer@geomart.rw
civil@geomart.rw
client@geomart.rw
```

Default password:

```text
GeoSmart@2026
```

## How to Test the Subdivision Planner

Open:

```text
http://localhost:5173/subdivision
```

### Test Parcel 1: Constraint and Slope Demonstration

Search:

```text
1/01/05/04/3041
```

Expected parcel:

```text
Location: Kigali City, Nyarugenge, Mageregere, Ntungamo, Rubungo
Area: about 26,846 sqm
Zones: A1 Agriculture and P3C Steep Slopes
```

This parcel is useful to demonstrate warning and failure behavior.

Clean proposal result:

```text
Recommendation: Needs review
Reason: proposal can avoid direct restrictions, but parent parcel intersects A1 and P3C zones.
```

Bad proposal result:

```text
Recommendation: Not recommended
Reason: proposed plot overlaps P3B/P3C restricted or steep-slope zones.
```

### Test Parcel 2: Residential R2 Lot-Size Demonstration

Search:

```text
1/01/08/01/706
```

Expected parcel:

```text
Location: Kigali City, Nyarugenge, Nyamirambo, Cyivugiza, Shema
Area: about 4,923 sqm
Zone: R2 Medium Density Residential Improvement
```

This parcel is useful to demonstrate residential lot-size checking.

Expected behavior:

```text
Plots above 200 sqm are flagged under the current R2 rule table.
Plots outside the parent parcel fail.
Plots splitting buildings produce warnings.
```

### Other Useful Parcels

```text
UPI: 1/01/08/02/941
Zone: R1A
Area: about 4,988 sqm
Location: Kigali City, Nyarugenge, Nyamirambo, Gasharu, Karukoro
```

```text
UPI: 1/01/05/03/10224
Zone: R3
Area: about 4,903 sqm
Location: Kigali City, Nyarugenge, Mageregere, Mataba, Mataba
```

## Demo Testing Checklist

### 1. Parcel Search Test

Search a parcel by UPI.

Expected:

```text
Matching parcel appears.
User can select the correct parcel.
Parcel details are shown.
```

### 2. Zoning Intersection Test

After selecting a parcel, check zoning summary.

Expected:

```text
Masterplan zone codes are shown.
Applicable zoning rules are displayed.
```

### 3. Layer Toggle Test

Turn layers on and off:

```text
Parcels
Zoning
Administrative Boundaries
Building Footprints
Constraints
```

Expected:

```text
Map overlays appear and disappear correctly.
```

### 4. Clean Proposal Test

Draw a plot fully inside the selected parcel, away from buildings and constraints.

Expected:

```text
Inside parent: PASS
Building split: No
Restricted overlaps: None
Slope overlap: No
Recommendation: Needs review or Likely compliant depending on zoning and access warnings
```

### 5. Outside Boundary Test

Draw a plot partly outside the parent parcel.

Expected:

```text
Inside parent: FAIL
Recommendation: Not recommended
```

### 6. Overlap Test

Draw two plots that overlap each other.

Expected:

```text
Internal overlap: FAIL
Overlap area is reported
Recommendation: Not recommended
```

### 7. Building Split Test

Draw a proposed boundary through existing building footprints.

Expected:

```text
Building split: Yes
Building footprint check: WARN
```

### 8. Restricted and Slope Test

Draw a plot over a red or gray constrained area.

Expected:

```text
Restricted overlaps: P3B or P3C
Slope overlap: Yes if touching P3C
Recommendation: Not recommended
```

### 9. Lot-Size Test

Use the R2 test parcel:

```text
1/01/08/01/706
```

Draw plots larger than the R2 limit.

Expected:

```text
Lot size: Review / fail
Report says plot area is above the maximum lot size
```

### 10. GeoJSON Upload Test

Switch to:

```text
Upload or paste GeoJSON
```

Paste or upload GeoJSON polygons.

Expected:

```text
System checks uploaded proposal geometries the same way as drawn polygons.
```

## Confirmed Testing Results

The following were tested successfully:

```text
GIS inspection script: working
GIS cache builder: working
FastAPI service: working
Spring Boot backend: working
React frontend: working
Parcel search by UPI: working
Parcel details and administrative location: working
Zoning intersection: working
Layer toggles: working
Map drawing: working
GeoJSON upload/paste: working
Inside-parent check: working
Area balance check: working
Overlap check: working
Lot-size rule check: working
Building footprint check: working
Restricted-zone check: working
Slope/steep-zone check: working
Preliminary road access warning: working
Compliance report generation: working
```

## Example Explanation for Lecturer

```text
GeoSmart Manager is a preliminary land subdivision planning and zoning compliance tool for Kigali. It uses real GIS datasets including Kigali parcels, Kigali Masterplan zoning, administrative boundaries, building footprints, DEM metadata, and zoning regulation rules extracted from the land use planning PDF.

The user searches a parent parcel by UPI, selects the correct parcel, views its administrative location and zoning, draws proposed subdivision plots, and runs compliance checks. The system then reports whether the proposal is likely compliant, needs review, or is not recommended.

The system is not an official approval platform. It supports early planning by identifying issues such as plots outside the parent parcel, overlapping proposed plots, restricted zones, steep slopes, building conflicts, lot-size problems, and preliminary road access concerns.
```

## Known Limitations

This first implementation is intentionally practical and testable. Current limitations are:

- DEM-derived slope polygons are not fully implemented yet; slope checking currently uses masterplan steep-slope zones such as `P3C`.
- Road access is preliminary because official road centerline or right-of-way survey data is not available.
- Shapefile upload for proposed subdivisions is not implemented yet; GeoJSON upload and paste are supported.
- Some zoning codes exist in the PDF rules but do not exist as geometries in the supplied masterplan layer.
- The system does not replace NLA, District One Stop Centre, Irembo, or licensed surveyor approval.

## Final Summary

GeoSmart Manager successfully demonstrates how real Kigali GIS data can be used to support preliminary subdivision planning. It combines parcel search, zoning intersection, map drawing, spatial validation, compliance logic, and report generation into one workflow that can support surveyors, students, planners, and landowners before official submission.
