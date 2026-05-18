# GeoSmart-Manager

AI-integrated geospatial ERP system for automated land subdivision and survey operations, aligned with Rwanda Land Management and Use Authority (RLMUA) standards and the National Master Plan.

## Impact Highlights
- Faster, fairer land delivery: automated parcel layouts cut review cycles from weeks to minutes.
- Built-in compliance: encodes RLMUA standards (min lot size, road width, setbacks) to reduce rework and disputes.
- Transparent decisions: repeatable efficiency scoring makes layouts explainable to communities and authorities.
- Housing & equity: scenario testing for affordable housing while keeping regulatory standards intact.
- Stronger local economy: compliant titled parcels reach the market sooner, expanding the tax base.
- Resilience & infrastructure: geospatial layers (flood, slope, utilities) help avoid risky areas and plan roads/utilities up front.
- Open collaboration: GeoJSON/API-first design lets NGOs, startups, and civic-tech apps plug in without format friction.

## Partner Organization
Venus Surveying and Engineering Ltd, Kigali, Rwanda

## Student
Irankunda Badaga Steven (ID: 25961)
Faculty of Computing and Information Sciences, AUCA, Kigali, Rwanda

## Objectives
- Automate land parcel subdivision using geospatial and AI techniques
- Integrate MIS workflows for surveying operations
- Ensure compliance with RLMUA standards and the National Master Plan
- Analyze cadastral and UPI data to support decision-making
- Improve accuracy and efficiency of survey operations
- Support real-world testing and validation

## Modules
- User Registration & Authentication
- Client & Project Management
- Geospatial Data Management
- AI Land Subdivision
- Regulatory Compliance
- Workflow & MIS Integration
- Reporting & Analytics
- Audit & Security

## Tech Stack
- Frontend: React (Vite) + Tailwind CSS
- Backend: Spring Boot
- Database: PostgreSQL
- Auth: JWT (access tokens)

## Quick Start
1. Start PostgreSQL
   - If you have Docker: `docker compose up -d`
   - If you have local PostgreSQL, ensure a user/database match `DB_USER`/`DB_PASSWORD` (defaults: `geosmart`/`geosmart`).
2. Backend
   - `cd backend`
   - `mvn spring-boot:run`
3. Frontend
   - `cd frontend`
   - `npm install`
   - `npm run dev`

Default API URL: `http://localhost:8080` (copy `frontend/.env.example` to `frontend/.env` to change).

## Google Sign-In (Optional)
To enable Google login on the sign-in page:
1. Create an OAuth Client ID in Google Cloud Console (type: Web application).
2. Add frontend origin(s), e.g. `http://localhost:5173`, in authorized JavaScript origins.
3. Configure backend with your client ID (frontend can auto-read it from backend).

Frontend (`frontend/.env`):
```
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Backend environment variable:
```
set GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Optional frontend override (`frontend/.env`):
```
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## Local PostgreSQL Setup (example)
If you are not using Docker, create a matching user/database:
```
psql -U postgres
CREATE USER geosmart WITH PASSWORD 'geosmart';
CREATE DATABASE geosmart OWNER geosmart;
```
Or set environment variables before running the backend:
```
set DB_USER=your_user
set DB_PASSWORD=your_password
set DB_URL=jdbc:postgresql://localhost:5432/your_db
```

## Sample Data
On first boot, the backend seeds demo clients, projects, datasets, subdivision runs, compliance checks, workflow tasks, and reports if the database is empty.
If you already seeded data and want Rwanda-based sample geometry, clear the `clients` table and restart the backend.

## Demo Accounts
The backend now ensures stable demo user accounts on every startup. Missing demo accounts are created automatically and existing demo accounts keep their current password while being refreshed to active status with the expected role.

Default password when the demo account is first created:
`GeoSmart@2026`

- `admin@geomart.rw` - `ADMIN`
- `manager@geomart.rw` - `PROJECT_MANAGER`
- `surveyor@geomart.rw` - `SURVEYOR`
- `engineer@geomart.rw` - `ENGINEER`
- `civil@geomart.rw` - `CIVIL_ENGINEER`
- `client@geomart.rw` - `CLIENT`

If a user forgets the password, use the `Forgot password?` flow on the sign-in page.

## Forgot Password Email Setup
Password reset emails are sent by the backend through SMTP. For Gmail, use an app password rather than your normal account password.

Windows example:
```powershell
set MAIL_HOST=smtp.gmail.com
set MAIL_PORT=587
set MAIL_USERNAME=youraddress@gmail.com
set MAIL_PASSWORD=your-16-char-app-password
set APP_MAIL_FROM_ADDRESS=youraddress@gmail.com
set APP_AUTH_PASSWORD_RESET_URL_BASE=http://localhost:5173/reset-password
```

Then start the backend normally. The login page now supports:
- requesting a reset link from `/forgot-password`
- opening the emailed link on `/reset-password?token=...`
- changing the password and revoking old sessions automatically

## Map Visualization
Use the `Map` page to preview dataset polygons or subdivision results on a Rwanda-centered basemap. Professional survey tools include draw/edit polygons and lines, snapping, buffering, parcel labels, coordinate readout, UTM grid (35S/36S), and GeoJSON export. Rwanda administrative layers and roads can be uploaded and styled via `properties.type` or `properties.admin_level` (e.g., district, sector, cell, village) and `properties.road_class` or `properties.highway`.

## Convert Rwanda Shapefiles (maps/)
If you have Rwanda boundary shapefiles in `maps/`, convert them to GeoJSON:
```
cd frontend
cmd /c npm install
cmd /c npm run convert:maps
```
Outputs will be written to `maps_geojson/` (preserving folder names). Upload those GeoJSON files as `ADMIN_BOUNDARY` datasets.

### Auto-upload after conversion
You can auto-upload the **simplified** GeoJSON to a project:
```
cmd /c npm run convert:maps -- --upload --project-id 1 --token YOUR_JWT --api http://localhost:8080
```
Options:
- `--no-simplify` to skip simplification
- `--tolerance 0.0005` to tune simplification (smaller = more detail)
- `--high-quality` for better shape preservation (slower)

You can also set env vars:
```
set GEO_SMART_TOKEN=YOUR_JWT
set GEO_SMART_API=http://localhost:8080
```

## Sample GeoJSON (Kigali)
Use a Kigali-area polygon to test subdivision:
```
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "upi": "RW-UPI-0001" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[30.040,-1.970],[30.040,-1.940],[30.080,-1.940],[30.080,-1.970],[30.040,-1.970]]]
      }
    }
  ]
}
```

## Report PDF Export
Reports can be downloaded as PDFs from the `Reports` page using **Download PDF**.
Backend endpoint: `GET /api/projects/{projectId}/reports/{reportId}/pdf`
