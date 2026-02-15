import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { reminderAPI } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const POLL_INTERVAL = 2 * 60 * 1000; // 2 minutes
const DISMISSED_STORAGE_KEY = 'dismissed_reminders';

// Get today's dismissed IDs from localStorage (resets daily)
const getDismissedIds = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(DISMISSED_STORAGE_KEY) || '{}');
    const today = new Date().toDateString();
    if (stored.date !== today) {
      // Reset dismissed list for new day
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify({ date: today, ids: [] }));
      return [];
    }
    return stored.ids || [];
  } catch {
    return [];
  }
};

const saveDismissedId = (id) => {
  try {
    const today = new Date().toDateString();
    const stored = JSON.parse(localStorage.getItem(DISMISSED_STORAGE_KEY) || '{}');
    const ids = stored.date === today ? (stored.ids || []) : [];
    if (!ids.includes(id)) {
      ids.push(id);
    }
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify({ date: today, ids }));
  } catch {}
};

const saveDismissAll = (allIds) => {
  try {
    const today = new Date().toDateString();
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify({ date: today, ids: allIds }));
  } catch {}
};

export default function useReminderPopups() {
  const { user } = useContext(AuthContext);
  const { on, off, connected } = useSocket() || {};
  const [reminders, setReminders] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [allReminders, setAllReminders] = useState([]); // unfiltered for badge
  const intervalRef = useRef(null);
  const hasFetchedRef = useRef(false);

  const fetchReminders = useCallback(async () => {
    if (!user) return;
    try {
      const res = await reminderAPI.getTodayReminders();
      const data = res.data?.reminders || [];
      
      // Filter out dismissed ones
      const dismissedIds = getDismissedIds();
      const active = data.filter(r => !dismissedIds.includes(r._id));

      setAllReminders(active);
      setReminders(active);

      // Show popup only if there are active reminders
      if (active.length > 0) {
        setShowPopup(true);
      }
    } catch (err) {
      console.error('Failed to fetch reminders:', err);
    }
  }, [user]);

  // Initial fetch (after 3 second delay to let dashboard load)
  useEffect(() => {
    if (!user || hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const initialTimer = setTimeout(() => {
      fetchReminders();
    }, 3000);

    return () => clearTimeout(initialTimer);
  }, [user, fetchReminders]);

  // Poll every 5 minutes
  useEffect(() => {
    if (!user) return;
    
    intervalRef.current = setInterval(() => {
      fetchReminders();
    }, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, fetchReminders]);

  // Auto-update on socket events (task/lead status changes)
  useEffect(() => {
    if (!on || !off || !connected) return;

    const autoRefresh = () => {
      // Small delay to let backend finish updating
      setTimeout(() => fetchReminders(), 1000);
    };

    const events = [
      'task-updated', 'task-created',
      'lead-updated', 'lead-created', 'lead-remarks-updated',
      'new-notification'
    ];

    events.forEach(event => on(event, autoRefresh));
    return () => events.forEach(event => off(event, autoRefresh));
  }, [on, off, connected, fetchReminders]);

  const dismissReminder = useCallback((id) => {
    saveDismissedId(id);
    setReminders(prev => prev.filter(r => r._id !== id));
    setAllReminders(prev => prev.filter(r => r._id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    const allIds = reminders.map(r => r._id);
    saveDismissAll(allIds);
    setReminders([]);
    setAllReminders([]);
    setShowPopup(false);
  }, [reminders]);

  const closePopup = useCallback(() => {
    setShowPopup(false);
  }, []);

  const openPopup = useCallback(() => {
    if (allReminders.length > 0) {
      setShowPopup(true);
    }
  }, [allReminders]);

  return {
    reminders,
    showPopup,
    reminderCount: allReminders.length,
    dismissReminder,
    dismissAll,
    closePopup,
    openPopup,
  };
}
