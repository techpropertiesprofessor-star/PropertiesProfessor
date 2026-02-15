import { useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * useRealtimeData - hook for real-time data refresh via SocketContext.
 *
 * @param {string[]} events - Socket events to listen for (e.g., ['lead-created', 'lead-updated'])
 * @param {Function} refreshFn - Function to call when any of the events fire
 * @param {Object} options - { enabled: true, debounceMs: 500 }
 */
export default function useRealtimeData(events, refreshFn, options = {}) {
  const { on, off, connected } = useSocket() || {};
  const { enabled = true, debounceMs = 500 } = options;
  const timerRef = useRef(null);
  const refreshRef = useRef(refreshFn);

  // Keep refreshFn ref up to date without triggering re-subscribe
  useEffect(() => {
    refreshRef.current = refreshFn;
  }, [refreshFn]);

  const debouncedRefresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      refreshRef.current?.();
    }, debounceMs);
  }, [debounceMs]);

  useEffect(() => {
    if (!enabled || !on || !off || !connected) return;

    events.forEach((event) => {
      on(event, debouncedRefresh);
    });

    return () => {
      events.forEach((event) => {
        off(event, debouncedRefresh);
      });
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, on, off, connected, debouncedRefresh, JSON.stringify(events)]);
}
