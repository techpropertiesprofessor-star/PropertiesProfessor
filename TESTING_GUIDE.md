# 🧪 Observability System Testing Guide

## Pre-Test Setup

### 1. Install All Dependencies

```bash
# Backend (already done)
cd backend
npm install

# Admin Panel
cd admin
npm install

# BIOS Panel
cd bios
npm install
```

### 2. Start All Services

```bash
# Use startup script (Windows)
start-observability.bat

# OR Manual start
cd backend && npm start        # Terminal 1
cd frontend && npm start       # Terminal 2
cd admin && npm start          # Terminal 3
cd bios && npm start           # Terminal 4
```

### 3. Verify Services Running

- ✅ Backend: http://localhost:5000
- ✅ Frontend: http://localhost:3000
- ✅ Admin Panel: http://localhost:3001
- ✅ BIOS Panel: http://localhost:3002

---

## Test Suite 1: Backend Observability

### Test 1.1: Health Monitor Started
**Expected:** Console shows `📊 Observability system started`

```bash
# Check backend console
# Should see: "📊 Observability system started"
```

✅ Pass / ❌ Fail

### Test 1.2: BIOS Ping Endpoint
```bash
curl http://localhost:5000/api/bios/ping
```

**Expected Response:**
```json
{
  "success": true,
  "timestamp": "2026-02-04T...",
  "uptime": 123.45
}
```

✅ Pass / ❌ Fail

### Test 1.3: API Logging Middleware
1. Make any API call (e.g., GET /api/employees)
2. Check database: `observability_api_logs` collection
3. Should contain log entry with timing

**Verify:**
- Log entry exists
- Has response time
- Has status code
- Has endpoint name

✅ Pass / ❌ Fail

### Test 1.4: Queue Processing
```bash
# In backend console, should see periodic:
# [LoggingQueue] Processing batch...
```

✅ Pass / ❌ Fail

---

## Test Suite 2: Admin Panel

### Test 2.1: Access & Authentication

1. Go to http://localhost:3001
2. Login with admin credentials
3. Should redirect to dashboard

**Verify:**
- Login page loads
- Can enter credentials
- Successful authentication
- Dashboard loads

✅ Pass / ❌ Fail

### Test 2.2: Dashboard Metrics

**Verify dashboard shows:**
- [ ] System health status (components)
- [ ] Total API calls
- [ ] Error rate
- [ ] Average response time
- [ ] Active users
- [ ] Bandwidth usage
- [ ] Top endpoints table

✅ Pass / ❌ Fail

### Test 2.3: Activity Logs Page

1. Click "Activity Logs" in sidebar
2. Page should load with logs

**Verify:**
- [ ] Logs table displays
- [ ] Filters work (action type, category)
- [ ] Search works
- [ ] Pagination works
- [ ] Refresh button works

✅ Pass / ❌ Fail

### Test 2.4: API Logs Page

1. Click "API Logs" in sidebar
2. Page should load with API logs

**Verify:**
- [ ] API logs display
- [ ] Method filter works
- [ ] Status code filter works
- [ ] Shows response times
- [ ] Shows bandwidth

✅ Pass / ❌ Fail

### Test 2.5: Bandwidth Page

1. Click "Bandwidth" in sidebar
2. Should show bandwidth by user

**Verify:**
- [ ] User list displays
- [ ] Shows data in/out
- [ ] Shows total bandwidth
- [ ] Time range selector works

✅ Pass / ❌ Fail

### Test 2.6: Auto-Refresh

1. Stay on dashboard
2. Wait 30 seconds
3. Metrics should update automatically

✅ Pass / ❌ Fail

---

## Test Suite 3: BIOS Panel

### Test 3.1: Access & Authentication

1. Go to http://localhost:3002
2. Should see BIOS-style login
3. Login with super admin credentials

**Verify:**
- [ ] BIOS interface loads
- [ ] ASCII art displays
- [ ] Authentication required
- [ ] Super admin check works

✅ Pass / ❌ Fail

### Test 3.2: System Status Display

**Verify BIOS shows:**
- [ ] Overall status (GREEN/YELLOW/RED)
- [ ] System uptime
- [ ] Component status list
- [ ] Database status
- [ ] Backend status
- [ ] System resources (CPU, memory)

✅ Pass / ❌ Fail

### Test 3.3: Component Health

**Verify each component shows:**
- [ ] Status indicator (OK/WARN/FAIL)
- [ ] Response time
- [ ] Status message

