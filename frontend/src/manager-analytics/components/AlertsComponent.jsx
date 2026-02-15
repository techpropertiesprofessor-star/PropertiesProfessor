/**
 * Alerts & Exceptions Component - Modern Professional Design
 * Displays important alerts with priority-based glassmorphism cards
 */

import React from 'react';

const AlertItem = ({ alert, onAlertClick, index }) => {
  const getAlertStyles = (type, priority) => {
    if (type === 'warning' || priority === 'high') {
      return {
        bg: 'bg-gradient-to-r from-red-50 to-rose-50',
        border: 'border-red-200',
        text: 'text-red-800',
        icon: '🚨',
        badge: 'bg-red-500',
        hover: 'hover:from-red-100 hover:to-rose-100 hover:border-red-300 hover:shadow-red-100'
      };
    } else if (priority === 'medium') {
      return {
        bg: 'bg-gradient-to-r from-amber-50 to-yellow-50',
        border: 'border-amber-200',
        text: 'text-amber-800',
        icon: '⚠️',
        badge: 'bg-amber-500',
        hover: 'hover:from-amber-100 hover:to-yellow-100 hover:border-amber-300 hover:shadow-amber-100'
      };
    } else {
      return {
        bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        icon: 'ℹ️',
        badge: 'bg-blue-500',
        hover: 'hover:from-blue-100 hover:to-indigo-100 hover:border-blue-300 hover:shadow-blue-100'
      };
    }
  };

  const styles = getAlertStyles(alert.type, alert.priority);

  return (
    <div
      className={`${styles.bg} border ${styles.border} rounded-xl p-4 mb-3 cursor-pointer transition-all duration-300 ${styles.hover} hover:shadow-lg transform hover:-translate-y-0.5`}
      onClick={() => onAlertClick && onAlertClick(alert)}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <span className="text-2xl mt-0.5">{styles.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className={`text-sm font-bold ${styles.text}`}>{alert.category}</p>
              <span className={`${styles.badge} text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase`}>
                {alert.priority || 'low'}
              </span>
            </div>
            <p className={`text-sm ${styles.text} opacity-90 leading-relaxed`}>{alert.message}</p>
            <p className={`text-xs ${styles.text} opacity-50 mt-1.5 flex items-center gap-1`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Click to view details
            </p>
          </div>
        </div>
        {alert.count && (
          <div className="flex-shrink-0 ml-3">
            <span className={`text-2xl font-black ${styles.text}`}>{alert.count}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const AlertsComponent = ({ data, onRefresh, onAlertClick }) => {
  const handleAlertClick = (alert) => {
    if (onAlertClick) {
      onAlertClick(alert);
    } else {
      switch (alert.category.toLowerCase()) {
        case 'tasks': window.location.href = '/tasks'; break;
        case 'leads': window.location.href = '/leads'; break;
        case 'inventory': window.location.href = '/inventory'; break;
        default: console.log('Alert clicked:', alert);
      }
    }
  };

  if (!data) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden">
        <div className="bg-gradient-to-r from-red-500 to-rose-500 px-6 py-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">🔔 Alerts & Exceptions</h3>
        </div>
        <div className="p-6 flex items-center justify-center h-32 text-gray-400">
          <div className="text-center">
            <span className="text-4xl block mb-2">🔔</span>
            <p className="text-sm">No alerts data available</p>
          </div>
        </div>
      </div>
    );
  }

  const highPriorityCount = data.filter(a => a.priority === 'high').length;
  const mediumPriorityCount = data.filter(a => a.priority === 'medium').length;
  const lowPriorityCount = data.filter(a => a.priority !== 'high' && a.priority !== 'medium').length;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100/50 overflow-hidden hover:shadow-2xl transition-shadow duration-500">
      <div className="bg-gradient-to-r from-red-500 to-rose-500 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-white">🔔 Alerts & Exceptions</h3>
          {data.length > 0 && (
            <div className="flex gap-2">
              {highPriorityCount > 0 && (
                <span className="px-2.5 py-1 bg-white/25 text-white text-xs font-bold rounded-full backdrop-blur-sm">
                  {highPriorityCount} High
                </span>
              )}
              {mediumPriorityCount > 0 && (
                <span className="px-2.5 py-1 bg-white/25 text-white text-xs font-bold rounded-full backdrop-blur-sm">
                  {mediumPriorityCount} Medium
                </span>
              )}
            </div>
          )}
        </div>
        {onRefresh && (
          <button onClick={() => onRefresh('alerts')} className="text-white/80 hover:text-white text-sm hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all">
            ↻ Refresh
          </button>
        )}
      </div>

      <div className="p-6">
        {/* Priority summary */}
        {data.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-2.5 bg-red-50 rounded-xl border border-red-100">
              <p className="text-lg font-black text-red-700">{highPriorityCount}</p>
              <p className="text-xs text-red-600 font-medium">Critical</p>
            </div>
            <div className="text-center p-2.5 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-lg font-black text-amber-700">{mediumPriorityCount}</p>
              <p className="text-xs text-amber-600 font-medium">Warning</p>
            </div>
            <div className="text-center p-2.5 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-lg font-black text-blue-700">{lowPriorityCount}</p>
              <p className="text-xs text-blue-600 font-medium">Info</p>
            </div>
          </div>
        )}

        <div className="max-h-96 overflow-y-auto pr-1 custom-scrollbar">
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <span className="text-3xl">✓</span>
              </div>
              <p className="text-sm font-medium text-green-600">All clear! No alerts at this time.</p>
            </div>
          ) : (
            data.map((alert, index) => (
              <AlertItem key={index} alert={alert} onAlertClick={handleAlertClick} index={index} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertsComponent;
