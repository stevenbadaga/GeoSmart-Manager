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
  - Detailed requirement coverage (2026-03-11):

    | Requirement | Status | Current implementation evidence | Gap to close |
    |---|---|---|---|
    | Subdivision planning canvas with drag-and-drop parcel creation | Partial | A map drawing canvas exists in map workspace via Leaflet Draw (`frontend/src/components/GeoJsonMap.jsx`) but not embedded in subdivision page workflow (`frontend/src/pages/Subdivision.jsx`). | Integrate interactive planning canvas directly into subdivision module and bind it to runs. |
    | AI suggestion panel for optimal parcel layout | Implemented | Subdivision page includes AI decision summary, explanation scores, and recommendation text (`frontend/src/pages/Subdivision.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/api/dto/SubdivisionDtos.java`, `backend/src/main/java/rw/venus/geosmartmanager/service/SubdivisionService.java`). | Optional: add alternative layout suggestions with ranked tradeoffs. |
    | Parameter input (min/max size, road access, slope constraints) | Missing | Current run request supports only `datasetId`, `parcelCount`, and `optimizationMode` (`backend/src/main/java/rw/venus/geosmartmanager/api/dto/SubdivisionDtos.java`, `frontend/src/pages/Subdivision.jsx`). | Add user-configurable constraints (size bounds, road frontage targets, slope/elevation limits). |
    | Visualization of subdivision results with dimensions and area | Partial | UI shows parcel count, average area, quality score, and raw GeoJSON output (`frontend/src/pages/Subdivision.jsx`). | Add map-based dimensions/labels per parcel and richer geometry metrics visualization. |
    | Manual adjustment and override tools | Partial | Manual geometry editing tools exist in general map component (`frontend/src/components/GeoJsonMap.jsx`), but subdivision runs themselves are not directly editable/overridable in module flow (`frontend/src/pages/Subdivision.jsx`). | Add run-level edit/override operations and persist adjusted outputs as new revisions. |
    | Conflict detection and resolution interface | Missing | No dedicated conflict UI for overlaps/access violations in subdivision page; compliance is a separate module (`frontend/src/pages/Subdivision.jsx`, `frontend/src/pages/Compliance.jsx`). | Add inline conflict detection and guided resolution actions within subdivision workflow. |
    | Subdivision history and version comparison | Partial | Run history list is available (`frontend/src/pages/Subdivision.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/api/controller/SubdivisionController.java`). | Add side-by-side version comparison (geometry delta, metrics delta, decision rationale changes). |
    | Machine learning-based parcel optimization | Missing | Current generation is deterministic grid/row-column splitting from bounding box and mode heuristics (`backend/src/main/java/rw/venus/geosmartmanager/service/SubdivisionService.java`). | Introduce actual ML-driven optimization model/pipeline and model lifecycle management. |
    | Compliance-aware subdivision algorithms | Partial | Compliance readiness scoring is computed in subdivision explanation, and formal compliance checks exist (`backend/src/main/java/rw/venus/geosmartmanager/service/SubdivisionService.java`, `backend/src/main/java/rw/venus/geosmartmanager/service/ComplianceService.java`). | Embed compliance constraints directly during subdivision generation, not only post-run evaluation. |
    | Integration with local zoning and planning rules | Partial | Compliance checks include Rwanda bounds and master-plan boundary logic with configurable thresholds (`backend/src/main/resources/application.yml`, `backend/src/main/java/rw/venus/geosmartmanager/service/ComplianceService.java`). | Expand zoning rule coverage and integrate zoning datasets/rule engine into subdivision generation decisions. |
    | Automated calculation of parcel metrics | Implemented | System computes average area, compactness-derived quality score, and AI explanation metrics automatically (`backend/src/main/java/rw/venus/geosmartmanager/service/SubdivisionService.java`). | Optional: expose additional parcel-level metrics (frontage, depth, adjacency). |
    | Support for complex topography and irregular shapes | Missing | Subdivision currently parses a bounding box and generates regular rectangular parcels (`parseBoundingBox`, `buildSubdivisionGeoJson`) without terrain/slope integration (`backend/src/main/java/rw/venus/geosmartmanager/service/SubdivisionService.java`). | Add topology-aware geometry engine for irregular boundaries, obstacles, and elevation constraints. |

