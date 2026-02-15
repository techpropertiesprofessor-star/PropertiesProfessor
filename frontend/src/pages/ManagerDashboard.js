import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import useSidebarCollapsed from '../hooks/useSidebarCollapsed';
import api from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { FiUsers, FiCheckCircle, FiClock, FiAlertCircle, FiCalendar, FiCheck, FiX } from 'react-icons/fi';
import axios from 'axios';

const ManagerDashboard = () => {
  const sidebarCollapsed = useSidebarCollapsed();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, online, offline
  const [allNotes, setAllNotes] = useState({}); // For all notes grouped by userId

  useEffect(() => {
    fetchEmployeesStatistics();
    fetchAllNotes();
  }, []);

  const fetchEmployeesStatistics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/employees/statistics/all');
      setEmployees(Array.isArray(response.data)
  ? response.data
  : response.data?.data || []);

      setError(null);
    } catch (err) {
      console.error('Error fetching employee statistics:', err);
      setError(err.response?.data?.message || 'Failed to fetch employee statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllNotes = async () => {
    try {
      const response = await axios.get('/api/personal-notes/all', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAllNotes(typeof response.data === "object"
  ? response.data
  : {});

    } catch (err) {
      console.error('Error fetching all notes:', err);
    }
  };



  const safeEmployees = Array.isArray(employees) ? employees : [];

// Filter employees
const filteredEmployees = safeEmployees.filter(emp => {

    const matchesSearch = 
      emp.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'online' && emp.isOnline) ||
      (filterStatus === 'offline' && !emp.isOnline);

    return matchesSearch && matchesStatus;
  });

  // Calculate overall statistics
  const overallStats = safeEmployees.reduce((acc, emp) => {

    if (emp.statistics) {
      acc.totalTasks += emp.statistics.tasks?.total || 0;
      acc.completedTasks += emp.statistics.tasks?.completed || 0;
      acc.pendingTasks += emp.statistics.tasks?.pending || 0;
      acc.presentDays += emp.statistics.attendance?.presentDays || 0;
      acc.absentDays += emp.statistics.attendance?.absentDays || 0;
      acc.leaveDays += emp.statistics.attendance?.leaveDays || 0;
    }
    if (emp.isOnline) acc.onlineEmployees += 1;
    return acc;
  }, {
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    presentDays: 0,
    absentDays: 0,
    leaveDays: 0,
    onlineEmployees: 0
  });

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="hidden md:block"><Sidebar /></div>
        <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
          <Header user={user} />
          <main className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
            <div className="text-xl text-gray-600 break-words">Loading employee statistics...</div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="hidden md:block"><Sidebar /></div>
        <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
          <Header user={user} />
          <main className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
            <div className="text-xl text-red-600 break-words">{error}</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="hidden md:block"><Sidebar /></div>
      <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header user={user} />
        <main className="flex-1 overflow-auto p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="mb-4 w-full sm:w-auto px-4 py-2 text-xs bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-lg font-bold shadow transition-all duration-150 flex items-center gap-2"
          >
            ← Back
          </button>

          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 mb-2 break-words">Employee Management Dashboard</h1>
              <p className="text-gray-600 break-words">Comprehensive view of all employee statistics and performance</p>
            </div>
            {/* Personal note action removed */}
          </div>

          {/* success message removed */}

          {/* Overall Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Employees</p>
                  <p className="text-3xl font-bold text-gray-800">{employees.length}</p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <FiUsers className="text-blue-600 text-2xl" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Online Now</p>
                  <p className="text-3xl font-bold text-gray-800">{overallStats.onlineEmployees}</p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <FiCheck className="text-green-600 text-2xl" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Tasks Completed</p>
                  <p className="text-3xl font-bold text-gray-800">{overallStats.completedTasks}</p>
                  <p className="text-xs text-gray-500">of {overallStats.totalTasks} total</p>
                </div>
                <div className="bg-purple-100 rounded-full p-3">
                  <FiCheckCircle className="text-purple-600 text-2xl" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Present Days</p>
                  <p className="text-3xl font-bold text-gray-800">{overallStats.presentDays}</p>
                  <p className="text-xs text-gray-500">this month</p>
                </div>
                <div className="bg-orange-100 rounded-full p-3">
                  <FiCalendar className="text-orange-600 text-2xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Personal Notes removed per request */}

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`w-full sm:w-auto px-6 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus('online')}
                  className={`w-full sm:w-auto px-6 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === 'online'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Online
                </button>
                <button
                  onClick={() => setFilterStatus('offline')}
                  className={`w-full sm:w-auto px-6 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === 'offline'
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Offline
                </button>
              </div>
              <button
                onClick={fetchEmployeesStatistics}
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Employee Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(filteredEmployees) && filteredEmployees.map((employee) => (

              <div
                key={employee._id}
                className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden flex flex-col"
              >
                {/* Employee Header */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                        {employee.first_name?.[0]}{employee.last_name?.[0]}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold break-words">
                          {employee.first_name} {employee.last_name}
                        </h3>
                        <p className="text-sm opacity-90 break-words">{employee.role}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                      employee.isOnline ? 'bg-green-400 text-green-900' : 'bg-gray-400 text-gray-900'
                    }`}>
                      {employee.isOnline ? '● Online' : '○ Offline'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm opacity-90 break-words">
                    <FiClock className="text-lg" />
                    <span>{employee.statusText}</span>
                  </div>
                </div>

                {/* Statistics Content */}
                <div className="p-6 flex-1 flex flex-col">
                  {/* Contact Info */}
                  <div className="mb-6 pb-4 border-b border-gray-200">
                    <p className="text-sm text-gray-600 mb-1 break-words">📧 {employee.email}</p>
                    {employee.phone && <p className="text-sm text-gray-600 break-words">📱 {employee.phone}</p>}
                  </div>

                  {/* Personal Notes */}
                  <div className="mb-6">
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <span role="img" aria-label="note">📝</span>
                      Personal Notes
                    </h4>
                    <div className="space-y-2">
                      {allNotes[employee.userId] && allNotes[employee.userId].length > 0 ? (
                        allNotes[employee.userId].map((note, idx) => (
                          <div key={idx} className="bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 rounded-lg p-3 shadow break-words">
                            <p className="text-gray-700 text-sm break-words">{note.note}</p>
                            <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(note.createdAt).toLocaleString()}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-400 text-sm italic">No personal notes yet.</div>
                      )}
                    </div>
                  </div>

                  {/* Task Statistics */}
                  <div className="mb-6">
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <FiCheckCircle className="text-blue-600" />
                      Task Statistics
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Total Tasks</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {employee.statistics?.tasks?.total || 0}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Completed</p>
                        <p className="text-2xl font-bold text-green-600">
                          {employee.statistics?.tasks?.completed || 0}
                        </p>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">Pending</p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {employee.statistics?.tasks?.pending || 0}
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <p className="text-xs text-gray-600 mb-1">In Progress</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {employee.statistics?.tasks?.inProgress || 0}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {employee.statistics?.tasks?.total > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Completion Rate</span>
                          <span>
                            {Math.round((employee.statistics.tasks.completed / employee.statistics.tasks.total) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${(employee.statistics.tasks.completed / employee.statistics.tasks.total) * 100}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Attendance Statistics */}
                  <div>
                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <FiCalendar className="text-purple-600" />
                      Attendance (This Month)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-green-50 rounded-lg p-3 text-center">
                        <FiCheck className="text-green-600 text-xl mx-auto mb-1" />
                        <p className="text-xs text-gray-600 mb-1">Present</p>
                        <p className="text-xl font-bold text-green-600">
                          {employee.statistics?.attendance?.presentDays || 0}
                        </p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 text-center">
                        <FiX className="text-red-600 text-xl mx-auto mb-1" />
                        <p className="text-xs text-gray-600 mb-1">Absent</p>
                        <p className="text-xl font-bold text-red-600">
                          {employee.statistics?.attendance?.absentDays || 0}
                        </p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <FiCalendar className="text-blue-600 text-xl mx-auto mb-1" />
                        <p className="text-xs text-gray-600 mb-1">Leave</p>
                        <p className="text-xl font-bold text-blue-600">
                          {employee.statistics?.attendance?.leaveDays || 0}
                        </p>
                      </div>
                    </div>

                    {/* Attendance Summary */}
                    <div className="mt-3 bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Working Days</span>
                        <span className="font-bold text-gray-800">
                          {employee.statistics?.attendance?.totalWorkingDays || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* No Results */}
          {filteredEmployees.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <FiAlertCircle className="text-gray-400 text-6xl mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">No Employees Found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          )}
        </main>
      </div>

      {/* add-note modal removed */}
    </div>
  );
};

export default ManagerDashboard;
