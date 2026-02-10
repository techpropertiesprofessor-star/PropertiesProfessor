#!/bin/bash

# Kill any existing node processes
pkill -9 node 2>/dev/null || true
sleep 2

# Start backend in background
cd /Users/rudraraut/Desktop/pro_test/backend
PORT=5001 npm run dev &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID) on port 5001"

# Wait for backend to start
sleep 4

# Start frontend in background (explicitly on 3000)
cd /Users/rudraraut/Desktop/pro_test/frontend
HOST=0.0.0.0 PORT=3000 npm start &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID) on port 3000"

# Wait for frontend to start
sleep 6

# Open browsers
echo "Opening browsers..."
DEFAULT_IFACE=$(route -n get default 2>/dev/null | awk '/interface: /{print $2}')
LOCAL_IP=$(ipconfig getifaddr "$DEFAULT_IFACE" 2>/dev/null)
if [ -z "$LOCAL_IP" ]; then
	# Fallbacks for common interfaces
	LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || ipconfig getifaddr en2 2>/dev/null)
fi

DASHBOARD_URL="http://localhost:3000"
NETWORK_URL="http://$LOCAL_IP:3000"

# Open the network URL if available, otherwise localhost
if [ -n "$LOCAL_IP" ]; then
	open "$NETWORK_URL" -a "Google Chrome" --new
else
	open "$DASHBOARD_URL" -a "Google Chrome" --new
fi
sleep 2
open "$DASHBOARD_URL" -a "Google Chrome" --new

echo ""
echo "================================"
echo "✅ Both servers are running!"
echo "================================"
echo "Backend: http://localhost:5001"
echo "Frontend: http://localhost:3000"
if [ -n "$LOCAL_IP" ]; then
	echo "Network Dashboard (share this on your Wi‑Fi): $NETWORK_URL"
fi
echo ""
echo "Manager Login:"
echo "  Email: manager@company.com"
echo "  Password: Manager@123"
echo ""
echo "Caller Login:"
echo "  Email: caller@company.com"
echo "  Password: Caller@123"
echo ""
echo "To stop servers, press Ctrl+C"
echo "================================"

# Keep script running
wait
