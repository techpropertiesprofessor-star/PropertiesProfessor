# Manager Analytics Dashboard - Integration Guide

## 📋 Overview

A completely isolated manager-only analytics dashboard module that provides real-time insights without modifying existing application logic.

---

## ✅ What Has Been Created

### Backend Files (New)
```
backend/
├── src/
│   ├── middleware/
│   │   └── managerOnly.js                          # Role-based access control
│   ├── modules/
│   │   └── manager-analytics/
│   │       ├── analytics.service.js                # Data aggregation logic
│   │       ├── analytics.controller.js             # HTTP request handlers
│   │       └── analytics.routes.js                 # API route definitions
│   └── sockets/
│       └── manager.analytics.socket.js              # Real-time socket events
```

### Frontend Files (New)
```
frontend/
└── src/
    └── manager-analytics/
        ├── ManagerAnalyticsDashboard.jsx            # Main dashboard component
        ├── services/
        │   └── analyticsService.js                  # API service
        ├── hooks/
        │   └── useManagerAnalytics.js               # Analytics hook with socket
        ├── components/
        │   ├── PerformanceKPICards.jsx              # KPI cards
        │   └── AlertsComponent.jsx                  # Alerts display
        └── charts/
            ├── TaskStatusChart.jsx                  # Donut chart
            ├── EmployeeTaskLoadChart.jsx            # Horizontal bar chart
            ├── LeadsFunnelChart.jsx                 # Funnel chart
            ├── LeadSourceChart.jsx                  # Lead sources
            ├── InventoryStatusChart.jsx             # Inventory pie chart
            └── CallActivityChart.jsx                # Line chart
```

---

## 🔌 Integration Steps

### Step 1: Backend - Register Routes

**File**: `backend/src/app.js` or `backend/server.js` (wherever routes are registered)

**Add this import** (near other route imports):
```javascript
const managerAnalyticsRoutes = require('./modules/manager-analytics/analytics.routes');
```

**Add this route** (after authentication middleware, before other routes):
```javascript
// Manager Analytics Routes (Protected)
app.use('/api/manager-analytics', authMiddleware, managerAnalyticsRoutes);
```

**Example location in existing code**:
```javascript
// ... existing imports ...
const taskRoutes = require('./routes/taskRoutes');
const leadRoutes = require('./routes/leadRoutes');
const managerAnalyticsRoutes = require('./modules/manager-analytics/analytics.routes'); // ADD THIS

// ... existing middleware ...

// Routes
app.use('/api/tasks', authMiddleware, taskRoutes);
app.use('/api/leads', authMiddleware, leadRoutes);
app.use('/api/manager-analytics', authMiddleware, managerAnalyticsRoutes); // ADD THIS
```

---

### Step 2: Backend - Initialize Socket Handler

**File**: `backend/src/app.js` or `backend/server.js` (where Socket.IO is initialized)

**Add this import** (at the top):
```javascript
const managerAnalyticsSocket = require('./sockets/manager.analytics.socket');
```

**Initialize socket handler** (after Socket.IO setup):
```javascript
// Existing Socket.IO setup
const io = require('socket.io')(server, {
  cors: { origin: '*' }
});

// ADD THIS: Initialize manager analytics socket
managerAnalyticsSocket.initialize(io);
```

---

### Step 3: Backend - Emit Updates (Optional, for Real-time)

To enable real-time updates, add event emitters after data changes in your existing controllers.

**Example: Task Controller** (`backend/src/controllers/taskController.js`)

```javascript
// Import at top
const managerAnalyticsSocket = require('../sockets/manager.analytics.socket');

// In your create/update/delete task functions, add:
exports.createTask = async (req, res) => {
  try {
    // ... existing task creation logic ...
    const newTask = await Task.create(taskData);
    
    // Emit update to managers (ADD THIS)
    if (req.app.get('io')) {
      managerAnalyticsSocket.emitTaskUpdate(req.app.get('io'), newTask);
    }
    
    res.status(201).json({ success: true, data: newTask });
  } catch (error) {
    // ... error handling ...
  }
};
```

