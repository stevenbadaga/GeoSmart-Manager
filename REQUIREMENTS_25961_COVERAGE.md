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
  - Detailed requirement coverage (2026-03-10):

    | Requirement | Status | Current implementation evidence | Gap to close |
    |---|---|---|---|
    | Role-based registration (Surveyor, Engineer, Project Manager, Admin, Client) | Partial | Public registration supports only `ENGINEER` and `ADMIN` (`frontend/src/pages/Register.jsx`). Full role set exists in admin user management (`frontend/src/pages/Users.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/domain/Role.java`). | Add all required roles to self-registration flow (or document admin-only onboarding policy). |
    | Secure login with professional credentials (license number optional) | Partial | Login is email/password plus optional Google SSO (`frontend/src/pages/Login.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/service/AuthService.java`). Professional license exists on user profile/admin forms (`frontend/src/pages/Users.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/entity/UserEntity.java`). | If license-based sign-in is required, add it to auth flow; currently license is profile metadata only. |
    | Multi-factor authentication setup | Missing | No MFA/TOTP/OTP setup UI or backend flow found in `frontend/src` or `backend/src`. | Implement MFA enrollment, challenge, recovery codes, and policy enforcement. |
    | Profile completion with certification and specialization | Missing | User model currently exposes name/email/role/status/professionalLicense (`backend/src/main/java/rw/venus/geosmartmanager/api/dto/AuthDtos.java`). | Add certification/specialization fields, edit UI, and persistence. |
    | Session management and device control | Partial | JWT session with online/offline presence (`frontend/src/auth/AuthContext.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/api/controller/UserController.java`). | Add per-device session list/revoke controls and concurrent-session governance. |
    | Activity log display | Implemented | Audit Trail page + filters + integrity check (`frontend/src/pages/Audit.jsx`) backed by audit endpoints (`backend/src/main/java/rw/venus/geosmartmanager/api/controller/AuditController.java`). | Optional: add user-specific "My activity" view in Account page. |
    | Bulk import for engineering teams | Implemented | Admin `Users` page supports CSV bulk import and creates users (`frontend/src/pages/Users.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/api/controller/UserController.java`). | Optional: server-side batch API for atomic imports and rollback. |
    | Secure role-based access to sensitive geospatial data | Implemented | Stateless JWT + authenticated endpoints (`backend/src/main/java/rw/venus/geosmartmanager/config/SecurityConfig.java`) and role guards on project/dataset/subdivision APIs (`backend/src/main/java/rw/venus/geosmartmanager/api/controller/*Controller.java`). | Optional: object-level access constraints per project ownership/team. |
    | Integration with professional licensing databases | Missing | No external licensing API integration found; `professionalLicense` is stored as plain field. | Add licensing authority connector, verification workflow, and periodic revalidation. |
    | Session timeout for secure operations | Partial | JWT expiration is configured (`backend/src/main/resources/application.yml`, `backend/src/main/java/rw/venus/geosmartmanager/config/JwtService.java`). | Add idle timeout, refresh token rotation, and forced re-auth for high-risk actions. |
    | Audit trail for user actions | Implemented | Audit events logged from auth/services with hash-chain tamper evidence (`backend/src/main/java/rw/venus/geosmartmanager/service/AuditService.java`, `backend/src/main/java/rw/venus/geosmartmanager/service/AuthService.java`). | Optional: broader event coverage for read access to highly sensitive data. |
    | GDPR-compliant handling of client and land data | Missing | No explicit GDPR/privacy-consent/retention/right-to-erasure implementation references found. | Add GDPR controls (consent records, retention policy, export/delete workflows, legal basis tracking). |

