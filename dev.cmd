@echo off
setlocal

REM Starts backend + frontend in separate terminals (Windows).

echo Starting GeoSmart-Manager...

pushd "%~dp0backend"
start "GeoSmart Backend" cmd /k mvn spring-boot:run
popd

pushd "%~dp0frontend"
start "GeoSmart Frontend" cmd /k npm.cmd run dev
popd

echo.
echo Backend:  http://localhost:8080
echo Swagger:  http://localhost:8080/swagger-ui/index.html
echo Frontend: http://localhost:5173
echo.
echo Default dev login: admin / Admin123!

