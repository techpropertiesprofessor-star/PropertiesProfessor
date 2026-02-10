# Manager Analytics Dashboard Module

🎯 **Completely Isolated** | 🔒 **Manager-Only** | ⚡ **Real-Time** | 🚫 **Zero Breaking Changes**

---

## 📊 What Is This?

A production-ready analytics dashboard exclusively for managers that provides:

- **Real-time insights** into tasks, leads, inventory, calls, and team performance
- **8 Interactive charts** with auto-refresh and live socket updates
- **KPI cards** showing critical metrics
- **Smart alerts** for overdue tasks, low stock, uncontacted leads
- **Role-based access control** - invisible to non-managers

---

## ✨ Features

### Charts
1. **Task Status Overview** (Donut Chart) - Distribution by status
2. **Employee Task Load** (Horizontal Bar) - Workload per employee
3. **Leads Funnel** - Conversion through sales stages
4. **Lead Source Analysis** - Performance by source with conversion rates
5. **Inventory Status** (Pie Chart) - Stock distribution
6. **Call Activity** (Line Chart) - 7-day trend analysis
7. **Performance KPIs** - 5 key metric cards
8. **Alerts & Exceptions** - Prioritized action items

### Real-Time Updates
- Socket.IO integration with debouncing
- Automatic refresh when data changes
- Live connection status indicator
- Manual refresh per chart

### Security
- Middleware enforces `role === 'manager'`
- API returns 403 for non-managers
- Frontend route protected
- Unauthorized access logged

---

## 📁 Module Structure

```
NEW BACKEND FILES:
backend/src/
├── middleware/managerOnly.js
├── modules/manager-analytics/
│   ├── analytics.service.js       # Data aggregation
│   ├── analytics.controller.js    # Request handlers
│   └── analytics.routes.js        # Route definitions
└── sockets/manager.analytics.socket.js

NEW FRONTEND FILES:
frontend/src/manager-analytics/
├── ManagerAnalyticsDashboard.jsx  # Main component
├── services/analyticsService.js
├── hooks/useManagerAnalytics.js
├── components/
│   ├── PerformanceKPICards.jsx
│   └── AlertsComponent.jsx
└── charts/
    ├── TaskStatusChart.jsx
    ├── EmployeeTaskLoadChart.jsx
    ├── LeadsFunnelChart.jsx
    ├── LeadSourceChart.jsx
    ├── InventoryStatusChart.jsx
    └── CallActivityChart.jsx
```

---

## 🚀 Quick Start

### 1. Install Frontend Dependencies
```bash
cd frontend
npm install recharts socket.io-client
```

### 2. Backend Integration (3 lines)
**File**: `backend/src/app.js` or `server.js`

```javascript
// Import
const managerAnalyticsRoutes = require('./modules/manager-analytics/analytics.routes');
const managerAnalyticsSocket = require('./sockets/manager.analytics.socket');

// Register route
app.use('/api/manager-analytics', authMiddleware, managerAnalyticsRoutes);

// Initialize socket
managerAnalyticsSocket.initialize(io);
```

### 3. Frontend Integration (2 lines)
**File**: `frontend/src/App.js`

```javascript
// Import
import ManagerAnalyticsDashboard from './manager-analytics/ManagerAnalyticsDashboard';

// Add route
{user?.role === 'manager' && (
  <Route path="/manager/analytics" element={<ManagerAnalyticsDashboard />} />
)}
```

### 4. Add Navigation Link
**File**: `frontend/src/components/Header.js`

```jsx
{user?.role === 'manager' && (
  <Link to="/manager/analytics">📊 Analytics</Link>
)}
```

---

## 🔗 API Endpoints

All require authentication + manager role:

| Endpoint | Description |
|----------|-------------|
| `GET /api/manager-analytics/all` | Get all analytics data |
| `GET /api/manager-analytics/task-status` | Task distribution |
| `GET /api/manager-analytics/employee-load` | Employee workload |
| `GET /api/manager-analytics/leads-funnel` | Sales funnel |
| `GET /api/manager-analytics/lead-sources` | Lead source performance |
| `GET /api/manager-analytics/inventory-status` | Inventory overview |
| `GET /api/manager-analytics/call-activity` | Call trends (7 days) |
| `GET /api/manager-analytics/kpis` | Performance metrics |
| `GET /api/manager-analytics/alerts` | Alerts & exceptions |

---

## 📡 Socket Events

### Emitted to Managers (Backend → Frontend)
- `manager:analytics:taskStatus`
- `manager:analytics:employeeLoad`
- `manager:analytics:leadsFunnel`
- `manager:analytics:leadSources`
- `manager:analytics:inventory`
- `manager:analytics:callActivity`
- `manager:analytics:kpis`
- `manager:analytics:alerts`
- `manager:analytics:newAlert`

### Received from Frontend
- `manager:analytics:refresh` - Manual chart refresh

