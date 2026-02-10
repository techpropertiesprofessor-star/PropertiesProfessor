# 📊 Admin Observability System

A fully isolated, non-intrusive black box observability system with BIOS-style control panel.

## 🎯 System Architecture

### Multi-Entry Point Design

- **`/app`** → Main Dashboard (Employee/Manager)
- **`/admin`** → Admin Observability Panel (Admin/Manager)
- **`/bios`** → BIOS System Health (Super Admin Only)

Each entry point is **completely independent** - crashes in one do not affect others.

## 🔧 Backend Components

### Database Models (Isolated Collections)

Located in `backend/src/models/observability/`:

- **ActivityLog** - User actions (clicks, navigation, forms)
- **ApiLog** - API requests/responses with timing
- **SystemMetric** - System performance metrics
- **HealthCheck** - Component health status
- **CrashLog** - System crashes and recovery

### Services

Located in `backend/src/services/observability/`:

- **loggingQueue.js** - Async queue with retry logic
- **activityLogger.js** - Activity logging utilities
- **systemHealthMonitor.js** - Health monitoring service

### Middleware

- **observability.middleware.js** - Non-blocking API logging

### API Routes

- **`/api/admin/*`** - Admin panel endpoints
- **`/api/bios/*`** - BIOS panel endpoints

## 🎨 Frontend Applications

### Admin Panel (`/admin`)

Modern dashboard with:
- Real-time analytics
- Activity logs viewer
- API logs with filtering
- Bandwidth monitoring
- Crash log viewer
- System health status

**Technologies:** React, Tailwind CSS, Recharts, Socket.IO

### BIOS Panel (`/bios`)

Minimal BIOS-style interface:
- ASCII art interface
- System component status (GREEN/YELLOW/RED)
- Crash diagnostics
- Resource monitoring

**Technologies:** React (minimal), inline CSS

### Frontend Activity Tracker

Located in `frontend/src/hooks/useActivityTracker.js`:

Non-intrusive hook that tracks:
- Page navigation
- Button clicks
- Form submissions
- JavaScript errors

**Usage:**
```javascript
import { useActivityTracker } from './hooks/useActivityTracker';

function App() {
  useActivityTracker(); // Add this line
  // ... rest of your app
}
```

## 🚀 Installation & Setup

### 1. Backend (Already Integrated)

The observability system is already integrated into the backend. No additional setup needed.

System starts automatically when backend starts.

### 2. Admin Panel

```bash
cd admin
npm install
npm start  # Runs on port 3001
```

Build for production:
```bash
npm run build
```

### 3. BIOS Panel

```bash
cd bios
npm install
npm start  # Runs on port 3002
```

Build for production:
```bash
npm run build
```

### 4. Frontend Activity Tracking

Add to your existing dashboard (`frontend/src/App.js`):

```javascript
import { useActivityTracker } from './hooks/useActivityTracker';

function App() {
  useActivityTracker(); // ✅ Add this line - non-intrusive
  
  // ... rest of your existing code
}
```

## 📋 Key Features

### ✅ Non-Intrusive Design

- **Zero modifications** to existing dashboard
- **Additive only** - no refactoring required
- **Async logging** - never blocks user actions
- **Isolated routes** - no conflicts with existing APIs

### ✅ Black Box Logging

- **Millisecond precision** timestamps
- **Immutable logs** - insert only, no updates/deletes
- **Queue-based** with automatic retry
- **Batch processing** for efficiency

### ✅ Bandwidth & Performance Tracking

- Request/response sizes
- API latency (avg, p95)
- Per-user bandwidth usage
- Per-endpoint statistics

### ✅ System Health Monitoring

- Database connection & latency
- Backend uptime & response time
- System resources (CPU, memory)
- WebSocket status
- Real-time status indicators (GREEN/YELLOW/RED)

### ✅ Crash Detection

- Frontend crashes (JS errors)
- Backend crashes (process exit)
- Database failures
- WebSocket failures
- Recovery tracking

### ✅ Role-Based Access Control

- **Super Admin** - Full access to BIOS & Admin
- **Admin** - Full access to Admin panel
- **Manager** - Read-only access to Admin panel
- **Employee** - No access (blocked)

All access attempts are logged.

## 🔒 Security

- JWT token authentication
- Role-based authorization
- All unauthorized access attempts logged
- Critical logs retention
- Immutable audit trail

## 📊 API Endpoints

### Admin Panel APIs

```
GET  /api/admin/logs/activity       - Get activity logs
GET  /api/admin/logs/api            - Get API logs
GET  /api/admin/metrics/system      - Get system metrics
GET  /api/admin/health              - Get health checks
GET  /api/admin/logs/crashes        - Get crash logs
GET  /api/admin/analytics           - Get analytics dashboard
GET  /api/admin/bandwidth/users     - Get bandwidth by user
GET  /api/admin/queue/stats         - Get logging queue stats
POST /api/admin/log/activity        - Log activity from frontend
```

