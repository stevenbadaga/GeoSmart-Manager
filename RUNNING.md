# Running GeoSmart Manager

This guide provides the essential steps to run the system and the Gemini CLI assistant.

## 1. Prerequisites
Ensure you have the following installed:
- **Java 21 or 17** (for the backend)
- **Node.js 18+** (for the frontend)
- **Docker Desktop** (optional, for PostgreSQL)

---

## 2. Start the System

### Step 1: Database (Optional)
By default, the system uses a local SQLite database (`backend/data/geosmart_main.sqlite`). If you prefer PostgreSQL, start it from the project root:
```powershell
docker compose up -d
```

### Step 2: Backend
Open a new terminal:
```powershell
cd backend
.\run-backend.cmd
```
*Wait for "Started GeoSmartManagerApplication" in the logs.*
*Health check: http://localhost:8080/api/health*

### Step 3: Frontend
Open a new terminal:
```powershell
cd frontend
npm install
npm run dev
```
*Access the app: http://localhost:5173*

---

## 3. Running Gemini CLI
To start the Gemini CLI assistant for this project, run the following command in the project root:

```powershell
gemini
```
*Note: Ensure your `GEMINI_API_KEY` is set in your environment variables.*

---

## 4. Default Login
- **Username:** `badagaclass@gmail.com`
- **Password:** `GeoSmart@2026`

---

## 5. Troubleshooting
- **Connection Refused:** Ensure the backend is running on port 8080. If it fails to start, check `backend/backend-live.err.log`.
- **Database Errors:** If migrations fail, you can delete `backend/data/geosmart_main.sqlite` and restart the backend to recreate it.
