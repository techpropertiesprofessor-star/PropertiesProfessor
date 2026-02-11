import React, { useState, useEffect, useContext } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { attendanceAPI } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { format, isToday, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';

// Client-based marking: user's location becomes center, 100m radius allowed
const DEFAULT_RADIUS_METERS = 100;

// Live clock component
const LiveClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
      <div className="text-4xl font-bold text-indigo-900">
        {format(time, 'HH:mm:ss')}
      </div>
      <div className="text-lg font-semibold text-indigo-700">
        {format(time, 'EEEE, MMMM dd, yyyy')}
      </div>
    </div>
  );
};

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

export default function AttendancePage() {
  const { user } = useContext(AuthContext);
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    reason: '',
    leave_type: 'sick'
  });
  const [loading, setLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [withinRadius, setWithinRadius] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [markedLocation, setMarkedLocation] = useState(null);
  const [radiusMeters, setRadiusMeters] = useState(DEFAULT_RADIUS_METERS);

  useEffect(() => {
    loadAttendance();
    loadLeaveRequests();
    checkUserLocation();
    checkTodayAttendance();
  }, []);

  const checkTodayAttendance = async () => {
    try {
      const response = await attendanceAPI.getHistory();
      const today = response.data.find(a => isToday(new Date(a.date)));
      if (today && today.check_in) {
        setCheckedInToday(true);
      }
    } catch (err) {
      console.error('Failed to check today attendance:', err);
    }
  };

  const handleMark = async () => {
    if (!withinRadius) {
      alert('You must be within the allowed zone to mark attendance');
      return;
    }

    setLoading(true);
    try {
      await attendanceAPI.checkIn({
        lat: userLocation?.lat,
        lng: userLocation?.lng
      });
      setMarkedLocation({ lat: userLocation?.lat, lng: userLocation?.lng });
      setCheckedInToday(true);
      await loadAttendance();
      alert('Attendance marked successfully!');
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const getCalendarDays = () => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    return eachDayOfInterval({ start, end });
  };

  const isAbsentDay = (day) => {
    return attendance.some(a => 
      isSameMonth(new Date(a.date), day) &&
      new Date(a.date).getDate() === day.getDate() &&
      a.status === 'absent'
    );
  };

  const isPresentDay = (day) => {
    return attendance.some(a => 
      isSameMonth(new Date(a.date), day) &&
      new Date(a.date).getDate() === day.getDate() &&
      a.status === 'present'
    );
  };

  const checkUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        if (markedLocation) {
          const distance = calculateDistance(
            latitude,
            longitude,
            markedLocation.lat,
            markedLocation.lng
          );
          setWithinRadius(distance <= radiusMeters);
          if (distance > radiusMeters) {
            setLocationError(`You are ${Math.round(distance)}m away from marked location. Attendance area: ${radiusMeters}m.`);
          } else {
            setLocationError('');
          }
        } else {
          setWithinRadius(true);
          setLocationError('');
        }
      },
      (error) => {
        setLocationError('Unable to retrieve your location. Please enable location services.');
        console.error('Geolocation error:', error);
      }
    );
  };

  const loadAttendance = async () => {
    try {
      const response = await attendanceAPI.getHistory();
      setAttendance(response.data);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    }
  };

  const loadLeaveRequests = async () => {
    try {
      const response = await attendanceAPI.getLeaveRequests();
      setLeaveRequests(response.data);
    } catch (err) {
      console.error('Failed to load leave requests:', err);
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await attendanceAPI.requestLeave(formData);
      setShowLeaveForm(false);
      setFormData({ start_date: '', end_date: '', reason: '', leave_type: 'sick' });
      await loadLeaveRequests();
      alert('Leave request submitted successfully');
    } catch (err) {
      alert('Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header user={user} />
        
        <main className="flex-1 overflow-auto p-8">
          {/* Live Clock Section */}
          <div className="mb-8">
            <LiveClock />
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Attendance & Leave Management</h1>
            <p className="text-gray-600 mt-1">Manage your office attendance, work-from-home requests, and leave applications</p>
          </div>

          {/* Location & Check-in Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Location Status */}
            <div>
              {locationError ? (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                  <div className="flex">
                    <svg className="h-6 w-6 text-yellow-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold text-yellow-800">Location Alert</p>
                      <p className="text-sm text-yellow-700 mt-1">{locationError}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                  <div className="flex">
                    <svg className="h-6 w-6 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-semibold text-green-800">✓ Within Target Zone</p>
                      <p className="text-sm text-green-700 mt-1">You are inside the set radius</p>
                    </div>
                  </div>
                </div>
              )}
              {/* Geofence is fixed server-side; show info only */}
              <div className="mt-4 p-4 bg-white rounded border">
                <p className="text-sm text-gray-700">Attendance location is fixed to ATS BOUQUET. Allowed radius: {radiusMeters}m.</p>
                <button
                  onClick={checkUserLocation}
                  className="mt-2 px-3 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
                >
                  Recheck Location
                </button>
              </div>
            </div>

            {/* Mark Attendance Button */}
            <div>
              <button
                onClick={() => { checkUserLocation(); handleMark(); }}
                disabled={!withinRadius || checkedInToday || loading}
                className={`w-full py-4 px-6 rounded-lg font-semibold text-white text-lg transition ${
                  checkedInToday
                    ? 'bg-gray-400 cursor-not-allowed'
                    : withinRadius
                    ? 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {checkedInToday ? '✓ Marked Today' : '📍 Mark Attendance'}
              </button>
              <p className="text-xs text-gray-600 mt-2 text-center">
                {checkedInToday ? 'Attendance already marked' : 'Mark your attendance'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Attendance History */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-900">Attendance History</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-4 py-2 rounded transition ${
                        viewMode === 'list'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      📋 List
                    </button>
                    <button
                      onClick={() => setViewMode('calendar')}
                      className={`px-4 py-2 rounded transition ${
                        viewMode === 'calendar'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      📅 Calendar
                    </button>
                  </div>
                </div>

                {viewMode === 'list' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px] text-xs">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900 whitespace-nowrap">Date</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900 whitespace-nowrap">Check In</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900 whitespace-nowrap">Check Out</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-900 whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {attendance.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="px-4 py-6 text-center text-gray-500">
                              No attendance records
                            </td>
                          </tr>
                        ) : (
                          attendance.map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-xs text-gray-900 font-medium whitespace-nowrap break-words">
                                {format(new Date(record.date), 'MMM dd, yyyy')}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-900 whitespace-nowrap break-words">
                                {record.check_in ? format(new Date(record.check_in), 'HH:mm') : '-'}
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-900 whitespace-nowrap break-words">
                                {record.check_out ? format(new Date(record.check_out), 'HH:mm') : '-'}
                              </td>
                              <td className="px-4 py-3 text-xs whitespace-nowrap">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold break-words ${
                                  record.status === 'present' ? 'bg-green-100 text-green-800' :
                                  record.status === 'absent' ? 'bg-red-100 text-red-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {record.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <button
                        onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
                        className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        ← Prev
                      </button>
                      <h3 className="text-lg font-semibold">
                        {format(selectedMonth, 'MMMM yyyy')}
                      </h3>
                      <button
                        onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
                        className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        Next →
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-7 gap-2 mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center font-semibold text-gray-600 text-sm py-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {getCalendarDays().map(day => (
                        <div
                          key={day.toString()}
                          className={`aspect-square flex items-center justify-center rounded-lg text-sm font-semibold cursor-pointer transition ${
                            isPresentDay(day)
                              ? 'bg-green-100 text-green-800 border-2 border-green-400'
                              : isAbsentDay(day)
                              ? 'bg-red-100 text-red-800 border-2 border-red-400'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {day.getDate()}
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 pt-4 border-t flex gap-6">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-100 border-2 border-green-400 rounded"></div>
                        <span className="text-sm text-gray-600">Present</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-100 border-2 border-red-400 rounded"></div>
                        <span className="text-sm text-gray-600">Absent</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Leave Requests */}
            <div>
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b flex justify-between items-center">
                  <h2 className="text-lg font-bold text-gray-900">Leave Requests</h2>
                  <button
                    onClick={() => setShowLeaveForm(!showLeaveForm)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm transition"
                  >
                    + New
                  </button>
                </div>

                {showLeaveForm && (
                  <form onSubmit={handleLeaveSubmit} className="p-6 border-b space-y-4 bg-gray-50">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={formData.leave_type}
                        onChange={(e) => setFormData({...formData, leave_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="sick">Sick Leave</option>
                        <option value="casual">Casual Leave</option>
                        <option value="emergency">Emergency</option>
                        <option value="wfh">Work From Home</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                      <textarea
                        value={formData.reason}
                        onChange={(e) => setFormData({...formData, reason: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        rows="3"
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 px-4 rounded transition text-sm font-medium"
                    >
                      Submit Request
                    </button>
                  </form>
                )}

                <div className="divide-y max-h-96 overflow-y-auto">
                  {leaveRequests.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">No leave requests</div>
                  ) : (
                    leaveRequests.map((req) => (
                      <div key={req.id} className="p-4 hover:bg-gray-50">
                        <p className="font-semibold text-sm text-gray-900">{req.leave_type.toUpperCase()}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(req.start_date), 'MMM dd')} - {format(new Date(req.end_date), 'MMM dd')}
                        </p>
                        <p className="text-xs text-gray-600 mt-2">{req.reason}</p>
                        <span className={`inline-block mt-2 px-2 py-1 text-xs font-semibold rounded ${
                          req.status === 'approved' ? 'bg-green-100 text-green-800' :
                          req.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