- Client & Project Management Module
  - API: /api/clients, /api/projects
  - Files: backend/src/main/java/rw/venus/geosmartmanager/service/ClientService.java
  - UI: frontend/src/pages/Clients.jsx, frontend/src/pages/Projects.jsx
  - Detailed requirement coverage (2026-03-10):

    | Requirement | Status | Current implementation evidence | Gap to close |
    |---|---|---|---|
    | Client onboarding form with KYC and land ownership details | Partial | Client onboarding UI and API capture `name`, `contactEmail`, `phone`, `address` (`frontend/src/pages/Clients.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/api/dto/ClientDtos.java`, `backend/src/main/java/rw/venus/geosmartmanager/entity/ClientEntity.java`). | Add KYC and land-ownership fields (ID docs, ownership references, verification state, reviewer notes). |
    | Project creation wizard (type, location, scope, timeline) | Partial | Project create/edit form supports `code`, `name`, `client`, `status`, `startDate`, `endDate`, `description` (`frontend/src/pages/Projects.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/api/dto/ProjectDtos.java`). | Convert to guided wizard with explicit type/location/scope steps and validation checkpoints. |
    | Interactive project dashboard with status indicators | Implemented | Projects page has status cards, filters, progress bars, deadlines, and next actions (`frontend/src/pages/Projects.jsx`). Global dashboard exposes project metrics (`frontend/src/pages/Dashboard.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/api/controller/MetricsController.java`). | Optional: add drill-down charts per project timeline and blockers. |
    | Document upload and management (deeds, titles, approvals) | Missing | Current upload flow is geospatial dataset upload only (`frontend/src/pages/Datasets.jsx`, `/api/projects/{projectId}/datasets`). | Add project-document module with metadata, versions, approval state, and secure file storage. |
    | Communication log with clients | Missing | No dedicated communication/message entity or endpoint found; current audit log is system-action oriented (`backend/src/main/resources/db/migration/V1__init.sql`). | Add client communication timeline (email/call/meeting notes), templates, and status tracking. |
    | Invoice and payment tracking | Missing | No invoice/payment tables, DTOs, services, or endpoints found in current backend/frontend modules. | Add billing domain (invoice, payment, balance, reminders) and UI summaries per client/project. |
    | Project archive and retrieval | Missing | Project module supports create/list/update/delete only (`backend/src/main/java/rw/venus/geosmartmanager/api/controller/ProjectController.java`). | Add archive/restore lifecycle with archived filters and retention policies. |
    | End-to-end project lifecycle management | Partial | Lifecycle states + workflow snapshot/next action/readiness are present (`backend/src/main/java/rw/venus/geosmartmanager/domain/ProjectStatus.java`, `backend/src/main/java/rw/venus/geosmartmanager/service/ProjectService.java`, `frontend/src/pages/Workflow.jsx`). | Complete lifecycle coverage for contract docs, billing, communications, and archival handover. |
    | Automated client communication and updates | Missing | No automation workflow for client notifications or periodic updates found. | Add event-driven notifications (email/SMS/in-app) triggered by status and milestone changes. |
    | Integration with accounting and CRM systems | Missing | No connectors/webhooks for accounting or CRM providers found in current services/config. | Add integration layer for accounting/CRM sync and reconciliation logs. |
    | Deadline and milestone tracking | Partial | Project `startDate`/`endDate`, workflow task `dueDate`, and computed `nextAction`/`readinessPercent` are implemented (`frontend/src/pages/Projects.jsx`, `frontend/src/pages/Workflow.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/service/ProjectService.java`). | Add first-class milestone entities, dependencies, reminders, and escalation rules. |
    | Client portal for transparency | Partial | `CLIENT` role can access multiple read endpoints (projects/clients/reports/compliance/metrics) (`backend/src/main/java/rw/venus/geosmartmanager/api/controller/*Controller.java`, `frontend/src/App.jsx`). | Add dedicated client portal UX with scoped data views and stricter per-client data isolation. |

