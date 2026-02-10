# Real Estate CRM System - Technical Architecture

## System Architecture Diagram (Draw.io Format)

Copy the text below and paste it into Draw.io (File → Import → Text → Paste):

```
# Real Estate CRM - System Architecture

## Frontend Layer
React Application [Port 3000]
  |
  ├─> Authentication Module
  ├─> Dashboard Module
  ├─> Attendance Module
  ├─> Task Management Module
  ├─> Lead Management Module (Manager/Admin Only)
  ├─> Inventory Module
  └─> Employee Module (Manager/Admin Only)

## API Layer
Express.js Backend [Port 5001]
  |
  ├─> Authentication Routes (/api/auth)
  ├─> Employee Routes (/api/employees)
  ├─> Attendance Routes (/api/attendance)
  ├─> Task Routes (/api/tasks)
  ├─> Lead Routes (/api/leads)
  ├─> Inventory Routes (/api/inventory)
  ├─> Caller Routes (/api/callers)
  └─> Notification Routes (/api/notifications)

## Database Layer
PostgreSQL 16 [Database: realestate_dashboard]
  |
  ├─> Employee Tables (employees, documents)
  ├─> Attendance Tables (attendance, leave_requests)
  ├─> Task Tables (tasks, task_comments)
  ├─> Lead Tables (leads, lead_activities, lead_comments, upload_history)
  ├─> Inventory Tables (projects, towers, inventory_units, inventory_price_history)
  ├─> Assignment Tables (assignment_rules, assignment_history, round_robin_counter)
  └─> Metrics Tables (daily_metrics)

## Real-time Layer
Socket.IO
  |
  ├─> Task Assignment Events
  ├─> Notification Events
  └─> Real-time Updates

## File Storage
Local File System
  |
  ├─> /uploads/leads (Excel/CSV files)
  └─> /uploads/documents (Employee documents)

## External Dependencies
Node.js v24.11.0
Express.js v4.18.2
PostgreSQL v16
React v18
Socket.IO v4.7.2
```

---

## Minimal Black & White Architecture for Draw.io

Use this simplified structure for a clean diagram:

### Box Structure:
```
┌─────────────────────────┐
│   FRONTEND (React)      │
│   Port: 3000            │
└───────────┬─────────────┘
            │ HTTP/REST
            ↓
┌─────────────────────────┐
│   BACKEND (Express.js)  │
│   Port: 5001            │
└───────────┬─────────────┘
            │ SQL
            ↓
┌─────────────────────────┐
│   DATABASE (PostgreSQL) │
│   Database: realestate  │
└─────────────────────────┘
```

---

## Component Checklist (For Tracking Progress)

### ✅ COMPLETED COMPONENTS

#### 1. Authentication System
- [✅] Login/Logout
- [✅] JWT Token Management
- [✅] Role-based Access Control (Admin, Manager, Caller)
- [✅] Password Hashing (bcryptjs)
- [✅] Protected Routes

#### 2. Employee Management
- [✅] Employee Registration
- [✅] Employee Profile Management
- [✅] Document Upload
- [✅] Role Assignment
- [✅] Employee Listing (Admin/Manager only)

#### 3. Attendance System
- [✅] Check-in/Check-out
- [✅] Attendance History
- [✅] Monthly Reports
- [✅] Leave Requests
- [✅] Leave Approval/Rejection

#### 4. Task Management
- [✅] Task Creation
- [✅] Task Assignment
- [✅] Task Status Updates
- [✅] Task Comments
- [✅] Task Pinning
- [✅] Active/Backlog Views
- [✅] Auto-archive System
- [✅] Task Statistics

#### 5. Lead Management (CRM)
- [✅] Excel/CSV Upload
- [✅] Flexible Column Mapping
- [✅] Duplicate Detection
- [✅] Round-robin Assignment
- [✅] Manual Assignment
- [✅] Lead Filtering (Status, Category, Type, Budget, Location)
- [✅] Lead Details View
- [✅] Upload History Tracking
- [✅] Manager/Admin Only Access

#### 6. Inventory Management
- [✅] Project Management
- [✅] Tower Management
- [✅] Unit Management (Flats)
- [✅] Advanced Search Filters (Budget, Area, BHK, Location)
- [✅] Keys Location Tracking
- [✅] Price History Tracking
- [✅] Inventory Statistics Dashboard
- [✅] Unit Status Management (Available, Hold, Booked, Sold)

#### 7. Database Schema
- [✅] 23 Tables Created
- [✅] 19+ Indexes for Performance
- [✅] Proper Foreign Key Relations
- [✅] Audit Fields (created_at, updated_at)

#### 8. Real-time Features
- [✅] Socket.IO Integration
- [✅] Real-time Task Notifications
- [✅] Real-time Assignment Updates

---

### ⏳ PENDING COMPONENTS

#### 9. Media Management (Phase 2)
- [ ] Photo Upload for Units
- [ ] Video Upload for Units
- [ ] Media Gallery View
- [ ] WhatsApp Share Integration
- [ ] Image/Video Storage (S3/Cloudinary)

#### 10. Lead Activities (Phase 2)
- [ ] Call Logging
- [ ] Meeting Scheduling
- [ ] Site Visit Tracking
- [ ] Activity Timeline
- [ ] Follow-up Reminders

#### 11. Analytics Dashboard (Phase 2)
- [ ] Daily Metrics View
- [ ] Performance Reports
- [ ] Conversion Tracking
- [ ] Source Analysis
- [ ] Employee Performance Metrics

#### 12. Caller Workspace (Phase 2)
- [ ] Today's Leads View
- [ ] Call Scripts
- [ ] Quick Follow-up
- [ ] Daily Target Tracking

