# ✅ Installation & Verification Checklist

## Pre-Installation Checklist

- [ ] Backend server running (port 5000)
- [ ] Frontend dashboard running (port 3000)
- [ ] MongoDB connection confirmed
- [ ] Node.js version ≥ 14.x
- [ ] npm or yarn installed

---

## Installation Steps

### Step 1: Install Admin Panel Dependencies

```bash
cd admin
npm install
```

**Expected packages:**
- ✅ react@18.2.0
- ✅ react-router-dom@6.8.0
- ✅ axios@1.3.3
- ✅ recharts@2.5.0
- ✅ date-fns@2.29.3
- ✅ tailwindcss@3.2.7

**Verification:**
- [ ] `node_modules` folder created
- [ ] `package-lock.json` created
- [ ] No install errors

---

### Step 2: Install BIOS Panel Dependencies

```bash
cd ../bios
npm install
```

**Expected packages:**
- ✅ react@18.2.0
- ✅ react-dom@18.2.0
- ✅ axios@1.3.3

**Verification:**
- [ ] `node_modules` folder created
- [ ] `package-lock.json` created
- [ ] No install errors

---

### Step 3: Configure Backend (Already Done)

**Verify files exist:**
- [ ] `backend/src/models/observability/` (5 files)
- [ ] `backend/src/services/observability/` (3 files)
- [ ] `backend/src/middlewares/observability.middleware.js`
- [ ] `backend/src/controllers/observability/` (2 files)
- [ ] `backend/src/routes/observability/` (2 files)

**Verify integration:**
- [ ] `backend/src/app.js` has observability middleware
- [ ] `backend/src/app.js` has observability routes
- [ ] `backend/server.js` starts health monitor

---

### Step 4: Optional - Add Activity Tracking to Frontend

**Edit:** [frontend/src/App.js](frontend/src/App.js)

Add at the top:
```javascript
import useActivityTracker from './hooks/useActivityTracker';
```

Add inside `App` component:
```javascript
useActivityTracker();
```

**Verification:**
- [ ] Hook imported
- [ ] Hook called at top of App component
- [ ] No console errors

---

### Step 5: Start All Services

**Windows:**
```bash
start-observability.bat
```

**Unix/Linux/Mac:**
```bash
chmod +x start-observability.sh
./start-observability.sh
```

