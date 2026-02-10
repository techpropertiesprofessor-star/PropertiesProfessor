#!/bin/bash

echo "========================================"
echo "Starting All Services"
echo "========================================"

# Start Backend
cd backend
npm start &
BACKEND_PID=$!

# Wait 5 seconds
sleep 5

# Start Frontend (Main Dashboard)
cd ../frontend
npm start &
FRONTEND_PID=$!

# Start Admin Panel
cd ../admin
npm install
npm start &
ADMIN_PID=$!

# Start BIOS Panel
cd ../bios
npm install
npm start &
BIOS_PID=$!

echo "========================================"
echo "All services started!"
echo "========================================"
echo "Backend:   http://localhost:5000"
echo "Frontend:  http://localhost:3000"
echo "Admin:     http://localhost:3001"
echo "BIOS:      http://localhost:3002"
echo "========================================"
echo "Press Ctrl+C to stop all services"

# Wait for all processes
wait $BACKEND_PID $FRONTEND_PID $ADMIN_PID $BIOS_PID