- Regulatory Compliance Module
  - Rule-based compliance checks, Rwanda bounds, and Master Plan boundary check (if provided)
  - API: /api/projects/{projectId}/compliance/check
  - Files: backend/src/main/java/rw/venus/geosmartmanager/service/ComplianceService.java
  - UI: frontend/src/pages/Compliance.jsx
  - Detailed requirement coverage (2026-03-11):

    | Requirement | Status | Current implementation evidence | Gap to close |
    |---|---|---|---|
    | Compliance checklist aligned with RLMUA standards | Partial | Compliance page provides checklist-style guidance, and backend enforces configured thresholds (parcel area, count, aspect ratio, Rwanda bounds, master-plan boundary) (`frontend/src/pages/Compliance.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/service/ComplianceService.java`, `backend/src/main/resources/application.yml`). | Add clause-by-clause checklist mapped directly to official RLMUA standard references. |
    | Automated validation results panel (pass/fail with details) | Implemented | Validation run returns `PASS/WARN/FAIL` with rule-level details, and UI displays history cards with structured findings (`frontend/src/pages/Compliance.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/api/dto/ComplianceDtos.java`). | Optional: add severity scoring/weighting per rule for prioritization. |
    | Reference to specific clauses and regulations | Implemented | Compliance rules now include clause references and are shown in API/UI per rule result (`backend/src/main/java/rw/venus/geosmartmanager/service/ComplianceService.java`, `frontend/src/pages/Compliance.jsx`). | Add external links to official published regulation documents per clause. |
    | Non-compliance highlighting and suggestions | Implemented | Rule results now expose status + remediation suggestion and UI highlights non-compliant rules (`frontend/src/pages/Compliance.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/service/ComplianceService.java`). | Optional: add one-click remediation task creation from each failed rule. |
    | Submission package generator for regulatory approval | Implemented | Submission package endpoint and UI generator are implemented for selected compliance checks (`backend/src/main/java/rw/venus/geosmartmanager/api/controller/ComplianceController.java`, `frontend/src/pages/Compliance.jsx`). | Optional: add signed ZIP bundle with maps/documents instead of JSON package only. |
    | Compliance certificate and report templates | Implemented | Compliance certificate template endpoint/UI plus existing compliance report generation are available (`backend/src/main/java/rw/venus/geosmartmanager/api/controller/ComplianceController.java`, `frontend/src/pages/Compliance.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/service/ReportService.java`). | Optional: add regulator-branded template variants and e-signature fields. |
    | Update tracker for regulatory changes | Implemented | Regulatory update tracker is now served from configuration and rendered in compliance UI (`backend/src/main/java/rw/venus/geosmartmanager/config/AppProperties.java`, `backend/src/main/resources/application.yml`, `frontend/src/pages/Compliance.jsx`). | Add admin UI for managing updates without editing config files. |
    | Real-time compliance checking during design | Partial | Subdivision workflow now includes a live compliance monitor with auto-validation and periodic refresh via `/compliance/live/{subdivisionRunId}` (`frontend/src/pages/Subdivision.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/api/controller/ComplianceController.java`, `backend/src/main/java/rw/venus/geosmartmanager/service/ComplianceService.java`). | Extend live checks to map-edit/design-canvas events (not only subdivision run outputs). |
    | Integration with national planning databases | Missing | Master plan input is project dataset upload, not direct external database integration (`backend/src/main/java/rw/venus/geosmartmanager/service/ComplianceService.java`). | Add connectors to national planning/cadastral APIs with sync and reconciliation. |
    | Automated reporting for regulatory submissions | Partial | Report generation supports `COMPLIANCE` outputs and PDF download (`frontend/src/pages/Reports.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/api/controller/ReportController.java`). | Add submission-ready regulator packet formats and auto-routing workflow. |
    | Audit trail for compliance decisions | Implemented | Running compliance checks writes audit events, and logs are queryable with integrity verification (`backend/src/main/java/rw/venus/geosmartmanager/service/ComplianceService.java`, `backend/src/main/java/rw/venus/geosmartmanager/service/AuditService.java`, `frontend/src/pages/Audit.jsx`). | Optional: include rule-level decision traces in audit details. |
    | Support for local and national planning frameworks | Partial | Rwanda boundary and master-plan boundary checks are supported with configurable thresholds (`backend/src/main/java/rw/venus/geosmartmanager/service/ComplianceService.java`, `backend/src/main/resources/application.yml`). | Broaden framework coverage beyond current heuristic checks and map to formal policy catalogs. |

