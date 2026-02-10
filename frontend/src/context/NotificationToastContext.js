import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationToastContext = createContext();

export const useNotificationToast = () => {
  const context = useContext(NotificationToastContext);
  if (!context) {
    throw new Error('useNotificationToast must be used within NotificationToastProvider');
  }
  return context;
};

export const NotificationToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      ...toast,
      createdAt: Date.now()
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after 4 seconds (3s visible + 1s exit animation)
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  return (
    <NotificationToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
    </NotificationToastContext.Provider>
  );
};
