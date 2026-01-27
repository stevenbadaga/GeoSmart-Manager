# GeoSmart-Manager (Final Year Project 25961)

GeoSmart-Manager is an AI-integrated geospatial ERP system for surveying and engineering companies to automate land subdivision and survey operations (MIS + AI + geospatial workflows).

## Tech stack
- Frontend: React (Vite) + Tailwind CSS (JSX)
- Backend: Java 17 + Spring Boot (REST, JWT auth)
- DB: H2 (dev) + PostgreSQL/PostGIS (recommended)
- Migrations: Flyway

## Quick start (dev)
### One command (Windows)
Run `dev.cmd` from the repo root to start both backend + frontend.

If you want PostgreSQL/PostGIS locally (recommended), run `dev-postgres.cmd` instead (requires Docker).

If the backend fails with a Flyway validation error (failed migration), run `dev-reset.cmd` once to reset the local H2 database.

### 1) Start backend (Spring Boot)
```bash
cd backend
mvn spring-boot:run
```

Backend runs on `http://localhost:8080`.

Default dev admin:
- Username: `admin`
- Password: `Admin123!`

### 2) Start frontend (React)
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

If PowerShell blocks `npm` scripts on your machine, use:
```bash
npm.cmd install
npm.cmd run dev
```

## PostgreSQL/PostGIS (recommended)
If you have Docker installed, start PostGIS locally:
```bash
docker compose up -d db
```

Then run the backend with the Postgres profile:
- PowerShell:
```bash
$env:SPRING_PROFILES_ACTIVE="postgres"
mvn -f backend/pom.xml spring-boot:run
```
- CMD:
```bash
set SPRING_PROFILES_ACTIVE=postgres
mvn -f backend/pom.xml spring-boot:run
```

## Notes
- If the backend fails with `FlywayValidateException` and mentions a failed migration, delete `backend/data/` (or run `reset-h2.cmd`) and start again.

## Demo flow (end-to-end)
1. Create a Client
2. Create a Project
3. (Optional) In Workflow: create/assign tasks
4. In Map Workspace: upload a cadastral GeoJSON file
5. Run AI Subdivision
6. Run Compliance Check
7. Generate a PDF report and download it
8. In Field Survey: capture a GPS observation + equipment log
9. In Collaboration: post messages, request approvals, schedule meetings, and view notifications

Sample GeoJSON you can upload:
- `sample-data/kigali-sample-boundary.geojson`

## Docs
- Requirements: `Docs/Requirements 25961.docx`
