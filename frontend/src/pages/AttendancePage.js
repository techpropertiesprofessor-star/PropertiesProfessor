import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import useSidebarCollapsed from '../hooks/useSidebarCollapsed';
import CalendarWidget from '../components/CalendarWidget';
import HolidayForm from '../components/HolidayForm';
import holidayAPI from '../api/holiday';
import { attendanceAPI, default as api } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { format, isToday, isSameMonth } from 'date-fns';
import { FiMapPin, FiClock, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { usePermissions } from '../hooks/usePermissions';
import { leaveAPI } from "../api/client";
import useRealtimeData from '../hooks/useRealtimeData';


// Geo-fence configuration for attendance marking
const ALLOWED_RADIUS_METERS = 100;
const OFFICE_LOCATION = {
  lat: 28.5105188863241,
  lng: 77.38054726639055
};

const LiveClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg text-white">
      <div className="text-3xl font-bold">{format(time, 'HH:mm:ss')}</div>
      <div className="text-xs mt-1 opacity-90">{format(time, 'EEEE, MMM dd, yyyy')}</div>
    </div>
  );
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function AttendancePage({ newMessageCount = 0, resetNewMessageCount }) {
    const sidebarCollapsed = useSidebarCollapsed();
    // Holidays state for calendar
    const [holidays, setHolidays] = useState([]);
    // Show/hide holiday form
    const [showHolidayForm, setShowHolidayForm] = useState(false);

    useEffect(() => {
      fetchHolidays();
    }, []);

    const fetchHolidays = async () => {
      try {
        const res = await holidayAPI.getAll();
        setHolidays(res.data || []);
      } catch (err) {
        setHolidays([]);
      }
    };
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { canViewAttendance, canMarkAttendance, loading: permissionsLoading } = usePermissions();
  const [attendance, setAttendance] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [distanceFromOffice, setDistanceFromOffice] = useState(null);
  const [withinRadius, setWithinRadius] = useState(false);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checkedOutToday, setCheckedOutToday] = useState(false);
  const [isAfterNoon, setIsAfterNoon] = useState(new Date().getHours() >= 12);
  const [markedLocation, setMarkedLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  
  // Geo-fence specific states
  const [isCheckingLocation, setIsCheckingLocation] = useState(true);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState(false);
  const [isWithinOfficeGeofence, setIsWithinOfficeGeofence] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    reason: '',
    leave_type: 'sick'
  });
  
  // Manager-specific states
  const [employees, setEmployees] = useState([]);
  const [teamAttendance, setTeamAttendance] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'monthly'
  
  // Employee-specific states
  const [employeeViewMode, setEmployeeViewMode] = useState('current'); // 'current' or 'history'
  const [employeeSelectedMonth, setEmployeeSelectedMonth] = useState(new Date());
  
  // Reload team attendance when selected month changes
  useEffect(() => {
    if (user && user.role === 'MANAGER' && viewMode === 'monthly') {
      console.log('📅 Loading attendance for month:', format(selectedMonth, 'MMMM yyyy'));
      loadTeamAttendance();
    }
  }, [selectedMonth, viewMode]);


  useEffect(() => {
    loadAttendance();
    loadLeaveRequests();
    checkUserLocation();
    checkTodayAttendance();
    
    // Load manager-specific data
    if (user && user.role === 'MANAGER') {
      loadEmployees();
      loadTeamAttendance();
    }
    
    // Poll every 30 seconds for real-time updates
    const interval = setInterval(() => {
      loadAttendance();
      loadLeaveRequests();
      checkTodayAttendance();
      if (user && user.role === 'MANAGER') {
        loadTeamAttendance();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [user]);
  
  // Real-time team attendance updates via shared socket
  const refreshAttendance = useCallback(() => {
    loadAttendance();
    loadLeaveRequests();
    checkTodayAttendance();
    if (user && user.role === 'MANAGER') loadTeamAttendance();
  }, [user]);
  useRealtimeData(['attendance-updated', 'team-attendance-updated'], refreshAttendance);

  // Update isAfterNoon every minute to auto-enable checkout button at 12PM
  useEffect(() => {
    const noonTimer = setInterval(() => {
      setIsAfterNoon(new Date().getHours() >= 12);
    }, 60000);
    return () => clearInterval(noonTimer);
  }, []);

  useEffect(() => {
    if (!permissionsLoading && !canViewAttendance) {
      navigate('/');
    }
  }, [canViewAttendance, permissionsLoading, navigate]);

  // Geo-fence: Check location on page load and setup polling
  useEffect(() => {
    // Initial location check
    checkGeofenceLocation();

    // Set up polling every 20 seconds to refresh location
    const locationPollingInterval = setInterval(() => {
      checkGeofenceLocation();
    }, 20000); // 20 seconds

    // Cleanup interval on unmount
    return () => {
      clearInterval(locationPollingInterval);
    };
  }, []); // Empty dependency array - only run on mount/unmount

  const checkTodayAttendance = async () => {
    try {
      const response = await attendanceAPI.getHistory();
      const today = response.data.find(a => isToday(new Date(a.date)));
      if (today && (today.check_in || today.checkIn)) setCheckedInToday(true);
      if (today && (today.check_out || today.checkOut)) setCheckedOutToday(true);
      setIsAfterNoon(new Date().getHours() >= 12);
    } catch (err) {
      console.error('Failed to check today attendance:', err);
    }
  };

  // Geo-fence: Check if user is within office premises
  const checkGeofenceLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by your browser');
      setLocationPermissionDenied(true);
      setIsCheckingLocation(false);
      setIsWithinOfficeGeofence(false);
      return;
    }

    setIsCheckingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        // Calculate distance from office using Haversine formula
        const distance = calculateDistance(
          latitude,
          longitude,
          OFFICE_LOCATION.lat,
          OFFICE_LOCATION.lng
        );
        
        setDistanceFromOffice(Math.round(distance));
        
        // Check if within allowed radius
        if (distance <= ALLOWED_RADIUS_METERS) {
          setIsWithinOfficeGeofence(true);
          setWithinRadius(true);
          setLocationError('');
          setLocationPermissionDenied(false);
        } else {
          setIsWithinOfficeGeofence(false);
          setWithinRadius(false);
          setLocationError(`You are ${Math.round(distance)}m away from office. Must be within ${ALLOWED_RADIUS_METERS}m.`);
          setLocationPermissionDenied(false);
        }
        
        setIsCheckingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsCheckingLocation(false);
        setLocationPermissionDenied(true);
        setIsWithinOfficeGeofence(false);
        
        // Handle different error types
        if (error.code === 1) {
          setLocationError('Location access required to mark attendance');
        } else if (error.code === 2) {
          setLocationError('Unable to determine your location');
        } else if (error.code === 3) {
          setLocationError('Location request timed out');
        } else {
          setLocationError('Error accessing location services');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const checkUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        if (markedLocation) {
          const distance = calculateDistance(latitude, longitude, markedLocation.lat, markedLocation.lng);
          if (distance > ALLOWED_RADIUS_METERS) {
            setLocationError(`You are ${Math.round(distance)}m away from marked location`);
          } else {
            setLocationError('');
          }
        } else {
          setLocationError('');
        }
      },
      (error) => {
        setLocationError('Enable location services');
        console.error('Geolocation error:', error);
      }
    );
  };

  const handleMark = async () => {
    if (!canMarkAttendance) {
      alert('You do not have permission to mark attendance.');
      return;
    }
    // Zone check now handled by canMarkAttendance logic

    setLoading(true);
    try {
      await attendanceAPI.checkIn({
        lat: userLocation?.lat,
        lng: userLocation?.lng
      });
      setMarkedLocation({ lat: userLocation?.lat, lng: userLocation?.lng });
      setCheckedInToday(true);
      await loadAttendance();
      alert('✓ Attendance marked successfully!');
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!canMarkAttendance) {
      alert('You do not have permission.');
      return;
    }
    setLoading(true);
    try {
      await attendanceAPI.checkOut();
      setCheckedOutToday(true);
      await loadAttendance();
      alert('✓ Checked out successfully!');
    } catch (err) {
      alert(err?.response?.data?.message || err?.response?.data?.error || 'Failed to check out');
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    try {
      const response = await attendanceAPI.getHistory();
      // Map backend fields to expected frontend fields
      const mapped = (response.data || []).map((a) => ({
        ...a,
        check_in: a.check_in || a.checkIn,
        check_out: a.check_out || a.checkOut,
        date: a.date,
        status: (a.status || '').toLowerCase(),
      }));
      setAttendance(mapped);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    }
  };

  const loadLeaveRequests = async () => {
    try {
      const response = await api.get('/leaves/my');
      // Map backend fields to expected frontend fields
      const mapped = (response.data || []).map((l) => ({
        ...l,
        start_date: l.fromDate,
        end_date: l.toDate,
        leave_type: l.leaveType,
        status: (l.status || '').toLowerCase(),
        reason: l.reason || '',
      }));
      setLeaveRequests(mapped);
    } catch (err) {
      console.error('Failed to load leave requests:', err);
    }
  };
  
  // Manager-specific data loading
  const loadEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data || []);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };
  
  const loadTeamAttendance = async () => {
    try {
      const response = await api.get('/attendance/team');
      console.log('📊 Team attendance loaded:', response.data);
      setTeamAttendance(response.data || []);
    } catch (err) {
      console.error('Failed to load team attendance:', err);
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You are not logged in. Please log in to submit a leave request.');
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      // Prepare payload for backend
      const payload = {
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason,
        leave_type: formData.leave_type
      };
      await leaveAPI.requestLeave(payload);
      setShowLeaveForm(false);
      setFormData({ start_date: '', end_date: '', reason: '', leave_type: 'sick' });
      await loadLeaveRequests();
      alert('✓ Leave request submitted');
    } catch (err) {
      // Improved error logging for debugging
      console.error('Leave request error:', err?.response || err);
      alert(err?.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  // Find today's attendance record
  const todayRecord = attendance.find(a => a.date && isToday(new Date(a.date)));
  const todayCheckIn = (todayRecord && todayRecord.check_in && !isNaN(new Date(todayRecord.check_in)))
    ? format(new Date(todayRecord.check_in), 'HH:mm')
    : '-';
  const todayCheckOut = (todayRecord && (todayRecord.check_out || todayRecord.checkOut) && !isNaN(new Date(todayRecord.check_out || todayRecord.checkOut)))
    ? format(new Date(todayRecord.check_out || todayRecord.checkOut), 'HH:mm')
    : '-';

  // Calculate attendance status with business rules
  const getAttendanceStatus = (record) => {
    const recordDate = new Date(record.date);
    const dayOfWeek = recordDate.getDay(); // 0=Sunday, 1=Monday, etc.
    
    // Check if it's a Monday (weekly off)
    if (dayOfWeek === 1) return 'WO';
    
    // Check if it's a holiday
    const isHoliday = holidays.some(h => {
      const holidayDate = new Date(h.date);
      return holidayDate.toDateString() === recordDate.toDateString();
    });
    if (isHoliday) return 'H';
    
    // Check if there's an approved leave
    const hasApprovedLeave = leaveRequests.some(l => {
      if (l.status !== 'approved') return false;
      const startDate = new Date(l.start_date);
      const endDate = new Date(l.end_date);
      return recordDate >= startDate && recordDate <= endDate;
    });
    if (hasApprovedLeave) return 'L';
    
    // Check if there's a check-in (support both camelCase and snake_case)
    if (record.checkIn || record.check_in) return 'P';
    
    // Check if status field exists (database might have direct status field)
    if (record.status === 'PRESENT') return 'P';
    
    // Otherwise absent
    return 'A';
  };

  const presentCount = attendance.filter(a => {
    const status = getAttendanceStatus(a);
    return status === 'P';
  }).length;
  
  // Calculate absent by counting working days with no attendance in current month
  const absentCount = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    
    // Build a Set of dates (day number) that have present attendance
    const presentDays = new Set();
    attendance.forEach(a => {
      const d = new Date(a.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const status = getAttendanceStatus(a);
        if (status === 'P') presentDays.add(d.getDate());
      }
    });
    
    // Build a Set of holiday dates for current month
    const holidayDays = new Set();
    (holidays || []).forEach(h => {
      const d = new Date(h.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        holidayDays.add(d.getDate());
      }
    });
    
    // Build a Set of approved leave dates for current month
    const leaveDays = new Set();
    leaveRequests.filter(l => l.status === 'approved').forEach(l => {
      const start = new Date(l.start_date || l.fromDate);
      const end = new Date(l.end_date || l.toDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === year && d.getMonth() === month) {
          leaveDays.add(d.getDate());
        }
      }
    });
    
    let absent = 0;
    for (let day = 1; day < today; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      
      // Skip Sundays (0) and Mondays (1 = weekly off)
      if (dayOfWeek === 0 || dayOfWeek === 1) continue;
      
      // Skip holidays
      if (holidayDays.has(day)) continue;
      
      // Skip if on approved leave
      if (leaveDays.has(day)) continue;
      
      // Skip if attendance was marked
      if (presentDays.has(day)) continue;
      
      // Working day with no attendance = absent
      absent++;
    }
    return absent;
  })();
  
  // Count approved leaves (real-time count from leave requests)
  const leaveCount = leaveRequests.filter(l => l.status === 'approved').length;
  
  const weeklyOffCount = attendance.filter(a => {
    const status = getAttendanceStatus(a);
    return status === 'WO' || status === 'H';
  }).length;
  
  const pendingLeaves = leaveRequests.filter(l => l.status === 'pending').length;
  
  // ===== ACCURATE ABSENT CALCULATION HELPER =====
  // Counts working days where an employee had NO attendance in a given month
  const calculateEmployeeAbsentDays = useCallback((employeeId, targetMonth, targetYear, empAttendanceData) => {
    const now = new Date();
    const isCurrentMonth = now.getMonth() === targetMonth && now.getFullYear() === targetYear;
    const lastDay = isCurrentMonth ? now.getDate() : new Date(targetYear, targetMonth + 1, 0).getDate();

    // Build Set of days with present attendance
    const presentDays = new Set();
    empAttendanceData.forEach(a => {
      const d = new Date(a.date);
      if (d.getFullYear() === targetYear && d.getMonth() === targetMonth) {
        const status = getAttendanceStatus(a);
        if (status === 'P') presentDays.add(d.getDate());
      }
    });

    // Build Set of holiday dates
    const holidayDays = new Set();
    (holidays || []).forEach(h => {
      const d = new Date(h.date);
      if (d.getFullYear() === targetYear && d.getMonth() === targetMonth) {
        holidayDays.add(d.getDate());
      }
    });

    // Build Set of approved leave dates (use team leave data or global leaveRequests)
    const leaveDays = new Set();
    empAttendanceData.forEach(a => {
      const d = new Date(a.date);
      if (d.getFullYear() === targetYear && d.getMonth() === targetMonth) {
        const status = getAttendanceStatus(a);
        if (status === 'L') leaveDays.add(d.getDate());
      }
    });

    let absent = 0;
    for (let day = 1; day < lastDay; day++) {
      const date = new Date(targetYear, targetMonth, day);
      const dayOfWeek = date.getDay();
      // Skip Sundays (0) and Mondays (1 = weekly off)
      if (dayOfWeek === 0 || dayOfWeek === 1) continue;
      if (holidayDays.has(day)) continue;
      if (leaveDays.has(day)) continue;
      if (presentDays.has(day)) continue;
      absent++;
    }
    return absent;
  }, [holidays]);

  // Check if today is a working day
  const isTodayWorkingDay = useCallback(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 1) return false;
    const isHoliday = (holidays || []).some(h => new Date(h.date).toDateString() === now.toDateString());
    return !isHoliday;
  }, [holidays]);

  // Manager helper functions
  const getEmployeeAttendanceForDate = (employeeId, date) => {
    const record = teamAttendance.find(a => 
      String(a.employee) === String(employeeId) && 
      new Date(a.date).toDateString() === date.toDateString()
    );
    if (!record) return 'A';
    return getAttendanceStatus(record);
  };
  
  const getConsecutiveAbsences = (employeeId) => {
    const empRecords = teamAttendance
      .filter(a => String(a.employee) === String(employeeId))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let consecutive = 0;
    for (let record of empRecords) {
      const status = getAttendanceStatus(record);
      if (status === 'A') consecutive++;
      else break;
    }
    return consecutive;
  };
  
  const downloadAttendanceReport = () => {
    const today = new Date();
    const month = format(selectedMonth, 'MMMM yyyy');
    
    // Create CSV content
    let csv = `Attendance Report - ${month}\n\n`;
    csv += 'Employee Name,Total Present,Total Absent,Total Leave,Weekly Off/Holiday,Consecutive Absences\n';
    
    employees.forEach(emp => {
      const empAttendance = teamAttendance.filter(a => a.employee === emp._id);
      const present = empAttendance.filter(a => getAttendanceStatus(a) === 'P').length;
      const absent = calculateEmployeeAbsentDays(emp._id, selectedMonth.getMonth(), selectedMonth.getFullYear(), empAttendance);
      const leave = empAttendance.filter(a => getAttendanceStatus(a) === 'L').length;
      const wo = empAttendance.filter(a => ['WO', 'H'].includes(getAttendanceStatus(a))).length;
      const consecutive = getConsecutiveAbsences(emp._id);
      
      csv += `${emp.name || emp.email},${present},${absent},${leave},${wo},${consecutive}\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${format(today, 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (permissionsLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="hidden md:block"><Sidebar /></div>
        <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
          <Header user={user} newMessageCount={newMessageCount} resetNewMessageCount={resetNewMessageCount} />
          <main className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
            <div className="text-gray-600 text-sm">Loading permissions...
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!canViewAttendance) {
    return (
      <div className="flex h-screen bg-gray-50">
        <div className="hidden md:block"><Sidebar /></div>
        <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
          <Header user={user} newMessageCount={newMessageCount} resetNewMessageCount={resetNewMessageCount} />
          <main className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 sm:px-8 py-6 rounded-lg text-center max-w-md mx-4 sm:mx-0">
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p>You do not have permission to view attendance.</p>
              <p className="text-sm mt-3 text-red-600">Contact an administrator if you need access.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <div className="hidden md:block"><Sidebar /></div>
      <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header user={user} newMessageCount={newMessageCount} resetNewMessageCount={resetNewMessageCount} />
        <main className="flex-1 overflow-auto p-4 sm:p-8">
          {/* Today's Check-in/Check-out */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:space-x-8 justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-base font-semibold text-gray-700">Check-in:</span>
                <span className="text-lg font-bold text-green-700">{todayCheckIn}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-semibold text-gray-700">Check-out:</span>
                <span className="text-lg font-bold text-orange-600">{todayCheckOut}</span>
              </div>
            </div>
            {user && user.role === 'MANAGER' && (
              <div className="flex justify-end mt-3 md:mt-0">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded text-xs font-semibold shadow hover:bg-blue-700"
                  onClick={() => setShowHolidayForm((v) => !v)}
                >
                  {showHolidayForm ? 'Close Holiday Form' : '+ Add Holiday'}
                </button>
              </div>
            )}
          </div>
          
          {/* Holiday Form - Show right after the button */}
          {user && user.role === 'MANAGER' && showHolidayForm && (
            <div className="mb-6">
              <HolidayForm onHolidayAdded={fetchHolidays} />
            </div>
          )}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-blue-800 tracking-tight">Attendance & Leave</h1>
          </div>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Present (P)</p>
                    <p className="text-2xl font-extrabold text-green-600">{presentCount}</p>
                </div>
                <FiCheckCircle size={28} className="text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Absent (A)</p>
                    <p className="text-2xl font-extrabold text-red-600">{absentCount}</p>
                </div>
                <FiAlertCircle size={28} className="text-red-500" />
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Approved Leaves</p>
                    <p className="text-2xl font-extrabold text-blue-600">{leaveCount}</p>
                </div>
                <FiClock size={28} className="text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">WO/Holiday</p>
                    <p className="text-2xl font-extrabold text-purple-600">{weeklyOffCount}</p>
                </div>
                <span className="text-2xl">🏖️</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Pending Leaves</p>
                    <p className="text-2xl font-extrabold text-orange-600">{pendingLeaves}</p>
                </div>
                <FiClock size={28} className="text-orange-500" />
              </div>
            </div>
          </div>
          
          {/* Manager Team Attendance View */}
          {user && user.role === 'MANAGER' && (
            <div className="mb-8 bg-white rounded-2xl shadow-xl border border-blue-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-blue-800">Team Attendance</h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => setViewMode(viewMode === 'daily' ? 'monthly' : 'daily')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
                  >
                    {viewMode === 'daily' ? '📅 Monthly View' : '📆 Daily View'}
                  </button>
                  <button
                    onClick={downloadAttendanceReport}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition"
                  >
                    📥 Download Report
                  </button>
                </div>
              </div>
              
              {/* Daily View - Current View */}
              {viewMode === 'daily' && (
                <>
                  {/* Team Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                      <p className="text-xs text-green-700 font-semibold mb-1">Total Team</p>
                      <p className="text-3xl font-extrabold text-green-800">{employees.length}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                      <p className="text-xs text-blue-700 font-semibold mb-1">Present Today</p>
                      <p className="text-3xl font-extrabold text-blue-800">
                        {(() => {
                          const count = teamAttendance.filter(a => isToday(new Date(a.date)) && getAttendanceStatus(a) === 'P').length;
                          console.log('🟢 Present today count:', count, 'Today records:', teamAttendance.filter(a => isToday(new Date(a.date))).length);
                          return count;
                        })()}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                      <p className="text-xs text-red-700 font-semibold mb-1">Absent Today</p>
                      <p className="text-3xl font-extrabold text-red-800">
                        {(() => {
                          if (!isTodayWorkingDay()) return 0;
                          const presentToday = teamAttendance.filter(a => isToday(new Date(a.date)) && getAttendanceStatus(a) === 'P').length;
                          const leaveToday = teamAttendance.filter(a => isToday(new Date(a.date)) && getAttendanceStatus(a) === 'L').length;
                          return Math.max(0, employees.length - presentToday - leaveToday);
                        })()}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                      <p className="text-xs text-orange-700 font-semibold mb-1">On Leave</p>
                      <p className="text-3xl font-extrabold text-orange-800">
                        {teamAttendance.filter(a => isToday(new Date(a.date)) && getAttendanceStatus(a) === 'L').length}
                      </p>
                    </div>
                  </div>
                  
                  {/* Employee-wise Attendance Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-blue-800">Employee</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-blue-800">Today Status</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-blue-800">Present</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-blue-800">Absent</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-blue-800">Leave</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-blue-800">Consecutive Absences</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {employees.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                              No team members found
                            </td>
                          </tr>
                        ) : (
                          employees.map(emp => {
                            const empAttendance = teamAttendance.filter(a => String(a.employee) === String(emp._id));
                            const todayStatus = getEmployeeAttendanceForDate(emp._id, new Date());
                            const present = empAttendance.filter(a => getAttendanceStatus(a) === 'P').length;
                            const now = new Date();
                            const absent = calculateEmployeeAbsentDays(emp._id, now.getMonth(), now.getFullYear(), empAttendance);
                            const leave = empAttendance.filter(a => getAttendanceStatus(a) === 'L').length;
                            const consecutive = getConsecutiveAbsences(emp._id);
                            
                            console.log(`👤 ${emp.name}: empAttendance=${empAttendance.length}, present=${present}, absent=${absent}, leave=${leave}`);
                            
                            return (
                              <tr key={emp._id} className={`hover:bg-blue-50 transition ${consecutive >= 3 ? 'bg-red-50' : ''}`}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                                      {emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <span className="font-semibold text-gray-800">{emp.name || emp.email}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                                    todayStatus === 'P' ? 'bg-green-100 text-green-800' :
                                    todayStatus === 'A' ? 'bg-red-100 text-red-800' :
                                    todayStatus === 'L' ? 'bg-blue-100 text-blue-800' :
                                    todayStatus === 'WO' ? 'bg-purple-100 text-purple-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {todayStatus === 'P' ? 'Present' :
                                     todayStatus === 'A' ? 'Absent' :
                                     todayStatus === 'L' ? 'Leave' :
                                     todayStatus === 'WO' ? 'Weekly Off' : 'Holiday'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-green-700 font-bold">{present}</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`font-bold ${absent > 5 ? 'text-red-700' : 'text-red-600'}`}>{absent}</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-blue-700 font-bold">{leave}</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {consecutive >= 3 ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">
                                      <FiAlertCircle size={14} />
                                      {consecutive} days
                                    </span>
                                  ) : consecutive > 0 ? (
                                    <span className="text-orange-700 font-bold">{consecutive} day{consecutive > 1 ? 's' : ''}</span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              
              {/* Monthly View - Detailed Monthly Summary */}
              {viewMode === 'monthly' && (
                <>
                  {/* Month Selector */}
                  <div className="mb-6 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-200">
                    <button
                      onClick={() => {
                        const prevMonth = new Date(selectedMonth);
                        prevMonth.setMonth(prevMonth.getMonth() - 1);
                        setSelectedMonth(prevMonth);
                      }}
                      className="px-4 py-2 bg-white rounded-lg text-indigo-700 font-semibold hover:bg-indigo-100 transition border border-indigo-200"
                    >
                      ← Previous
                    </button>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-indigo-800">
                        {format(selectedMonth, 'MMMM yyyy')}
                      </h3>
                      <p className="text-xs text-indigo-600 mt-1">Monthly Attendance Summary</p>
                    </div>
                    <button
                      onClick={() => {
                        const nextMonth = new Date(selectedMonth);
                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                        setSelectedMonth(nextMonth);
                      }}
                      className="px-4 py-2 bg-white rounded-lg text-indigo-700 font-semibold hover:bg-indigo-100 transition border border-indigo-200"
                    >
                      Next →
                    </button>
                  </div>
                  
                  {/* Monthly Statistics Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                      <p className="text-xs text-purple-700 font-semibold mb-1">Total Employees</p>
                      <p className="text-3xl font-extrabold text-purple-800">{employees.length}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                      <p className="text-xs text-green-700 font-semibold mb-1">Avg Present/Day</p>
                      <p className="text-3xl font-extrabold text-green-800">
                        {(() => {
                          const monthAttendance = teamAttendance.filter(a => {
                            const attDate = new Date(a.date);
                            return attDate.getMonth() === selectedMonth.getMonth() && 
                                   attDate.getFullYear() === selectedMonth.getFullYear();
                          });
                          const presentDays = monthAttendance.filter(a => getAttendanceStatus(a) === 'P').length;
                          const workingDays = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
                          return employees.length > 0 ? Math.round(presentDays / workingDays) : 0;
                        })()}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                      <p className="text-xs text-red-700 font-semibold mb-1">Total Absences</p>
                      <p className="text-3xl font-extrabold text-red-800">
                        {(() => {
                          let totalAbsent = 0;
                          employees.forEach(emp => {
                            const empAtt = teamAttendance.filter(a => {
                              const attDate = new Date(a.date);
                              return attDate.getMonth() === selectedMonth.getMonth() && 
                                     attDate.getFullYear() === selectedMonth.getFullYear() &&
                                     String(a.employee) === String(emp._id);
                            });
                            totalAbsent += calculateEmployeeAbsentDays(emp._id, selectedMonth.getMonth(), selectedMonth.getFullYear(), empAtt);
                          });
                          return totalAbsent;
                        })()}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                      <p className="text-xs text-orange-700 font-semibold mb-1">Total Leaves</p>
                      <p className="text-3xl font-extrabold text-orange-800">
                        {teamAttendance.filter(a => {
                          const attDate = new Date(a.date);
                          return attDate.getMonth() === selectedMonth.getMonth() && 
                                 attDate.getFullYear() === selectedMonth.getFullYear() &&
                                 getAttendanceStatus(a) === 'L';
                        }).length}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
                      <p className="text-xs text-yellow-700 font-semibold mb-1">High Risk</p>
                      <p className="text-3xl font-extrabold text-yellow-800">
                        {employees.filter(emp => getConsecutiveAbsences(emp._id) >= 3).length}
                      </p>
                    </div>
                  </div>
                  
                  {/* Detailed Monthly Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b-2 border-indigo-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-indigo-800 sticky left-0 bg-indigo-50">Employee</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-indigo-800">Total Days</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-green-800">Present</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-red-800">Absent</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-blue-800">Leave</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-purple-800">Weekly Off</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-yellow-800">Attendance %</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-red-800">Consecutive Abs.</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-indigo-800">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {employees.length === 0 ? (
                          <tr>
                            <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                              No team members found
                            </td>
                          </tr>
                        ) : (
                          employees.map(emp => {
                            // Filter attendance for selected month
                            const monthAttendance = teamAttendance.filter(a => {
                              const attDate = new Date(a.date);
                              return attDate.getMonth() === selectedMonth.getMonth() && 
                                     attDate.getFullYear() === selectedMonth.getFullYear() &&
                                     String(a.employee) === String(emp._id);
                            });
                            
                            const present = monthAttendance.filter(a => getAttendanceStatus(a) === 'P').length;
                            const absent = calculateEmployeeAbsentDays(emp._id, selectedMonth.getMonth(), selectedMonth.getFullYear(), monthAttendance);
                            const leave = monthAttendance.filter(a => getAttendanceStatus(a) === 'L').length;
                            const weeklyOff = monthAttendance.filter(a => getAttendanceStatus(a) === 'WO').length;
                            const totalDays = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
                            const workingDays = totalDays - weeklyOff;
                            const attendancePercent = workingDays > 0 ? Math.round((present / workingDays) * 100) : 0;
                            const consecutive = getConsecutiveAbsences(emp._id);
                            const isHighRisk = consecutive >= 3 || attendancePercent < 75;
                            
                            return (
                              <tr key={emp._id} className={`hover:bg-indigo-50 transition ${isHighRisk ? 'bg-red-50' : ''}`}>
                                <td className="px-4 py-3 sticky left-0 bg-white">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                                      {emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-gray-800 block">{emp.name || emp.email}</span>
                                      {isHighRisk && <span className="text-xs text-red-600 font-bold">⚠ High Risk</span>}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="font-semibold text-gray-700">{totalDays}</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full font-bold">
                                    {present}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-block px-3 py-1 rounded-full font-bold ${
                                    absent > 5 ? 'bg-red-200 text-red-900' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {absent}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-bold">
                                    {leave}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-bold">
                                    {weeklyOff}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-24 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full ${
                                          attendancePercent >= 90 ? 'bg-green-600' :
                                          attendancePercent >= 75 ? 'bg-yellow-500' :
                                          'bg-red-600'
                                        }`}
                                        style={{ width: `${attendancePercent}%` }}
                                      ></div>
                                    </div>
                                    <span className={`font-bold text-sm ${
                                      attendancePercent >= 90 ? 'text-green-700' :
                                      attendancePercent >= 75 ? 'text-yellow-700' :
                                      'text-red-700'
                                    }`}>
                                      {attendancePercent}%
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {consecutive >= 3 ? (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-200 text-red-900 rounded-full text-xs font-bold">
                                      <FiAlertCircle size={14} />
                                      {consecutive} days
                                    </span>
                                  ) : consecutive > 0 ? (
                                    <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold">
                                      {consecutive} day{consecutive > 1 ? 's' : ''}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {isHighRisk ? (
                                    <button
                                      onClick={() => alert(`Action required for ${emp.name}:\n\n${consecutive >= 3 ? `• ${consecutive} consecutive absences\n` : ''}${attendancePercent < 75 ? `• Low attendance: ${attendancePercent}%\n` : ''}\nRecommendation: Schedule a meeting to discuss attendance issues.`)}
                                      className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition"
                                    >
                                      Take Action
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => alert(`${emp.name}'s performance is satisfactory.\n\nAttendance: ${attendancePercent}%\nNo action required.`)}
                                      className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition"
                                    >
                                      View Details
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Monthly Summary Footer */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-indigo-700 font-semibold mb-1">📊 Summary for {format(selectedMonth, 'MMMM yyyy')}</p>
                        <p className="text-xs text-indigo-600">Total Records: {teamAttendance.filter(a => {
                          const attDate = new Date(a.date);
                          return attDate.getMonth() === selectedMonth.getMonth() && 
                                 attDate.getFullYear() === selectedMonth.getFullYear();
                        }).length}</p>
                      </div>
                      <div>
                        <p className="text-green-700 font-semibold mb-1">✅ Best Performer</p>
                        <p className="text-xs text-green-600">
                          {(() => {
                            let best = null;
                            let maxPercent = 0;
                            employees.forEach(emp => {
                              const monthAtt = teamAttendance.filter(a => {
                                const attDate = new Date(a.date);
                                return attDate.getMonth() === selectedMonth.getMonth() && 
                                       attDate.getFullYear() === selectedMonth.getFullYear() &&
                                       String(a.employee) === String(emp._id);
                              });
                              const p = monthAtt.filter(a => getAttendanceStatus(a) === 'P').length;
                              const wo = monthAtt.filter(a => getAttendanceStatus(a) === 'WO').length;
                              const totalDays = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
                              const workingDays = totalDays - wo;
                              const percent = workingDays > 0 ? Math.round((p / workingDays) * 100) : 0;
                              if (percent > maxPercent) {
                                maxPercent = percent;
                                best = emp.name || emp.email;
                              }
                            });
                            return best ? `${best} (${maxPercent}%)` : 'N/A';
                          })()}
                        </p>
                      </div>
                      <div>
                        <p className="text-red-700 font-semibold mb-1">⚠ Requires Attention</p>
                        <p className="text-xs text-red-600">
                          {employees.filter(emp => {
                            const monthAtt = teamAttendance.filter(a => {
                              const attDate = new Date(a.date);
                              return attDate.getMonth() === selectedMonth.getMonth() && 
                                     attDate.getFullYear() === selectedMonth.getFullYear() &&
                                     String(a.employee) === String(emp._id);
                            });
                            const p = monthAtt.filter(a => getAttendanceStatus(a) === 'P').length;
                            const wo = monthAtt.filter(a => getAttendanceStatus(a) === 'WO').length;
                            const totalDays = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
                            const workingDays = totalDays - wo;
                            const percent = workingDays > 0 ? Math.round((p / workingDays) * 100) : 0;
                            return percent < 75 || getConsecutiveAbsences(emp._id) >= 3;
                          }).length} employee{employees.filter(emp => {
                            const monthAtt = teamAttendance.filter(a => {
                              const attDate = new Date(a.date);
                              return attDate.getMonth() === selectedMonth.getMonth() && 
                                     attDate.getFullYear() === selectedMonth.getFullYear() &&
                                     String(a.employee) === String(emp._id);
                            });
                            const p = monthAtt.filter(a => getAttendanceStatus(a) === 'P').length;
                            const wo = monthAtt.filter(a => getAttendanceStatus(a) === 'WO').length;
                            const totalDays = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
                            const workingDays = totalDays - wo;
                            const percent = workingDays > 0 ? Math.round((p / workingDays) * 100) : 0;
                            return percent < 75 || getConsecutiveAbsences(emp._id) >= 3;
                          }).length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          
            {/* Attendance summary card removed as requested */}
          {/* Clock & Mark Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Left - Clock & Marking */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-blue-100">
                <LiveClock />
              </div>
              {/* Location Status & Mark Button */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-blue-100">
                <h3 className="text-base font-bold text-blue-800 mb-4">Mark Attendance</h3>
                
                {/* Geo-fence Status Display */}
                {isCheckingLocation ? (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Checking Location...</p>
                      <p className="text-sm text-blue-700 mt-1">Verifying your position</p>
                    </div>
                  </div>
                ) : locationPermissionDenied ? (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <FiAlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">Location Access Required</p>
                      <p className="text-sm text-red-700 mt-1">{locationError || 'Please enable location services to mark attendance'}</p>
                    </div>
                  </div>
                ) : !isWithinOfficeGeofence ? (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                    <FiAlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-800">Outside Office Premises</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        {locationError || 'You must be within office premises to mark attendance'}
                      </p>
                      {distanceFromOffice && (
                        <p className="text-xs text-yellow-600 mt-1">
                          Distance from office: {distanceFromOffice}m (Max: {ALLOWED_RADIUS_METERS}m)
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                    <FiCheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">✓ Within Office Premises</p>
                      <p className="text-sm text-green-700 mt-1">
                        You are within {ALLOWED_RADIUS_METERS}m radius
                      </p>
                      {distanceFromOffice !== null && (
                        <p className="text-xs text-green-600 mt-1">
                          Distance from office: {distanceFromOffice}m
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    checkUserLocation();
                    if (checkedInToday && isAfterNoon && !checkedOutToday) {
                      handleCheckOut();
                    } else {
                      handleMark();
                    }
                  }}
                  disabled={
                    loading || !isWithinOfficeGeofence || locationPermissionDenied || isCheckingLocation ||
                    (!checkedInToday ? false : // Not checked in yet → enabled
                      checkedOutToday ? true : // Already checked out → disabled
                        !isAfterNoon // Checked in but before 12PM → disabled
                    )
                  }
                  className={`w-full py-3 px-4 rounded-lg font-bold text-white text-base transition-all duration-150 ${
                    checkedOutToday
                      ? 'bg-gray-400 cursor-not-allowed'
                      : (checkedInToday && !isAfterNoon)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : (checkedInToday && isAfterNoon && !checkedOutToday)
                      ? 'bg-orange-500 hover:bg-orange-600 active:scale-95'
                      : (!isWithinOfficeGeofence || locationPermissionDenied || isCheckingLocation)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
                  }`}
                >
                  {checkedOutToday
                    ? '✓ Done for Today'
                    : checkedInToday && isAfterNoon
                    ? '🏠 Check Out'
                    : checkedInToday
                    ? '✓ Checked In (Check-out after 12 PM)'
                    : isCheckingLocation
                    ? 'Checking Location...'
                    : '📍 Mark Attendance'
                  }
                </button>
              </div>
            </div>
            {/* Right - Calendar with Holidays */}
            <div>
              <CalendarWidget tasks={[]} holidays={holidays} compact={true} />
            </div>
          </div>
          {/* Employee Monthly View */}
          {user && user.role === 'EMPLOYEE' && (
            <div className="mb-8 bg-white rounded-2xl shadow-xl border border-blue-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-blue-800">My Attendance History</h2>
                <button
                  onClick={() => setEmployeeViewMode(employeeViewMode === 'current' ? 'history' : 'current')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
                >
                  {employeeViewMode === 'current' ? '📅 View Previous Months' : '📆 Current Month'}
                </button>
              </div>
              
              {employeeViewMode === 'history' && (
                <>
                  {/* Month Selector */}
                  <div className="mb-6 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-200">
                    <button
                      onClick={() => {
                        const prevMonth = new Date(employeeSelectedMonth);
                        prevMonth.setMonth(prevMonth.getMonth() - 1);
                        setEmployeeSelectedMonth(prevMonth);
                      }}
                      className="px-4 py-2 bg-white rounded-lg text-indigo-700 font-semibold hover:bg-indigo-100 transition border border-indigo-200"
                    >
                      ← Previous
                    </button>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-indigo-800">
                        {format(employeeSelectedMonth, 'MMMM yyyy')}
                      </h3>
                      <p className="text-xs text-indigo-600 mt-1">My Attendance Summary</p>
                    </div>
                    <button
                      onClick={() => {
                        const nextMonth = new Date(employeeSelectedMonth);
                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                        setEmployeeSelectedMonth(nextMonth);
                      }}
                      className="px-4 py-2 bg-white rounded-lg text-indigo-700 font-semibold hover:bg-indigo-100 transition border border-indigo-200"
                    >
                      Next →
                    </button>
                  </div>
                  
                  {/* Monthly Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {(() => {
                      const monthRecords = attendance.filter(a => {
                        const attDate = new Date(a.date);
                        return attDate.getMonth() === employeeSelectedMonth.getMonth() && 
                               attDate.getFullYear() === employeeSelectedMonth.getFullYear();
                      });
                      const monthPresent = monthRecords.filter(a => getAttendanceStatus(a) === 'P').length;
                      const monthAbsent = monthRecords.filter(a => getAttendanceStatus(a) === 'A').length;
                      const monthLeave = monthRecords.filter(a => getAttendanceStatus(a) === 'L').length;
                      const monthWO = monthRecords.filter(a => ['WO', 'H'].includes(getAttendanceStatus(a))).length;
                      
                      return (
                        <>
                          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                            <p className="text-xs text-green-700 font-semibold mb-1">Present Days</p>
                            <p className="text-3xl font-extrabold text-green-800">{monthPresent}</p>
                          </div>
                          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                            <p className="text-xs text-red-700 font-semibold mb-1">Absent Days</p>
                            <p className="text-3xl font-extrabold text-red-800">{monthAbsent}</p>
                          </div>
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                            <p className="text-xs text-blue-700 font-semibold mb-1">Leave Days</p>
                            <p className="text-3xl font-extrabold text-blue-800">{monthLeave}</p>
                          </div>
                          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                            <p className="text-xs text-purple-700 font-semibold mb-1">Weekly Off/Holiday</p>
                            <p className="text-3xl font-extrabold text-purple-800">{monthWO}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  
                  {/* Monthly Attendance Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-blue-800">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-blue-800">Day</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-blue-800">Check In</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-blue-800">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(() => {
                          const monthRecords = attendance.filter(a => {
                            const attDate = new Date(a.date);
                            return attDate.getMonth() === employeeSelectedMonth.getMonth() && 
                                   attDate.getFullYear() === employeeSelectedMonth.getFullYear();
                          }).sort((a, b) => new Date(b.date) - new Date(a.date));
                          
                          if (monthRecords.length === 0) {
                            return (
                              <tr>
                                <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                                  No attendance records for this month
                                </td>
                              </tr>
                            );
                          }
                          
                          return monthRecords.map((record) => {
                            const status = getAttendanceStatus(record);
                            const recordDate = new Date(record.date);
                            const dayName = format(recordDate, 'EEEE');
                            
                            return (
                              <tr key={record.id || record._id} className="hover:bg-blue-50 transition">
                                <td className="px-4 py-3">
                                  <span className="font-bold text-blue-900">
                                    {format(recordDate, 'MMM dd, yyyy')}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-gray-700 font-medium">{dayName}</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-blue-700 font-semibold">
                                    {(record.check_in && !isNaN(new Date(record.check_in))) 
                                      ? format(new Date(record.check_in), 'HH:mm') 
                                      : '-'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                                    status === 'P' ? 'bg-green-100 text-green-800' :
                                    status === 'A' ? 'bg-red-100 text-red-800' :
                                    status === 'L' ? 'bg-blue-100 text-blue-800' :
                                    status === 'WO' ? 'bg-purple-100 text-purple-800' :
                                    status === 'H' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {status === 'P' ? 'Present' :
                                     status === 'A' ? 'Absent' :
                                     status === 'L' ? 'Leave' :
                                     status === 'WO' ? 'Weekly Off' :
                                     status === 'H' ? 'Holiday' : status}
                                  </span>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* History & Leave Requests */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Attendance History */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-blue-100">
              <div className="border-b p-6 flex justify-between items-center">
                <h2 className="text-lg font-bold text-blue-800">Recent Attendance</h2>
                <a href="#" className="text-xs text-blue-600 hover:text-blue-700">View All</a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-blue-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-700">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-700">Day</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-700">Check In</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-blue-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {attendance.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-4 py-6 text-center text-xs text-gray-500">
                          No attendance records
                        </td>
                      </tr>
                    ) : (
                      attendance.slice(0, 10).map((record) => {
                        const status = getAttendanceStatus(record);
                        const recordDate = new Date(record.date);
                        const dayName = format(recordDate, 'EEE');
                        return (
                        <tr key={record.id} className="hover:bg-blue-50">
                          <td className="px-4 py-3 text-xs text-blue-900 font-bold">
                            {(record.date && !isNaN(new Date(record.date))) ? format(new Date(record.date), 'MMM dd') : '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700 font-medium">
                            {dayName}
                          </td>
                          <td className="px-4 py-3 text-xs text-blue-700">
                            {(record.check_in && !isNaN(new Date(record.check_in))) ? format(new Date(record.check_in), 'HH:mm') : '-'}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                              status === 'P' ? 'bg-green-100 text-green-800' :
                              status === 'A' ? 'bg-red-100 text-red-800' :
                              status === 'L' ? 'bg-blue-100 text-blue-800' :
                              status === 'WO' ? 'bg-purple-100 text-purple-800' :
                              status === 'H' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {status === 'P' ? 'Present' :
                               status === 'A' ? 'Absent' :
                               status === 'L' ? 'Leave' :
                               status === 'WO' ? 'Weekly Off' :
                               status === 'H' ? 'Holiday' : status}
                            </span>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Leave Requests */}
            <div className="bg-white rounded-2xl shadow-xl border border-blue-100">
              <div className="border-b p-6 flex justify-between items-center">
                <h2 className="text-lg font-bold text-blue-800">Leave Requests</h2>
                <button
                  onClick={() => setShowLeaveForm(!showLeaveForm)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition-all duration-150"
                >
                  + New
                </button>
              </div>
              {showLeaveForm && (
                <form onSubmit={handleLeaveSubmit} className="p-6 border-b bg-blue-50 space-y-4 rounded-b-2xl">
                  <div>
                    <label className="block text-xs font-bold text-blue-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      className="w-full px-3 py-2 text-xs border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                      className="w-full px-3 py-2 text-xs border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-700 mb-2">Type</label>
                    <select
                      value={formData.leave_type}
                      onChange={(e) => setFormData({...formData, leave_type: e.target.value})}
                      className="w-full px-3 py-2 text-xs border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="sick">Sick Leave</option>
                      <option value="casual">Casual Leave</option>
                      <option value="emergency">Emergency</option>
                      <option value="wfh">Work From Home</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-700 mb-2">Reason</label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData({...formData, reason: e.target.value})}
                      className="w-full px-3 py-2 text-xs border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="2"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-bold shadow transition-all duration-150"
                  >
                    Submit
                  </button>
                </form>
              )}
              <div className="divide-y max-h-64 overflow-y-auto">
                {leaveRequests.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-500">No leave requests</div>
                ) : (
                  leaveRequests.map((req) => (
                    <div key={req.id} className="p-4 hover:bg-blue-50 rounded-xl">
                      <p className="font-bold text-xs text-blue-800">{req.leave_type}</p>
                      <p className="text-xs text-blue-700 mt-0.5">
                        {(req.start_date && !isNaN(new Date(req.start_date))) ? format(new Date(req.start_date), 'MMM dd') : '-'} - {(req.end_date && !isNaN(new Date(req.end_date))) ? format(new Date(req.end_date), 'MMM dd') : '-'}
                      </p>
                      <p className="text-xs text-blue-600 mt-1 line-clamp-2">{req.reason}</p>
                      <span className={`inline-block mt-2 px-3 py-1 text-xs font-bold rounded-lg ${
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
        </main>
      </div>
    </div>
  );
}
