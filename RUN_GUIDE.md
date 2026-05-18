# GeoSmart Manager - Run Guide (Windows)

This project has three services:
1) **FastAPI AI Subdivision** (Python, port 8000)  
2) **Spring Boot API** (Java, port 8080)  
3) **React/Vite Frontend** (port 5173)

Follow the steps below from the repository root `C:\Users\Badaga\Desktop\Final year Project 25961\System`.

---

## 1) Start FastAPI AI Subdivision (port 8000)
The embedded Python lives in `backend\ai_subdivision\.python311`, so no global Python is required.

```powershell
cd backend/ai_subdivision
.\.python311\python.exe -m uvicorn main:app --reload --port 8000
```

Test:
- Swagger UI: http://127.0.0.1:8000/docs
- Health: http://127.0.0.1:8000/health

---

## 2) Start Spring Boot API (port 8080)
Requires Java 17+ and Maven.

```powershell
cd backend
mvn spring-boot:run
```

The backend will read default configuration from `src/main/resources/application.yml`.

If Maven complains about repository permissions, set a local repo path:
```powershell
mvn -Dmaven.repo.local=C:\Users\Badaga\.m2\repository spring-boot:run
```

---

## 3) Start React/Vite Frontend (port 5173)
Requires Node.js 18+ and npm.

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in the browser.

Environment:
- `VITE_API_URL` (default `http://localhost:8080`) points to the Spring Boot API.
- The Subdivision page has a “FastAPI Subdivision” panel that calls `http://localhost:8000/subdivide`.

---

## Recommended start order
1) FastAPI (port 8000)  
2) Spring Boot (port 8080)  
3) Vite frontend (port 5173)

---

## Quick sanity checks
- FastAPI: `curl http://127.0.0.1:8000/health`
- Spring Boot: `curl http://localhost:8080/api/projects` (after authentication, if required)
- Frontend: open http://localhost:5173 and run a subdivision from the Subdivision page.

---

## Troubleshooting
- **Port already in use**: stop other services or change `--port` for FastAPI / `server.port` for Spring.  
- **Maven repository access denied**: use `-Dmaven.repo.local=C:\Users\Badaga\.m2\repository`.  
- **FastAPI modules missing**: ensure you run with `.\.python311\python.exe`; all required packages are already installed there.  
- **Frontend can’t reach APIs**: confirm both backends are running and CORS is enabled (FastAPI allows `http://localhost:5173`).