- Workflow & MIS Integration Module
  - Task management
  - API: /api/projects/{projectId}/tasks, /api/tasks/{taskId}/status
  - Files: backend/src/main/java/rw/venus/geosmartmanager/service/WorkflowTaskService.java
  - UI: frontend/src/pages/Workflow.jsx
  - Detailed requirement coverage (2026-03-11):

    | Requirement | Status | Current implementation evidence | Gap to close |
    |---|---|---|---|
    | Visual workflow builder for surveying processes | Missing | Workflow UI is a fixed Kanban task board; no process designer/builder canvas is present (`frontend/src/pages/Workflow.jsx`). | Add configurable workflow designer with stages, transitions, and process templates. |
    | Task assignment and progress tracking board | Implemented | Tasks can be created, assigned by email, moved across `TODO/IN_PROGRESS/DONE`, and tracked with completion metrics (`frontend/src/pages/Workflow.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/service/WorkflowTaskService.java`). | Optional: add swimlanes by assignee/team and dependency visualization. |
    | Resource allocation dashboard (equipment, personnel) | Missing | Current workflow task model has no equipment/personnel allocation entities beyond `assigneeEmail` (`backend/src/main/java/rw/venus/geosmartmanager/entity/WorkflowTaskEntity.java`). | Add resource registry, allocation timeline, and conflict alerts. |
    | Timesheet and field log integration | Missing | No timesheet or field-log tables/endpoints/UI are implemented in current schema/modules (`backend/src/main/resources/db/migration/V1__init.sql`). | Add timesheet/field-log domain with approval and project linkage. |
    | Expense tracking and approval workflows | Missing | No expense or approval workflow entities/services/endpoints were found. | Add expense claims, approval states, and audit-linked approvals. |
    | Integration panel with existing ERP/accounting systems | Missing | No ERP/accounting connectors or integration settings panel exists in frontend/backend modules. | Add integration config UI and connector services/webhooks. |
    | Mobile field data sync interface | Partial | App shows online/offline presence notices and heartbeat-based status updates (`frontend/src/auth/AuthContext.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/api/controller/UserController.java`). | Add dedicated field sync queue UI for offline records and conflict resolution. |
    | Streamlined operational workflows | Partial | Core workflow operations (task create/list/status) are implemented and linked to projects (`frontend/src/pages/Workflow.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/api/controller/WorkflowController.java`). | Expand beyond basic task flow to full operational process orchestration. |
    | Real-time field-to-office data flow | Partial | Dashboard refreshes live metrics/events on interval and focus events; presence is heartbeat-based (`frontend/src/pages/Dashboard.jsx`, `frontend/src/auth/AuthContext.jsx`). | Add true real-time sync (WebSocket/SSE) for field updates and task state propagation. |
    | Equipment utilization tracking | Missing | No equipment entity, telemetry, or utilization reporting exists in schema/services/UI. | Add equipment inventory, assignment logs, and utilization analytics. |
    | Automated reporting for management | Partial | Management dashboards and generated reports are available (`frontend/src/pages/Dashboard.jsx`, `frontend/src/pages/Reports.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/service/ReportService.java`). | Add scheduled and policy-driven management report automation. |
    | Integration with financial and HR systems | Missing | No HR/finance integration APIs, sync jobs, or adapter layer found. | Add external system adapters and mapping workflows. |