#### 13. Advanced Features (Phase 3)
- [ ] WhatsApp API Integration
- [ ] Call Dialer Integration
- [ ] Email Notifications
- [ ] SMS Notifications
- [ ] AI-based Lead Scoring
- [ ] Automated Follow-ups

---

## Technology Stack Dependencies

### Frontend
```
React 18
  ├─> react-router-dom (Routing)
  ├─> axios (API Client)
  ├─> date-fns (Date Handling)
  ├─> Tailwind CSS (Styling)
  └─> react-icons (Icons)
```

### Backend
```
Node.js 24.11.0
  └─> Express.js 4.18.2
      ├─> cors (CORS Handling)
      ├─> helmet (Security)
      ├─> dotenv (Environment Variables)
      ├─> jsonwebtoken (JWT Auth)
      ├─> bcryptjs (Password Hashing)
      ├─> multer (File Upload)
      ├─> xlsx (Excel Processing)
      ├─> pg (PostgreSQL Client)
      └─> socket.io (Real-time)
```

## Module Dependency Graph

```
Authentication
    ↓
Employee Management
    ↓
Attendance System
    ↓
Task Management
    ↓
Lead Management (CRM)
    ↓
Inventory Management
    ↓
Analytics & Reporting (Pending)
    ↓
Media Management (Pending)
    ↓
Integration Layer (Pending)
```

---

## API Endpoint Map

### Authentication APIs
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/profile
- POST /api/auth/verify-token

### Employee APIs
- GET /api/employees
- GET /api/employees/:id
- PUT /api/employees/:id
- POST /api/employees/:id/documents
- GET /api/employees/:id/documents

### Attendance APIs
- POST /api/attendance/check-in
- POST /api/attendance/check-out
- GET /api/attendance/history/mine
- GET /api/attendance/:employeeId
- POST /api/attendance/leave-request
- GET /api/attendance/leave-requests/mine

### Task APIs
- POST /api/tasks
- GET /api/tasks
- GET /api/tasks/:id
- PUT /api/tasks/:id
- POST /api/tasks/:id/comments
- GET /api/tasks/:id/comments
- GET /api/tasks/employee/:empId/backlog
- GET /api/tasks/employee/:empId/stats

### Lead APIs (Manager/Admin Only)
- POST /api/leads/upload
- GET /api/leads
- GET /api/leads/:id
- PUT /api/leads/:id
- POST /api/leads/:id/assign
- GET /api/leads/uploads/history

### Inventory APIs
- GET /api/inventory/projects
- POST /api/inventory/projects
- GET /api/inventory/projects/:id/towers
- POST /api/inventory/projects/:id/towers
- GET /api/inventory/search
- GET /api/inventory/units/:id
- POST /api/inventory/units
- PUT /api/inventory/units/:id
- GET /api/inventory/stats

---

## Database Schema Summary

### Core Tables (11)
1. employees
2. employee_documents
3. attendance
4. leave_requests
5. tasks
6. task_comments
7. callers
8. caller_responses
9. notifications
10. pins
11. employee_stats

### CRM Tables (12)
12. leads
13. lead_activities
14. lead_comments
15. upload_history
16. projects
17. towers
18. inventory_units
19. inventory_price_history
20. assignment_rules
21. assignment_history
22. round_robin_counter
23. daily_metrics

**Total: 23 Tables**

---

## Deployment Checklist

### Development Environment ✅
- [✅] Backend running on localhost:5001
- [✅] Frontend running on localhost:3000
- [✅] PostgreSQL database configured
- [✅] All routes integrated
- [✅] Socket.IO connected

### Production Readiness ⏳
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] API documentation
- [ ] Error logging system
- [ ] Performance monitoring
- [ ] SSL certificates
- [ ] CDN for static assets
- [ ] Database backups
- [ ] Load balancing
- [ ] Security hardening

---

## Progress Tracking Format

Use this format to track completion:

```
Module: Lead Management
├─ [✅] Database Schema
├─ [✅] Backend APIs
├─ [✅] Frontend UI
├─ [✅] Excel Upload
├─ [✅] Assignment Logic
└─ [✅] Access Control

Module: Inventory Management
├─ [✅] Database Schema
├─ [✅] Backend APIs
├─ [✅] Frontend UI
├─ [✅] Search Filters
├─ [⏳] Photo/Video Upload
└─ [⏳] WhatsApp Share

Module: Analytics
├─ [✅] Database Schema
├─ [⏳] Backend APIs
├─ [ ] Frontend UI
└─ [ ] Reports Generation
```

---

## System Status: PHASE 1 COMPLETE ✅

**Completion: 65%**

- ✅ Core Infrastructure
- ✅ Authentication & Authorization
- ✅ Employee Management
- ✅ Attendance System
- ✅ Task Management
- ✅ Lead Management (CRM)
- ✅ Inventory Management
- ⏳ Media Management
- ⏳ Analytics & Reporting
- ⏳ External Integrations

---

## Next Steps (Phase 2)

1. **Media Upload System**
   - Implement photo/video storage
   - Create media gallery
   - Add WhatsApp share functionality

2. **Lead Activities**
   - Call logging interface
   - Meeting scheduler
   - Follow-up automation

3. **Analytics Dashboard**
   - Daily metrics visualization
   - Performance charts
   - Export reports

4. **Caller Workspace**
   - Simplified interface for callers
   - Daily task view
   - Call scripts integration

---

**Last Updated:** January 7, 2026  
**Version:** 1.0.0  
**Status:** Phase 1 Complete - Production Ready for Core Features