✅ Pass / ❌ Fail

### Test 3.4: Auto-Refresh

1. Watch BIOS panel
2. Should refresh every 5 seconds
3. Status should update

✅ Pass / ❌ Fail

---

## Test Suite 4: Activity Tracking

### Test 4.1: Add Tracker to Frontend

1. Open `frontend/src/App.js`
2. Add at top of component:
```javascript
import { useActivityTracker } from './hooks/useActivityTracker';

function App() {
  useActivityTracker(); // Add this line
  // ... rest
}
```
3. Save and restart frontend

✅ Pass / ❌ Fail

### Test 4.2: Navigation Tracking

1. Navigate to different pages in dashboard:
   - Dashboard → Employees
   - Employees → Tasks
   - Tasks → Dashboard
2. Go to Admin Panel → Activity Logs
3. Should see NAVIGATION entries

**Verify:**
- [ ] Navigation events logged
- [ ] Shows route changes
- [ ] Shows previous route
- [ ] Timestamp is accurate

✅ Pass / ❌ Fail

### Test 4.3: Click Tracking

1. Click various buttons in dashboard
2. Check Admin Panel → Activity Logs
3. Filter by "CLICK" action type

**Verify:**
- [ ] Click events logged
- [ ] Shows button text/ID
- [ ] Shows correct route
- [ ] Non-blocking (UI smooth)

✅ Pass / ❌ Fail

### Test 4.4: Error Tracking

1. In browser console, type:
```javascript
throw new Error('Test error');
```
2. Check Admin Panel → Activity Logs
3. Filter by "ERROR" action type

**Verify:**
- [ ] Error logged
- [ ] Shows error message
- [ ] Shows stack trace
- [ ] Category is CRITICAL

✅ Pass / ❌ Fail

---

## Test Suite 5: API Monitoring

### Test 5.1: Automatic API Logging

1. Make 10 different API calls (browse dashboard)
2. Go to Admin Panel → API Logs
3. Should see all 10 requests

**Verify:**
- [ ] All requests logged
- [ ] Correct endpoints
- [ ] Response times shown
- [ ] Status codes correct

✅ Pass / ❌ Fail

### Test 5.2: Error API Logging

1. Make request to non-existent endpoint:
```javascript
fetch('http://localhost:5000/api/nonexistent')
```
2. Check Admin Panel → API Logs
3. Filter by "Errors Only"

**Verify:**
- [ ] 404 error logged
- [ ] Shows as error
- [ ] Response time recorded

✅ Pass / ❌ Fail

### Test 5.3: Bandwidth Tracking

1. Make several API calls
2. Go to Admin Panel → Bandwidth
3. Your user should show data usage

**Verify:**
- [ ] Your username appears
- [ ] Shows data in/out
- [ ] Shows total bandwidth
- [ ] Request count correct

✅ Pass / ❌ Fail

---

## Test Suite 6: Performance & Stability

### Test 6.1: Non-Blocking Logging

1. Open browser DevTools → Network
2. Make API call
3. Check response time

**Expected:** Response time should be similar to before (~10-20ms overhead max)

✅ Pass / ❌ Fail

### Test 6.2: Queue Handling

1. Make 100+ rapid requests (refresh page multiple times quickly)
2. Check Admin Panel → Queue Stats (if available)
3. All logs should eventually be processed

**Verify:**
- [ ] No logs dropped
- [ ] Queue size manageable
- [ ] Processing completes

✅ Pass / ❌ Fail

### Test 6.3: High Load

1. Open multiple browser tabs
2. Navigate rapidly in each
3. Make many API calls

**Expected:**
- [ ] Dashboard remains responsive
- [ ] Logging doesn't slow down app
- [ ] No errors in console

✅ Pass / ❌ Fail

---

## Test Suite 7: Security & Access Control

### Test 7.1: Admin Panel Access

**Test with different roles:**

1. **Employee role:**
   - Login to Admin Panel
   - Should see "Admin access required"
   
2. **Manager role:**
   - Login to Admin Panel
   - Should have read-only access
   
3. **Admin role:**
   - Login to Admin Panel
   - Should have full access

✅ Pass / ❌ Fail

### Test 7.2: BIOS Panel Access

**Test with different roles:**

1. **Admin role:**
   - Login to BIOS Panel
   - Should see "Super admin access required"
   
2. **Super Admin role:**
   - Login to BIOS Panel
   - Should have full access

✅ Pass / ❌ Fail

### Test 7.3: Unauthorized Access Logging