- Geospatial Data Management Module
  - Dataset storage + analysis
  - API: /api/projects/{projectId}/datasets
  - Files: backend/src/main/java/rw/venus/geosmartmanager/service/DatasetService.java
  - UI: frontend/src/pages/Datasets.jsx
  - Detailed requirement coverage (2026-03-10):

    | Requirement | Status | Current implementation evidence | Gap to close |
    |---|---|---|---|
    | Interactive map interface with base layers (satellite, topo, cadastral) | Partial | Map workspace is interactive with selectable basemap and project layers (`frontend/src/pages/Map.jsx`, `frontend/src/components/GeoJsonMap.jsx`). Basemap options are currently `OpenStreetMap` and `Satellite`; topo/cadastral are handled as dataset layers (`frontend/src/pages/Datasets.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/domain/DatasetType.java`). | Add dedicated topo/cadastral basemap providers (or clearly separate as overlay presets). |
    | Data import tools for shapefiles, KML, DXF, GPS data | Partial | In-app import currently accepts GeoJSON text only (`frontend/src/pages/Datasets.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/api/dto/DatasetDtos.java`). A CLI script converts and uploads shapefiles (`frontend/scripts/convert-maps.mjs`). | Add UI import pipelines for SHP/KML/DXF/GPS with conversion, validation, and preview. |
    | Layer management panel with toggle visibility | Implemented | Map page includes toggles for provinces, districts, sectors, cells, villages, roads, labels, and UTM grid (`frontend/src/pages/Map.jsx`). | Optional: add grouped layer presets and saved layer profiles per user/project. |
    | Spatial query and measurement tools | Partial | Measurement tooling exists (area/length summaries, buffer overlay, cursor coordinates, snapping) (`frontend/src/pages/Map.jsx`, `frontend/src/components/GeoJsonMap.jsx`). | Add spatial query operations (intersects/within/nearest/select-by-attribute) with result panels. |
    | Attribute table viewer and editor | Missing | No attribute table view/editor for dataset features is currently exposed in map or datasets pages. | Add per-layer attribute table, filtering, inline edit, and save-back workflow. |
    | 3D terrain and elevation visualization | Missing | Current map stack is 2D Leaflet-based without terrain/elevation modules (`frontend/src/components/GeoJsonMap.jsx`). | Add 3D terrain mode (elevation tiles/DEM), slope/height tools, and profile view. |
    | Data export in multiple formats | Partial | Geospatial export currently provides GeoJSON download/copy for sketches (`frontend/src/pages/Map.jsx`). | Add multi-format exports (e.g., SHP/KML/DXF/CSV/GeoPackage) and projection options. |
    | Support for standard geospatial formats | Partial | Platform natively stores GeoJSON (`backend/src/main/java/rw/venus/geosmartmanager/entity/DatasetEntity.java`, `backend/src/main/java/rw/venus/geosmartmanager/api/dto/DatasetDtos.java`), with shapefile conversion available via script (`frontend/scripts/convert-maps.mjs`). | Provide first-class runtime support for additional formats beyond GeoJSON. |
    | Cloud-based storage for large datasets | Missing | Datasets are persisted in relational DB text fields (`backend/src/main/resources/db/migration/V1__init.sql`, `backend/src/main/java/rw/venus/geosmartmanager/entity/DatasetEntity.java`). | Add object storage integration (cloud blob) with chunked uploads and lifecycle policies. |
    | Version control for spatial data | Missing | Dataset service currently supports create/list without version history or rollback (`backend/src/main/java/rw/venus/geosmartmanager/service/DatasetService.java`). | Add dataset revisions, diffs, rollback, and change metadata. |
    | Integration with Rwanda’s UPI and cadastral systems | Partial | UPI/cadastral awareness exists via dataset types and UPI analytics (`backend/src/main/java/rw/venus/geosmartmanager/domain/DatasetType.java`, `backend/src/main/java/rw/venus/geosmartmanager/service/GeoJsonService.java`, `frontend/src/pages/Datasets.jsx`). | Add direct integration to external UPI/cadastral registries and automated reconciliation. |
    | Real-time data synchronization across teams | Missing | No real-time sync channel (WebSocket/SSE) is implemented for geospatial edits/data propagation. | Add collaborative sync architecture with live layer updates and conflict handling. |

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
