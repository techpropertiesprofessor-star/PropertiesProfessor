/**
 * QUICK INTEGRATION EXAMPLES
 * Copy-paste snippets for integrating Manager Analytics Dashboard
 */

// ============================================================================
// BACKEND INTEGRATION
// ============================================================================

// ----------------------------------------------------------------------------
// FILE: backend/src/app.js (or server.js)
// ----------------------------------------------------------------------------

// 1. ADD IMPORTS (at top with other imports)
// ----------------------------------------------------------------------------
const managerAnalyticsRoutes = require('./modules/manager-analytics/analytics.routes');
const managerAnalyticsSocket = require('./sockets/manager.analytics.socket');


// 2. REGISTER ROUTES (with other routes, after auth middleware)
// ----------------------------------------------------------------------------
// Manager Analytics Routes (Manager-only)
app.use('/api/manager-analytics', authMiddleware, managerAnalyticsRoutes);


// 3. INITIALIZE SOCKET HANDLER (after Socket.IO setup)
// ----------------------------------------------------------------------------
// Existing Socket.IO setup
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Make io accessible in controllers
app.set('io', io);

// Initialize manager analytics socket handler
managerAnalyticsSocket.initialize(io);


// ============================================================================
// OPTIONAL: REAL-TIME UPDATES IN EXISTING CONTROLLERS
// ============================================================================

// ----------------------------------------------------------------------------
// EXAMPLE: backend/src/controllers/taskController.js
// ----------------------------------------------------------------------------

// 1. ADD IMPORT
const managerAnalyticsSocket = require('../sockets/manager.analytics.socket');

