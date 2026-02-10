/**
 * Alerts and Exceptions Component
 * Displays important alerts and exceptions for managers
 */

import React from 'react';

const AlertItem = ({ alert, onAlertClick }) => {
  const getAlertStyles = (type, priority) => {
    if (type === 'warning' || priority === 'high') {
      return {
        bg: 'bg-red-50',
        border: 'border-red-300',
        text: 'text-red-800',
        icon: '🚨',
        hover: 'hover:bg-red-100 hover:border-red-400'
      };
    } else if (priority === 'medium') {
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-300',
        text: 'text-yellow-800',
        icon: '⚠️',
        hover: 'hover:bg-yellow-100 hover:border-yellow-400'
      };
    } else {
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-300',
        text: 'text-blue-800',
        icon: 'ℹ️',
        hover: 'hover:bg-blue-100 hover:border-blue-400'
      };
    }
  };

  const styles = getAlertStyles(alert.type, alert.priority);
  
  const handleClick = () => {
    if (onAlertClick) {
      onAlertClick(alert);
    }
  };

  return (
    <div 
      className={`${styles.bg} border ${styles.border} rounded-lg p-3 mb-2 cursor-pointer transition-all duration-200 ${styles.hover} transform hover:scale-[1.02]`}
      onClick={handleClick}
      title="Click to view details"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1">
          <span className="text-xl">{styles.icon}</span>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${styles.text}`}>
              {alert.category}
            </p>
            <p className={`text-sm ${styles.text}`}>
              {alert.message}
            </p>
            <p className={`text-xs ${styles.text} opacity-70 mt-1`}>
              Click to view details
            </p>
          </div>
        </div>
        {alert.count && (
          <span className={`text-lg font-bold ${styles.text} ml-2`}>
            {alert.count}
          </span>
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
      // Default behavior - navigate based on alert category
      switch (alert.category.toLowerCase()) {
        case 'tasks':
          window.location.href = '/tasks';
          break;
        case 'leads':
          window.location.href = '/leads';
          break;
        case 'inventory':
          window.location.href = '/inventory';
          break;
        default:
          console.log('Alert clicked:', alert);
      }
    }
  };

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Alerts & Exceptions</h3>
          {onRefresh && (
            <button
              onClick={() => onRefresh('alerts')}
              className="text-blue-600 hover:text-blue-800 text-sm transition-colors"
            >
              🔄 Refresh
            </button>
          )}
        </div>
        <div className="flex items-center justify-center h-32 text-gray-500">
          No alerts data available
        </div>
      </div>
    );
  }

  const highPriorityCount = data.filter(a => a.priority === 'high').length;
  const mediumPriorityCount = data.filter(a => a.priority === 'medium').length;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-800">Alerts & Exceptions</h3>
          {data.length > 0 && (
            <div className="flex gap-2">
              {highPriorityCount > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded">
                  {highPriorityCount} High
                </span>
              )}
              {mediumPriorityCount > 0 && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                  {mediumPriorityCount} Medium
                </span>
              )}
            </div>
          )}
        </div>
        {onRefresh && (
          <button
            onClick={() => onRefresh('alerts')}
            className="text-blue-600 hover:text-blue-800 text-sm"
            title="Refresh alerts"
          >
            🔄 Refresh
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <span className="text-5xl mb-2">✓</span>
            <p className="text-sm">All clear! No alerts at this time.</p>
          </div>
        ) : (
          data.map((alert, index) => (
            <AlertItem key={index} alert={alert} onAlertClick={handleAlertClick} />
          ))
        )}
      </div>
    </div>
  );
};

export default AlertsComponent;
