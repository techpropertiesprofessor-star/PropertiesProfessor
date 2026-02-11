import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { taskAPI, employeeAPI } from '../api/client';
// import AddCallerModal from '../components/AddCallerModal';
// import CallersList from '../components/CallersList';
import { AuthContext } from '../context/AuthContext';
import { format } from 'date-fns';
import { usePermissions } from '../hooks/usePermissions';

export default function TasksPage({ newMessageCount = 0, resetNewMessageCount }) {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canViewTasks, canCreateTasks, loading: permissionsLoading } = usePermissions();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    assignedTo: ''
  });

  // Modal state for viewing task details
  const [viewTask, setViewTask] = useState(null);

  const [showCallerModal, setShowCallerModal] = useState(false);

  // Cache for manager/creator names not in employees list
  const [managerNames, setManagerNames] = useState({});
  const fetchingManagerIds = useRef({});

  useEffect(() => {
    loadTasks();
    loadEmployees();
    
    // Check for add parameter in URL and auto-open add form
    if (searchParams.get('add') === 'true' && canCreateTasks) {
      setShowForm(true);
      // Clean up URL after opening
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('add');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams, canCreateTasks]);

  // Helper to get employeeId from user context
  const getEmployeeId = () => {
    if (user?.role === 'EMPLOYEE' && user?.employeeId) return user.employeeId;
    return null;
  };

  const loadEmployees = async () => {
    try {
      const response = await employeeAPI.getAll();
      setEmployees(response.data);
    } catch (err) {
      setEmployees([]);
    }
  };

  // Helper to fetch manager/creator name by ID if not in employees
  const fetchManagerName = async (id) => {
    if (!id || managerNames[id] || fetchingManagerIds.current[id]) return;
    fetchingManagerIds.current[id] = true;
    try {
      const response = await employeeAPI.getById(id);
      const emp = response.data;
      const name = emp.first_name ? `${emp.first_name} ${emp.last_name}` : emp.name || emp.email || id;
      setManagerNames(prev => ({ ...prev, [id]: name }));
    } catch {
      setManagerNames(prev => ({ ...prev, [id]: id }));
    } finally {
      fetchingManagerIds.current[id] = false;
    }
  };

  // On tasks load, trigger fetch for all missing manager IDs
  useEffect(() => {
    const missingManagerIds = tasks
      .map(task => task.assignedBy || task.manager || task.createdBy || task.created_by)
      .filter(id => id && !employees.find(e => String(e.id || e._id) === String(id)) && !managerNames[id]);
    missingManagerIds.forEach(id => fetchManagerName(id));
    // eslint-disable-next-line
  }, [tasks, employees]);

  useEffect(() => {
    if (!permissionsLoading && !canViewTasks) {
      navigate('/');
    }
  }, [permissionsLoading, canViewTasks, navigate]);

  const loadTasks = async () => {
    try {
      let params = {};
      const employeeId = getEmployeeId();
      if (employeeId) {
        params.assignedTo = employeeId;
      }
      const response = await taskAPI.getAll(params);
      // Sort tasks: pinned first, then by date
      const sortedTasks = (response.data || []).sort((a, b) => {
        // Pinned tasks first
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        // Then sort by date
        return new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at);
      });
      setTasks(sortedTasks);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    }
  };

  // Only assigned employee can update status
  const handleStatusChange = async (task, newStatus) => {
    if (!user || (!task.assigned_to && !task.assignedTo)) {
      alert('No assigned employee for this task.');
      return;
    }
    const assignedId = task.assignedTo || task.assigned_to;
    // For EMPLOYEE, compare with user.employeeId
    if (user.role === 'EMPLOYEE') {
      if (String(user.employeeId) !== String(assignedId)) {
        alert('Only the assigned employee can update status.');
        return;
      }
    } else {
      // For MANAGER/ADMIN, fallback to user._id or user.id
      if (user._id !== assignedId && user.id !== assignedId) {
        alert('Only the assigned employee can update status.');
        return;
      }
    }
    try {
      if (user.role === 'EMPLOYEE') {
        await taskAPI.updateStatusByEmployee(task.id || task._id, { status: newStatus.toUpperCase() });
      } else {
        await taskAPI.update(task.id || task._id, { status: newStatus.toUpperCase() });
      }
      await loadTasks();
    } catch (err) {
      alert('Failed to update task');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'PENDING':
        return 'bg-red-100 text-red-800';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'ARCHIVED':
        return 'bg-gray-200 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Pin/Unpin task
  const handlePinTask = async (task) => {
  try {
    const taskId = task?.id || task?._id;
    if (!taskId) return;

    const isPinned = task?.pinned;

    if (!taskAPI) {
      console.error("taskAPI not found");
      return;
    }

    if (user?.role === 'EMPLOYEE') {
      if (isPinned) {
        if (typeof taskAPI.unpinByEmployee === "function") {
          await taskAPI.unpinByEmployee(taskId);
        } else {
          console.error("unpinByEmployee not defined");
        }
      } else {
        if (typeof taskAPI.pinByEmployee === "function") {
          await taskAPI.pinByEmployee(taskId);
        } else {
          console.error("pinByEmployee not defined");
        }
      }
    } else {
      if (isPinned) {
        if (typeof taskAPI.unpinByManager === "function") {
          await taskAPI.unpinByManager(taskId);
        } else {
          console.error("unpinByManager not defined");
        }
      } else {
        if (typeof taskAPI.pinByManager === "function") {
          await taskAPI.pinByManager(taskId);
        } else {
          console.error("pinByManager not defined");
        }
      }
    }

    await loadTasks();
  } catch (err) {
    console.error("Pin/Unpin Error:", err);
    alert("Failed to update pin status");
  }
};

  if (permissionsLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header user={user} newMessageCount={newMessageCount} resetNewMessageCount={resetNewMessageCount} />
          <main className="flex-1 flex items-center justify-center p-8">
            <div className="text-gray-600 text-sm">Loading permissions...</div>
          </main>
        </div>
      </div>
    );
  }

  if (!canViewTasks) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header user={user} newMessageCount={newMessageCount} resetNewMessageCount={resetNewMessageCount} />
          <main className="flex-1 flex items-center justify-center p-8">
            <div className="bg-red-100 border border-red-400 text-red-700 px-8 py-6 rounded-lg text-center max-w-md">
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p>You do not have permission to view tasks.</p>
              <p className="text-sm mt-3 text-red-600">Contact an administrator if you need access.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header user={user} newMessageCount={newMessageCount} resetNewMessageCount={resetNewMessageCount} />
        
        <main className="flex-1 overflow-auto p-0 md:p-8 bg-gradient-to-tr from-blue-50 via-indigo-50 to-yellow-50">
          <div className="max-w-5xl mx-auto py-8">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight drop-shadow-lg flex items-center gap-3">
                <span className="text-indigo-500">🗂️</span> Tasks & Assignments
              </h1>
              <div className="flex space-x-2">
                {canCreateTasks && (
                  <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white px-7 py-2.5 rounded-xl font-bold shadow-lg transition text-base"
                  >
                    + New Task
                  </button>
                )}
              </div>
            </div>

            {/* Task Form */}
            {showForm && canCreateTasks && (
              <div className="relative bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-8 mb-10 border border-indigo-100 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{background: 'linear-gradient(120deg, rgba(99,102,241,0.08) 0%, rgba(236,72,153,0.07) 100%)', filter: 'blur(2px)'}}></div>
                <h2 className="text-2xl font-extrabold text-indigo-700 mb-6 flex items-center gap-2 tracking-tight relative z-10">
                  <span className="text-2xl">📝</span> Assign New Task
                </h2>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setLoading(true);
                    try {
                      // Send correct fields to backend
                      const submitData = {
                        title: formData.title,
                        description: formData.description,
                        assignedTo: formData.assignedTo,
                        dueDate: formData.due_date,
                        priority: formData.priority
                      };
                      await taskAPI.create(submitData);
                      setFormData({ title: '', description: '', priority: 'medium', due_date: '', assignedTo: '' });
                      setShowForm(false);
                      await loadTasks();
                    } catch (err) {
                      alert('Failed to assign task');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="space-y-4 relative z-10"
                >
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Task title..."
                    className="w-full px-4 py-2 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
                    required
                  />
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description (optional)..."
                    rows={2}
                    className="w-full px-4 py-2 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="px-4 py-2 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className="px-4 py-2 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-700">Assign To</label>
                    <select
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                      className="w-full px-4 py-2 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
                      required
                    >
                      <option value="">Select Employee</option>
                      {employees.map(emp => (
                        <option key={emp.id || emp._id} value={emp.id || emp._id}>
                          {emp.first_name ? `${emp.first_name} ${emp.last_name}` : emp.name || emp.email}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-2 text-base bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition shadow-lg"
                  >
                    {loading ? '⏳ Assigning...' : '✓ Assign'}
                  </button>
                </form>
              </div>
            )}

            {/* Tasks List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {tasks.length === 0 ? (
                <div className="bg-white/80 rounded-2xl shadow-xl p-10 text-center text-gray-500 border border-gray-100 col-span-full">
                  No tasks assigned
                </div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id || task._id} className="relative bg-white/90 backdrop-blur-lg rounded-xl shadow-md p-4 hover:shadow-xl transition border border-gray-100 flex flex-col justify-between min-h-[210px]">
                    {/* Pin Badge */}
                    {task.pinned && (
                      <div className="absolute top-2 right-2">
                        <span className="inline-block px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
                          📌 Pinned
                        </span>
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-indigo-400 text-xl">📝</span>
                        <h3 className="text-lg font-bold text-gray-900 truncate max-w-[120px]">{task.title}</h3>
                      </div>
                      <p className="text-gray-700 text-sm line-clamp-2 mb-1">{task.description}</p>
                      <div className="text-xs text-gray-700 mb-2">
                        <span className="font-semibold">Assigned To:</span> {
                          (() => {
                            const assignedToId = task.assignedTo || task.assignee || task.assigned_to;
                            if (!assignedToId) return '--';
                            const emp = employees.find(e => String(e.id || e._id) === String(assignedToId));
                            return emp ? (emp.first_name ? `${emp.first_name} ${emp.last_name}` : emp.name || emp.email) : (user && user.role === 'EMPLOYEE' ? (user.name || user.email) : assignedToId);
                          })()
                        }
                      </div>
                      {/* Status Update Dropdown for Employees */}
                      {user && user.role === 'EMPLOYEE' && String(user.employeeId) === String(task.assignedTo || task.assigned_to) && (
                        <div className="mb-2">
                          <label className="text-xs font-semibold text-gray-700 block mb-1">Status:</label>
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task, e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                        </div>
                      )}
                      {/* Status Badge for Managers/Non-assigned */}
                      {(!user || user.role !== 'EMPLOYEE' || String(user.employeeId) !== String(task.assignedTo || task.assigned_to)) && (
                        <div className="mb-2">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`font-bold text-xs ${getPriorityColor(task.priority)} px-2 py-1 rounded capitalize`}>
                        {task.priority ? `${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}` : 'Priority'}
                      </span>
                      <span className="text-xs text-gray-500">
                        Due: {
                          (task.due_date || task.dueDate) && !isNaN(new Date(task.due_date || task.dueDate))
                            ? format(new Date(task.due_date || task.dueDate), 'MMM dd, yyyy')
                            : '-'
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        className={`flex-1 px-3 py-1 text-xs rounded-lg font-semibold transition ${
                          task.pinned 
                            ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        }`}
                        onClick={() => handlePinTask(task)}
                        title={task.pinned ? 'Unpin task' : 'Pin task'}
                      >
                        {task.pinned ? '📌 Unpin' : '📌 Pin'}
                      </button>
                      <button
                        className="flex-1 px-3 py-1 text-xs rounded-lg font-semibold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition"
                        onClick={() => setViewTask(task)}
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Task View Modal */}
            {viewTask && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full relative animate-fadeIn">
                  <button
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                    onClick={() => setViewTask(null)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-indigo-400 text-3xl">📝</span>
                    <h2 className="text-2xl font-extrabold text-gray-900">{viewTask.title}</h2>
                  </div>
                  <div className="mb-2 text-gray-700 text-base">
                    {viewTask.description}
                  </div>
                  <div className="mb-2 text-sm text-gray-700">
                    <span className="font-semibold">Assigned To:</span> {
                      (() => {
                        const assignedToId = viewTask.assignedTo || viewTask.assignee || viewTask.assigned_to;
                        if (!assignedToId) return '--';
                        const emp = employees.find(e => String(e.id || e._id) === String(assignedToId));
                        return emp ? (emp.first_name ? `${emp.first_name} ${emp.last_name}` : emp.name || emp.email) : (user && user.role === 'EMPLOYEE' ? (user.name || user.email) : assignedToId);
                      })()
                    }
                  </div>
                  <div className="mb-2 text-sm text-gray-700">
                    <span className="font-semibold">Priority:</span> {viewTask.priority ? viewTask.priority.charAt(0).toUpperCase() + viewTask.priority.slice(1) : '-'}
                  </div>
                  <div className="mb-2 text-sm text-gray-700">
                    <span className="font-semibold">Due Date:</span> {
                      (viewTask.due_date || viewTask.dueDate) && !isNaN(new Date(viewTask.due_date || viewTask.dueDate))
                        ? format(new Date(viewTask.due_date || viewTask.dueDate), 'MMM dd, yyyy')
                        : '-'
                    }
                  </div>
                  <div className="mb-2 text-sm text-gray-700">
                    <span className="font-semibold">Status:</span> 
                    {user && user.role === 'EMPLOYEE' && String(user.employeeId) === String(viewTask.assignedTo || viewTask.assigned_to) ? (
                      <select
                        value={viewTask.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          await handleStatusChange(viewTask, newStatus);
                          setViewTask({ ...viewTask, status: newStatus });
                        }}
                        className="ml-2 px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                      >
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    ) : (
                      <span className={`ml-2 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(viewTask.status)}`}>
                        {viewTask.status}
                      </span>
                    )}
                  </div>
                  <div className="mb-2 text-sm text-gray-700">
                    <span className="font-semibold">Pinned:</span> {viewTask.pinned ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