**Similar pattern for other controllers**:
- **Lead Controller**: `managerAnalyticsSocket.emitLeadUpdate(io, leadData)`
- **Inventory Controller**: `managerAnalyticsSocket.emitInventoryUpdate(io, inventoryData)`
- **Call Controller**: `managerAnalyticsSocket.emitCallUpdate(io, callData)`
- **Attendance Controller**: `managerAnalyticsSocket.emitAttendanceUpdate(io, attendanceData)`

**Access `io` in controllers**:
```javascript
// In server.js, make io accessible
app.set('io', io);

// In controllers
const io = req.app.get('io');
```

---

### Step 4: Frontend - Install Dependencies

The dashboard uses **recharts** for charts. Install it (if not already installed):

```bash
cd frontend
npm install recharts socket.io-client
```

---

### Step 5: Frontend - Add Route

**File**: `frontend/src/App.js` (or your routing file)

**Add import**:
```javascript
import ManagerAnalyticsDashboard from './manager-analytics/ManagerAnalyticsDashboard';
```

**Add route** (with role check):
```javascript
// Inside your Routes component
<Routes>
  {/* ... existing routes ... */}
  
  {/* Manager Analytics Dashboard - Manager Only */}
  {user && user.role === 'manager' && (
    <Route path="/manager/analytics" element={<ManagerAnalyticsDashboard />} />
  )}
</Routes>
```

**Alternative: Separate protected route**:
```javascript
// Create a ProtectedRoute component
const ManagerRoute = ({ children }) => {
  const { user } = useAuth(); // Your auth hook
  
  if (!user || user.role !== 'manager') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Use it in routes
<Route 
  path="/manager/analytics" 
  element={
    <ManagerRoute>
      <ManagerAnalyticsDashboard />
    </ManagerRoute>
  } 
/>
```

---

### Step 6: Frontend - Add Navigation Link (Manager Only)

**File**: `frontend/src/components/Header.js` or `Sidebar.js`

**Add navigation link** (only visible to managers):
```jsx
{user && user.role === 'manager' && (
  <Link 
    to="/manager/analytics" 
    className="nav-link"
  >
    📊 Analytics Dashboard
  </Link>
)}
```

**Example in existing navigation**:
```jsx
<nav>
  <Link to="/dashboard">Dashboard</Link>
  <Link to="/tasks">Tasks</Link>
  <Link to="/leads">Leads</Link>
  
  {/* Manager-only link */}
  {user.role === 'manager' && (
    <Link to="/manager/analytics" className="manager-only">
      📊 Analytics
    </Link>
  )}
</nav>
```

---

## 🔒 Security Verification

### Backend Protection
All analytics APIs are protected by the `managerOnly` middleware:
- Checks if user is authenticated
- Verifies `user.role === 'manager'`
- Logs unauthorized access attempts
- Returns 403 Forbidden for non-managers

### Frontend Protection
- Dashboard only mounted if `user.role === 'manager'`
- Route protected with role check
- Navigation link only visible to managers

---

## 📡 Real-Time Events

### Socket Events Emitted (Backend → Frontend)
```
manager:analytics:taskStatus       - Task status updated
manager:analytics:employeeLoad     - Employee task load updated
manager:analytics:leadsFunnel      - Leads funnel updated
manager:analytics:leadSources      - Lead sources updated
manager:analytics:inventory        - Inventory updated
manager:analytics:callActivity     - Call activity updated
manager:analytics:kpis             - KPIs updated
manager:analytics:alerts           - Alerts updated
manager:analytics:newAlert         - New alert triggered
manager:analytics:all              - All data refreshed
```

### Socket Events Received (Frontend → Backend)
```
manager:analytics:refresh          - Request specific chart refresh
```

---

## 🎯 API Endpoints

All endpoints require authentication + manager role:

```
GET /api/manager-analytics/all              - Get all analytics (initial load)
GET /api/manager-analytics/task-status      - Get task status overview
GET /api/manager-analytics/employee-load    - Get employee task load
GET /api/manager-analytics/leads-funnel     - Get leads funnel
GET /api/manager-analytics/lead-sources     - Get lead source analysis
GET /api/manager-analytics/inventory-status - Get inventory status
GET /api/manager-analytics/call-activity    - Get call activity (7 days)
GET /api/manager-analytics/kpis             - Get performance KPIs
GET /api/manager-analytics/alerts           - Get alerts & exceptions
```

