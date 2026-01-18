@echo off
setlocal

REM Resets the local file-based H2 database used by the backend (dev).
REM Stop the backend first (it can lock the DB files).

set "ROOT=%~dp0"
set "DATA_DIR=%ROOT%backend\data"

echo.
echo Resetting local H2 database...

if exist "%DATA_DIR%" (
  rmdir /s /q "%DATA_DIR%"
  echo Deleted: %DATA_DIR%
) else (
  echo No H2 data directory found: %DATA_DIR%
)

echo Done.

