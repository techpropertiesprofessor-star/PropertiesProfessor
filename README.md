<<<<<<< HEAD
# propertiesprofessor
=======
# Real Estate Company Dashboard & Management System

A professional, flagship employee management system for real estate companies featuring employee authentication, attendance tracking, caller data management, and task assignments.

## 📋 Project Structure

```
pro_test/
├── backend/              # Node.js/Express API
├── frontend/             # React Dashboard
└── website/              # Public Website
```

## ✨ Key Features

### 1. **Employee Management**
- User authentication with JWT
- Document submission and verification by managers
- Employee profile management
- ID card generation
- Role-based access (admin, manager, caller, team_lead)

### 2. **Attendance Tracking**
- Check-in/Check-out system
- Monthly attendance history
- Leave request management with approval workflow
- Leave type categorization (sick, casual, emergency)

### 3. **Caller Management** 
- Bulk data import (CSV/Excel)
- Data distribution to callers
- Response tracking (interested, not interested, busy, switched off, wrong number, callback later)
- Call history and follow-up scheduling

### 4. **Task Management**
- Task assignment by managers
- Priority levels (high, medium, low)
- Status tracking (pending, in-progress, completed, overdue)
- Task comments and updates
- Deadline management with notifications

### 5. **Real-time Notifications**
- WebSocket-based notifications
- Task assignments
- Leave approvals
- Document verifications
- Deadline alerts

### 6. **Professional Dashboard**
- Sidebar navigation (similar to Amizone)
- User profile section
- Dashboard cards with quick actions
- Responsive design
- Dark/Light mode ready

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL (v12 or higher)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create PostgreSQL database**
   ```bash
   psql -U postgres
   psql> CREATE DATABASE realestate_dashboard;
   psql> \c realestate_dashboard
   psql> \i src/config/schema.sql
   ```

4. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

5. **Start backend server**
   ```bash
   npm run dev
   ```

Backend will run on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start frontend dev server**
   ```bash
   npm start
   ```

Frontend will run on `http://localhost:3000`

## 📊 Database Schema

- **employees** - User accounts and roles
- **documents** - Employee document uploads for verification
- **attendance** - Daily attendance records
- **leave_requests** - Leave request tracking
- **caller_data** - Lead/prospect information
- **call_responses** - Call interaction records
- **tasks** - Task assignments
- **notifications** - User notifications
- **id_cards** - Employee ID card information
- **audit_logs** - System audit trail

## 🔐 Authentication

- JWT-based authentication
- Password hashing with bcryptjs
- Token expiration: 7 days (configurable)
- Protected routes by role

## 📱 API Endpoints

### Auth
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Create new employee (admin only)
- `GET /api/auth/profile` - Get current user profile
- `POST /api/auth/verify-token` - Verify JWT token

### Employees
- `GET /api/employees` - List all employees
- `GET /api/employees/:id` - Get employee details
- `PUT /api/employees/:id` - Update profile
- `POST /api/employees/:id/documents` - Upload document
- `GET /api/employees/:id/documents` - Get documents
- `PUT /api/employees/documents/:docId/verify` - Verify document
- `PUT /api/employees/:id/activate` - Activate employee

### Attendance
- `POST /api/attendance/check-in` - Check in
- `POST /api/attendance/check-out` - Check out
- `GET /api/attendance/history/mine` - Get attendance history
- `POST /api/attendance/leave-request` - Request leave
- `GET /api/attendance/leave-requests/mine` - Get leave requests
- `PUT /api/attendance/leave-requests/:requestId` - Approve/Reject leave

### Tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks` - Get user tasks
- `GET /api/tasks/all` - Get all tasks (admin/manager)
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task
- `POST /api/tasks/:id/comments` - Add comment
- `GET /api/tasks/:id/comments` - Get comments

### Callers
- `POST /api/callers/import` - Import caller data
- `GET /api/callers` - Get assigned callers
- `GET /api/callers/:id` - Get caller details
- `POST /api/callers/:id/response` - Record call response

### Notifications
- `GET /api/notifications` - Get notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `GET /api/notifications/unread/count` - Get unread count

## 🎨 Frontend Components

### Pages
- **LoginPage** - User authentication
- **DashboardPage** - Main dashboard with quick actions
- **AttendancePage** - Attendance tracking and leave management
- **TasksPage** - Task assignment and management
- **CallersPage** - Caller data and response recording
- **ProfilePage** - User profile management
- **EmployeesPage** - Employee management (admin/manager only)

### Components
- **Sidebar** - Navigation menu
- **Header** - Top header with notifications and profile
- **ProtectedRoute** - Route protection wrapper

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- CORS protection
- Helmet.js for HTTP header security
- Input validation with express-validator
- Role-based access control (RBAC)
- SQL injection prevention (using parameterized queries)

## 📦 Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT
- **Real-time**: Socket.IO
- **File Upload**: Multer
- **Data Parsing**: csv-parse, xlsx

### Frontend
- **UI Framework**: React 18
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Real-time**: Socket.IO Client
- **Icons**: React Icons, Lucide React
- **Date Utility**: date-fns

### Infrastructure
- Cloud deployment ready
- Environment-based configuration
- Docker support (to be added)
- Production builds optimized

## 🚀 Deployment

### Environment Setup
1. Create `.env` files for production
2. Set up PostgreSQL database
3. Configure Node environment variables
4. Build frontend for production
5. Deploy using your preferred platform (AWS, Azure, Heroku, etc.)

### Production Checklist
- [ ] Database backups configured
- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Monitoring set up
- [ ] Error logging configured
- [ ] Email notifications working

## 📝 Usage Guide

### Admin/Manager Flow
1. Create employee accounts
2. Employees upload documents
3. Manager verifies documents
4. System generates ID/password
5. Employee login and use dashboard
6. Assign tasks and caller data
7. Approve leave requests
8. Track attendance

### Employee Flow
1. Login with credentials
2. Complete profile
3. Upload documents
4. Check-in/Check-out
5. Request leaves
6. View assigned tasks
7. Make calls and record responses
8. View notifications

## 🔄 Workflow Example: Caller Assignment

1. Manager imports CSV/Excel with leads
2. System assigns data to specific callers
3. Caller sees list on their dashboard
4. Caller makes calls and records responses
5. Responses stored in database
6. Manager can view analytics and reports

## 📞 Support & Next Steps

### Features to Add
- [ ] Email notifications
- [ ] SMS alerts
- [ ] Advanced analytics/reports
- [ ] Export to Excel/PDF
- [ ] Video call integration
- [ ] Performance metrics dashboard
- [ ] Custom workflows
- [ ] Multi-language support

### Contact
For support or questions about setup, please contact your system administrator.

## 📄 License

MIT License - See LICENSE file for details

---

**Version**: 1.0.0  
**Last Updated**: December 2025
>>>>>>> 1afbe34 (Initial commit)
#   P r o p e r t i e s P r o f e s s o r  
 