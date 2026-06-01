@echo off
setlocal

cd /d "%~dp0\..\.."

set "MMGH_K6_DATA_DIR=%CD%\.k6-backend-data"
set "MMGH_K6_RESET=1"

if exist "%MMGH_K6_DATA_DIR%" (
  rmdir /s /q "%MMGH_K6_DATA_DIR%"
)

"%CD%\src-tauri\target\debug\k6_backend_harness.exe" > "%CD%\k6-harness.out.log" 2> "%CD%\k6-harness.err.log"