1. Try to access admin panel as employee
2. Check database: `observability_activity_logs`
3. Should have log entry with denied access

**Verify:**
- [ ] Access attempt logged
- [ ] Shows user who tried
- [ ] Category is CRITICAL

✅ Pass / ❌ Fail

---

## Test Suite 8: Crash Resilience

### Test 8.1: Frontend Crash

1. In main dashboard (port 3000), trigger error:
```javascript
// In browser console
throw new Error('Simulated crash');
```
2. Admin Panel (port 3001) should still work
3. BIOS Panel (port 3002) should still work

**Verify:**
- [ ] Admin Panel accessible
- [ ] BIOS Panel accessible
- [ ] Error logged in Admin Panel

✅ Pass / ❌ Fail

### Test 8.2: Backend Temporary Error

1. Stop MongoDB temporarily
2. Try making API call
3. Check BIOS Panel

**Expected:**
- [ ] BIOS shows RED status for database
- [ ] Other components still monitored
- [ ] BIOS panel remains accessible

✅ Pass / ❌ Fail

### Test 8.3: Independent Entry Points

1. Open all three URLs:
   - http://localhost:3000 (Dashboard)
   - http://localhost:3001 (Admin)
   - http://localhost:3002 (BIOS)
2. Close dashboard tab
3. Admin and BIOS should keep working

✅ Pass / ❌ Fail

---

## Test Suite 9: Data Integrity

### Test 9.1: Immutable Logs

1. Access MongoDB
2. Try to update an activity log
3. Should fail with error

```javascript
// In MongoDB
db.observability_activity_logs.updateOne(
  {}, 
  { $set: { actionType: "MODIFIED" } }
)
// Expected: Error
```

✅ Pass / ❌ Fail

### Test 9.2: Log Timestamps

1. Check multiple logs in Admin Panel
2. Verify millisecond precision
3. Timestamps should be accurate

✅ Pass / ❌ Fail

---

## Test Suite 10: Integration Verification

### Test 10.1: Existing Dashboard Unchanged

1. Navigate through entire dashboard
2. All features should work exactly as before
3. No new bugs introduced

**Verify all existing features work:**
- [ ] Employee management
- [ ] Task management
- [ ] Lead management
- [ ] Calendar
- [ ] Chat
- [ ] Inventory
- [ ] All existing pages load

✅ Pass / ❌ Fail

### Test 10.2: No Existing API Modified

1. Check all existing API endpoints
2. Responses should be identical
3. No new fields in responses

✅ Pass / ❌ Fail

### Test 10.3: Database Isolation

1. Check MongoDB collections
2. New collections should have `observability_` prefix
3. No existing collections modified

**New collections:**
- `observability_activity_logs`
- `observability_api_logs`
- `observability_system_metrics`
- `observability_health_checks`
- `observability_crash_logs`

✅ Pass / ❌ Fail

---

## 📊 Test Results Summary

### Total Tests: 37

**Test Results:**
- ✅ Passed: _____ / 37
- ❌ Failed: _____ / 37
- ⏭️ Skipped: _____ / 37

### Critical Issues Found:
_List any critical issues here_

### Non-Critical Issues Found:
_List any minor issues here_

### Overall Status:
- [ ] ✅ All tests passed - Production ready
- [ ] ⚠️ Minor issues - Ready with warnings
- [ ] ❌ Critical issues - Needs fixes

---

## 🐛 Common Issues & Solutions

### Issue: Admin Panel won't load

**Solution:**
```bash
cd admin
rm -rf node_modules package-lock.json
npm install
npm start
```

### Issue: Activity logs not appearing

**Solution:**
1. Verify `useActivityTracker()` is called in App.js
2. Check browser console for errors
3. Verify token is valid
4. Check backend `/api/admin/log/activity` endpoint

### Issue: BIOS shows "Access denied"

**Solution:**
- Only super admin can access BIOS
- Check user role in database
- Update user role if needed

### Issue: Queue processing slow

**Solution:**
- Check database connection
- Increase batch size in `loggingQueue.js`
- Check server resources

---

## ✅ Sign-Off

**Tested by:** _____________
**Date:** _____________
**Status:** ✅ Approved / ❌ Rejected / ⚠️ Conditional

**Notes:**
_Add any additional notes here_

---

**Next Steps:**
1. Fix any critical issues found
2. Document minor issues for future enhancement
3. Deploy to production if all tests pass
4. Monitor system in production
5. Set up alerts (future enhancement)
