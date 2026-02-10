# 🧪 Manager Analytics Dashboard - Testing Guide
# टेस्टिंग गाइड - चरण दर चरण

---

## ✅ STEP 1: Backend Start करें

### Terminal खोलें और Backend चलाएं:

```bash
cd D:\pro_test\backend
npm start
```

**Expected Output:**
```
🚀 Server running on port 5000
📊 Manager Analytics socket handler initialized
```

✅ अगर ये messages दिखें तो backend सही से setup हो गया है!

---

## ✅ STEP 2: Frontend Start करें

### दूसरा Terminal खोलें:

```bash
cd D:\pro_test\frontend
npm start
```

**Expected Output:**
```
Compiled successfully!
webpack compiled with 1 warning
```

Browser automatically खुलेगा: `http://localhost:3000`

---

## 🔐 STEP 3: Manager Account से Login करें

### Option A: Existing Manager Account
अगर आपके पास पहले से manager account है:
1. Email/username enter करें
2. Password डालें
3. Login button click करें

### Option B: Create Manager Account (अगर नहीं है)

**Terminal में (backend folder से):**
```bash
cd D:\pro_test\backend
node create_admin.js
```

Or manually MongoDB में:
```javascript
// MongoDB Compass या mongo shell में:
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "manager" } }
)
```

---

## 📊 STEP 4: Analytics Dashboard खोलें

Login होने के बाद:

### Method 1: Sidebar Link से
1. देखें left sidebar में
2. **"📊 Analytics"** link दिखाई देगा (सिर्फ managers को)
3. Click करें

### Method 2: Direct URL
Browser address bar में type करें:
```
http://localhost:3000/manager/analytics
```

---

## ✅ STEP 5: Dashboard Verify करें

Dashboard खुलने पर ये दिखना चाहिए:

### Header Section:
```
✅ "Manager Analytics Dashboard" heading
✅ "Real-time insights and performance metrics"
✅ Green dot (🟢) "Live Updates Active"
✅ "🔄 Reload All" button
```

### KPI Cards (5 cards):
```
1. 👥 Active Employees
2. ✓ Total Tasks
3. 🎯 Total Leads
4. 📦 Inventory Items
5. 📞 Calls Today
```

### Alerts Section:
```
✅ "Alerts & Exceptions" heading
✅ Alert items या "All clear! No alerts"
```

### Charts (8 charts):
```
1. Task Status Overview (Donut chart)
2. Leads Funnel (Bar chart)
3. Employee Task Load (Horizontal bars)
4. Lead Source Analysis (Bars with conversion rates)
5. Inventory Status (Pie chart)
6. Call Activity (Last 7 Days - Line chart)
```

---

## 🧪 STEP 6: Features Test करें

### A. Individual Refresh Test
हर chart के ऊपर **🔄 Refresh** button है:
1. किसी भी chart का refresh button click करें
2. Chart update होना चाहिए
3. Console में check करें (F12):
   ```
   [ANALYTICS_HOOK] Refresh taskStatus
   ```

### B. Reload All Test
Top-right में **🔄 Reload All** button:
1. Click करें
2. सभी charts reload होने चाहिए
3. Loading spinner दिखना चाहिए

### C. Connection Status Test
Top-right में dot check करें:
- 🟢 Green = Connected
- 🔴 Red = Disconnected

### D. Real-time Updates Test (Advanced)

**दूसरी browser window में:**
1. Same application खोलें
2. Employee account से login करें
3. कोई task create/update करें

**Analytics Dashboard में:**
- Task charts automatically update होने चाहिए
- Debounce के कारण 1-2 seconds में

---

## 🔒 STEP 7: Access Control Test करें

### Test 1: Non-Manager Access
1. Logout करें
2. Employee account से login करें
3. Sidebar में "Analytics" link **नहीं दिखना चाहिए**

### Test 2: Direct URL Protection
Employee से login होकर:
1. Type करें: `http://localhost:3000/manager/analytics`
2. Access denied या redirect होना चाहिए

---

## 🌐 STEP 8: Backend API Test करें

### Postman या cURL से:

#### A. Get All Analytics (सही token के साथ)
```bash
curl -X GET http://localhost:5000/api/manager-analytics/all \
  -H "Authorization: Bearer YOUR_MANAGER_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "taskStatus": [...],
    "employeeLoad": [...],
    "leadsFunnel": [...],
    ...
  }
}
```

#### B. Test Role Enforcement (employee token से)
```bash
curl -X GET http://localhost:5000/api/manager-analytics/all \
  -H "Authorization: Bearer EMPLOYEE_TOKEN"
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Access denied. Manager privileges required."
}
```

**Status Code:** 403 Forbidden

---

## 🔍 STEP 9: Console Logs Check करें

### Frontend Console (Browser F12):
```javascript
[ANALYTICS_HOOK] Socket connected
[ANALYTICS_HOOK] Manager Analytics socket connected
```