- Reporting & Analytics Module
  - Report generation (survey, subdivision, compliance) + PDF export + dataset analytics
  - API: /api/projects/{projectId}/reports/generate
  - Files: backend/src/main/java/rw/venus/geosmartmanager/service/ReportService.java
  - PDF: GET /api/projects/{projectId}/reports/{reportId}/pdf
  - UI: frontend/src/pages/Reports.jsx, frontend/src/pages/Dashboard.jsx
  - Detailed requirement coverage (2026-03-11):

    | Requirement | Status | Current implementation evidence | Gap to close |
    |---|---|---|---|
    | Dashboard with project, financial, and operational KPIs | Partial | Dashboard provides project/operations/system KPIs (projects, users, alerts, storage, workload, server load), but no financial KPIs (`frontend/src/pages/Dashboard.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/service/MetricsService.java`). | Add finance KPIs (revenue, invoice aging, budget burn, margin). |
    | Interactive charts for survey accuracy, project duration, cost | Missing | UI currently uses metric cards and progress bars, not interactive analytical chart components. | Add chart-driven analytics for accuracy, duration, cost, and trend drilldowns. |
    | Geospatial analytics (land use, parcel distribution, accessibility) | Partial | Dataset analytics expose area/centroid/bounds/polygon/UPI metrics (`backend/src/main/java/rw/venus/geosmartmanager/service/DatasetAnalysisService.java`, `frontend/src/pages/Datasets.jsx`). | Add richer geospatial analytics views (land-use classification, accessibility surfaces, parcel distribution maps). |
    | Custom report builder with map and data integration | Missing | Report generation supports predefined types only (`SURVEY`, `SUBDIVISION`, `COMPLIANCE`, `PROJECT_SUMMARY`) (`frontend/src/pages/Reports.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/api/dto/ReportDtos.java`). | Add configurable report templates with selectable map/data sections. |
    | Scheduled report generation and distribution | Missing | Reports are generated manually from UI; no scheduler/distribution mechanism is implemented. | Add scheduler, recipient lists, and distribution channels with delivery logs. |
    | Export to PDF, Excel, GeoPDF | Partial | PDF export is implemented; Excel and GeoPDF export flows are absent (`frontend/src/pages/Reports.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/service/ReportService.java`). | Add XLSX/CSV and GeoPDF exporters with projection-aware map embeds. |
    | Client-facing report portal | Partial | `CLIENT` role can list and download reports through role-guarded endpoints (`backend/src/main/java/rw/venus/geosmartmanager/api/controller/ReportController.java`), but there is no dedicated client portal UX. | Add standalone client report portal with scoped access and approval flow. |
    | Business intelligence for surveying operations | Partial | Operations metrics and report summaries are available (`frontend/src/pages/Dashboard.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/api/controller/MetricsController.java`). | Add BI-grade slicing, trends, cohorting, and comparative analysis tools. |
    | Geospatial analytics for decision support | Partial | Geospatial dataset analysis is implemented and exposed through API/UI (`backend/src/main/java/rw/venus/geosmartmanager/service/DatasetAnalysisService.java`, `frontend/src/pages/Datasets.jsx`). | Integrate analytics outputs into decision dashboards and reporting workflows. |
    | Automated report generation for stakeholders | Partial | Report creation is automated once triggered, but triggering and distribution are manual (`frontend/src/pages/Reports.jsx`). | Add event-driven and scheduled stakeholder report automation. |
    | Benchmarking against industry standards | Missing | No benchmarking model, reference datasets, or standard-comparison dashboards found. | Add benchmark catalogs and variance analysis against accepted standards. |
    | Integration with business intelligence tools | Missing | No connectors for external BI tools (Power BI/Tableau/etc.) were found. | Add export/connect APIs and secure BI integration adapters. |

