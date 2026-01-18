@echo off
setlocal

REM Starts PostGIS + backend + frontend in separate terminals (Windows).

echo Starting GeoSmart-Manager (PostgreSQL/PostGIS)...

pushd "%~dp0"
start "GeoSmart PostGIS" cmd /k docker compose up -d db
popd

pushd "%~dp0backend"
start "GeoSmart Backend (Postgres)" cmd /k set SPRING_PROFILES_ACTIVE=postgres ^&^& mvn spring-boot:run
popd

pushd "%~dp0frontend"
start "GeoSmart Frontend" cmd /k npm.cmd run dev
popd

echo.
echo PostGIS:   localhost:5432 (db=geosmart user=geosmart pass=geosmart)
echo Backend:   http://localhost:8080
echo Swagger:   http://localhost:8080/swagger-ui/index.html
echo Frontend:  http://localhost:5173
echo.
echo Default dev login: admin / Admin123!