**Manual start (if scripts don't work):**

Terminal 1 - Backend:
```bash
cd backend
npm start
```

Terminal 2 - Main Dashboard:
```bash
cd frontend
npm start
```

Terminal 3 - Admin Panel:
```bash
cd admin
npm start
```

Terminal 4 - BIOS Panel:
```bash
cd bios
npm start
```

**Verification:**
- [ ] Backend shows: `📊 Observability system started`
- [ ] Frontend opens at http://localhost:3000
- [ ] Admin Panel opens at http://localhost:3001
- [ ] BIOS Panel opens at http://localhost:3002
- [ ] No startup errors in any terminal

---

## Post-Installation Verification

### Backend Health Check

**Test 1: Ping endpoint**
```bash
curl http://localhost:5000/api/bios/ping
```

**Expected:** `{"status":"ok"}`

- [ ] Response received
- [ ] Status is "ok"

---

**Test 2: Check observability middleware**

Look for backend console output:
```
📊 Observability system started
✓ Activity logging enabled
✓ API monitoring active
✓ System health monitor running
✓ Logging queue initialized (maxSize: 10000, batchSize: 100)
```

- [ ] All green checkmarks visible
- [ ] No error messages

---

### Frontend Verification

**Test 3: Access Main Dashboard**

1. Open http://localhost:3000
2. Login with your credentials
3. Navigate to different pages
4. Click some buttons

**Verification:**
- [ ] App loads normally
- [ ] No console errors
- [ ] Navigation works
- [ ] No performance degradation

---

**Test 4: Check browser console**

Look for:
```
[ActivityTracker] Activity tracker initialized
[ActivityTracker] Session started: xxx-xxx-xxx
```

- [ ] Tracker initialized message
- [ ] Session ID generated
- [ ] No errors

---

### Admin Panel Verification

**Test 5: Access Admin Panel**

1. Open http://localhost:3001
2. Login with admin credentials
   - Username: Your admin username
   - Password: Your admin password

**Verification:**
- [ ] Login page loads
- [ ] Can login successfully
- [ ] Redirected to dashboard

---

**Test 6: Check Dashboard**

On Admin Dashboard page:

**Health Status Cards:**
- [ ] Database shows GREEN
- [ ] Backend shows GREEN
- [ ] Logging Queue shows GREEN

**Key Metrics:**
- [ ] Total Activities shows number
- [ ] API Calls shows number
- [ ] Active Users shows number
- [ ] Error Rate shows percentage

**Bandwidth Display:**
- [ ] Total Bandwidth shows formatted size

**Top Endpoints Table:**
- [ ] Shows list of endpoints
- [ ] Shows call counts
- [ ] Shows average response times

---

**Test 7: Check Activity Logs**

Navigate to Activity Logs page:

**Filters:**
- [ ] Date range selector works
- [ ] Action type filter works
- [ ] Category filter works

**Table:**
- [ ] Shows list of activities
- [ ] Displays timestamps
- [ ] Shows user info
- [ ] Shows action details

**Pagination:**
- [ ] Page numbers visible
- [ ] Can navigate between pages

---

**Test 8: Check API Logs**

Navigate to API Logs page:

**Filters:**
- [ ] Method filter (GET, POST, etc.)
- [ ] Status code filter (200, 404, 500)
- [ ] Date range selector

**Table:**
- [ ] Shows endpoint URLs
- [ ] Shows response times
- [ ] Shows status codes
- [ ] Color-coded performance (🟢🟡🔴)

---

**Test 9: Check Bandwidth Page**

Navigate to Bandwidth page:

**Display:**
- [ ] Shows total bandwidth
- [ ] Shows per-user breakdown
- [ ] Shows bandwidth in/out
- [ ] Shows formatted sizes (KB, MB, GB)

---

### BIOS Panel Verification

**Test 10: Access BIOS Panel**

1. Open http://localhost:3002
2. Login with super admin credentials

**Verification:**
- [ ] ASCII art displays
- [ ] Login form shows
- [ ] Can login with super admin role

---

**Test 11: Check System Status**

On BIOS Panel:

**ASCII Display:**
- [ ] Shows SYSTEM STATUS title
- [ ] Shows current timestamp
- [ ] Shows uptime

**Component Status:**
- [ ] Database: [OK]/[WARN]/[FAIL]
- [ ] Backend: [OK]/[WARN]/[FAIL]
- [ ] Queue: [OK]/[WARN]/[FAIL]
- [ ] Disk: [OK]/[WARN]/[FAIL]

**System Resources:**
- [ ] Shows hostname
- [ ] Shows platform (Linux/Windows/Darwin)
- [ ] Shows CPU count
- [ ] Shows memory usage

**Auto-refresh:**
- [ ] Updates every 5 seconds
- [ ] Timestamp updates

---

## Functional Testing

### Test Activity Tracking

**Test 12: Generate Activity Logs**

1. Go to Main Dashboard (localhost:3000)
2. Navigate to different pages
3. Click various buttons
4. Submit a form
5. Wait 5 seconds

**Verification:**
- [ ] No console errors
- [ ] App remains responsive
- [ ] No slowdowns

**Check logs:**
1. Go to Admin Panel
2. Open Activity Logs page
3. Look for your recent activities

- [ ] Activities appear in logs
- [ ] Timestamps are recent
- [ ] Your username appears
- [ ] Actions are correctly categorized

---

### Test API Monitoring

**Test 13: Generate API Logs**

1. In Main Dashboard, perform actions that trigger API calls
2. Load user list
3. Create/update a record
4. Search for something

**Verification:**
- [ ] API calls complete normally
- [ ] No slowdowns
- [ ] No errors

**Check logs:**
1. Go to Admin Panel
2. Open API Logs page
3. Look for recent API calls

- [ ] API calls appear in logs
- [ ] Response times recorded
- [ ] Status codes correct
- [ ] Bandwidth calculated

---

### Test Health Monitoring

**Test 14: Check System Health**

**In Admin Panel Dashboard:**
- [ ] Database health shows GREEN
- [ ] Backend health shows GREEN
- [ ] Queue stats show:
  - Pending items
  - Processed total
  - Failed count (should be 0)

**In BIOS Panel:**
- [ ] All components show [OK]
- [ ] System resources display
- [ ] No errors or warnings

---

### Test Performance

**Test 15: Load Testing**

**Generate load:**
1. Open Main Dashboard in multiple tabs (3-5 tabs)
2. Navigate quickly in each tab
3. Perform actions simultaneously
4. Wait 10 seconds

**Verification:**
- [ ] All tabs remain responsive
- [ ] No errors in console
- [ ] API calls complete normally
- [ ] No crashes

**Check Admin Panel:**
1. Look at Activity Logs count
2. Look at API Logs count

- [ ] Logs from all tabs recorded
- [ ] No missing data
- [ ] Timestamps accurate

---

### Test Security

**Test 16: Role-Based Access**

**As Employee/Manager:**
1. Try to access Admin Panel (localhost:3001)
2. Try to access BIOS Panel (localhost:3002)

**Expected:**
- [ ] Cannot access Admin Panel (or read-only for manager)
- [ ] Cannot access BIOS Panel

**As Admin:**
1. Login to Admin Panel
2. Access all pages

**Expected:**
- [ ] Full access to Admin Panel
- [ ] Cannot access BIOS Panel

**As Super Admin:**
1. Login to Admin Panel
2. Login to BIOS Panel

**Expected:**
- [ ] Full access to Admin Panel
- [ ] Full access to BIOS Panel

---

### Test Error Handling

**Test 17: Trigger Frontend Error**

1. In Main Dashboard console:
```javascript
throw new Error('Test error');
```

**Verification:**
- [ ] Error caught
- [ ] App doesn't crash
- [ ] Error appears in Activity Logs

---

**Test 18: Trigger API Error**

1. Make invalid API call:
```javascript
fetch('http://localhost:5000/api/invalid-endpoint')
```

**Verification:**
- [ ] API returns error
- [ ] Error logged in API Logs
- [ ] isError flag set to true

---

### Test Data Integrity

**Test 19: Verify Immutability**

1. Go to MongoDB:
```javascript
use your_database_name
db.observability_activity_logs.findOne()
```

2. Try to update a log:
```javascript
db.observability_activity_logs.updateOne(
  { _id: ObjectId('...') },
  { $set: { actionType: 'HACKED' } }
)
```

**Expected:**
- [ ] Update fails or doesn't change data
- [ ] Error message about immutability

---

**Test 20: Check Timestamps**

Look at recent logs:
```javascript
db.observability_activity_logs.find().sort({timestamp: -1}).limit(5)
```

**Verification:**
- [ ] Timestamps are recent
- [ ] Timestamps have millisecond precision
- [ ] Timestamps are in correct order

---

## Production Readiness Checklist

### Configuration

- [ ] Environment variables set
- [ ] MongoDB connection string configured
- [ ] JWT secret configured
- [ ] CORS settings configured

### Security

- [ ] JWT tokens expire properly
- [ ] Role-based access enforced
- [ ] Sensitive data not logged
- [ ] HTTPS enabled (production only)

### Performance

- [ ] Logging queue doesn't overflow
- [ ] API response times acceptable (<200ms average)
- [ ] Memory usage stable
- [ ] No memory leaks

### Monitoring

- [ ] Health checks running every 30s
- [ ] Logs being written to database
- [ ] Auto-flush working (check every 1s)
- [ ] Batch processing working (100 logs per batch)

### Documentation

- [ ] All documentation files created
- [ ] Testing guide available
- [ ] Quick reference accessible
- [ ] Architecture diagram reviewed

---

## Troubleshooting

### Common Issues

**Issue: Admin Panel won't start**
- Check if port 3001 is available
- Run: `netstat -ano | findstr :3001` (Windows) or `lsof -i :3001` (Unix)
- Kill conflicting process or change port in admin/package.json

**Issue: BIOS Panel won't start**
- Check if port 3002 is available
- Same process as above

**Issue: Can't login to Admin Panel**
- Verify your user role is admin/super_admin/superadmin
- Check MongoDB: `db.users.findOne({username: 'your_username'})`
- Verify JWT token in localStorage

**Issue: No activity logs appearing**
- Check if useActivityTracker() is called in frontend/src/App.js
- Check browser console for errors
- Verify backend is receiving POST requests to /api/admin/log/activity

**Issue: High memory usage**
- Check logging queue size: `http://localhost:5000/api/admin/queue-stats`
- If queue is large, logs may be backing up
- Check MongoDB connection and write performance

**Issue: Health status showing YELLOW/RED**
- Check BIOS Panel for details
- Review specific component showing warning/failure
- Check MongoDB connectivity
- Check system resources (CPU, memory, disk)

---

## Success Criteria

### All Tests Passing ✅

- [ ] 20 functional tests completed
- [ ] All verification checkboxes checked
- [ ] No errors in consoles
- [ ] All three entry points accessible

### Performance Targets Met ✅

- [ ] API response time < 200ms average
- [ ] Activity tracking overhead < 10ms
- [ ] Memory usage stable over 1 hour
- [ ] No crashes or freezes

### Security Requirements Met ✅

- [ ] Role-based access enforced
- [ ] Unauthorized attempts logged
- [ ] Sensitive data protected
- [ ] Logs are immutable

---

## Next Steps

Once all checks pass:

1. **Production Deployment**
   - [ ] Deploy to production environment
   - [ ] Configure production MongoDB
   - [ ] Set production environment variables
   - [ ] Enable HTTPS

2. **Monitoring Setup**
   - [ ] Set up alerts for YELLOW/RED health status
   - [ ] Configure log retention policies
   - [ ] Set up automated backups
   - [ ] Create monitoring dashboards

3. **Team Training**
   - [ ] Train admins on Admin Panel usage
   - [ ] Train super admins on BIOS Panel
   - [ ] Document incident response procedures
   - [ ] Create runbooks for common issues

4. **Maintenance Schedule**
   - [ ] Weekly log review
   - [ ] Monthly performance analysis
   - [ ] Quarterly retention cleanup
   - [ ] Annual security audit

---

**Installation Guide Version:** 1.0
**Last Updated:** February 2026
**Status:** ✅ Ready for Production