- Audit & Security Module
  - Audit logging with hash chain + integrity verification
  - API: /api/audit, /api/audit/verify
  - Files: backend/src/main/java/rw/venus/geosmartmanager/service/AuditService.java
  - UI: frontend/src/pages/Audit.jsx
  - Detailed requirement coverage (2026-03-11):

    | Requirement | Status | Current implementation evidence | Gap to close |
    |---|---|---|---|
    | Comprehensive audit log with spatial and transactional data | Partial | Comprehensive transactional audit logging exists for key actions, but no parcel-level spatial activity metadata is stored (`backend/src/main/java/rw/venus/geosmartmanager/service/AuditService.java`, `frontend/src/pages/Audit.jsx`). | Extend audit schema with spatial context (dataset ID, geometry/parcel refs, coordinate envelope). |
    | User activity map (who accessed/modified which parcel) | Missing | No geospatial user activity map UI or backend endpoint is present. | Add parcel-level access/edit telemetry and map visualization. |
    | Data integrity verification tools | Implemented | Hash-chain integrity verification endpoint and UI action are implemented (`backend/src/main/java/rw/venus/geosmartmanager/api/controller/AuditController.java`, `frontend/src/pages/Audit.jsx`). | Optional: add scheduled integrity checks with alerting on failures. |
    | Backup and restore management for geospatial data | Missing | No backup/restore controls or recovery workflow are exposed in current modules. | Add backup policies, restore jobs, and verification dashboard. |
    | Security policy configuration | Partial | Role-permission visibility exists in `Permissions` page and role checks are enforced in backend controllers (`frontend/src/pages/Permissions.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/api/controller/*Controller.java`). | Add editable policy management (password/MFA/session/retention/IP rules) with governance workflow. |
    | Incident reporting and resolution panel | Missing | No incident ticketing/response UI or backend incident domain was found. | Add security incident lifecycle tracking and resolution workflows. |
    | Compliance audit reporting | Partial | Compliance reports and audit logs can be generated/viewed (`frontend/src/pages/Reports.jsx`, `frontend/src/pages/Audit.jsx`). | Add dedicated compliance-audit report templates and evidence package exports. |
    | Tamper-evident logging of all geospatial edits | Partial | Audit hash chain is tamper-evident, but not all geospatial edits are explicitly captured with parcel-level detail (`backend/src/main/java/rw/venus/geosmartmanager/service/AuditService.java`). | Enforce mandatory logging hooks on every geospatial edit operation. |
    | Secure, encrypted storage for sensitive land data | Missing | Auth uses JWT/BCrypt, but geospatial payloads are stored as plain text fields and no explicit at-rest encryption policy is configured (`backend/src/main/resources/db/migration/V1__init.sql`, `backend/src/main/java/rw/venus/geosmartmanager/entity/DatasetEntity.java`). | Add encryption-at-rest/key management and sensitive-field protection controls. |
    | Regular security and compliance audits | Partial | Manual integrity verification and compliance check runs are available (`frontend/src/pages/Audit.jsx`, `frontend/src/pages/Compliance.jsx`). | Add scheduled recurring audits, policy checks, and alert automation. |
    | Disaster recovery and business continuity planning | Missing | No DR/BCP runbooks, failover automation, or recovery SLA tooling is represented in code/config. | Implement DR plans, tested restore procedures, and continuity monitoring. |
    | Support for legal and regulatory audits | Partial | Audit logs plus compliance/report outputs provide baseline evidence for audits (`backend/src/main/java/rw/venus/geosmartmanager/api/controller/AuditController.java`, `backend/src/main/java/rw/venus/geosmartmanager/api/controller/ReportController.java`). | Add legal-hold workflows, evidence packaging, and immutable archival options. |

- Field Survey & Mobile Integration Module
  - Responsive app shell + task/map modules, with online/offline presence handling
  - Files: frontend/src/components/AppShell.jsx, frontend/src/pages/Workflow.jsx, frontend/src/pages/Map.jsx, frontend/src/auth/AuthContext.jsx
  - Detailed requirement coverage (2026-03-11):

    | Requirement | Status | Current implementation evidence | Gap to close |
    |---|---|---|---|
    | Mobile-responsive field data collection forms | Partial | Core app shell and pages are responsive, and task/project/data forms work on mobile layouts (`frontend/src/components/AppShell.jsx`, `frontend/src/components/Sidebar.jsx`, `frontend/src/pages/Workflow.jsx`). | Add dedicated field data collection forms optimized for mobile surveying workflows. |
    | GPS and sensor integration interface | Missing | No GPS/sensor interface or device API integration UI is present. | Add GNSS/sensor capture interfaces and validation tools. |
    | Offline data collection with sync capability | Partial | Online/offline detection and presence notices exist, with reconnection handling (`frontend/src/auth/AuthContext.jsx`). | Add offline-first storage/queue and sync conflict resolution for collected field records. |
    | Field photo and note attachment | Missing | No field photo/note attachment UI or backend storage model exists. | Add media/note capture linked to tasks, parcels, and survey sessions. |
    | Survey validation and error checking in real-time | Partial | Validation engines exist (compliance checks, dataset analytics), but are not integrated as real-time mobile field validators (`frontend/src/pages/Compliance.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/service/ComplianceService.java`). | Add inline field validation during data capture with immediate error feedback. |
    | Task list and navigation for field crews | Partial | Workflow task board and map workspace provide task visibility and location context (`frontend/src/pages/Workflow.jsx`, `frontend/src/pages/Map.jsx`). | Add field-crew mode with route/navigation guidance and prioritized daily task packs. |
    | Equipment calibration and log | Missing | No calibration/log model or UI exists in current modules. | Add calibration records, reminders, and compliance logs for survey equipment. |
    | Real-time field data integration | Missing | No real-time field data ingest pipeline (WebSocket/SSE/device stream) is implemented. | Add live field ingest and instant office-side visibility. |
    | Support for RTK GPS and total stations | Missing | No RTK/total-station protocol or connector layer is present. | Implement hardware adapters and standardized observation import pipeline. |
    | Automated data quality checks | Partial | Automated checks exist for compliance and dataset metrics once data is uploaded/run (`backend/src/main/java/rw/venus/geosmartmanager/service/ComplianceService.java`, `backend/src/main/java/rw/venus/geosmartmanager/service/DatasetAnalysisService.java`). | Add field-stage automated quality checks before submission/sync. |
    | Offline functionality for remote areas | Partial | App detects offline state and preserves session context cues (`frontend/src/auth/AuthContext.jsx`). | Add resilient offline CRUD and delayed sync for remote field operations. |
    | Integration with surveying hardware | Missing | No surveying hardware integration endpoints/services were found. | Add hardware integration SDK layer and device management module. |