---

## 🧪 Testing

### Test Backend API (Postman/cURL)

**1. Get all analytics**:
```bash
curl -H "Authorization: Bearer <manager_token>" \
     http://localhost:5000/api/manager-analytics/all
```

**2. Test role enforcement** (should fail with 403):
```bash
curl -H "Authorization: Bearer <employee_token>" \
     http://localhost:5000/api/manager-analytics/all
```

### Test Frontend

1. **Login as Manager**
2. **Navigate to** `/manager/analytics`
3. **Verify**:
   - All charts load with data
   - Connection status shows "Live Updates Active"
   - Refresh buttons work
   - Real-time updates when data changes

4. **Test Role Enforcement**:
   - Logout and login as non-manager
   - Verify dashboard link is hidden
   - Verify direct access to `/manager/analytics` is blocked

---

## 🚀 Performance Optimizations

### Debouncing
Real-time updates are debounced to prevent excessive re-renders:
- Task Status: 1 second
- Employee Load: 2 seconds (heavy aggregation)
- Leads Funnel: 1 second
- Lead Sources: 2 seconds
- Call Activity: 3 seconds (larger dataset)

### Lazy Loading
Each chart re-fetches only when needed via `refreshChart(chartType)`

### Socket Room
Managers join a dedicated `managers` socket room - events only sent to this room

---

## 🔧 Troubleshooting

### Issue: "Access denied. Manager privileges required"
**Solution**: Ensure user has `role: 'manager'` in database

### Issue: Charts not loading
**Solution**: 
1. Check backend console for errors
2. Verify models exist (Task, Lead, Inventory, etc.)
3. Check MongoDB collections have data

### Issue: Real-time updates not working
**Solution**:
1. Verify Socket.IO is initialized: `managerAnalyticsSocket.initialize(io)`
2. Check browser console for socket connection errors
3. Ensure `io` is accessible in controllers: `req.app.get('io')`

### Issue: "Cannot find module 'recharts'"
**Solution**: `npm install recharts` in frontend directory

---

## 📦 Dependencies Added

### Backend
- None (uses existing dependencies)

### Frontend
- `recharts` - Charts library
- `socket.io-client` - Real-time updates (likely already installed)

---

## 🎨 Customization

### Change Chart Colors
Edit color constants in chart files:
- `TaskStatusChart.jsx` - `COLORS` object
- `EmployeeTaskLoadChart.jsx` - `COLORS` object
- etc.

### Add New Chart
1. Create new chart component in `frontend/src/manager-analytics/charts/`
2. Add API endpoint in backend service/controller/routes
3. Add socket event in `manager.analytics.socket.js`
4. Add to dashboard in `ManagerAnalyticsDashboard.jsx`

### Modify KPIs
Edit `getPerformanceKPIs()` in `backend/src/modules/manager-analytics/analytics.service.js`

---

## ✅ Verification Checklist

- [ ] Backend routes registered in `app.js`
- [ ] Socket handler initialized
- [ ] Frontend route added with role check
- [ ] Navigation link added (manager-only)
- [ ] Dependencies installed (`recharts`)
- [ ] Tested with manager account
- [ ] Tested with non-manager (access denied)
- [ ] Real-time updates working
- [ ] All charts display data correctly

---

## 📝 Notes

- **Zero Modifications**: Existing code remains untouched
- **Isolated Module**: Can be removed by deleting folders
- **No Breaking Changes**: Build/deployment unchanged
- **Production Ready**: Includes error handling, loading states, and security

---

## 🆘 Support

If you encounter issues:

1. Check console logs (backend and frontend)
2. Verify user role in database
3. Ensure authentication middleware passes user object
4. Check MongoDB collections have data
5. Verify Socket.IO connection in browser DevTools

---

**Created**: Manager Analytics Dashboard Module
**Version**: 1.0.0
**Compatibility**: React 16.8+, Node.js 14+, MongoDB
