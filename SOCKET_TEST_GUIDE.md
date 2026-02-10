# Socket.IO Real-time Updates - Quick Test Guide

## Prerequisites
✅ Backend running on port 5000  
✅ Frontend running on port 3000  
✅ MongoDB connected  
✅ At least 2 users: 1 Manager, 1 Employee  

## Test Credentials

### Manager Account
- **Email**: shivam@example.com
- **Password**: shivam123
- **Role**: MANAGER

### Employee Account
- **Email**: nishant@example.com  
- **Password**: nishant123
- **Role**: EMPLOYEE

## Quick Test Scenarios

### Test 1: Real-time Permission Updates (2 minutes)

**Setup:**
1. Open Browser 1 (Chrome): Login as Manager (shivam@example.com)
2. Open Browser 2 (Firefox/Incognito): Login as Employee (nishant@example.com)

**Steps:**

**Browser 1 (Manager):**
```
1. Navigate to "Employees" page
2. Click on "Nishant kumar" employee card
3. Scroll to "Permission Page" section
4. Toggle "Dashboard" permission OFF
   ✅ Expected: Toggle switches immediately (no loading spinner)
```

**Browser 2 (Employee):**
```
1. Keep any page open (e.g., Dashboard)
2. Watch the sidebar navigation
   ✅ Expected: "Dashboard" menu item disappears immediately
   ✅ Expected: No page reload, sidebar updates in real-time
3. Try to navigate to /dashboard manually
   ✅ Expected: Redirected to home page (permission denied)
```

**Browser 1 (Manager):**
```
1. Toggle "Dashboard" permission back ON
   ✅ Expected: Toggle switches immediately
```

**Browser 2 (Employee):**
```
1. Watch the sidebar
   ✅ Expected: "Dashboard" menu item reappears immediately
   ✅ Expected: Can now access Dashboard page
```

**Result**: ✅ PASS if permissions update in real-time without page reload

---

### Test 2: Online Status Indicator (3 minutes)

**Setup:**
1. Browser 1: Login as Manager (shivam@example.com)
2. Browser 2: Keep closed initially

**Steps:**

**Browser 1 (Manager):**
```
1. Navigate to "Employees" page
2. Click on "Nishant kumar" employee
3. Observe avatar area
   ✅ Expected: Gray dot on bottom-right of avatar
   ✅ Expected: "Offline" or "Last seen [time]" text below email
```

**Browser 2 (Employee):**
```
1. Login as nishant@example.com
2. Wait 2-3 seconds
```

**Browser 1 (Manager):**
```
1. Check Nishant's profile (no need to refresh)
   ✅ Expected: Green dot appears on avatar
   ✅ Expected: "● Online" text below email
   ✅ Expected: Change happens automatically (no refresh)
```

**Browser 2 (Employee):**
```
1. Close browser tab or logout
```

**Browser 1 (Manager):**
```
1. Wait 5 seconds
2. Observe Nishant's profile
   ✅ Expected: Green dot changes to gray
   ✅ Expected: "Last seen [timestamp]" appears
   ✅ Expected: Timestamp shows recent time (< 1 minute ago)
```

**Result**: ✅ PASS if online status updates in real-time

---

### Test 3: Multi-Manager Real-time Sync (2 minutes)

**Setup:**
1. Browser 1: Login as Manager (shivam@example.com)
2. Browser 2: Login as another Manager account

**Steps:**

**Both Browsers:**
```
1. Navigate to "Employees" page
2. Both open "Nishant kumar" employee profile
```

**Browser 1 (Manager 1):**
```
1. Change employee role: EMPLOYEE → MANAGER
2. Click "Update"
   ✅ Expected: Role updates immediately
```

**Browser 2 (Manager 2):**
```
1. Observe employee profile (no refresh needed)
   ✅ Expected: Role badge changes to "MANAGER" automatically
   ✅ Expected: Permission section updates (managers have all permissions)
```

**Browser 1 (Manager 1):**
```
1. Toggle "Leads" permission OFF for Nishant
```

**Browser 2 (Manager 2):**
```
1. Observe permission toggles
   ✅ Expected: "Leads" toggle switches to OFF automatically
   ✅ Expected: Both managers see same state
```

