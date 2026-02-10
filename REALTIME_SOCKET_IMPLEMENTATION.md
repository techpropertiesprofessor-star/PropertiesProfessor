# Real-time Socket.IO Implementation Guide

## Overview
This document describes the Socket.IO implementation for real-time employee profile and permission management in the Real Estate CRM system.

## Features Implemented

### 1. Real-time Permission Updates
- Managers can toggle employee permissions from the employee profile page
- Changes reflect instantly without page reload
- Permission updates are broadcast to affected employees and all managers

### 2. Online Status Tracking
- Real-time display of employee online/offline status
- Green dot indicator for online employees
- Gray dot indicator for offline employees
- Last seen timestamp for offline employees
- Status updates broadcast to all managers

### 3. Employee Profile Updates
- Any changes to employee data broadcast in real-time
- Managers see updates on their dashboards instantly
- Employees see their own profile updates immediately

## Backend Implementation

### Models Enhanced

#### Employee Model (`backend/src/models/Employee.js`)
Added fields for real-time tracking:
```javascript
{
  permissions: [{ type: String }],  // Array of page permissions
  isOnline: { type: Boolean, default: false },  // Current online status
  lastSeen: { type: Date },  // Last activity timestamp
  socketId: { type: String }  // Socket.IO connection ID
}
```

### Controllers Enhanced

#### Employee Controller (`backend/src/controllers/employee.controller.js`)

**New Functions:**

1. **updateOnlineStatus** - Updates employee online/offline status
   - Called when employee connects/disconnects
   - Emits `employee-status-changed` event to all managers
   - Updates `isOnline`, `lastSeen`, and `socketId` fields

2. **getEmployeeWithStatus** - Retrieves employee with real-time status
   - Checks if employee is currently online (last seen < 5 minutes)
   - Returns formatted status text ("Online", "Last seen 5 minutes ago", etc.)
   - Used for detailed employee views

**Enhanced Functions:**

1. **updateEmployee** - Enhanced with Socket.IO emission
   - Emits `permissions-updated` to specific employee via socketId
   - Emits `employee-updated` to all managers
   - Includes error handling for socket emission failures

### Routes Added

#### Employee Routes (`backend/src/routes/employee.routes.js`)
```javascript
// Online status update (accessible by all authenticated users)
router.put('/status/online', auth, employeeController.updateOnlineStatus);

// Get employee with real-time status
router.get('/:id/status', auth, employeeController.getEmployeeWithStatus);
```

### Socket.IO Events

#### Emitted Events:

1. **permissions-updated** (Targeted)
   - Sent to specific employee when their permissions change
   - Payload:
     ```javascript
     {
       employeeId: String,
       permissions: Array<String>,
       updatedAt: Date
     }
     ```

2. **employee-updated** (Broadcast)
   - Sent to all managers when any employee data changes
   - Payload:
     ```javascript
     {
       employeeId: String,
       employee: Object,
       updatedBy: String,
       timestamp: Date
     }
     ```

3. **employee-status-changed** (Broadcast)
   - Sent to all managers when employee online status changes
   - Payload:
     ```javascript
     {
       employeeId: String,
       isOnline: Boolean,
       lastSeen: Date,
       timestamp: Date
     }
     ```

## Frontend Implementation

### Components Enhanced

#### EmployeesPage (`frontend/src/pages/EmployeesPage.js`)

**Socket.IO Connection:**
```javascript
useEffect(() => {
  const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
    auth: {
      token: localStorage.getItem('token')
    }
  });
  
  // Event listeners...
  
  return () => {
    socket.disconnect();
  };
}, []);
```

**Event Listeners:**

1. **permissions-updated** - Updates employeeDetails when permissions change
2. **employee-updated** - Reloads employee data when any field changes
3. **employee-status-changed** - Updates online status indicators

**UI Enhancements:**

1. **Online Status Indicator**
   - Green dot for online employees
   - Gray dot for offline employees
   - Positioned at bottom-right of avatar

2. **Last Seen Status**
   - Shows "● Online" for online employees
   - Shows "Last seen [timestamp]" for offline employees
   - Updates in real-time

## Permission Pages

The following pages can be enabled/disabled for each employee:

1. Dashboard
2. Employees
3. Attendance
4. Leads
5. Tasks
6. Profile
7. Inventory
8. Announcements
9. Notes
10. Content
11. Content Calendar
12. Leave Request
13. Caller

## How It Works

### Permission Update Flow:

1. **Manager Action**: Manager toggles permission switch on employee profile
2. **API Call**: Frontend calls `PUT /api/employees/:id` with new permissions
3. **Database Update**: Backend updates Employee document in MongoDB
4. **Socket Emission**: Backend emits two events:
   - `permissions-updated` to specific employee (if online)
   - `employee-updated` to all managers
5. **Frontend Update**: 
   - Employee's sidebar navigation updates immediately
   - Manager's employee list refreshes
   - No page reload required

### Online Status Flow:

1. **Employee Login**: Frontend establishes Socket.IO connection
2. **Status Update**: Frontend calls `PUT /api/employees/status/online`
3. **Database Update**: Backend sets `isOnline: true`, stores `socketId`
4. **Broadcast**: Backend emits `employee-status-changed` to all managers
5. **UI Update**: Green dot appears on employee's avatar

### Offline Detection:

1. **Socket Disconnect**: Employee's socket connection closes
2. **Status Update**: Backend sets `isOnline: false`, updates `lastSeen`
3. **Broadcast**: Backend emits `employee-status-changed`
4. **UI Update**: Gray dot appears, shows "Last seen" timestamp

## Testing

### Manual Testing Steps:

1. **Test Permission Updates:**
   ```bash
   # Terminal 1: Login as Manager (Shivam Kumar)
   - Navigate to Employees page
   - Click on employee "Nishant kumar"
   - Toggle "Dashboard" permission OFF
   - Observe: Toggle switches immediately, no spinner/reload
   
   # Terminal 2: Login as Employee (Nishant kumar)
   - Keep Dashboard page open
   - When permission is toggled OFF by manager
   - Observe: Sidebar navigation updates, Dashboard link disappears
   - Try accessing /dashboard route
   - Observe: Redirected to home page (permission denied)
   ```

2. **Test Online Status:**
   ```bash
   # Terminal 1: Login as Manager
   - Navigate to Employees page
   - Open employee profile for "Nishant kumar"
   - Observe: Gray dot (offline)
   
   # Terminal 2: Login as Employee (Nishant kumar)
   - Login to system
   - Wait 2-3 seconds
   
   # Terminal 1: Check Manager View
   - Observe: Green dot appears on avatar
   - Observe: "● Online" text below email
   
   # Terminal 2: Logout or close browser
   - Close browser tab
   
   # Terminal 1: Check Manager View
   - Wait 5 seconds
   - Observe: Gray dot appears
   - Observe: "Last seen [timestamp]" text
   ```

3. **Test Real-time Updates:**
   ```bash
   # Terminal 1 & 2: Both as managers
   - Both navigate to Employees page
   - Terminal 1: Change employee role from EMPLOYEE to MANAGER
   - Terminal 2: Observe employee list auto-refreshes
   - Verify: Both see same role immediately
   ```

### Browser Console Testing:

```javascript
// Check Socket.IO connection
localStorage.debug = 'socket.io-client:socket';

// Reload page and check console
// Should see: "socket.io-client:socket connecting to http://localhost:5000"

// Verify connection
const socket = io('http://localhost:5000');
socket.on('connect', () => console.log('Connected:', socket.id));

// Test event listening
socket.on('permissions-updated', data => console.log('Permissions:', data));
socket.on('employee-updated', data => console.log('Employee:', data));
socket.on('employee-status-changed', data => console.log('Status:', data));
```

## API Endpoints

### Employee Status

**Update Online Status**
```http
PUT /api/employees/status/online
Authorization: Bearer <token>
Content-Type: application/json

{
  "employeeId": "697e5bf46269911e67d2b42a",
  "isOnline": true,
  "socketId": "abc123xyz"
}
```

**Get Employee with Status**
```http
GET /api/employees/:id/status
Authorization: Bearer <token>

Response:
{
  "_id": "697e5bf46269911e67d2b42a",
  "name": "Nishant kumar",
  "isOnline": true,
  "lastSeen": "2025-02-02T22:21:51.000Z",
  "isCurrentlyOnline": true,
  "statusText": "Online"
}
```

