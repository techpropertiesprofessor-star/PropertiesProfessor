/**
 * ACTIVITY TRACKER HOOK
 * Non-intrusive activity tracking for existing dashboard
 * Logs user actions without modifying existing functionality
 */

import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL;

// Queue for batching activity logs
class ActivityQueue {
  constructor() {
    this.queue = [];
    this.maxSize = 50;
    this.flushInterval = 5000; // 5 seconds
    this.processing = false;
    this.startAutoFlush();
  }

  enqueue(activity) {
    this.queue.push(activity);
    
    // Flush immediately if queue is full
    if (this.queue.length >= this.maxSize) {
      this.flush();
    }
  }

  startAutoFlush() {
    this.timer = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  async flush() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    const batch = [...this.queue];
    this.queue = [];

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Send all activities in batch
      await Promise.all(
  batch.map(activity =>
    axios.post(`${API_BASE}/admin/log/activity`, activity, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch(err => {
      console.debug('Activity log failed:', err.message);
    })
  )
);

    } catch (error) {
      console.debug('Activity batch failed:', error.message);
    } finally {
      this.processing = false;
    }
  }

  destroy() {
    clearInterval(this.timer);
    this.flush();
  }
}

const activityQueue = new ActivityQueue();

/**
 * Activity Tracker Hook
 * Use this in App.js or main component to enable tracking
 */
export const useActivityTracker = () => {
  const location = useLocation();
  const previousRoute = useRef(location.pathname);
  const sessionId = useRef(Math.random().toString(36).substring(7));

  const logActivity = useCallback((activity) => {
    try {
      // Add timestamp
      activity.timestamp = new Date().toISOString();
      
      // Queue for async sending
      activityQueue.enqueue(activity);
    } catch (error) {
      // Never throw
    }
  }, []);

  // Track navigation
  useEffect(() => {
    const currentRoute = location.pathname;
    
    if (previousRoute.current !== currentRoute) {
      logActivity({
        actionType: 'NAVIGATION',
        route: currentRoute,
        previousRoute: previousRoute.current,
        sessionId: sessionId.current
      });
      
      previousRoute.current = currentRoute;
    }
  }, [location, logActivity]);


  // Track clicks
  useEffect(() => {
    const handleClick = (e) => {
      try {
        const target = e.target;
        const tagName = target.tagName.toLowerCase();
        
        // Only track interactive elements
        if (['button', 'a', 'input'].includes(tagName)) {
          logActivity({
            actionType: 'CLICK',
            route: location.pathname,
            elementId: target.id || undefined,
            elementType: tagName,
            elementText: target.innerText || target.value || undefined,
            sessionId: sessionId.current
          });
        }
      } catch (error) {
        // Never throw
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [location, logActivity]);


  // Track errors
  useEffect(() => {
    const handleError = (event) => {
      logActivity({
        actionType: 'ERROR',
        route: location.pathname,
        errorMessage: event.message || 'Unknown error',
        errorStack: event.error?.stack,
        category: 'CRITICAL',
        sessionId: sessionId.current
      });
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [location, logActivity]);


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activityQueue.destroy();
    };
  }, []);

  return { logActivity };
};

/**
 * Manually log specific activities
 */
export const logFormSubmit = (formId, entityType, metadata = {}) => {
  activityQueue.enqueue({
    actionType: 'FORM_SUBMIT',
    route: window.location.pathname,
    elementId: formId,
    elementType: 'form',
    entityType,
    metadata,
    timestamp: new Date().toISOString()
  });
};

export const logPermissionChange = (targetUserId, oldPermissions, newPermissions, metadata = {}) => {
  activityQueue.enqueue({
    actionType: 'PERMISSION_CHANGE',
    entityType: 'user',
    entityId: targetUserId,
    category: 'CRITICAL',
    metadata: {
      ...metadata,
      oldPermissions,
      newPermissions
    },
    timestamp: new Date().toISOString()
  });
};

export default useActivityTracker;