### Backend Console:
```
🟢 Socket connected: <socket-id>
[MANAGER_ANALYTICS_SOCKET] Manager <user-id> connected
📊 Manager Analytics socket handler initialized
```

---

## ❌ STEP 10: Error Cases Test करें

### Test 1: No Data
अगर database empty है:
- Charts में "No data available" message दिखना चाहिए
- Error नहीं होना चाहिए

### Test 2: Network Failure
1. Backend stop करें (Ctrl+C)
2. Dashboard में connection status red (🔴) हो जाना चाहिए
3. Error message: "Unable to connect to server"

### Test 3: Unauthorized Access
1. Logout करें
2. Direct URL try करें
3. Login page पर redirect होना चाहिए

---

## 📊 STEP 11: Data Verification

### Database में Data Check करें:

**MongoDB Compass या Mongo Shell:**
```javascript
// Tasks count
db.tasks.countDocuments()

// Leads count
db.leads.countDocuments()

// Employees count
db.employees.countDocuments({ status: 'active' })

// Inventory count
db.inventories.countDocuments()
```

Dashboard में same numbers दिखने चाहिए।

---

## 🚀 STEP 12: Real-Time Updates Enable करें (Optional)

अगर real-time updates चाहिए:

### Task Controller में Add करें:
```javascript
// File: backend/src/controllers/taskController.js

// Top पर import करें:
const managerAnalyticsSocket = require('../sockets/manager.analytics.socket');

// createTask function में:
exports.createTask = async (req, res) => {
  try {
    const newTask = await Task.create(taskData);
    
    // ✨ ADD THIS:
    const io = req.app.get('io');
    if (io) {
      managerAnalyticsSocket.emitTaskUpdate(io, newTask);
    }
    
    res.status(201).json({ success: true, data: newTask });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

Similar pattern में और controllers में भी add करें।

---

## ✅ Success Checklist

Test करने के बाद ये सब ✅ होना चाहिए:

- [ ] Backend successfully start हो रहा है
- [ ] Frontend compile हो रहा है (warnings OK)
- [ ] Manager login हो सकता है
- [ ] Sidebar में "Analytics" link दिख रहा है (manager को)
- [ ] Dashboard खुल रहा है
- [ ] सभी 8 charts load हो रहे हैं
- [ ] KPI cards data show कर रहे हैं
- [ ] Connection status "Live Updates Active" है
- [ ] Individual refresh buttons काम कर रहे हैं
- [ ] "Reload All" button काम कर रहा है
- [ ] Employee को Analytics link नहीं दिख रहा
- [ ] Direct URL से employee access नहीं कर सकता
- [ ] Backend API 403 return कर रहा है (employee के लिए)
- [ ] Console में errors नहीं हैं

---

## 🐛 Troubleshooting

### Problem 1: "Cannot find module 'recharts'"
**Solution:**
```bash
cd frontend
npm install recharts socket.io-client
```

### Problem 2: Dashboard नहीं खुल रहा
**Check:**
1. Browser console में errors देखें (F12)
2. Backend running है?
3. Manager role सही है database में?

### Problem 3: Charts empty हैं
**Check:**
1. MongoDB में data है?
2. Backend console में errors?
3. Network tab में API calls check करें

### Problem 4: Real-time updates काम नहीं कर रहे
**Check:**
1. Socket connection green है?
2. Backend में socket handler initialized है?
3. Console में socket logs आ रहे हैं?

### Problem 5: "Access denied" error
**Check:**
1. User role "manager" है? (lowercase)
2. Token valid है?
3. Backend middleware correctly configured है?

---

## 📱 Testing URLs

Dashboard तक पहुँचने के सभी ways:

```
Main Dashboard:
→ http://localhost:3000/manager/analytics

Backend APIs:
→ http://localhost:5000/api/manager-analytics/all
→ http://localhost:5000/api/manager-analytics/task-status
→ http://localhost:5000/api/manager-analytics/kpis
→ http://localhost:5000/api/manager-analytics/alerts
```

---

## 🎯 Quick Test Commands

सब एक साथ test करने के लिए:

```bash
# Terminal 1: Backend
cd D:\pro_test\backend && npm start

# Terminal 2: Frontend  
cd D:\pro_test\frontend && npm start

# Terminal 3: Test API
curl http://localhost:5000/api/manager-analytics/all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📞 Support

अगर कोई issue हो:

1. **Backend Console** check करें
2. **Browser Console (F12)** check करें
3. **Network Tab** में API calls देखें
4. **MongoDB** में data verify करें
5. Documentation files पढ़ें:
   - `MANAGER_ANALYTICS_INTEGRATION_GUIDE.md`
   - `MANAGER_ANALYTICS_QUICK_START.js`

---

## ✨ Testing Complete!

सब कुछ work कर रहा है तो:
- ✅ Module successfully implemented
- ✅ Ready for production use
- ✅ No breaking changes to existing code

**Happy Testing! 🎉**

