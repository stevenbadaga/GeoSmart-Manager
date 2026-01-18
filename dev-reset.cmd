@echo off
setlocal

REM Resets the local H2 DB then starts backend + frontend.

call "%~dp0reset-h2.cmd"
call "%~dp0dev.cmd"

