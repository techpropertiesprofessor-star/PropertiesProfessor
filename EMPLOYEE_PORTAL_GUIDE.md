# Employee Portal - Quick Guide

## 🎯 What's Been Implemented

### 1. **Employee Account Created**
- **Email**: `caller@company.com`
- **Password**: `Caller@123`
- **Role**: Caller (Employee)
- **Name**: John Caller

### 2. **Geolocation-Based Attendance** ✅
- Employee MUST be within **50 meters** of office to mark attendance
- Automatic location detection using browser GPS
- Visual alerts showing:
  - ✅ Green: Within range (can check-in/out)
  - ⚠️ Yellow: Outside range with distance shown
- Office location set to: `28.7041°N, 77.1025°E` (Delhi - **update in AttendancePage.js**)

**To Update Office Location:**
Edit `/frontend/src/pages/AttendancePage.js`:
```javascript
const COMPANY_LAT = 28.7041; // Your office latitude
const COMPANY_LNG = 77.1025; // Your office longitude
const RADIUS_METERS = 50;    // Allowed radius
```

### 3. **Data Assignment & Calling System** ✅
Employee portal shows:
- **Data Assigned**: List of leads assigned by manager
- **Click-to-Call**: Click phone number to dial directly
- **Company/Contact Info**: Full lead details visible

### 4. **Remark System with Slider Options** ✅
After calling, employee can:
- Add **detailed notes/remarks** (required)
- Set **follow-up date** (optional)
- Select response status:
  - ✅ **Interested** (Green)
  - ❌ **Not Interested** (Red)
  - 📞 **Busy** (Yellow)
  - 🔌 **Switched Off** (Gray)
  - ❓ **Wrong Number** (Blue)
  - 📅 **Callback Later** (Purple)

### 5. **Sample Test Data**
3 leads assigned to the employee:
1. Rajesh Kumar - ABC Properties (Delhi)
2. Priya Sharma - XYZ Builders (Mumbai)
3. Amit Patel - PQR Realty (Ahmedabad)

## 🚀 How to Test

### Employee Login Flow:
1. Open frontend: `http://localhost:3000/login`
2. Login with:
   - Email: `caller@company.com`
   - Password: `Caller@123`
3. Navigate to **Attendance**:
   - Browser will ask for location permission → **Allow it**
   - If within 50m radius: ✅ Green message + can check-in
   - If outside: ⚠️ Yellow warning with distance
4. Navigate to **Callers** (or "Data Assignment"):
   - See 3 assigned leads
   - Click phone number to dial
   - Click "Update" button
   - Add remarks in text box
   - Optionally set follow-up date
   - Click status button (Interested/Busy/etc.)
   - Response saved!

### Admin Login Flow:
1. Login with:
   - Email: `admin@company.com`
   - Password: `Admin@123`
2. Admin can:
   - View all employees at `/employees`
   - Assign tasks
   - Import CSV/Excel data
   - Approve leave requests
   - View caller responses

## 📋 Manager Functions (Already Built)

Managers can assign data via API:
```http
POST /api/callers/import
Content-Type: multipart/form-data
Authorization: Bearer <manager-token>

file: leads.csv
assigned_to: 2  (employee ID)
```

## 🔧 Configuration Notes

1. **Update Office Location** in `AttendancePage.js` (lines 10-12)
2. **Browser Location Permission** required for attendance
3. **Phone number format**: System supports any format; clicking dials via `tel:` protocol
4. **Data Assignment**: Manager imports CSV/Excel → assigns to callers

## 🎨 UI Features
- **Professional gradient cards** for caller info
- **Color-coded status badges** (6 response types)
- **Click-to-call** phone numbers
- **Required remark field** before submission
- **Location status alerts** (green/yellow)
- **Mobile-responsive** design

## 🔐 Security
- Geolocation validated client-side (can add server-side validation)
- JWT token authentication
- Role-based access (caller vs manager vs admin)

## Next Steps
1. Test with actual office coordinates
2. Add more employees via admin portal
3. Import real CSV data for callers
4. Set up production deployment

---
**All servers running on:**
- Backend: http://localhost:5001
- Frontend: http://localhost:3000
- PostgreSQL: localhost:5432
