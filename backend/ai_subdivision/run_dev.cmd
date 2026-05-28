@echo off
setlocal

cd /d "%~dp0"

set "PORT=%~1"
if "%PORT%"=="" set "PORT=8000"

.\.python311\python.exe -m uvicorn main:app --reload --reload-dir . --reload-exclude=.python311/* --port %PORT%
