@echo off
REM Starts the backend (port 3000) and the React frontend (port 5173) in two windows.
start "Road2Role backend" cmd /k "cd /d %~dp0backend && npm start"
start "Road2Role frontend" cmd /k "cd /d %~dp0frontend && npm start"
timeout /t 6 >nul
start http://localhost:5173
