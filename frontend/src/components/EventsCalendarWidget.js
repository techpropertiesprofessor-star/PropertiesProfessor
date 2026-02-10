import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isPast } from 'date-fns';
import { FiChevronLeft, FiChevronRight, FiCalendar, FiX } from 'react-icons/fi';
import api from '../api/client';

export default function EventsCalendarWidget({ announcements = [], holidays = [] }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);

  // Fetch calendar events for the selected month
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth() + 1;
        const response = await api.get(`/calendar/events?year=${year}&month=${month}`);
        setEvents(response.data || []);
      } catch (error) {
        console.error('Error fetching calendar events:', error);
        setEvents([]);
      }
    };

    fetchEvents();
  }, [selectedMonth]);

  const getCalendarDays = () => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    return eachDayOfInterval({ start, end });
  };

  const getItemsForDay = (day) => {
    const items = [];

    // Check for announcements with dates
    announcements.forEach(announcement => {
      if (announcement.date) {
        try {
          const announcementDate = new Date(announcement.date);
          if (isSameDay(announcementDate, day)) {
            items.push({
              type: 'announcement',
              title: announcement.text,
              data: announcement,
              color: 'bg-blue-100 text-blue-800'
            });
          }
        } catch (e) {
          // Skip invalid dates
        }
      }
    });

    // Check for holidays
    holidays.forEach(holiday => {
      try {
        const holidayDate = new Date(holiday.date);
        if (isSameDay(holidayDate, day)) {
          items.push({
            type: 'holiday',
            title: holiday.name,
            data: holiday,
            color: 'bg-yellow-100 text-yellow-800'
          });
        }
      } catch (e) {
        // Skip invalid dates
      }
    });

    // Check for calendar events
    events.forEach(event => {
      try {
        const eventDate = new Date(event.date);
        if (isSameDay(eventDate, day)) {
          items.push({
            type: 'event',
            title: event.title,
            data: event,
            color: 'bg-green-100 text-green-800'
          });
        }
      } catch (e) {
        // Skip invalid dates
      }
    });

    return items;
  };

  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1));
  };

  const handleDateClick = (day) => {
    const items = getItemsForDay(day);
    if (items.length > 0) {
      setSelectedDate(day);
      setModalData(items);
      setShowModal(true);
    }
  };

  const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <FiCalendar size={16} />
            Events Calendar
          </h3>
          <div className="flex gap-1">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <FiChevronLeft size={16} />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>

        <p className="text-xs font-medium text-gray-600 mb-2 text-center">
          {format(selectedMonth, 'MMMM yyyy')}
        </p>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayOfWeek.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-500 py-1">
              {day.slice(0, 1)}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {getCalendarDays().map(day => {
            const dayItems = getItemsForDay(day);
            const isCurrentDay = isToday(day);
            const isPastDay = isPast(day) && !isCurrentDay;
            const hasItems = dayItems.length > 0;

            return (
              <button
                key={day.toString()}
                onClick={() => handleDateClick(day)}
                className={`aspect-square flex flex-col items-center justify-center rounded text-xs transition relative ${
                  isCurrentDay
                    ? 'bg-blue-500 text-white font-bold'
                    : isPastDay
                    ? 'bg-gray-100 text-gray-400'
                    : hasItems
                    ? 'bg-gradient-to-br from-purple-100 to-pink-100 text-purple-900 font-semibold border border-purple-200 hover:from-purple-200 hover:to-pink-200 cursor-pointer'
                    : 'text-gray-600 hover:bg-gray-50'
                } ${hasItems ? 'hover:scale-105' : ''}`}
                disabled={!hasItems}
              >
                <div>{day.getDate()}</div>
                {hasItems && (
                  <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-purple-500 border border-white"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 pt-3 border-t">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-gray-600">Has Events</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-600">Today</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for showing day details */}
      {showModal && modalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">
                {format(selectedDate, 'MMMM dd, yyyy')}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <FiX size={18} />
              </button>
            </div>
            
            <div className="p-4 max-h-80 overflow-y-auto">
              <div className="space-y-3">
                {modalData.map((item, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${item.color} border-opacity-40`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
                            {item.type}
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm leading-tight">{item.title}</h4>
                        
                        {item.type === 'event' && item.data && (
                          <div className="mt-2 text-xs space-y-1">
                            {item.data.description && (
                              <p className="text-gray-600">{item.data.description}</p>
                            )}
                            {item.data.priority && (
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Priority:</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  item.data.priority === 'high' ? 'bg-red-100 text-red-800' :
                                  item.data.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {item.data.priority}
                                </span>
                              </div>
                            )}
                            {item.data.createdBy?.name && (
                              <p className="text-gray-500">
                                Created by: {item.data.createdBy.name}
                              </p>
                            )}
                          </div>
                        )}
                        
                        {item.type === 'announcement' && item.data && (
                          <div className="mt-2 text-xs text-gray-600">
                            <p>Company Announcement</p>
                          </div>
                        )}
                        
                        {item.type === 'holiday' && item.data && (
                          <div className="mt-2 text-xs text-gray-600">
                            <p>Public Holiday</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}