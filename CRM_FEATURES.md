# Real Estate CRM System

## 🚀 New Features Added

### 1. **Lead Management System**
Complete lead lifecycle management with Excel/CSV upload capability.

#### Features:
- **Excel Upload** with flexible column mapping
  - Supports variations: "Name", "Client Name", "Customer Name", etc.
  - Auto-detects and normalizes lead types, property types, BHK
  - Duplicate detection by phone number
  - Batch tracking with upload history
  
- **Lead Assignment**
  - **Round-Robin**: Automatically distributes leads evenly among callers
  - **Manual Assignment**: Assign leads to specific employees
  - **No Assignment**: Upload without immediate assignment
  
- **Advanced Filtering**
  - Search by name, phone, email
  - Filter by status (New, Contacted, Qualified, Interested, Site Visit, Negotiation, Closed, Lost)
  - Filter by category (Hot 🔥, Warm 🟠, Cold 🔵)
  - Filter by lead type (Buyer, Seller, Tenant, Owner)
  - Filter by property type (Residential, Commercial, Plot, Villa)
  - Filter by BHK (1 BHK, 2 BHK, 3 BHK, 4+ BHK)
  - Filter by location
  - Filter by budget range (min/max)

#### API Endpoints:
```
POST   /api/leads/upload          - Upload Excel/CSV file
GET    /api/leads                 - List all leads (with filters)
GET    /api/leads/:id             - Get lead details
PUT    /api/leads/:id             - Update lead
POST   /api/leads/:id/assign      - Manually assign lead
GET    /api/leads/uploads/history - View upload history
```

---

### 2. **Inventory Management System**
Hierarchical property inventory (Projects → Towers → Units).

#### Features:
- **Multi-level Structure**
  - Projects (e.g., DLF Cyber City, M3M Golf Estate)
  - Towers (buildings within projects)
  - Units (individual flats with complete details)
  
- **Comprehensive Search**
  - Search by project
  - Filter by status (Available, On Hold, Booked, Sold)
  - Filter by BHK configuration
  - Filter by budget range
  - Filter by area range (sq.ft)
  - Filter by location/city
  - Filter by keys location (With Us, With Owner, With Tenant, Broker)
  - Filter by facing direction
  - Filter by furnished status
  
- **Unit Details**
  - Carpet area, built-up area, super area
  - Base price, final price, price per sq.ft
  - Floor number, unit number
  - Keys location tracking
  - Owner information
  - RERA number
  - Parking slots

#### API Endpoints:
```
GET    /api/inventory/projects              - List projects
POST   /api/inventory/projects              - Create project
GET    /api/inventory/projects/:id/towers   - List towers in project
POST   /api/inventory/projects/:id/towers   - Create tower
GET    /api/inventory/search                - Search units (advanced filters)
GET    /api/inventory/units/:id             - Get unit details
POST   /api/inventory/units                 - Create unit
PUT    /api/inventory/units/:id             - Update unit
GET    /api/inventory/stats                 - Get inventory statistics
```

---

### 3. **Database Schema**

#### New Tables Created:
1. **leads** - Complete lead data with 30+ fields
2. **lead_activities** - Call logs, meetings, site visits
3. **lead_comments** - Internal notes and comments
4. **upload_history** - Excel import tracking
5. **projects** - Property projects
6. **towers** - Buildings within projects
7. **inventory_units** - Individual units
8. **inventory_price_history** - Price change tracking
9. **assignment_rules** - Configurable assignment logic
10. **assignment_history** - Assignment audit trail
11. **round_robin_counter** - Round-robin state tracking
12. **daily_metrics** - Performance analytics

---

## 📁 File Structure

### Backend
```
backend/src/
├── routes/
│   ├── leads.js          ✅ NEW - Lead management
│   └── inventory.js      ✅ NEW - Inventory management
└── config/
    └── crm_schema_update.sql  ✅ NEW - Database schema
```

### Frontend
```
frontend/src/
├── pages/
│   ├── LeadsPage.js      ✅ NEW - Lead list & filters
│   └── InventoryPage.js  ✅ NEW - Inventory search
├── components/
│   ├── LeadUpload.js     ✅ NEW - Excel upload UI
│   └── Sidebar.js        ✅ UPDATED - Added CRM menu items
└── api/
    └── client.js         ✅ UPDATED - Added leadAPI & inventoryAPI
```

---

## 🎯 How to Use

### Upload Leads from Excel

1. Navigate to **Leads** page
2. Click "📤 Upload Leads"
3. Select Excel/CSV file (.xlsx, .xls, .csv)
4. Choose assignment method:
   - **Round Robin** - Auto-distribute evenly
   - **Manual** - Specify employee ID
   - **None** - Upload without assignment
