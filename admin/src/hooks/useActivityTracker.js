/**
 * ACTIVITY TRACKER HOOK FOR ADMIN PANEL
 * Tracks user actions and sends to backend
 */

import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
          axios.post(`${API_BASE}/api/admin/log/activity`, activity, {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(err => {
            // Silently fail - never disrupt user experience
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
 * Use this in App.js to enable tracking
 */
export const useActivityTracker = () => {
  const location = useLocation();
  const previousRoute = useRef(location.pathname);
  const sessionId = useRef(Math.random().toString(36).substring(7));

  // Track navigation
  useEffect(() => {
    const currentRoute = location.pathname;
    
    if (previousRoute.current !== currentRoute) {
      logActivity({
        actionType: 'NAVIGATION',
        route: currentRoute,
        previousRoute: previousRoute.current,
        sessionId: sessionId.current,
        category: 'ACTIVITY'
      });
      
      previousRoute.current = currentRoute;
    }
  }, [location]);

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
            elementText: target.innerText || target.value || target.textContent || undefined,
            sessionId: sessionId.current,
            category: 'ACTIVITY'
          });
        }
      } catch (error) {
        // Never throw
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [location]);

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
  }, [location]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activityQueue.destroy();
    };
  }, []);

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
    category: 'ACTIVITY',
    timestamp: new Date().toISOString()
  });
};

/**
 * Log API calls
 */
export const logApiCall = (method, endpoint, statusCode) => {
  activityQueue.enqueue({
    actionType: 'API_CALL',
    route: window.location.pathname,
    elementText: `${method} ${endpoint}`,
    metadata: { method, endpoint, statusCode },
    category: statusCode >= 400 ? 'CRITICAL' : 'SYSTEM',
    timestamp: new Date().toISOString()
  });
};
