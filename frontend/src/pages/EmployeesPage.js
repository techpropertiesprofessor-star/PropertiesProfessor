import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { employeeAPI, taskAPI, attendanceAPI, authAPI } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { format, isToday } from 'date-fns';
import { usePermissions } from '../hooks/usePermissions';
import io from 'socket.io-client';

export default function EmployeesPage() {
      // Auto-refresh interval ref
      const statsIntervalRef = React.useRef();
    // Add Employee Modal State
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [addForm, setAddForm] = useState({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      role: 'CALLER',
      password: ''
    });
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState('');

    const handleAddFormChange = (key, value) => {
      setAddForm(prev => ({ ...prev, [key]: value }));
    };

    const handleCreateEmployee = async () => {
      if (!addForm.first_name || !addForm.last_name || !addForm.email || !addForm.password) {
        setAddError('First name, last name, email, and password are required');
        return;
      }
      setAddLoading(true);
      setAddError('');
      try {
        // Use authAPI.register so password is set and user can login
        await authAPI.register({
          name: addForm.first_name + ' ' + addForm.last_name,
          email: addForm.email,
          phone: addForm.phone,
          role: addForm.role,
          password: addForm.password
        });
        setAddModalOpen(false);
        setAddForm({ first_name: '', last_name: '', email: '', phone: '', role: 'employee', password: '' });
        await loadEmployees();
        showSuccess('Employee created successfully');
      } catch (err) {
        setAddError(err.response?.data?.message || 'Failed to create employee');
      } finally {
        setAddLoading(false);
      }
    };
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { canViewEmployees, canCreateTasks, loading: permissionsLoading } = usePermissions();
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [employeeAttendance, setEmployeeAttendance] = useState([]);
  const [employeeTasks, setEmployeeTasks] = useState([]);
  const [taskStats, setTaskStats] = useState({ total: 0, pending: 0, completed: 0 });
  const [loading, setLoading] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', due_date: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  
  // Socket.IO ref to maintain connection
  const socketRef = React.useRef(null);

  useEffect(() => {
    loadEmployees();
    
    // Note: Socket.IO connection is now managed by AuthContext
    // This component will listen to events from that single connection
    
    // Cleanup on unmount
    return () => {
      // No need to disconnect here as AuthContext manages the connection
    };
  }, []);

  useEffect(() => {
    if (selectedEmployee && viewMode === 'details') {
      const empId = selectedEmployee._id || selectedEmployee.id;
      // Always refetch details, attendance, tasks, and stats for real-time
      const fetchAll = async () => {
        try {
          const detailsResponse = await employeeAPI.getById(empId);
          setEmployeeDetails(detailsResponse.data);
        } catch {}
        try {
          const attendanceResponse = await attendanceAPI.getEmployeeAttendance(empId, new Date().getMonth() + 1, new Date().getFullYear());
          setEmployeeAttendance(attendanceResponse.data || []);
        } catch {}
        try {
          const dateStr = format(selectedDate, 'yyyy-MM-dd');
          const tasksResponse = await taskAPI.getTasksByDate(empId, dateStr);
          setEmployeeTasks(tasksResponse.data || []);
        } catch {}
        try {
          const statsResponse = await taskAPI.getStats(empId);
          setTaskStats(statsResponse.data || { total: 0, pending: 0, completed: 0 });
        } catch {}
      };
      fetchAll();
      // Set up interval for real-time stats refresh
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = setInterval(() => {
        taskAPI.getStats(empId).then(res => setTaskStats(res.data || { total: 0, pending: 0, completed: 0 })).catch(() => {});
      }, 20000); // 20 seconds
    } else {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    }
    // Cleanup on unmount or view change
    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    };
  }, [selectedEmployee, viewMode, selectedDate]);

  useEffect(() => {
    if (!permissionsLoading && !canViewEmployees) {
      navigate('/');
    }
  }, [permissionsLoading, canViewEmployees, navigate]);

  const loadEmployees = async () => {
    try {
      const response = await employeeAPI.getAll();
      setEmployees(response.data);
    } catch (err) {
      console.error('Failed to load employees:', err);
      showError('Failed to load employees');
    }
  };

  const loadEmployeeDetails = async (employeeId) => {
    try {
      setLoading(true);
      const detailsResponse = await employeeAPI.getById(employeeId);
      setEmployeeDetails(detailsResponse.data);
      
      try {
        const attendanceResponse = await attendanceAPI.getEmployeeAttendance(employeeId, new Date().getMonth() + 1, new Date().getFullYear());
        setEmployeeAttendance(attendanceResponse.data || []);
      } catch (err) {
        setEmployeeAttendance([]);
      }
      
      setViewMode('details');
    } catch (err) {
      console.error('Failed to load employee details:', err);
      showError('Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeTasks = async (employeeId, date) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const response = await taskAPI.getTasksByDate(employeeId, dateStr);
      setEmployeeTasks(response.data || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setEmployeeTasks([]);
    }
  };

  const loadTaskStats = async (employeeId) => {
    try {
      const response = await taskAPI.getStats(employeeId);
      // response.data is an array like [{_id: 'PENDING', count: 2}, ...]
      const statsArr = response.data || [];
      let total = 0, pending = 0, completed = 0;
      for (const s of statsArr) {
        total += s.count;
        if (s._id === 'PENDING') pending = s.count;
        if (s._id === 'COMPLETED') completed = s.count;
      }
      setTaskStats({ total, pending, completed });
    } catch (err) {
      console.error('Failed to load task stats:', err);
      setTaskStats({ total: 0, pending: 0, completed: 0 });
    }
  };

  const handleSelectEmployee = async (emp) => {
    const empId = emp._id || emp.id;
    setSelectedEmployee(emp);
    setLoading(true);
    try {
      // Fetch details
      const detailsResponse = await employeeAPI.getById(empId);
      setEmployeeDetails(detailsResponse.data);
      // Fetch attendance
      try {
        const attendanceResponse = await attendanceAPI.getEmployeeAttendance(empId, new Date().getMonth() + 1, new Date().getFullYear());
        setEmployeeAttendance(attendanceResponse.data || []);
      } catch (err) {
        setEmployeeAttendance([]);
      }
      // Fetch tasks for today
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      try {
        const tasksResponse = await taskAPI.getTasksByDate(empId, todayStr);
        setEmployeeTasks(tasksResponse.data || []);
      } catch (err) {
        setEmployeeTasks([]);
      }
      // Fetch stats
      try {
        const statsResponse = await taskAPI.getStats(empId);
        setTaskStats(statsResponse.data || { total: 0, pending: 0, completed: 0 });
      } catch (err) {
        setTaskStats({ total: 0, pending: 0, completed: 0 });
      }
      setViewMode('details');
    } catch (err) {
      showError('Failed to load employee details');
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    (emp.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (!canCreateTasks) {
      showError('You do not have permission to assign tasks');
      return;
    }
    
    if (selectedEmployee && viewMode === 'details') {
      loadEmployeeTasks(selectedEmployee._id, selectedDate);
      loadTaskStats(selectedEmployee._id);
    }

    setLoading(true);
    try {
      await taskAPI.create({
        title: taskForm.title,
        description: taskForm.description,
        assigned_to: selectedEmployee.id,
        priority: taskForm.priority,
        due_date: taskForm.due_date
      });
      
      showSuccess(`✅ Task assigned to ${selectedEmployee.first_name}`);
      setTaskForm({ title: '', description: '', priority: 'medium', due_date: '' });
      await loadEmployeeTasks(selectedEmployee.id, selectedDate);
    } catch (err) {
      showError('Failed to assign task');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const empId = selectedEmployee._id || selectedEmployee.id;
      await taskAPI.update(taskId, { status });
      // Refetch everything for real-time update
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const [tasksResponse, statsResponse, detailsResponse, attendanceResponse] = await Promise.all([
        taskAPI.getTasksByDate(empId, dateStr),
        taskAPI.getStats(empId),
        employeeAPI.getById(empId),
        attendanceAPI.getEmployeeAttendance(empId, new Date().getMonth() + 1, new Date().getFullYear())
      ]);
      setEmployeeTasks(tasksResponse.data || []);
      setTaskStats(statsResponse.data || { total: 0, pending: 0, completed: 0 });
      setEmployeeDetails(detailsResponse.data);
      setEmployeeAttendance(attendanceResponse.data || []);
    } catch (err) {
      showError('Failed to update task');
    }
  };

  const getEmployeeStatus = () => {
    const todayAttendance = employeeAttendance.find(a =>
      new Date(a.date).toDateString() === new Date().toDateString()
    );
    
    if (todayAttendance?.check_in && !todayAttendance?.check_out) {
      return { status: 'Online', color: 'green' };
    } else if (todayAttendance?.check_out) {
      return { status: 'Left', color: 'gray' };
    }
    return { status: 'Offline', color: 'red' };
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const showError = (msg) => {
    setSuccessMsg('');
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 3000);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');
    try {
      // You may need to adjust API endpoint and payload as per backend
      await authAPI.changePassword({
        userId: employeeDetails.id || employeeDetails._id,
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordSuccess('Password changed successfully!');
      setPasswordForm({ oldPassword: '', newPassword: '' });
      setShowPasswordModal(false);
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (permissionsLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header user={user} />
          <main className="flex-1 flex items-center justify-center p-8">
            <div className="text-gray-600 text-sm">Loading permissions...</div>
          </main>
        </div>
      </div>
    );
  }

  if (!canViewEmployees) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header user={user} />
          <main className="flex-1 flex items-center justify-center p-8">
            <div className="bg-red-100 border border-red-400 text-red-700 px-8 py-6 rounded-lg text-center max-w-md">
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p>You do not have permission to view employees.</p>
              <p className="text-sm mt-3 text-red-600">Contact an administrator if you need access.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-tr from-blue-50 via-indigo-50 to-emerald-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header user={user} />
        <main className="flex-1 overflow-auto">
          {/* Success/Error Messages */}
          {successMsg && (
            <div className="fixed top-20 right-4 p-3 bg-green-50 border border-green-300 rounded text-green-800 text-xs z-50 animate-pulse max-w-xs">
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="fixed top-20 right-4 p-3 bg-red-50 border border-red-300 rounded text-red-800 text-xs z-50 animate-pulse max-w-xs">
              {errorMsg}
            </div>
          )}

          {viewMode === 'list' ? (
            // ===== EMPLOYEES LIST VIEW (Modern) =====
            <div className="p-4 md:p-8">
              {/* Back Button */}
              <button
                onClick={() => navigate(-1)}
                className="mb-4 px-4 py-2 text-xs bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-lg font-bold shadow transition-all duration-150 flex items-center gap-2"
              >
                ← Back
              </button>
              
              {/* Header + Add Employee Button */}
              <div className="mb-7 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold text-indigo-800 tracking-tight mb-1 flex items-center gap-2">
                    <span role="img" aria-label="employees">👥</span> Employees
                  </h1>
                  <p className="text-xs text-gray-600 mt-1">Total: {employees.length}</p>
                </div>
                <button
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-105 border-2 border-blue-200/40 hover:border-blue-300/80"
                  style={{ minWidth: '160px', boxShadow: '0 0 16px 2px rgba(59,130,246,0.10), 0 2px 8px 0 rgba(29,78,216,0.10)' }}
                  onClick={() => setAddModalOpen(true)}
                >
                  + Add Employee
                </button>
                        {/* Add Employee Modal */}
                        {addModalOpen && (
                          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-lg">
                              <div className="flex flex-col gap-0 mb-4">
                                <div className="flex justify-between items-center">
                                  <h2 className="text-lg font-bold">Add Employee</h2>
                                  <button onClick={() => setAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                                </div>
                                <span className="text-sm text-gray-600 mt-1 ml-0.5 font-semibold">Manager/Admins can create accounts</span>
                              </div>
                              {addError && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{addError}</div>}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <input type="text" placeholder="First Name" value={addForm.first_name} onChange={e => handleAddFormChange('first_name', e.target.value)} className="px-3 py-2 border rounded-md" />
                                <input type="text" placeholder="Last Name" value={addForm.last_name} onChange={e => handleAddFormChange('last_name', e.target.value)} className="px-3 py-2 border rounded-md" />
                                <input type="email" placeholder="Email" value={addForm.email} onChange={e => handleAddFormChange('email', e.target.value)} className="px-3 py-2 border rounded-md" />
                                <input type="text" placeholder="Phone (optional)" value={addForm.phone} onChange={e => handleAddFormChange('phone', e.target.value)} className="px-3 py-2 border rounded-md" maxLength="10" />
                                <select value={addForm.role} onChange={e => handleAddFormChange('role', e.target.value)} className="px-3 py-2 border rounded-md">
                                  <option value="MANAGER">Manager</option>
                                  <option value="EMPLOYEE">Employee</option>
                                </select>
                                <input type="text" placeholder="Temporary Password" value={addForm.password} onChange={e => handleAddFormChange('password', e.target.value)} className="px-3 py-2 border rounded-md" />
                              </div>
                              <div className="flex justify-end gap-3">
                                <button onClick={() => setAddModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancel</button>
                                <button onClick={handleCreateEmployee} disabled={addLoading} className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-semibold disabled:opacity-60">{addLoading ? 'Creating...' : 'Create Employee'}</button>
                              </div>
                            </div>
                          </div>
                        )}
              </div>

              {/* Search Bar */}
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="🔍 Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Employee Cards Grid (Modern) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredEmployees.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500 text-sm">
                    No employees found
                  </div>
                ) : (
                  filteredEmployees.map((emp) => (
                    <div
                      key={emp._id || emp.id}
                      className="relative bg-white/70 backdrop-blur-xl border border-indigo-100 rounded-2xl p-5 shadow-xl hover:shadow-2xl hover:border-emerald-300 transition-all duration-200 group overflow-hidden"
                      style={{ boxShadow: '0 4px 24px 0 rgba(99,102,241,0.08), 0 1.5px 8px 0 rgba(16,185,129,0.08)' }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        {/* Profile Picture or Initials */}
                        {emp.profilePic ? (
                          <img
                            src={emp.profilePic}
                            alt="Profile"
                            className="w-12 h-12 rounded-full object-cover border-2 border-indigo-300 shadow"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-indigo-200 rounded-full flex items-center justify-center text-lg font-extrabold text-indigo-700 shadow">
                            {
                              emp.first_name && emp.last_name
                                ? `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase()
                                : emp.name
                                  ? emp.name.split(' ').map(n => n[0]).join('').toUpperCase()
                                  : 'NA'
                            }
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-extrabold text-gray-900 truncate">
                            {
                              ((emp.first_name || emp.name?.split(' ')[0] || '') +
                              (emp.last_name ? ' ' + emp.last_name : (emp.name && emp.name.split(' ')[1] ? ' ' + emp.name.split(' ').slice(1).join(' ') : ''))
                              ).trim() || emp.name || 'No Name'
                            }
                          </p>
                          <p className="text-xs text-gray-500 truncate">{emp.email}</p>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs mb-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Role:</span>
                          <span className="font-semibold capitalize text-indigo-700">{emp.role}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            (emp.status === 'active' || !emp.status) ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {emp.status ? emp.status.charAt(0).toUpperCase() + emp.status.slice(1) : 'Active'}
                          </span>
                        </div>
                      </div>
                      <button 
                        className="w-full px-3 py-2 text-xs bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-xl font-bold shadow hover:from-blue-600 hover:to-blue-800 transition-all duration-150 group-hover:scale-105"
                        onClick={() => handleSelectEmployee(emp)}
                      >
                        View →
                      </button>
                      <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-indigo-200 to-emerald-200 rounded-full opacity-30 blur-2xl pointer-events-none"></div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            // ===== EMPLOYEE DETAILS VIEW (Compact) =====
            <div className="p-4 md:p-6">

              {/* Back Button */}
              <button
                onClick={() => {
                  setViewMode('list');
                  setSelectedEmployee(null);
                }}
                className="mb-6 px-4 py-2 text-xs bg-gradient-to-r from-blue-100 to-blue-300 hover:from-blue-200 hover:to-blue-400 text-blue-800 rounded-lg font-bold shadow transition-all duration-150"
              >
                ← Back to List
              </button>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Column - Tasks & Form (2/3) */}

                <div className="lg:col-span-2 space-y-4">
                  {/* Page Permissions Form - Manager Only */}
                  {selectedEmployee && (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                      {/* Header with gradient */}
                      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-white">Access Permissions</h4>
                            <p className="text-blue-100 text-sm">Manage page access and visibility</p>
                          </div>
                          {user?.role === 'MANAGER' && selectedEmployee.role === 'EMPLOYEE' && (
                            <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold text-white border border-white/30">
                              Editable
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Permissions Grid */}
                      <div className="p-6">
                        {(() => {
                          const isAdminOrManager = selectedEmployee.role === 'ADMIN' || selectedEmployee.role === 'MANAGER';
                          const isEditable = user?.role === 'MANAGER' && selectedEmployee.role === 'EMPLOYEE';
                          
                          return (
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {['Dashboard', 'Employees', 'Attendance', 'Leads', 'Tasks', 'Team Chat', 'Profile', 'Inventory', 'Announcements', 'Notes', 'Calendar', 'Leave Request', 'Caller'].map((page) => {
                                  let hasPermission = isAdminOrManager ? true : (employeeDetails?.permissions?.includes(page));
                            const updatePermissions = async (newPerms) => {
                              try {
                                await employeeAPI.updateProfile(employeeDetails._id, { permissions: newPerms });
                                const detailsResponse = await employeeAPI.getById(employeeDetails._id);
                                setEmployeeDetails(detailsResponse.data);
                              } catch (err) {}
                            };

                            // Icon mapping for each page
                            const iconMap = {
                              'Dashboard': '📊',
                              'Employees': '👥',
                              'Attendance': '📅',
                              'Leads': '🎯',
                              'Tasks': '✓',
                              'Team Chat': '💬',
                              'Profile': '👤',
                              'Inventory': '📦',
                              'Announcements': '📢',
                              'Notes': '📝',
                              'Calendar': '🗓️',
                              'Leave Request': '🏖️',
                              'Caller': '📞'
                            };

                            return (
                              <div 
                                key={page} 
                                className={`relative group flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 ${
                                  hasPermission 
                                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-300' 
                                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                } ${!isEditable ? 'opacity-75' : 'hover:shadow-md cursor-pointer'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{iconMap[page]}</span>
                                  <div>
                                    <span className="font-semibold text-gray-900 text-sm block">{page}</span>
                                    {isAdminOrManager && (
                                      <span className="text-xs text-gray-500">Role-based access</span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  {/* Enhanced Switch Toggle */}
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={!!hasPermission}
                                      disabled={!isEditable}
                                      onChange={async () => {
                                        if (!isEditable) return;
                                        let newPerms = employeeDetails?.permissions ? [...employeeDetails.permissions] : [];
                                        if (hasPermission) {
                                          newPerms = newPerms.filter(p => p !== page);
                                        } else {
                                          newPerms.push(page);
                                        }
                                        await updatePermissions(newPerms);
                                      }}
                                      className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-200 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-green-500 peer-checked:to-emerald-500 transition-all duration-300 shadow-inner"></div>
                                    <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 peer-checked:translate-x-5"></span>
                                  </label>
                                  
                                  {/* Status Badge */}
                                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                    hasPermission 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-red-100 text-red-600'
                                  }`}>
                                    {hasPermission ? '✓' : '✗'}
                                  </span>
                                </div>

                                {/* Hover Effect Overlay */}
                                {isEditable && (
                                  <div className="absolute inset-0 bg-indigo-500 opacity-0 group-hover:opacity-5 rounded-lg transition-opacity pointer-events-none"></div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Info Footer */}
                        {!isEditable && (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="text-sm text-blue-700">
                                {selectedEmployee.role === 'ADMIN' || selectedEmployee.role === 'MANAGER' 
                                  ? 'Admins and Managers have automatic access to all pages.' 
                                  : 'Only Managers can modify employee permissions.'}
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Attendance & Actions (1/3) */}
                <div className="space-y-4">
                  {/* Quick Actions */}
                  <div className="bg-white rounded-lg p-4">
                    <h4 className="text-sm font-bold text-gray-900 mb-3">Quick Actions</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => window.open(`tel:${employeeDetails?.phone || ''}`)}
                        className="w-full px-3 py-2 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded font-semibold transition"
                      >
                        📞 Call
                      </button>
                      <button
                        onClick={() => window.open(`mailto:${employeeDetails?.email}`)}
                        className="w-full px-3 py-2 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded font-semibold transition"
                      >
                        📧 Email
                      </button>
                    </div>
                  </div>

                  {/* Change Password - Manager Only */}
                  {user?.role === 'MANAGER' && (
                    <div className="bg-white rounded-lg p-4 mt-4">
                      <h4 className="text-sm font-bold text-gray-900 mb-3">Change Password</h4>
                      <button
                        className="w-full px-3 py-2 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded font-semibold transition"
                        onClick={() => setShowPasswordModal(true)}
                      >
                        🔒 Change Password
                      </button>
                    </div>
                  )}
                  {user?.role === 'MANAGER' && showPasswordModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-lg relative">
                        <button onClick={() => setShowPasswordModal(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl">✕</button>
                        <h3 className="text-lg font-bold mb-4">Change Password</h3>
                        {passwordError && <div className="mb-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{passwordError}</div>}
                        {passwordSuccess && <div className="mb-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2">{passwordSuccess}</div>}
                        <form onSubmit={handlePasswordChange} className="space-y-3">
                          <input
                            type="password"
                            placeholder="Old Password"
                            value={passwordForm.oldPassword}
                            onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                            className="w-full px-3 py-2 border rounded-md"
                            required
                          />
                          <input
                            type="password"
                            placeholder="New Password"
                            value={passwordForm.newPassword}
                            onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            className="w-full px-3 py-2 border rounded-md"
                            required
                          />
                          <button
                            type="submit"
                            disabled={passwordLoading}
                            className="w-full px-3 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 font-semibold disabled:opacity-60"
                          >
                            {passwordLoading ? 'Changing...' : 'Change Password'}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