**Result**: ✅ PASS if multiple managers see synchronized updates

---

### Test 4: Browser Console Verification (1 minute)

**Setup:**
1. Login as any user
2. Open Browser DevTools (F12)

**Steps:**

```javascript
// In Console tab:

// 1. Enable Socket.IO debug logs
localStorage.debug = 'socket.io-client:socket';

// 2. Reload page (Ctrl+R)
// ✅ Expected console output:
// "socket.io-client:socket connecting to http://localhost:5000"
// "socket.io-client:socket connect"

// 3. Check connection status
// (Socket should be available if EmployeesPage is open)
// Look for: "Connected: [socket-id]"

// 4. Listen for events manually:
window.addEventListener('permissions-updated', (e) => {
  console.log('Permissions updated:', e.detail);
});

// 5. Navigate to Employees page
// Toggle a permission
// ✅ Expected: Console shows event data
```

**Result**: ✅ PASS if Socket.IO connection established and events received

---

## Troubleshooting

### Issue: Socket.IO not connecting

**Check:**
```powershell
# Terminal 1: Verify backend is running
netstat -ano | findstr :5000

# Should show LISTENING on port 5000
```

**Browser Console:**
```javascript
// Check for connection errors
// Should NOT see: "socket.io-client:socket connect_error"
```

**Solution:**
1. Restart backend: `cd d:\pro_test\backend; node server.js`
2. Clear browser cache (Ctrl+Shift+Del)
3. Check JWT token: `localStorage.getItem('token')` (should not be null)

---

### Issue: Permissions not updating

**Check Backend Logs:**
```powershell
# In backend terminal, look for:
# "Socket emission error:" (should NOT appear)
```

**Check Database:**
```javascript
// In MongoDB Compass or shell:
db.employees.findOne({ email: "nishant@example.com" })

// Check fields:
// - socketId: should have value when online
// - permissions: should be array of strings
// - updatedAt: should be recent timestamp
```

**Solution:**
1. Verify employee has socketId in database
2. Check browser console for event emissions
3. Ensure employeeId matches in API responses

---

### Issue: Online status stuck

**Check:**
```javascript
// In MongoDB:
db.employees.findOne({ email: "nishant@example.com" })

// Check:
// - isOnline: true/false
// - lastSeen: recent timestamp
// - socketId: not null when online
```

**Solution:**
1. Call status update API manually:
```javascript
fetch('http://localhost:5000/api/employees/status/online', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    employeeId: 'your-employee-id',
    isOnline: true,
    socketId: 'test-socket-id'
  })
});
```

2. Verify response is 200 OK

---

## Quick Verification Checklist

Before testing, verify:

- [ ] Backend server running (green ✅ in terminal)
- [ ] Frontend dev server running (http://localhost:3000)
- [ ] MongoDB connected (✅ MongoDB Connected in backend logs)
- [ ] Can login as manager and employee
- [ ] Employees page loads without errors
- [ ] Browser console shows no red errors

During testing, verify:

- [ ] Socket.IO connection established (check browser console)
- [ ] Permission toggles work (click switches without errors)
- [ ] Changes reflect immediately (no page reload needed)
- [ ] Online status indicator appears (green/gray dot)
- [ ] Multiple browsers stay synchronized
- [ ] Backend logs show no socket errors

After testing, verify:

- [ ] Database shows updated permissions
- [ ] Database shows correct online status
- [ ] No memory leaks (refresh page, check socket disconnects)
- [ ] Backend still running (no crashes)

---

## Success Metrics

**Performance:**
- ⚡ Permission updates: < 500ms latency
- ⚡ Online status updates: < 1 second
- ⚡ Socket connection: < 2 seconds on page load

**Reliability:**
- 🔒 No socket errors in backend logs
- 🔒 No console errors in browser
- 🔒 Updates persist in database
- 🔒 Unauthorized users cannot modify permissions

**User Experience:**
- ✨ No page reloads required
- ✨ Instant visual feedback on actions
- ✨ Accurate online status indicators
- ✨ Synchronized views across managers

---

## API Testing (Optional)

### Test Permission Update API

```bash
# PowerShell
$token = "your-jwt-token-here"
$employeeId = "697e5bf46269911e67d2b42a"

# Update permissions
Invoke-RestMethod -Uri "http://localhost:5000/api/employees/$employeeId" `
  -Method PUT `
  -Headers @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  } `
  -Body '{"permissions":["Dashboard","Attendance"]}'

# Expected response:
# {
#   "_id": "697e5bf46269911e67d2b42a",
#   "name": "Nishant kumar",
#   "permissions": ["Dashboard", "Attendance"],
#   "updatedAt": "2025-02-02T22:21:51.000Z"
# }
```

### Test Online Status API

```bash
# Update online status
Invoke-RestMethod -Uri "http://localhost:5000/api/employees/status/online" `
  -Method PUT `
  -Headers @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
  } `
  -Body "{`"employeeId`":`"$employeeId`",`"isOnline`":true,`"socketId`":`"test123`"}"

