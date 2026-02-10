import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiUser, FiMessageSquare, FiVolume2, FiCheckCircle } from 'react-icons/fi';

const NotificationToast = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let exitTimer;
    
    if (!isPaused) {
      // Start exit animation after 3 seconds
      exitTimer = setTimeout(() => {
        setIsExiting(true);
      }, 3000);
    }

    return () => clearTimeout(exitTimer);
  }, [isPaused]);

  useEffect(() => {
    let removeTimer;
    
    if (isExiting) {
      // Remove toast after 1 second exit animation
      removeTimer = setTimeout(() => {
        onRemove(toast.id);
      }, 1000);
    }

    return () => clearTimeout(removeTimer);
  }, [isExiting, toast.id, onRemove]);

  const getIcon = () => {
    const type = toast.type?.toLowerCase() || '';
    
    if (type.includes('task')) {
      return <FiCheckCircle className="w-5 h-5" />;
    } else if (type.includes('lead') || type.includes('caller')) {
      return <FiUser className="w-5 h-5" />;
    } else if (type.includes('chat') || type.includes('message')) {
      return <FiMessageSquare className="w-5 h-5" />;
    } else if (type.includes('announcement')) {
      return <FiVolume2 className="w-5 h-5" />;
    }
    
    return <FiBell className="w-5 h-5" />;
  };

  const getColors = () => {
    const type = toast.type?.toLowerCase() || '';
    
    if (type.includes('task')) {
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        title: 'text-blue-900',
        text: 'text-blue-700'
      };
    } else if (type.includes('lead') || type.includes('caller')) {
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: 'text-green-600',
        title: 'text-green-900',
        text: 'text-green-700'
      };
    } else if (type.includes('chat') || type.includes('message')) {
      return {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        icon: 'text-purple-600',
        title: 'text-purple-900',
        text: 'text-purple-700'
      };
    } else if (type.includes('announcement')) {
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        icon: 'text-yellow-600',
        title: 'text-yellow-900',
        text: 'text-yellow-700'
      };
    }
    
    return {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      icon: 'text-gray-600',
      title: 'text-gray-900',
      text: 'text-gray-700'
    };
  };

  const handleClick = () => {
    if (toast.onClick) {
      toast.onClick();
    } else if (toast.link) {
      navigate(toast.link);
    }
    onRemove(toast.id);
  };

  const colors = getColors();

  return (
    <div
      className={`notification-toast ${isExiting ? 'toast-exit' : 'toast-enter'} ${colors.bg} ${colors.border} border rounded-xl shadow-lg cursor-pointer`}
      style={{
        minWidth: '320px',
        maxWidth: '400px',
        pointerEvents: 'all'
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="p-4 flex items-start gap-3">
        <div className={`${colors.icon} flex-shrink-0 mt-0.5`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-bold ${colors.title} text-sm mb-1`}>
            {toast.title || 'Notification'}
          </div>
          <div className={`${colors.text} text-xs leading-relaxed line-clamp-2`}>
            {toast.message || toast.description || 'You have a new notification'}
          </div>
          {toast.timestamp && (
            <div className={`${colors.text} text-xs mt-1 opacity-70`}>
              {new Date(toast.timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const NotificationToastContainer = ({ toasts, onRemove }) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: '12px',
        maxHeight: 'calc(100vh - 48px)',
        overflow: 'visible'
      }}
    >
      {toasts.map((toast) => (
        <NotificationToast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

export default NotificationToastContainer;