**Update Employee Permissions**
```http
PUT /api/employees/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "permissions": ["Dashboard", "Attendance", "Leads"]
}

Response:
{
  "_id": "697e5bf46269911e67d2b42a",
  "name": "Nishant kumar",
  "permissions": ["Dashboard", "Attendance", "Leads"],
  "updatedAt": "2025-02-02T22:21:51.000Z"
}
```

## Security

### Role-Based Access Control:

- **ADMIN**: Full access to all employee management features
- **MANAGER**: Can view and modify EMPLOYEE permissions
- **EMPLOYEE**: Can only view their own profile, cannot modify permissions
- **CALLER**: Limited access, no permission management

### Socket.IO Authentication:

- JWT token passed in Socket.IO handshake
- Token validated on connection
- Unauthorized connections rejected

### Permission Checks:

1. **Backend**: Role middleware validates user role before allowing updates
2. **Frontend**: UI disables permission toggles for non-managers
3. **Routes**: Each route protected with auth and role middleware

## Environment Variables

```env
# Backend (.env)
MONGODB_URI=mongodb://localhost:27017/crm
PORT=5000
JWT_SECRET=your_jwt_secret_key

# Frontend (.env)
REACT_APP_API_URL=http://localhost:5000
```

## Troubleshooting

### Socket.IO Not Connecting

**Issue**: Frontend shows "socket.io-client:socket connect_error"

**Solutions**:
1. Check backend is running on port 5000
2. Verify CORS settings in backend server.js
3. Check JWT token is valid: `localStorage.getItem('token')`
4. Verify Socket.IO server initialized: `const io = require('socket.io')(server)`

### Permissions Not Updating

**Issue**: Permission toggle changes but UI doesn't update

**Solutions**:
1. Check Socket.IO connection: `socket.connected`
2. Verify employee has socketId in database
3. Check browser console for event emissions
4. Verify employeeId matches in event payload

### Online Status Not Changing

**Issue**: Employee shows offline even when logged in

**Solutions**:
1. Check `updateOnlineStatus` API is called on login
2. Verify `socketId` is stored in database
3. Check socket connection is maintained
4. Verify `employee-status-changed` event is emitted

## Performance Considerations

### Socket.IO Connection Management:

- **Single Connection**: One socket connection per browser tab
- **Auto-Reconnect**: Socket.IO handles reconnection automatically
- **Heartbeat**: Default 25-second heartbeat interval

### Event Throttling:

- Permission updates: No throttling needed (infrequent user action)
- Status updates: 5-minute threshold for online detection
- Employee list refresh: Debounced on frontend

### Database Queries:

- **Indexed Fields**: `_id`, `email`, `socketId`
- **Selective Updates**: Only update changed fields
- **Efficient Queries**: Use `findByIdAndUpdate` with `{ new: true }`

## Future Enhancements

1. **Presence System**:
   - Show which managers are viewing same employee
   - Real-time collaboration indicators

2. **Typing Indicators**:
   - Show when someone is editing employee data
   - Prevent concurrent edit conflicts

3. **Activity Feed**:
   - Real-time log of all employee changes
   - "Manager X updated permissions for Employee Y"

4. **Push Notifications**:
   - Browser notifications for important changes
   - Email notifications for permission changes

5. **Audit Trail**:
   - Track who changed what and when
   - Stored in separate AuditLog collection

## Success Criteria

✅ Manager can toggle employee permissions  
✅ Changes reflect instantly without page reload  
✅ Online status indicator shows green when employee is active  
✅ Multiple managers see same updates simultaneously  
✅ Socket.IO connection resilient to network issues  
✅ No console errors in browser or server  
✅ Permission changes persist in database  
✅ Unauthorized users cannot modify permissions  

## Conclusion

The Socket.IO implementation provides a robust real-time communication system for employee management. Permission updates, online status tracking, and profile changes all happen instantly across all connected clients, creating a seamless user experience.

The system is secure, performant, and scalable, with proper role-based access control and error handling throughout.
