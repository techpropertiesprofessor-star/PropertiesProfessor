import React, { useState, useEffect, useContext, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import useSidebarCollapsed from '../hooks/useSidebarCollapsed';
import { AuthContext } from '../context/AuthContext';
import { calendarAPI } from '../api/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, getDay } from 'date-fns';
import { FiChevronLeft, FiChevronRight, FiX, FiPlus, FiEdit2, FiTrash2, FiCheck, FiCalendar, FiClock, FiUser, FiGlobe, FiLock, FiAlertCircle, FiFlag, FiInfo } from 'react-icons/fi';
import useRealtimeData from '../hooks/useRealtimeData';

export default function ContentCalendarPage() {
  const sidebarCollapsed = useSidebarCollapsed();
  const { user } = useContext(AuthContext);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modal states
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [viewOnlyMode, setViewOnlyMode] = useState(false);

  // Form states
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    color: '#3B82F6',
    isPublished: false
  });

  const isManager = user?.role === 'MANAGER' || user?.role === 'ADMIN';

  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const response = await calendarAPI.getEvents(year, month);
      setEvents(response.data);
    } catch (err) {
      console.error('Failed to load events:', err);
      showError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  // Real-time calendar event updates
  const refreshEvents = useCallback(() => loadEvents(), [currentDate]);
  useRealtimeData(['new-notification'], refreshEvents);

  const handleDateDoubleClick = (date) => {
    setSelectedDate(date);
    setEditingEvent(null);
    setViewOnlyMode(false);
    setEventForm({
      title: '',
      description: '',
      priority: 'medium',
      color: '#3B82F6',
      isPublished: isManager ? false : false // EMPLOYEE cannot publish
    });
    setShowEventModal(true);
  };

  const handleEventClick = (event, e) => {
    e.stopPropagation();
    setSelectedDate(new Date(event.date));
    setEditingEvent(event);
    setViewOnlyMode(true); // Always show view first when clicking existing event
    setEventForm({
      title: event.title,
      description: event.description || '',
      priority: event.priority,
      status: event.status,
      isPublished: event.isPublished
    });
    setShowEventModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!eventForm.title.trim()) {
      showError('Title is required');
      return;
    }
    try {
      // EMPLOYEE cannot publish events
      let eventData = { ...eventForm, date: selectedDate };
      if (!isManager) {
        eventData.isPublished = false;
      }
      if (editingEvent) {
        await calendarAPI.updateEvent(editingEvent._id, eventData);
        showSuccess('Event updated successfully');
      } else {
        await calendarAPI.createEvent(eventData);
        showSuccess('Event created successfully');
      }
      setShowEventModal(false);
      loadEvents();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to save event');
    }
  };

  const handleDelete = async () => {
    if (!editingEvent) return;
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await calendarAPI.deleteEvent(editingEvent._id);
      showSuccess('Event deleted successfully');
      setShowEventModal(false);
      loadEvents();
    } catch (err) {
      showError('Failed to delete event');
    }
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 3000);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const getEventsForDate = (date) => {
    return events.filter(event => isSameDay(new Date(event.date), date));
  };

  const colorOptions = [
    { value: '#3B82F6', name: 'Blue' },
    { value: '#10B981', name: 'Green' },
    { value: '#F59E0B', name: 'Amber' },
    { value: '#EF4444', name: 'Red' },
    { value: '#8B5CF6', name: 'Purple' },
    { value: '#EC4899', name: 'Pink' },
  ];

  const todayEvents = events.filter(event => isSameDay(new Date(event.date), new Date()));

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <div className="hidden md:block"><Sidebar /></div>
      <div className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <Header user={user} />

        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 lg:p-8">
          {/* Toast Notifications */}
          {successMsg && (
            <div className="fixed top-20 right-6 z-50 animate-slide-in">
              <div className="flex items-center gap-3 px-5 py-3.5 bg-emerald-600 text-white rounded-xl shadow-2xl shadow-emerald-200">
                <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                  <FiCheck className="text-sm" />
                </div>
                <span className="font-medium text-sm">{successMsg}</span>
              </div>
            </div>
          )}
          {errorMsg && (
            <div className="fixed top-20 right-6 z-50 animate-slide-in">
              <div className="flex items-center gap-3 px-5 py-3.5 bg-red-600 text-white rounded-xl shadow-2xl shadow-red-200">
                <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                  <FiAlertCircle className="text-sm" />
                </div>
                <span className="font-medium text-sm">{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Page Header */}
          <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-200">
                <FiCalendar className="text-white text-2xl" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Calendar</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {isManager ? 'Manage & publish events for your team' : 'Track your personal events & schedule'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToToday}
                className="px-4 py-2.5 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all"
              >
                Today
              </button>
              {todayEvents.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
                  <FiClock className="text-amber-600 text-sm" />
                  <span className="text-xs font-semibold text-amber-700">{todayEvents.length} event{todayEvents.length > 1 ? 's' : ''} today</span>
                </div>
              )}
            </div>
          </div>

          {/* Calendar Card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            {/* Month Navigation */}
            <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 px-6 py-5 flex items-center justify-between">
              <button
                onClick={prevMonth}
                className="p-2.5 hover:bg-white/15 active:bg-white/25 rounded-xl transition-all"
              >
                <FiChevronLeft className="w-5 h-5 text-white" />
              </button>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-white tracking-wide">
                  {format(currentDate, 'MMMM yyyy')}
                </h2>
                <p className="text-indigo-200 text-xs mt-0.5">{getDaysInMonth().length} days</p>
              </div>

              <button
                onClick={nextMonth}
                className="p-2.5 hover:bg-white/15 active:bg-white/25 rounded-xl transition-all"
              >
                <FiChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Loading Bar */}
            {loading && (
              <div className="h-1 bg-indigo-100 overflow-hidden">
                <div className="h-full bg-indigo-500 animate-pulse" style={{ width: '60%' }} />
              </div>
            )}

            {/* Calendar Grid */}
            <div className="p-4 md:p-6">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1.5 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                  <div key={day} className={`text-center font-bold text-[11px] uppercase tracking-widest py-2.5 rounded-lg ${
                    idx === 0 || idx === 6 ? 'text-red-400 bg-red-50/50' : 'text-gray-400 bg-gray-50/50'
                  }`}>
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1.5">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: getDay(startOfMonth(currentDate)) }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="aspect-square bg-gray-50/30 rounded-xl" />
                ))}

                {/* Actual days */}
                {getDaysInMonth().map(date => {
                  const dateEvents = getEventsForDate(date);
                  const isCurrentDay = isToday(date);
                  const dayOfWeek = getDay(date);
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                  return (
                    <div
                      key={date.toString()}
                      onDoubleClick={() => handleDateDoubleClick(date)}
                      className={`aspect-square rounded-xl p-1.5 md:p-2 cursor-pointer transition-all group relative ${
                        isCurrentDay
                          ? 'bg-indigo-50 ring-2 ring-indigo-500 ring-offset-1 shadow-md shadow-indigo-100'
                          : isWeekend
                            ? 'bg-red-50/30 hover:bg-red-50/60 border border-transparent hover:border-red-200'
                            : 'bg-white hover:bg-indigo-50/50 border border-gray-100 hover:border-indigo-200 hover:shadow-md'
                      }`}
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className={`text-sm font-bold leading-none ${
                            isCurrentDay
                              ? 'w-7 h-7 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-sm'
                              : isWeekend
                                ? 'text-red-400'
                                : 'text-gray-700'
                          }`}>
                            {format(date, 'd')}
                          </div>
                          {dateEvents.length > 0 && !isCurrentDay && (
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          )}
                        </div>

                        {/* Events for this date */}
                        <div className="flex-1 overflow-hidden space-y-0.5 mt-0.5">
                          {dateEvents.slice(0, 2).map(event => {
                            const isOwnEvent = event.createdBy._id === user.id || event.createdBy === user.id;
                            return (
                              <div
                                key={event._id}
                                onClick={(e) => handleEventClick(event, e)}
                                className="text-[10px] md:text-[11px] leading-tight px-1.5 py-0.5 rounded-md truncate cursor-pointer transition-all font-medium hover:opacity-80"
                                style={{
                                  backgroundColor: `${event.color}18`,
                                  color: event.color,
                                  borderLeft: `2.5px solid ${event.color}`
                                }}
                                title={`${event.title}${event.isPublished ? ' (Published)' : ' (Personal)'} - Click to ${isOwnEvent ? 'edit' : 'view'}`}
                              >
                                {event.title}
                              </div>
                            );
                          })}
                          {dateEvents.length > 2 && (
                            <div className="text-[10px] text-indigo-500 font-bold pl-1">
                              +{dateEvents.length - 2}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hover hint */}
                      <div className="absolute inset-x-0 bottom-0.5 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[9px] text-gray-400">double-click</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-5 px-4 py-3 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-100">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-md" style={{ backgroundColor: '#3B82F618', borderLeft: '3px solid #3B82F6' }} />
                    <span className="text-gray-500 font-medium">Personal</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-md" style={{ backgroundColor: '#8B5CF618', borderLeft: '3px solid #8B5CF6' }} />
                    <span className="text-gray-500 font-medium">Published</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 bg-indigo-600 rounded-md flex items-center justify-center">
                      <span className="text-[9px] text-white font-bold">{format(new Date(), 'd')}</span>
                    </div>
                    <span className="text-gray-500 font-medium">Today</span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <FiInfo className="text-gray-400" />
                    <span className="text-gray-400 italic">Double-click to create</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] overflow-hidden" style={{ animation: 'modalIn 0.2s ease-out' }}>
            {/* Modal Header */}
            <div className="relative overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-500 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      {viewOnlyMode ? (
                        <FiCalendar className="text-white text-lg" />
                      ) : editingEvent ? (
                        <FiEdit2 className="text-white text-lg" />
                      ) : (
                        <FiPlus className="text-white text-lg" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {viewOnlyMode ? 'Event Details' : editingEvent ? 'Edit Event' : 'New Event'}
                      </h3>
                      <p className="text-indigo-200 text-xs">
                        {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEventModal(false)}
                    className="w-8 h-8 bg-white/15 hover:bg-white/25 rounded-lg flex items-center justify-center transition-colors"
                  >
                    <FiX className="text-white text-lg" />
                  </button>
                </div>
              </div>
              {/* Decorative accent */}
              <div className="absolute -bottom-4 left-0 right-0 h-8 bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-500 rounded-b-[40%]" />
            </div>

            {/* Modal Content */}
            {viewOnlyMode ? (
              /* ===== READ-ONLY DETAIL VIEW ===== */
              <div className="p-6 pt-8 space-y-5 overflow-y-auto max-h-[calc(92vh-120px)]">
                {/* Title */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    <FiFlag className="text-indigo-400" /> Event Title
                  </label>
                  <h3 className="text-lg font-bold text-gray-900">{eventForm.title}</h3>
                </div>

                {/* Description */}
                {eventForm.description && (
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      <FiInfo className="text-indigo-400" /> Description
                    </label>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 whitespace-pre-wrap">{eventForm.description}</p>
                  </div>
                )}

                {/* Priority & Status Row */}
                <div className="flex flex-wrap gap-3">
                  <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border ${
                    eventForm.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                    eventForm.priority === 'medium' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {eventForm.priority === 'high' ? '🔴 High Priority' : eventForm.priority === 'medium' ? '🔵 Medium Priority' : '🟢 Low Priority'}
                  </div>
                  <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border ${
                    eventForm.isPublished ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>
                    {eventForm.isPublished ? <><FiGlobe className="text-xs" /> Published</> : <><FiLock className="text-xs" /> Personal</>}
                  </div>
                </div>

                {/* Color Tag */}
                {editingEvent?.color && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Color Tag</span>
                    <div className="w-6 h-6 rounded-lg shadow-sm border border-white" style={{ backgroundColor: editingEvent.color }} />
                  </div>
                )}

                {/* Creator Info */}
                {editingEvent && (
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <FiUser className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-blue-500 uppercase tracking-wider">Created by</div>
                      <div className="text-sm font-semibold text-gray-800 truncate">
                        {editingEvent.createdBy?.username || editingEvent.createdBy?.email || 'Unknown'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2.5 pt-3 border-t border-gray-100">
                  {/* Edit button for own events */}
                  {editingEvent && (editingEvent.createdBy?._id === user.id || editingEvent.createdBy === user.id) && (
                    <button
                      type="button"
                      onClick={() => setViewOnlyMode(false)}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-amber-200 hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
                    >
                      <FiEdit2 className="text-sm" /> Edit Event
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
            /* ===== EDIT / CREATE FORM ===== */
            <form onSubmit={handleSubmit} className="p-6 pt-8 space-y-5 overflow-y-auto max-h-[calc(92vh-120px)]">
              {/* Title */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  <FiFlag className="text-indigo-400" /> Event Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm transition-all border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 hover:border-gray-300"
                  placeholder="What's the event about?"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  <FiInfo className="text-indigo-400" /> Description
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-sm transition-all resize-none border-2 border-gray-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 hover:border-gray-300"
                  placeholder="Add details about this event..."
                  rows="3"
                />
              </div>

              {/* Priority & Color Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Priority */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    <FiAlertCircle className="text-indigo-400" /> Priority
                  </label>
                  <div className="flex gap-1.5">
                    {[
                      { value: 'low', label: 'Low', color: 'emerald', emoji: '🟢' },
                      { value: 'medium', label: 'Med', color: 'blue', emoji: '🔵' },
                      { value: 'high', label: 'High', color: 'red', emoji: '🔴' },
                    ].map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setEventForm({ ...eventForm, priority: p.value })}
                        className={`flex-1 px-2 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${
                          eventForm.priority === p.value
                            ? p.color === 'red'
                              ? 'bg-red-50 border-red-400 text-red-700 shadow-sm'
                              : p.color === 'blue'
                                ? 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm'
                                : 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {p.emoji} {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Picker */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                    🎨 Color Tag
                  </label>
                  <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                    {colorOptions.map(({ value: color }) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setEventForm({ ...eventForm, color })}
                        className={`w-8 h-8 rounded-lg transition-all flex-shrink-0 ${
                          eventForm.color === color
                            ? 'ring-2 ring-offset-2 ring-indigo-400 scale-110 shadow-md'
                            : 'hover:scale-110 opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Publish Checkbox (Manager Only) */}
              {isManager && (
                <div className="rounded-xl overflow-hidden transition-all">
                  <label className={`flex items-center gap-3.5 p-4 cursor-pointer border-2 rounded-xl transition-all ${
                    eventForm.isPublished
                      ? 'bg-purple-50 border-purple-300'
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      eventForm.isPublished ? 'bg-purple-500' : 'bg-gray-300'
                    }`}>
                      {eventForm.isPublished ? (
                        <FiGlobe className="text-white text-lg" />
                      ) : (
                        <FiLock className="text-white text-lg" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold text-sm ${eventForm.isPublished ? 'text-purple-900' : 'text-gray-700'}`}>
                        {eventForm.isPublished ? 'Published for Everyone' : 'Personal Event'}
                      </div>
                      <div className={`text-xs ${eventForm.isPublished ? 'text-purple-600' : 'text-gray-500'}`}>
                        {eventForm.isPublished ? 'All team members can see this event' : 'Only visible to you'}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={eventForm.isPublished}
                      onChange={(e) => setEventForm({ ...eventForm, isPublished: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                      eventForm.isPublished ? 'bg-purple-500' : 'bg-gray-300'
                    }`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                        eventForm.isPublished ? 'translate-x-[22px]' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-3 border-t border-gray-100">
                {editingEvent && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl transition-all border border-red-200 flex items-center gap-1.5"
                  >
                    <FiTrash2 className="text-sm" />
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  {editingEvent ? (
                    <><FiCheck /> Update</>
                  ) : (
                    <><FiPlus /> Create</>
                  )}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in { animation: slideIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}
