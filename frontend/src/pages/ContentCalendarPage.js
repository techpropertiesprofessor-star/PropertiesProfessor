import React, { useState, useEffect, useContext } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { AuthContext } from '../context/AuthContext';
import { calendarAPI } from '../api/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, getDay } from 'date-fns';
import { FiChevronLeft, FiChevronRight, FiX, FiPlus, FiEdit2, FiTrash2, FiCheck } from 'react-icons/fi';

export default function ContentCalendarPage() {
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

  const handleDateDoubleClick = (date) => {
    setSelectedDate(date);
    setEditingEvent(null);
    setViewOnlyMode(false); // Always allow editing when creating new event
    setEventForm({
      title: '',
      description: '',
      priority: 'medium',
      color: '#3B82F6',
      isPublished: false
    });
    setShowEventModal(true);
  };

  const handleEventClick = (event, e) => {
    e.stopPropagation();
    
    // Check if user owns this event
    const isOwnEvent = event.createdBy._id === user.id || event.createdBy === user.id;
    
    setSelectedDate(new Date(event.date));
    setEditingEvent(event);
    setViewOnlyMode(!isOwnEvent); // View-only if not the owner
    
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
      const eventData = {
        ...eventForm,
        date: selectedDate
      };

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

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const getEventsForDate = (date) => {
    return events.filter(event => 
      isSameDay(new Date(event.date), date)
    );
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-700 border-green-300',
    medium: 'bg-blue-100 text-blue-700 border-blue-300',
    high: 'bg-red-100 text-red-700 border-red-300'
  };

  const statusIcons = {
    pending: '⏳',
    'in-progress': '🔄',
    completed: '✓',
    cancelled: '✗'
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} />
        
        <main className="flex-1 overflow-auto p-4 md:p-8">
          {/* Success/Error Messages */}
          {successMsg && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center gap-2">
              <FiCheck className="flex-shrink-0" />
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {errorMsg}
            </div>
          )}

          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white text-2xl shadow-lg">
                📅
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Calendar</h1>
                <p className="text-sm text-gray-500">
                  {isManager ? 'Create personal or published events' : 'Create and manage your personal events'}
                </p>
              </div>
            </div>
          </div>

          {/* Calendar Card */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Month Navigation */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 flex items-center justify-between">
              <button
                onClick={prevMonth}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <FiChevronLeft className="w-6 h-6 text-white" />
              </button>
              
              <h2 className="text-2xl font-bold text-white">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <FiChevronRight className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="p-6">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-semibold text-gray-600 text-sm py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: getDay(startOfMonth(currentDate)) }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="aspect-square" />
                ))}
                
                {/* Actual days */}
                {getDaysInMonth().map(date => {
                  const dateEvents = getEventsForDate(date);
                  const isCurrentDay = isToday(date);
                  
                  return (
                    <div
                      key={date.toString()}
                      onDoubleClick={() => handleDateDoubleClick(date)}
                      className={`aspect-square border-2 rounded-xl p-2 cursor-pointer transition-all ${
                        isCurrentDay 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                      }`}
                    >
                      <div className="flex flex-col h-full">
                        <div className={`text-sm font-semibold mb-1 ${
                          isCurrentDay ? 'text-indigo-600' : 'text-gray-700'
                        }`}>
                          {format(date, 'd')}
                        </div>
                        
                        {/* Events for this date */}
                        <div className="flex-1 overflow-y-auto space-y-1">
                          {dateEvents.slice(0, 3).map(event => {
                            const isOwnEvent = event.createdBy._id === user.id || event.createdBy === user.id;
                            return (
                              <div
                                key={event._id}
                                onClick={(e) => handleEventClick(event, e)}
                                className={`text-xs p-1 rounded truncate cursor-pointer transition-all ${
                                  event.isPublished 
                                    ? 'bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200' 
                                    : 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200'
                                }`}
                                style={{ borderLeftWidth: '3px', borderLeftColor: event.color }}
                                title={`${event.title}${event.isPublished ? ' (Published)' : ' (Personal)'} - Click to ${isOwnEvent ? 'edit' : 'view'}`}
                              >
                                {statusIcons[event.status]} {event.title}
                              </div>
                            );
                          })}
                          {dateEvents.length > 3 && (
                            <div className="text-xs text-gray-500 font-semibold">
                              +{dateEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-100 border-2 border-blue-300 rounded"></div>
                    <span className="text-gray-600">Personal Event</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-100 border-2 border-purple-300 rounded"></div>
                    <span className="text-gray-600">Published Event</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-500 bg-indigo-50 rounded"></div>
                    <span className="text-gray-600">Today</span>
                  </div>
                  <div className="text-gray-500 italic ml-auto">
                    Double-click any date to create an event
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                {viewOnlyMode ? (
                  <>👁️ View Event</>
                ) : editingEvent ? (
                  <><FiEdit2 /> Edit Event</>
                ) : (
                  <><FiPlus /> Create New Event</>
                )}
              </h3>
              <button
                onClick={() => setShowEventModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <FiX className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={viewOnlyMode ? (e) => e.preventDefault() : handleSubmit} className="p-6 space-y-4">
              {/* Date Display */}
              <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                <div className="text-sm font-semibold text-indigo-600">Event Date</div>
                <div className="text-lg font-bold text-gray-900">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  disabled={viewOnlyMode}
                  className={`w-full px-4 py-3 border-2 border-gray-300 rounded-xl transition-all ${
                    viewOnlyMode 
                      ? 'bg-gray-100 cursor-not-allowed text-gray-600' 
                      : 'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                  }`}
                  placeholder="Enter event title"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  disabled={viewOnlyMode}
                  className={`w-full px-4 py-3 border-2 border-gray-300 rounded-xl transition-all ${
                    viewOnlyMode 
                      ? 'bg-gray-100 cursor-not-allowed text-gray-600' 
                      : 'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                  }`}
                  placeholder="Enter event description"
                  rows="3"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={eventForm.priority}
                  onChange={(e) => setEventForm({ ...eventForm, priority: e.target.value })}
                  disabled={viewOnlyMode}
                  className={`w-full px-4 py-3 border-2 border-gray-300 rounded-xl transition-all ${
                    viewOnlyMode 
                      ? 'bg-gray-100 cursor-not-allowed text-gray-600' 
                      : 'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'
                  }`}
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🔵 Medium</option>
                  <option value="high">🔴 High</option>
                </select>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Color Tag
                </label>
                <div className="flex gap-2">
                  {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => !viewOnlyMode && setEventForm({ ...eventForm, color })}
                      disabled={viewOnlyMode}
                      className={`w-10 h-10 rounded-lg transition-all ${
                        viewOnlyMode 
                          ? 'cursor-not-allowed opacity-60' 
                          : eventForm.color === color 
                            ? 'ring-4 ring-offset-2 ring-indigo-400' 
                            : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Publish Checkbox (Manager Only) */}
              {isManager && (
                <div className={`p-4 border-2 border-purple-200 rounded-xl ${
                  viewOnlyMode ? 'bg-gray-100 opacity-60' : 'bg-purple-50'
                }`}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventForm.isPublished}
                      onChange={(e) => setEventForm({ ...eventForm, isPublished: e.target.checked })}
                      disabled={viewOnlyMode}
                      className={`w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 ${
                        viewOnlyMode ? 'cursor-not-allowed' : ''
                      }`}
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-purple-900">📢 Publish for All</div>
                      <div className="text-sm text-purple-700">
                        Make this event visible to all users
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {/* Event Creator Info (View-only mode) */}
              {viewOnlyMode && editingEvent && (
                <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <div className="text-sm font-semibold text-blue-800">Created By</div>
                  <div className="text-blue-700">
                    {editingEvent.createdBy.username || editingEvent.createdBy.email}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    Event Type: {eventForm.isPublished ? 'Published Event' : 'Personal Event'}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                {viewOnlyMode ? (
                  // View-only mode buttons
                  <button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
                  >
                    Close
                  </button>
                ) : (
                  // Edit/Create mode buttons
                  <>
                    {editingEvent && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
                      >
                        <FiTrash2 />
                        Delete
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowEventModal(false)}
                      className="flex-1 px-6 py-3 border-2 border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl"
                    >
                      {editingEvent ? 'Update Event' : 'Create Event'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
