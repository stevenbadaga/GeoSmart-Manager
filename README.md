# GeoSmart-Manager (Final Year Project 25961)

GeoSmart-Manager is an AI-integrated geospatial ERP system prototype for surveying and engineering companies to automate land subdivision and survey operations (MIS + AI + geospatial workflows).

## Tech stack
- Frontend: React (Vite) + Tailwind CSS (JSX)
- Backend: Java 17 + Spring Boot (REST, JWT auth)
- DB (dev): H2 (file-based). Tests use in-memory H2.

## Quick start (dev)
### One command (Windows)
Run `dev.cmd` from the repo root to start both backend + frontend.

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

## Demo flow (for prototype)
1. Create a Client
2. Create a Project
3. (Optional) In Workflow: create/assign tasks
4. In Map Workspace: upload a cadastral GeoJSON file
5. Run AI Subdivision
6. Run Compliance Check
7. Generate a PDF report and download it

Sample GeoJSON you can upload:
- `sample-data/kigali-sample-boundary.geojson`

## Docs
- Requirements: `Docs/Requirements 25961.docx`
