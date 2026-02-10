@echo off
echo ========================================
echo Starting All Services
echo ========================================

REM Start Backend
start "Backend Server" cmd /k "cd backend && npm start"

REM Wait 5 seconds
timeout /t 5 /nobreak

REM Start Frontend (Main Dashboard)
start "Frontend Dashboard" cmd /k "cd frontend && npm start"

REM Start Admin Panel
start "Admin Panel" cmd /k "cd admin && npm install && npm start"

REM Start BIOS Panel
start "BIOS Panel" cmd /k "cd bios && npm install && npm start"

echo ========================================
echo All services started!
echo ========================================
echo Backend:   http://localhost:5000
echo Frontend:  http://localhost:3000
echo Admin:     http://localhost:3001
echo BIOS:      http://localhost:3002
echo ========================================
pause
