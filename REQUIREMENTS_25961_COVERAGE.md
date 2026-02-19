# GeoSmart-Manager Requirement Coverage

This document maps each requirement to implementation in the current codebase.

## Objectives
- Automate land parcel subdivision using geospatial and AI techniques
  - Backend: Subdivision engine with optimization modes and quality score
  - Files: backend/src/main/java/rw/venus/geosmartmanager/service/SubdivisionService.java
  - API: POST /api/projects/{projectId}/subdivisions/run

- Integrate MIS functionalities to streamline surveying workflows
  - Workflow tasks, project status tracking, dashboard stats
  - Files: backend/src/main/java/rw/venus/geosmartmanager/service/WorkflowTaskService.java
  - API: /api/projects/{projectId}/tasks, /api/projects
  - UI: frontend/src/pages/Workflow.jsx, frontend/src/pages/Dashboard.jsx

- Ensure compliance with RLMUA standards and National Master Plan
  - Compliance rules (min/max parcel area, max parcel count, aspect ratio, Rwanda bounds)
  - Files: backend/src/main/java/rw/venus/geosmartmanager/service/ComplianceService.java
  - Config: backend/src/main/resources/application.yml (app.compliance)
  - API: POST /api/projects/{projectId}/compliance/check

- Analyze cadastral and UPI data to support decision-making
  - Dataset analysis (area, bounds, centroid, polygon count, UPI stats)
  - Files: backend/src/main/java/rw/venus/geosmartmanager/service/DatasetAnalysisService.java
  - UPI detection: backend/src/main/java/rw/venus/geosmartmanager/service/GeoJsonService.java
  - API: GET /api/projects/{projectId}/datasets/{datasetId}/analysis
  - UI: frontend/src/pages/Datasets.jsx

- Improve accuracy and efficiency of survey operations
  - GeoJSON map tools: drawing, snapping, buffering, UTM grid, labels
  - Files: frontend/src/components/GeoJsonMap.jsx, frontend/src/pages/Map.jsx

- Support real-world testing and validation of geospatial workflows
  - Sample data seeding for Rwanda
  - Files: backend/src/main/java/rw/venus/geosmartmanager/service/SampleDataSeeder.java

## System Modules
- User Registration & Authentication Module
  - JWT auth, login/register
  - API: /api/auth/login, /api/auth/register
  - Files: backend/src/main/java/rw/venus/geosmartmanager/service/AuthService.java
  - UI: frontend/src/pages/Login.jsx, frontend/src/pages/Register.jsx

- Client & Project Management Module
  - API: /api/clients, /api/projects
  - Files: backend/src/main/java/rw/venus/geosmartmanager/service/ClientService.java
  - UI: frontend/src/pages/Clients.jsx, frontend/src/pages/Projects.jsx

- Geospatial Data Management Module
  - Dataset storage + analysis
  - API: /api/projects/{projectId}/datasets
  - Files: backend/src/main/java/rw/venus/geosmartmanager/service/DatasetService.java
  - UI: frontend/src/pages/Datasets.jsx

- AI Land Subdivision Module
  - Optimization modes and quality score
  - API: /api/projects/{projectId}/subdivisions/run
  - Files: backend/src/main/java/rw/venus/geosmartmanager/service/SubdivisionService.java

- Regulatory Compliance Module
  - Rule-based compliance checks, Rwanda bounds, and Master Plan boundary check (if provided)
  - API: /api/projects/{projectId}/compliance/check
  - Files: backend/src/main/java/rw/venus/geosmartmanager/service/ComplianceService.java

- Workflow & MIS Integration Module
  - Task management
  - API: /api/projects/{projectId}/tasks, /api/tasks/{taskId}/status
  - Files: backend/src/main/java/rw/venus/geosmartmanager/service/WorkflowTaskService.java

- Reporting & Analytics Module
  - Report generation (survey, subdivision, compliance) + PDF export + dataset analytics
  - API: /api/projects/{projectId}/reports/generate
  - Files: backend/src/main/java/rw/venus/geosmartmanager/service/ReportService.java
  - PDF: GET /api/projects/{projectId}/reports/{reportId}/pdf

- Audit & Security Module
  - Audit logging with hash chain + integrity verification
  - API: /api/audit, /api/audit/verify
  - Files: backend/src/main/java/rw/venus/geosmartmanager/service/AuditService.java
  - UI: frontend/src/pages/Audit.jsx

## Rwanda-Specific Enhancements
- Rwanda-centered basemap and bounds
- Administrative layers (province/district/sector/cell/village)
- Kigali City boundary overlay
- Road hierarchy styling
- UTM grid overlay (35S/36S)
- Files: frontend/src/pages/Map.jsx, frontend/src/components/GeoJsonMap.jsx

## Notes
- Official Rwanda datasets can be uploaded as GeoJSON and will appear in overlays automatically.
- Compliance rules are configurable in application.yml.