// 2. IN YOUR CREATE/UPDATE/DELETE FUNCTIONS, ADD:
exports.createTask = async (req, res) => {
  try {
    // ... your existing task creation logic ...
    const newTask = await Task.create(taskData);
    
    // ✨ EMIT REAL-TIME UPDATE TO MANAGERS
    const io = req.app.get('io');
    if (io) {
      managerAnalyticsSocket.emitTaskUpdate(io, newTask);
    }
    
    res.status(201).json({ success: true, data: newTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    // ... your existing task update logic ...
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    // ✨ EMIT REAL-TIME UPDATE TO MANAGERS
    const io = req.app.get('io');
    if (io) {
      managerAnalyticsSocket.emitTaskUpdate(io, updatedTask);
    }
    
    res.json({ success: true, data: updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ----------------------------------------------------------------------------
// EXAMPLE: backend/src/controllers/leadController.js
// ----------------------------------------------------------------------------

const managerAnalyticsSocket = require('../sockets/manager.analytics.socket');

exports.createLead = async (req, res) => {
  try {
    const newLead = await Lead.create(req.body);
    
    // ✨ EMIT TO MANAGERS
    const io = req.app.get('io');
    if (io) managerAnalyticsSocket.emitLeadUpdate(io, newLead);
    
    res.status(201).json({ success: true, data: newLead });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ----------------------------------------------------------------------------
// EXAMPLE: backend/src/controllers/inventoryController.js
// ----------------------------------------------------------------------------

const managerAnalyticsSocket = require('../sockets/manager.analytics.socket');

exports.updateInventory = async (req, res) => {
  try {
    const updated = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // ✨ EMIT TO MANAGERS
    const io = req.app.get('io');
    if (io) managerAnalyticsSocket.emitInventoryUpdate(io, updated);
    
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ============================================================================
// FRONTEND INTEGRATION
// ============================================================================

// ----------------------------------------------------------------------------
// FILE: frontend/src/App.js
// ----------------------------------------------------------------------------

// 1. ADD IMPORT
import ManagerAnalyticsDashboard from './manager-analytics/ManagerAnalyticsDashboard';

// 2. ADD ROUTE (inside <Routes>)
// ----------------------------------------------------------------------------
function App() {
  const { user } = useAuth(); // Your auth context

  return (
    <Routes>
      {/* ... existing routes ... */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/leads" element={<Leads />} />
      
      {/* ✨ MANAGER ANALYTICS DASHBOARD (Manager-only) */}
      {user && user.role === 'manager' && (
        <Route path="/manager/analytics" element={<ManagerAnalyticsDashboard />} />
      )}
    </Routes>
  );
}


// ----------------------------------------------------------------------------
// ALTERNATIVE: Protected Route Component
// ----------------------------------------------------------------------------
const ManagerRoute = ({ children }) => {
  const { user } = useAuth();
  
  if (!user || user.role !== 'manager') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Use it:
<Route 
  path="/manager/analytics" 
  element={
    <ManagerRoute>
      <ManagerAnalyticsDashboard />
    </ManagerRoute>
  } 
/>


// ----------------------------------------------------------------------------
// FILE: frontend/src/components/Header.js (or Sidebar.js)
// ----------------------------------------------------------------------------

// ADD NAVIGATION LINK (only visible to managers)
// ----------------------------------------------------------------------------
function Header() {
  const { user } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/tasks">Tasks</Link>
      <Link to="/leads">Leads</Link>
      <Link to="/inventory">Inventory</Link>
      
      {/* ✨ MANAGER-ONLY ANALYTICS LINK */}
      {user && user.role === 'manager' && (
        <Link to="/manager/analytics" className="nav-link manager-only">
          📊 Analytics
        </Link>
      )}
    </nav>
  );
}


// ----------------------------------------------------------------------------
// TAILWIND EXAMPLE: Manager-only badge
// ----------------------------------------------------------------------------
{user && user.role === 'manager' && (
  <Link 
    to="/manager/analytics" 
    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200"
  >
    <span>📊</span>
    <span className="font-semibold">Analytics Dashboard</span>
    <span className="text-xs bg-purple-700 text-white px-2 py-0.5 rounded">Manager</span>
  </Link>
)}


// ============================================================================
// TESTING
// ============================================================================

// ----------------------------------------------------------------------------
// Test Backend API (cURL)
// ----------------------------------------------------------------------------

// 1. Get all analytics (requires manager token)
curl -X GET http://localhost:5000/api/manager-analytics/all \
  -H "Authorization: Bearer YOUR_MANAGER_JWT_TOKEN"

// 2. Test individual endpoint
curl -X GET http://localhost:5000/api/manager-analytics/kpis \
  -H "Authorization: Bearer YOUR_MANAGER_JWT_TOKEN"

// 3. Test role enforcement (should return 403)
curl -X GET http://localhost:5000/api/manager-analytics/all \
  -H "Authorization: Bearer EMPLOYEE_JWT_TOKEN"


// ----------------------------------------------------------------------------
// Test Frontend Access
// ----------------------------------------------------------------------------

// 1. Login as manager
// 2. Navigate to: http://localhost:3000/manager/analytics
// 3. Verify:
//    - All charts load
//    - "Live Updates Active" shown
//    - Refresh buttons work
//    - Real-time updates when you create/update data

// 4. Login as non-manager
// 5. Verify:
//    - Analytics link NOT visible in navigation
//    - Direct access to /manager/analytics redirects or shows error


// ============================================================================
// ENVIRONMENT VARIABLES (if needed)
// ============================================================================

// frontend/.env
// ----------------------------------------------------------------------------
REACT_APP_API_URL=http://localhost:5000

// backend/.env
// ----------------------------------------------------------------------------
FRONTEND_URL=http://localhost:3000


// ============================================================================
// NPM INSTALL COMMANDS
// ============================================================================

// Backend (no new dependencies required)
// cd backend
// npm install  # should work with existing packages

// Frontend (install recharts and socket.io-client)
// cd frontend
// npm install recharts socket.io-client


// ============================================================================
// COMPLETE EXAMPLE: Minimal Integration
// ============================================================================

// BACKEND: server.js
// ----------------------------------------------------------------------------
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const managerAnalyticsRoutes = require('./modules/manager-analytics/analytics.routes');
const managerAnalyticsSocket = require('./sockets/manager.analytics.socket');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.set('io', io);

// Routes
app.use('/api/manager-analytics', authMiddleware, managerAnalyticsRoutes);

// Socket
managerAnalyticsSocket.initialize(io);

server.listen(5000);


// FRONTEND: App.js
// ----------------------------------------------------------------------------
import { Routes, Route } from 'react-router-dom';
import ManagerAnalyticsDashboard from './manager-analytics/ManagerAnalyticsDashboard';

function App() {
  const { user } = useAuth();
  
  return (
    <Routes>
      {user?.role === 'manager' && (
        <Route path="/manager/analytics" element={<ManagerAnalyticsDashboard />} />
      )}
    </Routes>
  );
}


// ============================================================================
// DONE! 🎉
// ============================================================================
// 
// The Manager Analytics Dashboard is now integrated and ready to use!
// 
// Key Points:
// - ✅ Zero modifications to existing logic
// - ✅ Manager-only access enforced
// - ✅ Real-time updates via Socket.IO
// - ✅ Isolated and removable
// - ✅ Production ready
// 
// Access: http://localhost:3000/manager/analytics
// ============================================================================