---

## ⚙️ Optional: Enable Real-Time Updates

To emit updates when data changes, add to your existing controllers:

**Task Controller**:
```javascript
const managerAnalyticsSocket = require('../sockets/manager.analytics.socket');

// After creating/updating task:
managerAnalyticsSocket.emitTaskUpdate(req.app.get('io'), taskData);
```

**Lead Controller**:
```javascript
managerAnalyticsSocket.emitLeadUpdate(req.app.get('io'), leadData);
```

**Similar for**: Inventory, Calls, Attendance

---

## 🛡️ Security Features

### Backend
- ✅ Middleware checks `user.role === 'manager'`
- ✅ Returns 403 for non-managers
- ✅ Logs unauthorized attempts
- ✅ All routes protected

### Frontend
- ✅ Dashboard only mounts for managers
- ✅ Route protected with role check
- ✅ Navigation link hidden from non-managers
- ✅ Token-based API authentication

---

## 🎨 Customization

### Change Colors
Edit color constants in chart files:
```javascript
// TaskStatusChart.jsx
const COLORS = {
  pending: '#FFA500',
  completed: '#32CD32',
  // ...
};
```

### Add New Chart
1. Create chart component
2. Add service method
3. Add controller endpoint
4. Add socket event
5. Add to dashboard

### Modify KPIs
Edit `getPerformanceKPIs()` in `analytics.service.js`

---

## 🧪 Testing

### Test Access Control
```bash
# Should succeed (manager token)
curl -H "Authorization: Bearer MANAGER_TOKEN" \
     http://localhost:5000/api/manager-analytics/all

# Should fail 403 (employee token)
curl -H "Authorization: Bearer EMPLOYEE_TOKEN" \
     http://localhost:5000/api/manager-analytics/all
```

### Test Frontend
1. Login as manager → Navigate to `/manager/analytics`
2. Verify all charts load
3. Check "Live Updates Active" status
4. Test refresh buttons
5. Login as non-manager → Verify link hidden & access blocked

---

## 📊 Performance

### Optimizations
- **Debouncing**: Updates throttled (1-3 seconds per chart)
- **Lazy Loading**: Individual chart refresh
- **Socket Rooms**: Managers-only broadcast
- **Efficient Queries**: MongoDB aggregation pipelines

### Load Impact
- **Initial Load**: ~8 aggregation queries in parallel
- **Real-Time**: Only affected charts refresh
- **Network**: Socket events only to manager room
- **Database**: Indexed queries, minimal overhead

---

## 🔧 Troubleshooting

### "Access denied. Manager privileges required"
**Solution**: Verify user has `role: 'manager'` in database

### Charts not loading
**Solution**: 
- Check backend console for errors
- Verify MongoDB collections have data
- Check models are properly defined

### Real-time updates not working
**Solution**:
- Verify `managerAnalyticsSocket.initialize(io)` called
- Check browser console for socket errors
- Ensure `app.set('io', io)` in server.js

### "Cannot find module 'recharts'"
**Solution**: `npm install recharts` in frontend

---

## 📦 Dependencies

### Frontend (New)
- `recharts` - Charts library
- `socket.io-client` - Real-time (likely exists)

### Backend
- None (uses existing dependencies)

---

## ✅ Advantages

- ✅ **Zero modifications** to existing code
- ✅ **Fully isolated** - can be removed by deleting folders
- ✅ **No breaking changes** - existing builds unaffected
- ✅ **Production ready** - error handling, loading states, security
- ✅ **Real-time** - socket updates with debouncing
- ✅ **Role-enforced** - backend + frontend protection
- ✅ **Scalable** - efficient queries and updates

---

## 📝 Documentation

- **Integration Guide**: `MANAGER_ANALYTICS_INTEGRATION_GUIDE.md`
- **Quick Start**: `MANAGER_ANALYTICS_QUICK_START.js`
- **This File**: `MANAGER_ANALYTICS_README.md`

---

## 🎯 Usage

### Manager Access
1. Login with manager credentials
2. Click "📊 Analytics" in navigation
3. View real-time dashboard
4. Use refresh buttons for manual updates
5. Monitor live connection status

### Non-Manager
- Dashboard link not visible
- Direct URL access blocked
- API returns 403 Forbidden

---

## 🚀 Deployment

No special steps required:

1. Deploy as usual (zero config changes)
2. Ensure environment variables set
3. Manager users can access immediately
4. No database migrations needed

---

## 📞 Support

Check:
1. Console logs (backend & frontend)
2. User role in database
3. Auth middleware passes user object
4. MongoDB has data in collections
5. Socket.IO connection in DevTools

---

## 📄 License

Same as parent project

---

## 👥 Author

Manager Analytics Module v1.0.0

---

**🎉 Ready to Use!**

Login as manager and navigate to: `http://localhost:3000/manager/analytics`