- Collaboration & Stakeholder Portal
  - Role-based shared access to projects/reports/compliance data
  - Files: frontend/src/App.jsx, frontend/src/pages/Projects.jsx, backend/src/main/java/rw/venus/geosmartmanager/api/controller/ProjectController.java
  - Detailed requirement coverage (2026-03-11):

    | Requirement | Status | Current implementation evidence | Gap to close |
    |---|---|---|---|
    | Shared project workspace with commenting and markup tools | Missing | No comments/markup entities, APIs, or UI components are present in current project/workflow pages. | Add threaded comments, map/document markup, and @mentions with audit history. |
    | Client review and approval interface | Partial | `CLIENT` role has read access to project/report/compliance outputs (`backend/src/main/java/rw/venus/geosmartmanager/api/controller/ProjectController.java`, `backend/src/main/java/rw/venus/geosmartmanager/api/controller/ReportController.java`). | Add explicit review/approval actions, decision capture, and approval state transitions. |
    | Regulatory authority access for review and feedback | Missing | No regulator role/access model or feedback workflow is defined in role matrix/controllers (`frontend/src/pages/Permissions.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/domain/Role.java`). | Add regulator portal role and structured feedback/response workflow. |
    | Public consultation portal (for required projects) | Missing | No public-facing consultation route/module exists in frontend/backend. | Add public consultation portal with moderation, publish controls, and response logging. |
    | Document sharing and version control | Missing | No document repository/versioning model exists in schema/services (`backend/src/main/resources/db/migration/V1__init.sql`). | Add document workspace with version history, permissions, and diff tracking. |
    | Meeting scheduler and minute logging | Missing | No meeting scheduling/minute logging entities or UI components were found. | Add scheduler integration, meeting records, and action-item tracking. |
    | Notification center for updates and approvals | Missing | No notification center exists; current notices are connectivity-related only (`frontend/src/auth/AuthContext.jsx`). | Add event notification center (in-app/email/SMS) with preferences and delivery logs. |
    | Secure collaboration across organizations | Partial | RBAC and authenticated APIs enable controlled multi-role access (`backend/src/main/java/rw/venus/geosmartmanager/config/SecurityConfig.java`, `frontend/src/pages/Permissions.jsx`). | Add tenant/project-level isolation and partner-organization collaboration governance. |
    | Streamlined approval workflows | Partial | Workflow tasks and status transitions exist, but no formal stakeholder approval engine is implemented (`frontend/src/pages/Workflow.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/service/WorkflowTaskService.java`). | Add approval pipelines, SLA timers, escalations, and decision audit schema. |
    | Transparent stakeholder engagement | Missing | No dedicated stakeholder communication portal, public feedback, or decision timeline UI is implemented. | Add engagement dashboards, consultation timelines, and visibility controls. |
    | Historical record of consultations and decisions | Partial | Audit logs provide system action history (`frontend/src/pages/Audit.jsx`, `backend/src/main/java/rw/venus/geosmartmanager/service/AuditService.java`). | Add consultation-specific history (comments, meeting minutes, approvals, responses). |
    | Integration with email and notification systems | Missing | No outbound email/notification integration services/configuration are implemented. | Add notification providers and workflow-triggered messaging integrations. |

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
