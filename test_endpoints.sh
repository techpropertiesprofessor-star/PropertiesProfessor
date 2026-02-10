#!/bin/bash

# CRM System - API Endpoint Test Script
# This script verifies all new endpoints are working

echo "🧪 Testing CRM API Endpoints..."
echo ""

# Set base URL
API_URL="http://localhost:5001/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    
    echo -n "Testing ${description}... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" -X ${method} "${API_URL}${endpoint}")
    
    # 401 is acceptable for protected routes (means auth is working)
    if [ "$response" -eq 200 ] || [ "$response" -eq 401 ]; then
        echo -e "${GREEN}✅ OK${NC} (HTTP $response)"
    else
        echo -e "${RED}❌ FAILED${NC} (HTTP $response)"
    fi
}

echo "📊 Lead Management Endpoints:"
echo "================================"
test_endpoint "GET" "/leads" "List Leads"
test_endpoint "GET" "/leads/uploads/history" "Upload History"
echo ""

echo "📦 Inventory Endpoints:"
echo "================================"
test_endpoint "GET" "/inventory/projects" "List Projects"
test_endpoint "GET" "/inventory/search" "Search Units"
test_endpoint "GET" "/inventory/stats" "Inventory Stats"
test_endpoint "GET" "/inventory/units/1" "Get Unit (id=1)"
test_endpoint "GET" "/inventory/units/1/media" "List Unit Media (id=1)"
test_endpoint "POST" "/inventory/units/1/media" "Upload Unit Media (id=1)"
test_endpoint "DELETE" "/inventory/units/1/media/1" "Delete Unit Media (unit=1, media=1)"
test_endpoint "POST" "/inventory/units/1/share" "Enable Unit Share (id=1)"
test_endpoint "GET" "/inventory/share/unit/fake-token" "Public Share JSON (fake token)"
echo ""

echo "👥 Existing Endpoints (verification):"
echo "================================"
test_endpoint "GET" "/employees" "List Employees"
test_endpoint "GET" "/tasks" "List Tasks"
test_endpoint "GET" "/attendance/history/mine" "Attendance History"
echo ""

echo "✅ Test Complete!"
echo ""
echo "📝 Note: HTTP 401 responses are normal for protected routes without auth token"
