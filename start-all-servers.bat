@echo off
echo ========================================
echo Starting All Services
echo ========================================
echo.

REM Start backend server on port 5000
start "Backend API (Port 5000)" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 3 /nobreak >nul

REM Start frontend server on port 3000
start "Main Dashboard (Port 3000)" cmd /k "cd /d %~dp0frontend && npm start"
timeout /t 2 /nobreak >nul

REM Start admin panel on port 3001
start "Admin Panel - Observability (Port 3001)" cmd /k "cd /d %~dp0admin && npm start"

echo.
echo ========================================
echo All services are starting!
echo ========================================
echo Backend API:     http://localhost:5000
echo Main Dashboard:  http://localhost:3000
echo Admin Panel:     http://localhost:3001
echo ========================================
pause
