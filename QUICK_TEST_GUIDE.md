# 🎯 QUICK TEST GUIDE - 11 Features

## Login Credentials

### Manager (Full Permissions)
- **Email**: manager@company.com
- **Password**: Manager@123
- **Access**: Permissions menu, all features

### Employee (Limited Permissions)
- **Email**: employee@company.com  
- **Password**: Employee@123
- **Access**: Dashboard, Attendance, Tasks, Chat

### Caller (Basic Permissions)
- **Email**: caller@company.com
- **Password**: Caller@123
- **Access**: Dashboard, Chat, Tasks

### Content Manager (Content Permissions)
- **Email**: contentmanager@test.com
- **Password**: ContentMgr@123
- **Access**: Content, Content Calendar, Dashboard, Chat

---

## 🧪 TEST PROCEDURES

### TEST 1: Permission Page Load
1. Login as **Manager**
2. Click **🔐 Permissions** in sidebar
3. **Verify**: 5 role cards visible (Admin, Manager, Employee, Caller, Content Manager)
4. **Expected**: No errors, clean UI

### TEST 2: Toggle Permissions
1. From TEST 1, click **Employee** role
2. Find a red "NO" button
3. Click it → should turn green "YES"
4. **Verify**: Toast notification appears
5. Click again → should turn red "NO"
6. **Verify**: Toast notification appears

### TEST 3: Permission Counts
1. Click each role and count permissions:
   - **Admin**: 18 ✓
   - **Manager**: 18 ✓
   - **Content Manager**: 7 ✓
   - **Employee**: 6 ✓
   - **Caller**: 4 ✓

### TEST 4: Admin Protection
1. Click **Admin** role
2. Try to click any YES/NO button
3. **Verify**: Gets error "Cannot modify admin permissions"
4. **Verify**: Buttons show blue "YES" (locked state)

### TEST 5: Categories
1. Select any role
2. Scroll through and count categories:
   - Dashboard (2 perms) ✓
   - Attendance (3 perms) ✓
   - Tasks (3 perms) ✓
   - Content (4 perms) ✓
   - Employees (2 perms) ✓
   - Chat (2 perms) ✓
   - Settings (2 perms) ✓

### TEST 6: Sidebar Menu
1. Login as **Manager** → Permissions menu visible ✓
2. Logout, login as **Employee** → Permissions menu hidden ✓
3. Login as **Caller** → Permissions menu hidden ✓

### TEST 7: Dashboard
1. Login as **Manager** → See manager dashboard ✓
2. Logout, login as **Employee** → See employee dashboard with calendar ✓
3. Logout, login as **Caller** → See caller dashboard ✓

### TEST 8: Attendance
1. Login as **Employee**
2. Click **Attendance** in sidebar
3. **Verify**: Live clock shows ✓
4. **Verify**: Calendar widget visible ✓
5. **Verify**: Attendance table shows ✓

### TEST 9: Content Management
1. Login as **Admin** (has content_manager access)
2. Click **Content** in sidebar
3. **Verify**: Content page loads ✓
4. Try creating content (optional)
5. **Verify**: Content cards display ✓

### TEST 10: Employees
1. Login as **Manager**
2. Click **Employees** in sidebar
3. **Verify**: Employee list loads ✓
4. Try search bar (optional)
5. **Verify**: Employee detail view works ✓

### TEST 11: Chat
1. Open two browser tabs
2. Tab 1: Login as **Manager**
3. Tab 2: Login as **Employee**
4. Both click **Team Chat**
5. **Verify**: Both can see chat ✓
6. Manager sends message
7. **Verify**: Employee sees it in real-time ✓
8. Employee replies
9. **Verify**: Manager sees it in real-time ✓

---

## 🔍 Verification Checklist

### Each Feature Should Have:
- ✅ No JavaScript errors in console
- ✅ No network errors (all API calls succeed)
- ✅ Proper styling and layout
- ✅ Responsive design working
- ✅ Toast notifications showing
- ✅ Buttons clickable and responsive
- ✅ Data persisting on refresh
- ✅ No loading spinners stuck

---

## 📱 Browser DevTools Tips

### Check API Calls
1. Open DevTools (F12)
2. Go to **Network** tab
3. Perform action
4. Look for API call (should be **200 OK**)
5. Click request to see payload/response

### Check Console
1. Open DevTools (F12)
2. Go to **Console** tab
3. Should see NO red errors
4. Green logs are OK

### Check Local Storage
1. Open DevTools (F12)
2. Go to **Application** → **Local Storage**
3. Should see `token` stored
4. Permission state data stored

---

## 🚨 Troubleshooting

### Permission Page Won't Load
- Verify you're logged in as Manager/Admin
- Check browser console for errors
- Verify network tab shows 200 responses

### Toggle Buttons Not Working
- Check console for errors
- Verify API returns success (200)
- Try refresh
- Check if Admin role (cannot modify)

### Chat Not Real-time
- Open console, check for Socket.IO connection
- Verify both users connected
- Refresh page if needed

### Menu Item Missing
- Check your role (must be admin/manager)
- Verify sidebar updated
- Try logging out and in again

---

## ✅ All Systems Ready!

**Frontend**: http://localhost:3000  
**Backend**: http://localhost:5001  
**Network**: http://192.168.1.13:3000  

**Status**: 🟢 READY FOR TESTING