5. Click "Upload Leads"
6. View results: Total rows, Inserted, Duplicates, Errors

### Search Inventory

1. Navigate to **Inventory** page
2. View overall statistics (Total, Available, Hold, Booked, Sold)
3. Set filters:
   - Select project
   - Set budget range (e.g., ₹50L - ₹1Cr)
   - Set area range (e.g., 1000-1500 sq.ft)
   - Select BHK (1/2/3/4 BHK)
   - Select status
   - Enter location
4. Click "🔍 Search"
5. View matching units in table
6. Click "View" for detailed unit information

---

## 🔑 Supported Excel Column Names

The system flexibly maps various Excel column names:

### Name Fields:
- "Name", "Client Name", "Customer Name", "Lead Name"

### Phone Fields:
- "Phone", "Mobile", "Contact", "Phone Number", "Mobile Number"

### Lead Type:
- "Lead Type", "Type", "Client Type"
- Values: Buyer, Seller, Tenant, Owner

### Property Type:
- "Property Type", "Type of Property"
- Values: Residential, Commercial, Plot, Villa

### BHK:
- "BHK", "Bedroom", "Configuration"
- Auto-normalizes: 1BHK → 1 BHK, 2bhk → 2 BHK, etc.

### Budget:
- "Budget", "Price", "Expected Price"

### Location:
- "Location", "Area", "Locality", "City"

---

## 👥 Role-Based Access

### Admin
- Upload leads
- View all leads
- Assign leads manually
- Create projects/towers/units
- Update inventory

### Manager
- Upload leads
- View all leads
- Assign leads manually
- Create projects/towers/units
- Update inventory

### Caller
- View assigned leads only
- Search inventory
- Update lead status
- Add comments/activities

---

## 📊 Database Highlights

### Lead Data Includes:
- Basic info (name, phone, email)
- Lead classification (type, property type, category, priority)
- Property preferences (BHK, budget, location)
- Source tracking (MagicBricks, 99acres, broker, etc.)
- Assignment tracking
- Follow-up scheduling
- Data quality scoring

### Inventory Data Includes:
- Project hierarchy
- Complete unit specifications
- Price tracking with history
- Keys location tracking
- Owner information
- Status management
- RERA compliance data

---

## 🚦 Status Workflow

### Lead Status:
New → Contacted → Qualified → Interested → Site Visit → Negotiation → Closed/Lost

### Lead Category:
- **Hot** 🔥 - High priority, ready to close
- **Warm** 🟠 - Interested, needs nurturing
- **Cold** 🔵 - Low priority, long-term

### Unit Status:
Available → Hold → Booked → Sold

---

## 🛠️ Technical Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL 16
- **Excel Processing**: xlsx library
- **File Upload**: multer
- **Frontend**: React 18, Tailwind CSS
- **Authentication**: JWT with role-based access

---

## ✅ Testing Checklist

- [x] Database schema created (12 tables)
- [x] Backend routes integrated (leads + inventory)
- [x] Frontend pages created (Leads + Inventory)
- [x] Upload component created
- [x] API client methods added
- [x] Sidebar navigation updated
- [x] Routes configured in App.js
- [x] Backend server running on port 5001
- [ ] Test Excel upload with sample data
- [ ] Test round-robin assignment
- [ ] Test inventory search filters
- [ ] Test lead filtering
- [ ] Add sample projects/towers/units

---

## 📝 Next Steps

### Phase 1 (Current) - Core Functionality ✅
- [x] Excel upload
- [x] Lead management
- [x] Inventory search
- [x] Assignment engine

### Phase 2 - Enhanced Features
- [ ] Lead activity logging (calls, meetings)
- [ ] Follow-up automation
- [ ] Caller workspace (today's leads, scripts)
- [ ] Analytics dashboard
- [ ] Document management

### Phase 3 - Advanced Features
- [ ] WhatsApp integration
- [ ] Call dialer integration
- [ ] AI-based lead scoring (with tokens)
- [ ] Performance reports
- [ ] Email notifications

---

## 🎨 UI Color Codes

### Lead Categories:
- Hot: Red (bg-red-100, text-red-700)
- Warm: Orange (bg-orange-100, text-orange-700)
- Cold: Blue (bg-blue-100, text-blue-700)

### Lead Status:
- New: Green
- Contacted: Blue
- Qualified: Purple
- Interested: Yellow
- Site Visit: Indigo
- Negotiation: Orange
- Closed: Dark Green
- Lost: Red

### Inventory Status:
- Available: Green
- Hold: Yellow
- Booked: Blue
- Sold: Gray

### Keys Location:
- With Us: Green
- With Owner: Blue
- With Tenant: Purple
- Broker: Orange

---

## 📞 Support

For issues or questions, contact the development team.

**Version**: 1.0.0  
**Last Updated**: December 2024
