import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const categoryConfig = {
  calendar: {
    gradient: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    badge: 'bg-blue-100 text-blue-700',
    label: 'Calendar Event',
    headerIcon: '📅',
  },
  task: {
    gradient: 'from-orange-500 to-red-500',
    bgLight: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-800',
    badge: 'bg-orange-100 text-orange-700',
    label: 'Task',
    headerIcon: '📋',
  },
  lead: {
    gradient: 'from-green-500 to-emerald-600',
    bgLight: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    badge: 'bg-green-100 text-green-700',
    label: 'Lead',
    headerIcon: '🎯',
  },
  caller: {
    gradient: 'from-purple-500 to-pink-500',
    bgLight: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-800',
    badge: 'bg-purple-100 text-purple-700',
    label: 'Caller',
    headerIcon: '📱',
  },
};

const priorityConfig = {
  high: { color: 'bg-red-500', pulse: true, label: 'HIGH' },
  medium: { color: 'bg-yellow-400', pulse: false, label: 'MEDIUM' },
  low: { color: 'bg-green-400', pulse: false, label: 'LOW' },
};

const ReminderCard = ({ reminder, onDismiss, onNavigate }) => {
  const config = categoryConfig[reminder.category] || categoryConfig.task;
  const pConfig = priorityConfig[reminder.priority] || priorityConfig.medium;

  return (
    <div className={`relative overflow-hidden rounded-xl border ${config.border} ${config.bgLight} shadow-md hover:shadow-lg transition-all duration-300 group`}>
      {/* Priority indicator strip */}
      <div className={`absolute top-0 left-0 w-1 h-full ${pConfig.color} ${pConfig.pulse ? 'animate-pulse' : ''}`} />
      
      <div className="pl-4 pr-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Category + Priority badges */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${config.badge}`}>
                {config.headerIcon} {config.label}
              </span>
              {reminder.isOverdue && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 animate-pulse">
                  🔴 OVERDUE
                </span>
              )}
              {reminder.priority === 'high' && !reminder.isOverdue && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">
                  ⚡ Urgent
                </span>
              )}
            </div>

            {/* Title */}
            <h4 className={`font-bold text-sm ${config.text} truncate`}>{reminder.title}</h4>
            
            {/* Description */}
            {reminder.description && (
              <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{reminder.description}</p>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
              {reminder.assignedTo && (
                <span className="flex items-center gap-1">
                  👤 {reminder.assignedTo}
                </span>
              )}
              {reminder.date && (
                <span className="flex items-center gap-1">
                  🕐 {new Date(reminder.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            <button
              onClick={() => onNavigate(reminder.link)}
              className={`px-2.5 py-1 text-xs font-semibold text-white bg-gradient-to-r ${config.gradient} rounded-lg hover:opacity-90 transition shadow-sm`}
            >
              View
            </button>
            <button
              onClick={() => onDismiss(reminder._id)}
              className="px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReminderPopup = ({ reminders = [], onDismiss, onDismissAll, onClose }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Play a subtle warning sound
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  }, []);

  if (!reminders || reminders.length === 0) return null;

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleNavigate = (link) => {
    navigate(link);
    handleClose();
  };

  const groupedReminders = {
    calendar: reminders.filter(r => r.category === 'calendar'),
    task: reminders.filter(r => r.category === 'task'),
    lead: reminders.filter(r => r.category === 'lead'),
    caller: reminders.filter(r => r.category === 'caller'),
  };

  const totalCount = reminders.length;
  const urgentCount = reminders.filter(r => r.priority === 'high' || r.isOverdue).length;

  return (
    <div className={`fixed inset-0 z-[100] flex items-start justify-center pt-4 md:pt-8 transition-all duration-300
      ${isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Popup Container */}
      <div className={`relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden
        ${isExiting ? 'animate-slideUp' : 'animate-slideDown'}`}
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 px-5 py-3.5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl animate-pulse">
                ⚠️
              </div>
              <div>
                <h3 className="font-bold text-base">Reminders & Warnings</h3>
                <p className="text-xs text-white/80">
                  {totalCount} item{totalCount !== 1 ? 's' : ''} need attention
                  {urgentCount > 0 && ` • ${urgentCount} urgent`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition text-sm"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? '🔽' : '🔼'}
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-white/20 rounded-lg transition text-lg font-bold leading-none"
                title="Close"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        {!isMinimized && (
          <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(85vh - 130px)' }}>
            {/* Category sections */}
            {Object.entries(groupedReminders).map(([category, items]) => {
              if (items.length === 0) return null;
              const config = categoryConfig[category];
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-gray-700">
                      {config.headerIcon} {config.label}s ({items.length})
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="space-y-2">
                    {items.map(reminder => (
                      <ReminderCard
                        key={reminder._id}
                        reminder={reminder}
                        onDismiss={onDismiss}
                        onNavigate={handleNavigate}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {!isMinimized && (
          <div className="border-t border-gray-200 px-5 py-3 bg-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-400">Auto-refreshes every 5 minutes</p>
            <div className="flex gap-2">
              <button
                onClick={() => { onDismissAll(); handleClose(); }}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-800 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition"
              >
                Dismiss All
              </button>
              <button
                onClick={handleClose}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg hover:opacity-90 transition shadow"
              >
                Got it!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Floating reminder bell badge (shown when popup is dismissed but reminders exist)
export const ReminderBadge = ({ count, onClick }) => {
  if (!count || count === 0) return null;
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-[90] w-14 h-14 bg-gradient-to-r from-amber-500 to-red-500 rounded-full shadow-xl flex items-center justify-center text-white hover:scale-110 transition-transform animate-bounce"
      title={`${count} reminder${count !== 1 ? 's' : ''}`}
    >
      <span className="text-xl">🔔</span>
      <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow">
        {count > 9 ? '9+' : count}
      </span>
    </button>
  );
};

export default ReminderPopup;