# Expected response:
# {
#   "message": "Status updated",
#   "employee": { ... }
# }
```

### Test Get Employee Status

```bash
# Get employee with status
Invoke-RestMethod -Uri "http://localhost:5000/api/employees/$employeeId/status" `
  -Method GET `
  -Headers @{
    "Authorization" = "Bearer $token"
  }

# Expected response:
# {
#   "_id": "697e5bf46269911e67d2b42a",
#   "name": "Nishant kumar",
#   "isOnline": true,
#   "isCurrentlyOnline": true,
#   "statusText": "Online"
# }
```

---

## Video Demo Script

If you want to record a demo:

**Script (3 minutes):**

```
[00:00] "Welcome! Today we're demonstrating real-time employee management with Socket.IO."

[00:10] "I'm logged in as a manager. Let me open the Employees page."
[Show: Employee list]

[00:20] "I'll click on this employee, Nishant kumar."
[Show: Employee profile with permissions]

[00:30] "Notice the gray dot? This employee is currently offline."

[00:35] "Now watch as I toggle the Dashboard permission OFF."
[Action: Click toggle, show instant change]

[00:40] "See how it changed immediately? No loading, no page refresh."

[00:50] "Now let me login as this employee in another browser."
[Show: Split screen, login as employee]

[01:00] "Look at the manager's view - the green dot appeared automatically!"
[Show: Green dot on avatar]

[01:10] "And if I check the employee's sidebar..."
[Show: Dashboard link missing]

[01:15] "The Dashboard link is gone! He lost access instantly."

[01:25] "Let me toggle it back ON from the manager view."
[Action: Toggle ON]

[01:30] "And boom! The Dashboard link reappears immediately."
[Show: Dashboard link back in sidebar]

[01:40] "This works for multiple managers too. Any change one manager makes..."
[Action: Open third browser as another manager]

[01:50] "...is instantly synchronized across all managers viewing the same employee."

[02:00] "When the employee logs out..."
[Action: Close employee browser]

[02:05] "...the status changes to offline automatically with last seen timestamp."
[Show: Gray dot, "Last seen 5 seconds ago"]

[02:15] "All of this happens in real-time, with no page reloads, using Socket.IO."

[02:25] "Thank you for watching!"
```

---

## Next Steps

After successful testing:

1. ✅ Update production environment variables
2. ✅ Deploy backend with Socket.IO enabled
3. ✅ Update frontend build with Socket.IO client
4. ✅ Configure CORS for production domain
5. ✅ Set up monitoring for Socket.IO connections
6. ✅ Add analytics for real-time feature usage
7. ✅ Train users on new real-time features

---

## Support

If you encounter issues during testing:

1. **Check logs**: Backend terminal shows detailed Socket.IO logs
2. **Browser console**: Shows connection status and events
3. **Network tab**: Shows WebSocket upgrade requests
4. **Database**: Verify data is being updated

For further assistance, check:
- [REALTIME_SOCKET_IMPLEMENTATION.md](./REALTIME_SOCKET_IMPLEMENTATION.md) - Full technical documentation
- Backend logs in terminal
- Browser DevTools Console and Network tabs