### BIOS Panel APIs

```
GET  /api/bios/ping                     - Health ping
GET  /api/bios/status                   - Overall system status
GET  /api/bios/health/:component        - Component health
GET  /api/bios/crashes                  - Recent crashes
GET  /api/bios/crashes/timeline         - Crash timeline
GET  /api/bios/diagnostics/database     - Database diagnostics
GET  /api/bios/diagnostics/process      - Process metrics
```

## 🎯 Usage Examples

### Manually Log Activities

```javascript
import { logFormSubmit, logPermissionChange } from './hooks/useActivityTracker';

// Log form submission
const handleSubmit = (e) => {
  e.preventDefault();
  // ... your form logic
  logFormSubmit('lead-form', 'lead', { formData: {...} });
};

// Log permission changes
const updateUserRole = (userId, oldRole, newRole) => {
  // ... your update logic
  logPermissionChange(userId, { role: oldRole }, { role: newRole });
};
```

### Query Logs from Admin API

```javascript
import axios from 'axios';

// Get activity logs with filters
const logs = await axios.get('/api/admin/logs/activity', {
  params: {
    actionType: 'PERMISSION_CHANGE',
    category: 'CRITICAL',
    startDate: '2026-02-01',
    page: 1,
    limit: 100
  },
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

## 🔄 Real-Time Updates

The system supports real-time streaming via WebSocket (future enhancement).

Currently uses polling with configurable intervals:
- Dashboard: 30 seconds
- BIOS: 5 seconds

## 📈 Performance

- **Queue size:** 10,000 logs (configurable)
- **Batch size:** 100 logs per flush
- **Flush interval:** 1 second
- **Max retries:** 3 attempts
- **Memory footprint:** Minimal (~10MB)

## 🧪 Testing

### Verify Observability System

1. **Backend logs:**
```
📊 Observability system started
```

2. **Check health:**
```bash
curl http://localhost:5000/api/bios/ping
```

3. **Test activity logging:**
- Navigate in dashboard
- Click buttons
- Submit forms
- Check Admin Panel → Activity Logs

4. **Test API logging:**
- Make any API call
- Check Admin Panel → API Logs

## 🚨 Crash Simulation

To test crash detection:

```javascript
// Frontend crash
throw new Error('Test crash');

// API error
// Make request to non-existent endpoint
```

View crashes in:
- Admin Panel → Crashes
- BIOS → Crash Timeline

## 🔧 Configuration

### Environment Variables

```bash
# Backend
PORT=5000
MONGODB_URI=your_mongodb_uri

# Admin Panel
REACT_APP_API_URL=http://localhost:5000

# BIOS Panel
REACT_APP_API_URL=http://localhost:5000
```

### Adjust Queue Settings

Edit `backend/src/services/observability/loggingQueue.js`:

```javascript
this.maxQueueSize = 10000;    // Max logs in queue
this.batchSize = 100;         // Logs per batch
this.flushInterval = 1000;    // Flush every 1s
this.maxRetries = 3;          // Retry failed logs
```

## 📁 File Structure

```
backend/
├── src/
│   ├── models/observability/       # Database models
│   ├── services/observability/     # Core services
│   ├── middlewares/               # Middleware
│   │   └── observability.middleware.js
│   ├── controllers/observability/  # Controllers
│   ├── routes/observability/       # API routes
│   └── app.js                     # Integrated

frontend/
└── src/
    └── hooks/
        └── useActivityTracker.js   # Activity tracker

admin/                              # Admin Panel app
├── src/
│   ├── pages/                     # Page components
│   ├── components/                # Shared components
│   └── services/                  # API client

bios/                              # BIOS Panel app
└── src/
    └── App.js                     # Single component
```

## 🎉 Benefits

✅ **Complete visibility** into user behavior & system performance
✅ **Zero impact** on existing functionality
✅ **Tamper-proof** audit trail
✅ **Independent** crash diagnostics
✅ **Real-time** health monitoring
✅ **Bandwidth** tracking
✅ **Role-based** secure access

## 📞 Support

For issues or questions, check:
1. Backend console for errors
2. Admin Panel for system health
3. BIOS Panel for crash diagnostics
4. API logs for request errors

## 🔮 Future Enhancements

- [ ] Real-time WebSocket streaming
- [ ] Log retention & archival automation
- [ ] Compression for cold storage
- [ ] Advanced analytics & predictions
- [ ] Alert notifications
- [ ] Custom dashboards
- [ ] Export logs to CSV/JSON
- [ ] Log search with Elasticsearch

---

**Status:** ✅ Production Ready (Core features implemented)
**Version:** 1.0.0
**Last Updated:** February 2026
