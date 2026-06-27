# GeoSmart Manager

GeoSmart Manager is a local demo system for preliminary land subdivision planning and zoning compliance in Kigali, Rwanda.

It helps users:

- search parcels by UPI;
- review zoning and parcel context;
- draw or upload proposed subdivision plots;
- run preliminary compliance checks;
- generate reports.

Important: this system does not replace official approval by the National Land Authority, District One Stop Centre, Irembo, or a licensed land surveyor.

## Project Structure

```text
frontend/                React + Vite client
backend/                 Spring Boot API
backend/ai_subdivision/  Optional FastAPI helper service
Requested Data/          Local GIS source data
```

## What You Need

- Java 17
- Node.js 18+ and npm
- PostgreSQL 15

The easiest local database setup is the included Docker Compose file.

## Quick Start

1. Start PostgreSQL:

```powershell
docker compose up -d
```

2. Start the backend:

```powershell
cd backend
run-backend.cmd
```

3. Start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

4. Open the app:

```text
http://localhost:5173
```

## Default Local Ports

- Frontend: `5173`
- Backend: `8080`
- PostgreSQL: `5432`
- Optional FastAPI service: `8000`

## Demo Accounts

The backend seeds demo users on startup.

Default password:

```text
GeoSmart@2026
```

Accounts:

- `badagaclass@gmail.com` - Admin
- `badagasteven6@gmail.com` - Land Surveyor
- `badagairankunda@gmail.com` - Client

Important local behavior:

- on backend startup, the demo seeder keeps the demo accounts and removes non-demo users;
- if you need persistent custom users, update or disable `backend/src/main/java/rw/venus/geosmartmanager/service/DemoUserSeeder.java`.

## Documentation

- [RUNNING.md](RUNNING.md) - full local run guide
- [DATA_ANALYSIS_REPORT.md](DATA_ANALYSIS_REPORT.md) - generated GIS data inspection report
- [backend/application-example.properties](backend/application-example.properties) - local configuration reference

## Optional Services

The main application can run with:

- PostgreSQL
- Spring Boot backend
- React frontend

The FastAPI service and GIS refresh scripts are optional unless you are working on the AI/data-processing side.

## Local Configuration

Backend defaults are already set for local development:

- database: `jdbc:postgresql://localhost:5432/geosmart`
- user: `geosmart`
- password: `geosmart`

Optional features you can configure later:

- SMTP email delivery
- Google Sign-In
- password reset URL base

See [backend/application-example.properties](backend/application-example.properties).

## Notes

- Backend health check: `http://localhost:8080/api/health`
- Frontend talks to `http://localhost:8080` by default
- Flyway migrations run automatically when the backend starts
- If you need to stop the backend cleanly from Command Prompt, use `backend\stop-backend.cmd`
