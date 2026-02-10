import React from 'react';

/**
 * CONNECTION STATUS INDICATOR
 * Shows real-time connection status with colored dot
 */
const ConnectionStatus = ({ status, lastUpdate }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'bg-green-500',
          text: 'Real-time Connected',
          pulse: 'animate-pulse'
        };
      case 'polling':
        return {
          color: 'bg-yellow-500',
          text: 'Polling Mode',
          pulse: ''
        };
      case 'disconnected':
        return {
          color: 'bg-red-500',
          text: 'Disconnected',
          pulse: ''
        };
      default:
        return {
          color: 'bg-gray-500',
          text: 'Unknown',
          pulse: ''
        };
    }
  };
  
  const config = getStatusConfig();
  
  const formatLastUpdate = () => {
    if (!lastUpdate) return '';
    
    const now = new Date();
    const diff = Math.floor((now - lastUpdate) / 1000); // seconds
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${config.color} ${config.pulse}`}></div>
        <span className="font-medium text-gray-700">{config.text}</span>
      </div>
      {lastUpdate && (
        <span className="text-gray-500 text-xs">
          Updated {formatLastUpdate()}
        </span>
      )}
    </div>
  );
};

export default ConnectionStatus;
