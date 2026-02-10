import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import api from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { FiUsers, FiCheckCircle, FiClock, FiAlertCircle, FiCalendar, FiUserCheck, FiUserX, FiPlus } from 'react-icons/fi';
import axios from 'axios';

const ManagerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, online, offline
  const [notes, setNotes] = useState([]); // For own notes
  const [allNotes, setAllNotes] = useState({}); // For all notes grouped by userId
  const [successMessage, setSuccessMessage] = useState('');
  const [newNote, setNewNote] = useState('');
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);

  useEffect(() => {
    fetchEmployeesStatistics();
    fetchNotes();
    fetchAllNotes();
  }, []);

  const fetchEmployeesStatistics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/employees/statistics/all');
      setEmployees(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching employee statistics:', err);
      setError(err.response?.data?.message || 'Failed to fetch employee statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    try {
      const response = await axios.get('/api/personal-notes', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setNotes(response.data);
    } catch (err) {
      console.error('Error fetching notes:', err);
    }
  };

  const fetchAllNotes = async () => {
    try {
      const response = await axios.get('/api/personal-notes/all', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAllNotes(response.data);
    } catch (err) {
      console.error('Error fetching all notes:', err);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    try {
      await axios.post('/api/personal-notes', { note: newNote }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setNewNote('');
      setShowAddNoteModal(false);
      setSuccessMessage('Note added successfully!');
      fetchNotes(); // Refresh own notes
      fetchAllNotes(); // Refresh all notes
      setTimeout(() => setSuccessMessage(''), 3000); // Hide message after 3 seconds
    } catch (err) {
      console.error('Error adding note:', err);
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
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
  const overallStats = employees.reduce((acc, emp) => {
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
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header user={user} />
          <main className="flex-1 flex items-center justify-center p-8">
            <div className="text-xl text-gray-600">Loading employee statistics...</div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header user={user} />
          <main className="flex-1 flex items-center justify-center p-8">
            <div className="text-xl text-red-600">{error}</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header user={user} />
        <main className="flex-1 overflow-auto p-6">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="mb-4 px-4 py-2 text-xs bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-lg font-bold shadow transition-all duration-150 flex items-center gap-2"
          >
            ← Back
          </button>

          {/* Header */}
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Employee Management Dashboard</h1>
              <p className="text-gray-600">Comprehensive view of all employee statistics and performance</p>
            </div>
            <button
              onClick={() => setShowAddNoteModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FiPlus /> Add Personal Note
            </button>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              {successMessage}
            </div>
          )}

      {/* Overall Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
              <FiUserCheck className="text-green-600 text-2xl" />
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

      {/* Personal Notes Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span role="img" aria-label="note">📝</span>
          My Personal Notes
        </h2>
        <div className="space-y-3">
          {notes.length > 0 ? (
            notes.map((note, idx) => (
              <div key={idx} className="bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 rounded-lg p-4 shadow">
                <p className="text-gray-700">{note.note}</p>
                <span className="text-xs text-gray-500">{new Date(note.createdAt).toLocaleString()}</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 italic">No personal notes yet. Add your first note!</p>
          )}
        </div>
      </div>

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
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('online')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'online'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Online
            </button>
            <button
              onClick={() => setFilterStatus('offline')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
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
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Employee Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => (
          <div
            key={employee._id}
            className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden"
          >
            {/* Employee Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                    {employee.first_name?.[0]}{employee.last_name?.[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">
                      {employee.first_name} {employee.last_name}
                    </h3>
                    <p className="text-sm opacity-90">{employee.role}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  employee.isOnline ? 'bg-green-400 text-green-900' : 'bg-gray-400 text-gray-900'
                }`}>
                  {employee.isOnline ? '● Online' : '○ Offline'}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm opacity-90">
                <FiClock className="text-lg" />
                <span>{employee.statusText}</span>
              </div>
            </div>

            {/* Statistics Content */}
            <div className="p-6">
              {/* Contact Info */}
              <div className="mb-6 pb-4 border-b border-gray-200">
                <p className="text-sm text-gray-600 mb-1">📧 {employee.email}</p>
                {employee.phone && <p className="text-sm text-gray-600">📱 {employee.phone}</p>}
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
                      <div key={idx} className="bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 rounded-lg p-3 shadow">
                        <p className="text-gray-700 text-sm">{note.note}</p>
                        <span className="text-xs text-gray-400">{new Date(note.createdAt).toLocaleString()}</span>
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
                <div className="grid grid-cols-2 gap-3">
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
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <FiUserCheck className="text-green-600 text-xl mx-auto mb-1" />
                    <p className="text-xs text-gray-600 mb-1">Present</p>
                    <p className="text-xl font-bold text-green-600">
                      {employee.statistics?.attendance?.presentDays || 0}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <FiUserX className="text-red-600 text-xl mx-auto mb-1" />
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

      {/* Add Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add Personal Note</h3>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter your note..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="4"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={addNote}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Add Note
              </button>
              <button
                onClick={() => setShowAddNoteModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
