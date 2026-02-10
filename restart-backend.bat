@echo off
echo ====================================
echo Backend Restart Script
echo ====================================
echo.

cd /d D:\pro_test\backend

echo Stopping any running Node processes on port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    echo Killing process ID: %%a
    taskkill /PID %%a /F
)

echo.
echo Waiting 2 seconds...
timeout /t 2 /nobreak >nul

echo.
echo Starting backend server...
start "Backend Server" cmd /k "npm start"

echo.
echo ====================================
echo Backend restarted successfully!
echo Check the new window for logs.
echo ====================================
pause
