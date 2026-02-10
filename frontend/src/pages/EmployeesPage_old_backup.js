import React, { useState, useEffect, useContext } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { employeeAPI, taskAPI, attendanceAPI } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { format, addDays, subDays, isSameDay, isPast, isToday, differenceInHours } from 'date-fns';

export default function EmployeesPage() {
  const { user } = useContext(AuthContext);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [employeeAttendance, setEmployeeAttendance] = useState([]);
  const [employeeTasks, setEmployeeTasks] = useState([]);
  const [backlogTasks, setBacklogTasks] = useState([]);
  const [taskStats, setTaskStats] = useState({ total: 0, pending: 0, in_progress: 0, completed: 0, overdue: 0, pinned: 0 });
  const [loading, setLoading] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', due_date: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'details'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [taskViewMode, setTaskViewMode] = useState('active'); // 'active', 'backlog', 'all'
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    loadEmployees();
    // Auto-archive tasks every hour
    const interval = setInterval(() => {
      taskAPI.autoArchive().catch(console.error);
    }, 3600000); // 1 hour
    
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh task data every 30 seconds when viewing employee details
  useEffect(() => {
    if (selectedEmployee && viewMode === 'details') {
      const interval = setInterval(() => {
        loadEmployeeTasks(selectedEmployee.id, selectedDate);
        loadTaskStats(selectedEmployee.id);
      }, 30000);
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    }
  }, [selectedEmployee, viewMode, selectedDate]);

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
      
      // Load employee's attendance
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
      
      // Auto-mark overdue tasks
      const tasks = response.data || [];
      tasks.forEach(task => {
        if (isPast(new Date(task.due_date)) && task.status === 'pending' && !isToday(new Date(task.due_date))) {
          updateTaskStatus(task.id, 'overdue');
        }
      });
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setEmployeeTasks([]);
    }
  };

  const loadBacklogTasks = async (employeeId) => {
    try {
      const response = await taskAPI.getBacklog(employeeId);
      setBacklogTasks(response.data || []);
    } catch (err) {
      console.error('Failed to load backlog:', err);
      setBacklogTasks([]);
    }
  };

  const loadTaskStats = async (employeeId) => {
    try {
      const response = await taskAPI.getStats(employeeId);
      setTaskStats(response.data || { total: 0, pending: 0, in_progress: 0, completed: 0, overdue: 0, pinned: 0 });
    } catch (err) {
      console.error('Failed to load task stats:', err);
    }
  };

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    loadEmployeeDetails(emp.id);
    loadEmployeeTasks(emp.id, selectedDate);
    loadTaskStats(emp.id);
    setTaskViewMode('active');
  };

  const handleViewModeChange = async (mode) => {
    setTaskViewMode(mode);
    if (mode === 'backlog') {
      await loadBacklogTasks(selectedEmployee.id);
    } else if (mode === 'active') {
      await loadEmployeeTasks(selectedEmployee.id, selectedDate);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssignTask = async (e) => {
    e.preventDefault();
    
    if (!taskForm.title || !taskForm.due_date) {
      showError('Please fill in title and due date');
      return;
    }

    // Validate due date is not in the past
    if (isPast(new Date(taskForm.due_date)) && !isToday(new Date(taskForm.due_date))) {
      showError('Due date cannot be in the past');
      return;
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
      
      showSuccess(`✅ Task assigned to ${selectedEmployee.first_name} ${selectedEmployee.last_name}`);
      setTaskForm({ title: '', description: '', priority: 'medium', due_date: '' });
      
      // Reload data
      await Promise.all([
        loadEmployeeTasks(selectedEmployee.id, selectedDate),
        loadTaskStats(selectedEmployee.id)
      ]);
    } catch (err) {
      showError('Failed to assign task');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePinTask = async (taskId, isPinnedByManager) => {
    try {
      if (isPinnedByManager) {
        await taskAPI.unpinByManager(taskId);
      } else {
        await taskAPI.pinByManager(taskId);
      }
      await Promise.all([
        loadEmployeeTasks(selectedEmployee.id, selectedDate),
        loadTaskStats(selectedEmployee.id)
      ]);
      showSuccess(isPinnedByManager ? 'Task unpinned' : 'Task pinned successfully');
    } catch (err) {
      showError('Failed to update pin status');
      console.error(err);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      await taskAPI.update(taskId, { status });
      await Promise.all([
        loadEmployeeTasks(selectedEmployee.id, selectedDate),
        loadTaskStats(selectedEmployee.id)
      ]);
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    if (selectedEmployee) {
      loadEmployeeTasks(selectedEmployee.id, newDate);
    }
  };

  const getEmployeeStatus = () => {
    const todayAttendance = employeeAttendance.find(a =>
      new Date(a.date).toDateString() === new Date().toDateString()
    );
    
    if (todayAttendance) {
      if (todayAttendance.check_in && !todayAttendance.check_out) {
        return { status: 'Online', color: 'green', icon: '🟢' };
      } else if (todayAttendance.check_out) {
        return { status: 'Left', color: 'gray', icon: '⚪' };
      }
    }
    return { status: 'Offline', color: 'red', icon: '🔴' };
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setSuccessMsg('');
    setTimeout(() => setErrorMsg(''), 4000);
  };

  const employeeStatus = employeeDetails ? getEmployeeStatus() : null;

  // Separate pinned and regular tasks
  const pinnedTasks = employeeTasks.filter(t => t.is_pinned);
  const regularTasks = employeeTasks.filter(t => !t.is_pinned);

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const TaskCard = ({ task, showActions = true }) => (
    <div className={`border-l-4 ${task.is_pinned ? 'border-red-500 bg-red-50' : 'border-blue-400 bg-blue-50'} pl-4 p-4 rounded-r-lg flex justify-between items-start hover:shadow-md transition`}>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {task.is_pinned && <span className="text-red-600 font-bold text-xs">📌 PINNED</span>}
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(task.priority)}`}>
            {task.priority.toUpperCase()}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
            {task.status.toUpperCase().replace('_', ' ')}
          </span>
          <span className="text-sm font-semibold text-gray-600">
            Due: {format(new Date(task.due_date), 'MMM dd, yyyy')}
          </span>
          {isPast(new Date(task.due_date)) && task.status !== 'completed' && !isToday(new Date(task.due_date)) && (
            <span className="text-xs text-red-600 font-bold">⚠️ OVERDUE</span>
          )}
        </div>
        <h5 className="text-lg font-bold text-gray-900 mb-1">{task.title}</h5>
        {task.description && (
          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
        )}
        <p className="text-xs text-gray-500">
          Assigned by: <span className="font-semibold">{task.assigned_by_name || 'Manager'}</span>
        </p>
      </div>
      {showActions && (
        <div className="ml-4 flex flex-col gap-2">
          <button
            onClick={() => handlePinTask(task.id, task.pinned_by_manager)}
            className={`px-3 py-2 ${task.pinned_by_manager ? 'bg-red-200 hover:bg-red-300 text-red-700' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} rounded font-semibold transition text-sm whitespace-nowrap`}
          >
            {task.pinned_by_manager ? '📌 Unpin' : '📌 Pin'}
          </button>
          {task.status !== 'completed' && task.status !== 'archived' && (
            <button
              onClick={() => updateTaskStatus(task.id, 'completed')}
              className="px-3 py-2 bg-green-200 hover:bg-green-300 text-green-700 rounded font-semibold transition text-sm whitespace-nowrap"
            >
              ✓ Complete
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} />
        
        <main className="flex-1 overflow-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Employee Management</h1>
            <p className="text-gray-600 mt-1">Manage employees, assign tasks, track performance</p>
          </div>

          {/* Global Messages */}
          {successMsg && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg animate-pulse">
              <p className="text-green-800 font-semibold">{successMsg}</p>
            </div>
          )}
          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg animate-pulse">
              <p className="text-red-800 font-semibold">{errorMsg}</p>
            </div>
          )}

          {viewMode === 'list' ? (
            // ========== EMPLOYEES LIST VIEW ==========
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">All Employees</h2>
                  <div className="text-sm text-gray-600">Total: <strong>{employees.length}</strong></div>
                </div>
                
                <div className="mt-4 relative">
                  <input
                    type="text"
                    placeholder="🔍 Search employees by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {filteredEmployees.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <p className="text-gray-500 text-lg">No employees found</p>
                  </div>
                ) : (
                  filteredEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      onClick={() => handleSelectEmployee(emp)}
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 cursor-pointer hover:border-indigo-500 hover:shadow-lg transition transform hover:scale-105"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {emp.first_name} {emp.last_name}
                          </h3>
                          <p className="text-sm text-gray-600">{emp.email}</p>
                        </div>
                        <div className="w-12 h-12 bg-indigo-200 rounded-full flex items-center justify-center text-xl font-bold text-indigo-600">
                          {emp.first_name.charAt(0)}{emp.last_name.charAt(0)}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-600">Role:</span>
                          <span className="ml-2 font-semibold text-gray-900 capitalize">{emp.role}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Status:</span>
                          <span className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold ${
                            emp.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {emp.status}
                          </span>
                        </div>
                        <div className="pt-2">
                          <button
                            className="w-full px-4 py-2 bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700 transition"
                          >
                            View Details →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            // ========== EMPLOYEE DETAILS & TASKS VIEW ==========
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-3 space-y-6">
                {/* Employee Header Card */}
                <div className="bg-gradient-to-r from-indigo-500 to-blue-600 rounded-lg shadow-lg p-8 text-white">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-4xl font-bold mb-2">
                        {employeeDetails?.first_name} {employeeDetails?.last_name}
                      </h2>
                      <p className="text-indigo-100 text-lg">{employeeDetails?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setViewMode('list');
                        setSelectedEmployee(null);
                        if (refreshInterval) clearInterval(refreshInterval);
                      }}
                      className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
                    >
                      ← Back to List
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div className="bg-white bg-opacity-20 rounded-lg p-4">
                      <p className="text-indigo-100 text-sm">Role</p>
                      <p className="text-lg font-bold capitalize">{employeeDetails?.role}</p>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-lg p-4">
                      <p className="text-indigo-100 text-sm">Status</p>
                      <p className="text-lg font-bold">{employeeStatus?.status}</p>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-lg p-4">
                      <p className="text-indigo-100 text-sm">Total Tasks</p>
                      <p className="text-lg font-bold">{taskStats.total}</p>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-lg p-4">
                      <p className="text-indigo-100 text-sm">Pending</p>
                      <p className="text-lg font-bold">{taskStats.pending}</p>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-lg p-4">
                      <p className="text-indigo-100 text-sm">Completed</p>
                      <p className="text-lg font-bold">{taskStats.completed}</p>
                    </div>
                    <div className="bg-white bg-opacity-20 rounded-lg p-4">
                      <p className="text-indigo-100 text-sm">Pinned</p>
                      <p className="text-lg font-bold">📌 {taskStats.pinned}</p>
                    </div>
                  </div>
                </div>

                {/* Task View Mode Selector */}
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleViewModeChange('active')}
                      className={`px-6 py-3 rounded-lg font-semibold transition ${
                        taskViewMode === 'active'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      📋 Active Tasks
                    </button>
                    <button
                      onClick={() => handleViewModeChange('backlog')}
                      className={`px-6 py-3 rounded-lg font-semibold transition ${
                        taskViewMode === 'backlog'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      📦 Backlog (Completed/Archived)
                    </button>
                  </div>
                </div>

                {/* Active Tasks View */}
                {taskViewMode === 'active' && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                      <h3 className="text-2xl font-bold text-gray-900">
                        Tasks for {format(selectedDate, 'MMMM dd, yyyy')}
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDateChange(subDays(selectedDate, 1))}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition"
                        >
                          ← Prev
                        </button>
                        <button
                          onClick={() => handleDateChange(new Date())}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition"
                        >
                          Today
                        </button>
                        <button
                          onClick={() => handleDateChange(addDays(selectedDate, 1))}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold transition"
                        >
                          Next →
                        </button>
                      </div>
                    </div>

                    {/* Pinned Tasks Section */}
                    {pinnedTasks.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
                          <span className="text-2xl">📌</span> Pinned Tasks (Always Visible)
                        </h4>
                        <div className="space-y-3">
                          {pinnedTasks.map((task) => (
                            <TaskCard key={task.id} task={task} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Regular Tasks Section */}
                    {regularTasks.length > 0 ? (
                      <div>
                        <h4 className="text-lg font-bold text-blue-600 mb-4">Today's Tasks</h4>
                        <div className="space-y-3">
                          {regularTasks.map((task) => (
                            <TaskCard key={task.id} task={task} />
                          ))}
                        </div>
                      </div>
                    ) : (
                      !pinnedTasks.length && (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                          <p className="text-gray-500 text-lg">📭 No tasks for this date</p>
                          {!isSameDay(selectedDate, new Date()) && (
                            <p className="text-sm text-gray-400 mt-2">
                              Tasks without pin are cleared after 24 hours
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Backlog View */}
                {taskViewMode === 'backlog' && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">
                      📦 Backlog - Completed & Archived Tasks
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Tasks are automatically archived 24 hours after completion
                    </p>
                    {backlogTasks.length > 0 ? (
                      <div className="space-y-3">
                        {backlogTasks.map((task) => (
                          <TaskCard key={task.id} task={task} showActions={false} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <p className="text-gray-500 text-lg">📭 No backlog tasks</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Assign New Task Form */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">✚ Assign New Task</h3>

                  <form onSubmit={handleAssignTask} className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Task Title *</label>
                      <input
                        type="text"
                        value={taskForm.title}
                        onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                        placeholder="e.g., Complete client proposal"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                      <textarea
                        value={taskForm.description}
                        onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                        placeholder="Task details and instructions..."
                        rows="4"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                        <select
                          value={taskForm.priority}
                          onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="low">🟢 Low</option>
                          <option value="medium">🟡 Medium</option>
                          <option value="high">🔴 High</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Due Date *</label>
                        <input
                          type="date"
                          value={taskForm.due_date}
                          onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                          min={format(new Date(), 'yyyy-MM-dd')}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition"
                    >
                      {loading ? '⏳ Assigning...' : '✓ Assign Task'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Live Status Indicator */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Live Status</h4>
                  <div className={`p-6 rounded-lg text-center text-white ${
                    employeeStatus?.status === 'Online' ? 'bg-green-500' :
                    employeeStatus?.status === 'Left' ? 'bg-gray-500' :
                    'bg-red-500'
                  }`}>
                    <div className="text-4xl mb-2">{employeeStatus?.icon}</div>
                    <p className="text-2xl font-bold">{employeeStatus?.status}</p>
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Updates every 30 seconds
                  </p>
                </div>

                {/* Today's Attendance */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Today's Attendance</h4>
                  {employeeAttendance.some(record => isToday(new Date(record.date))) ? (
                    <div className="space-y-3">
                      {employeeAttendance.filter(record => isToday(new Date(record.date))).map((record) => (
                        <div key={record.id} className="border-l-4 border-blue-500 pl-4">
                          <p className="text-sm text-gray-600">
                            Check In: <span className="font-bold">{record.check_in ? format(new Date(record.check_in), 'HH:mm') : '—'}</span>
                          </p>
                          <p className="text-sm text-gray-600">
                            Check Out: <span className="font-bold">{record.check_out ? format(new Date(record.check_out), 'HH:mm') : '—'}</span>
                          </p>
                          <p className="text-sm mt-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              record.status === 'present' ? 'bg-green-100 text-green-800' :
                              record.status === 'absent' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {record.status}
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No attendance records</p>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h4>
                  <div className="space-y-2">
                    <button 
                      onClick={() => window.open(`tel:${employeeDetails?.phone || ''}`)}
                      className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold py-2 px-4 rounded transition"
                    >
                      📞 Call
                    </button>
                    <button 
                      onClick={() => window.open(`mailto:${employeeDetails?.email}`)}
                      className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 font-semibold py-2 px-4 rounded transition"
                    >
                      📧 Email
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
