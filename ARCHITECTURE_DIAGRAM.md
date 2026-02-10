# 🏗️ Observability System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MULTI-ENTRY POINT ARCHITECTURE                   │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│              │    │              │    │              │
│  Main App    │    │ Admin Panel  │    │ BIOS Panel   │
│  (Port 3000) │    │ (Port 3001)  │    │ (Port 3002)  │
│              │    │              │    │              │
│  Employee/   │    │  Admin/      │    │  Super Admin │
│  Manager     │    │  Manager     │    │  Only        │
│              │    │              │    │              │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                           ▼
            ┌──────────────────────────┐
            │   Backend API Server     │
            │     (Port 5000)          │
            │                          │
            │  ┌────────────────────┐  │
            │  │ Observability      │  │
            │  │ Middleware         │  │
            │  │ (Non-blocking)     │  │
            │  └────────────────────┘  │
            │                          │
            │  ┌────────────────────┐  │
            │  │ System Health      │  │
            │  │ Monitor            │  │
            │  │ (Background)       │  │
            │  └────────────────────┘  │
            │                          │
            │  ┌────────────────────┐  │
            │  │ Logging Queue      │  │
            │  │ (Async, Retry)     │  │
            │  └────────────────────┘  │
            └──────────┬───────────────┘
                       │
                       ▼
            ┌──────────────────────────┐
            │    MongoDB Database      │
            │                          │
            │  App Collections         │
            │  ├─ users                │
            │  ├─ employees            │
            │  ├─ tasks                │
            │  └─ ...                  │
            │                          │
            │  Observability (Isolated)│
            │  ├─ activity_logs        │
            │  ├─ api_logs             │
            │  ├─ system_metrics       │
            │  ├─ health_checks        │
            │  └─ crash_logs           │
            └──────────────────────────┘
```

## Data Flow

### 1. Activity Tracking (Frontend → Backend)

```
User Action (Click/Navigate)
          ↓
┌─────────────────────┐
│ useActivityTracker  │  ← Non-intrusive React Hook
│ (Frontend)          │
└──────────┬──────────┘
           │ Batched
           ↓
┌─────────────────────┐
│ Activity Queue      │  ← In-memory queue
│ (Client-side)       │
└──────────┬──────────┘
           │ Every 5s or batch full
           ↓
┌─────────────────────┐
│ POST /api/admin/    │  ← Async, non-blocking
│ log/activity        │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│ Logging Queue       │  ← Server-side queue
│ (Backend)           │
└──────────┬──────────┘
           │ Every 1s or 100 logs
           ↓
┌─────────────────────┐
│ MongoDB             │  ← Persistent storage
│ activity_logs       │
└─────────────────────┘
```

### 2. API Monitoring (Automatic)

```
API Request
     ↓
┌─────────────────────┐
│ Express Middleware  │  ← Intercepts all requests
│ observability.      │
│ middleware.js       │
└──────────┬──────────┘
           │ Non-blocking
           ↓
┌─────────────────────┐
│ Capture Metadata    │  ← Timing, size, status
│ - Start time        │
│ - Request size      │
│ - User context      │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│ API Route Handler   │  ← Original route (unchanged)
│ (Existing logic)    │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│ Response Sent       │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│ Calculate Metrics   │  ← Response time, size
│ - End time          │
│ - Response size     │
│ - Performance cat   │
└──────────┬──────────┘
           │ Async
           ↓
┌─────────────────────┐
│ Logging Queue       │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│ MongoDB             │
│ api_logs            │
└─────────────────────┘
```

### 3. Health Monitoring (Background)

```
System Health Monitor (Starts with server)
           ↓
┌─────────────────────┐
│ setInterval(30s)    │  ← Periodic checks
└──────────┬──────────┘
           │
           ├─────────────────────┐
           │                     │
           ↓                     ↓
┌──────────────────┐  ┌──────────────────┐
│ Check Database   │  │ Check System     │
│ - Connection     │  │ - CPU usage      │
│ - Latency        │  │ - Memory usage   │
│ - Storage        │  │ - Disk I/O       │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         └──────────┬──────────┘
                    │
                    ↓
         ┌──────────────────┐
         │ Determine Status │
         │ GREEN/YELLOW/RED │
         └────────┬─────────┘
                  │
                  ↓
         ┌──────────────────┐
         │ Logging Queue    │
         └────────┬─────────┘
                  │
                  ↓
         ┌──────────────────┐
         │ MongoDB          │
         │ health_checks    │
         └──────────────────┘
