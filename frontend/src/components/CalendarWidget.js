import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isPast, isToday } from 'date-fns';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function CalendarWidget({ tasks = [], onDateClick = null, compact = false }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const getCalendarDays = () => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    return eachDayOfInterval({ start, end });
  };

  const getTasksForDay = (day) => {
    return tasks.filter(task => {
      const taskDate = new Date(task.due_date);
      return (
        taskDate.getDate() === day.getDate() &&
        taskDate.getMonth() === day.getMonth() &&
        taskDate.getFullYear() === day.getFullYear()
      );
    });
  };

  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1));
  };

  const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">Calendar</h3>
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
            const dayTasks = getTasksForDay(day);
            const isCurrentDay = isToday(day);
            const isPastDay = isPast(day) && !isCurrentDay;

            return (
              <button
                key={day.toString()}
                onClick={() => onDateClick && onDateClick(day)}
                className={`aspect-square flex flex-col items-center justify-center rounded text-xs transition ${
                  isCurrentDay
                    ? 'bg-blue-500 text-white font-bold'
                    : isPastDay
                    ? 'bg-gray-100 text-gray-400'
                    : dayTasks.length > 0
                    ? 'bg-yellow-100 text-yellow-900 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div>{day.getDate()}</div>
                {dayTasks.length > 0 && !isCurrentDay && (
                  <div className="text-xs">•</div>
                )}
              </button>
            );
          })}
        </div>

        {tasks.length > 0 && (
          <div className="mt-3 pt-3 border-t text-xs">
            <p className="font-semibold text-gray-700 mb-2">Tasks ({tasks.length})</p>
            <div className="space-y-1 max-h-24 overflow-y-auto">
              {tasks.slice(0, 5).map(task => (
                <div key={task.id} className="p-1 bg-yellow-50 rounded text-gray-700 truncate">
                  <span className="font-medium text-xs">{task.title}</span>
                </div>
              ))}
              {tasks.length > 5 && <p className="text-gray-500 text-xs">+{tasks.length - 5} more</p>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full calendar view
  return (
    <div className="bg-white rounded-lg shadow-sm p-5">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-1.5 hover:bg-gray-100 rounded"
        >
          <FiChevronLeft size={18} />
        </button>
        <h3 className="text-sm font-bold text-gray-900">
          {format(selectedMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={handleNextMonth}
          className="p-1.5 hover:bg-gray-100 rounded"
        >
          <FiChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {dayOfWeek.map(day => (
          <div key={day} className="text-center font-semibold text-gray-600 text-xs py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {getCalendarDays().map(day => {
          const dayTasks = getTasksForDay(day);
          const isCurrentDay = isToday(day);

          return (
            <button
              key={day.toString()}
              onClick={() => onDateClick && onDateClick(day)}
              className={`aspect-square flex flex-col items-center justify-center rounded text-xs font-medium transition ${
                isCurrentDay
                  ? 'bg-blue-500 text-white'
                  : dayTasks.length > 0
                  ? 'bg-yellow-100 text-yellow-900 border border-yellow-300'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div>{day.getDate()}</div>
              {dayTasks.length > 0 && (
                <div className="text-xs">({dayTasks.length})</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