```

## Component Architecture

### Backend Structure

```
backend/src/
│
├─ models/observability/
│  ├─ ActivityLog.js      ← Immutable user actions
│  ├─ ApiLog.js           ← Immutable API requests
│  ├─ SystemMetric.js     ← Time-series metrics
│  ├─ HealthCheck.js      ← Component health
│  └─ CrashLog.js         ← Crash events
│
├─ services/observability/
│  ├─ loggingQueue.js     ← Async batch processor
│  ├─ activityLogger.js   ← Activity logging utils
│  └─ systemHealthMonitor.js ← Health checker
│
├─ middlewares/
│  └─ observability.middleware.js ← API interceptor
│
├─ controllers/observability/
│  ├─ admin.controller.js ← Admin panel APIs
│  └─ bios.controller.js  ← BIOS panel APIs
│
└─ routes/observability/
   ├─ admin.routes.js     ← /api/admin/*
   └─ bios.routes.js      ← /api/bios/*
```

### Frontend Applications

```
┌─────────────────────────────────────────┐
│          Main Dashboard (Port 3000)      │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  useActivityTracker()              │ │
│  │  ├─ Navigation tracking            │ │
│  │  ├─ Click tracking                 │ │
│  │  ├─ Error tracking                 │ │
│  │  └─ Queue batching                 │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         Admin Panel (Port 3001)          │
│                                          │
│  Pages:                                  │
│  ├─ Dashboard (metrics, health)          │
│  ├─ Activity Logs (filters, search)      │
│  ├─ API Logs (performance, errors)       │
│  ├─ Metrics (charts, graphs)             │
│  ├─ Bandwidth (per-user, per-endpoint)   │
│  └─ Crashes (timeline, diagnostics)      │
│                                          │
│  Components:                             │
│  ├─ Layout (sidebar, navigation)         │
│  ├─ Login (authentication)               │
│  └─ Charts (recharts)                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│          BIOS Panel (Port 3002)          │
│                                          │
│  Ultra-minimal single-page app           │
│  ├─ ASCII art interface                  │
│  ├─ Component status display             │
│  ├─ System resource metrics              │
│  └─ Crash timeline                       │
│                                          │
│  No dependencies except React            │
│  Inline styles (no Tailwind)             │
│  Works even if main app crashes          │
└─────────────────────────────────────────┘
```

## Database Schema

### Activity Logs (Immutable)

```
{
  _id: ObjectId,
  timestamp: Date (ms precision),
  userId: ObjectId → users,
  userRole: String,
  username: String,
  actionType: Enum[CLICK, NAVIGATION, FORM_SUBMIT, ...],
  route: String,
  previousRoute: String,
  elementId: String,
  elementType: String,
  entityType: String,
  entityId: String,
  ipAddress: String,
  userAgent: String,
  deviceType: Enum[mobile, tablet, desktop],
  browser: String,
  os: String,
  metadata: Mixed,
  category: Enum[CRITICAL, ACTIVITY, SYSTEM],
  sessionId: String,
  retentionTier: Enum[HOT, WARM, COLD]
}
```

### API Logs (Immutable)

```
{
  _id: ObjectId,
  timestamp: Date (ms precision),
  method: Enum[GET, POST, PUT, PATCH, DELETE],
  endpoint: String,
  fullUrl: String,
  userId: ObjectId → users,
  userRole: String,
  ipAddress: String,
  requestSize: Number (bytes),
  responseSize: Number (bytes),
  responseTime: Number (ms),
  statusCode: Number,
  bandwidthIn: Number,
  bandwidthOut: Number,
  isError: Boolean,
  error: String,
  errorStack: String,
  performanceCategory: Enum[FAST, NORMAL, SLOW, CRITICAL],
  category: Enum[CRITICAL, ACTIVITY, SYSTEM]
}
```

## Security Model

```
┌─────────────────────────────────────┐
│           Request Flow              │
└─────────────────────────────────────┘

Request → JWT Token → Role Check → Authorization
   │          │           │              │
   │          │           │              ↓
   │          │           │        ┌──────────┐
   │          │           │        │ Granted  │
   │          │           │        └────┬─────┘
   │          │           │             │
   │          │           │             ↓
   │          │           │        Access Resource
   │          │           │
   │          │           ↓
   │          │      ┌──────────┐
   │          │      │ Denied   │
   │          │      └────┬─────┘
   │          │           │
   │          │           ↓
   │          │      Log Attempt (CRITICAL)
   │          │
   │          ↓
   │     ┌──────────┐
   │     │ Invalid  │
   │     └────┬─────┘
   │          │
   │          ↓
   │     401 Unauthorized
   │
   ↓
No Token → 401 Unauthorized
```

## Performance Characteristics

### Logging Pipeline

```
User Action → Queue (0ms) → User continues
                │
                ↓ (async)
            Batch (1s)
                │
                ↓
            Process (50-100ms)
                │
                ↓
            MongoDB Insert
                │
                ↓
            Success/Retry
```

### API Request Flow

```
Request → Middleware (capture) → Route Handler → Response
  0ms         2-5ms                 varies          0ms
                │                                    │
                └────────────────────────────────────┘
                            async (10-15ms)
                                  ↓
                            Log to Queue
```

## Crash Resilience

```
┌─────────────────────────────────────────────┐
│        Independent Entry Points              │
└─────────────────────────────────────────────┘

Main App (3000)     Admin Panel (3001)     BIOS (3002)
      │                    │                     │
      │                    │                     │
      ✗ Crashes            │                     │
                           │                     │
                           ✓ Still Works         │
                                                 │
                                                 ✓ Still Works
                                                 │
                                                 Shows:
                                                 - Last known state
                                                 - Crash timeline
                                                 - Component status
```

## Summary

### Key Principles

1. **Isolation** - No modifications to existing code
2. **Non-blocking** - Never blocks user actions or APIs
3. **Asynchronous** - Queue-based with retry logic
4. **Immutable** - Logs cannot be edited or deleted
5. **Independent** - Entry points work independently
6. **Secure** - Role-based access control
7. **Observable** - Complete visibility into system

### Design Patterns Used

- **Middleware Pattern** - API interception
- **Queue Pattern** - Async batch processing
- **Observer Pattern** - Event tracking
- **Singleton Pattern** - Queue and monitor instances
- **Strategy Pattern** - Different logging strategies
- **Facade Pattern** - Simplified API interfaces

---

**Architecture Status:** ✅ Production Ready
**Last Updated:** February 2026
