import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { AuthContext } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const socketBase = process.env.REACT_APP_API_URL
      ? process.env.REACT_APP_API_URL.replace('/api', '')
      : window.location.origin;

    const socket = io(socketBase, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      const userId = user?.employeeId || user?._id || user?.id;
      if (userId) {
        socket.emit('identify', userId);
        console.log('🔌 [SocketContext] Connected & identified:', userId);
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('🔌 [SocketContext] Disconnected');
    });

    socket.on('reconnect', () => {
      setConnected(true);
      const userId = user?.employeeId || user?._id || user?.id;
      if (userId) {
        socket.emit('identify', userId);
        console.log('🔌 [SocketContext] Reconnected & re-identified:', userId);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user]);

  // Convenience: subscribe to an event
  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
  }, []);

  // Convenience: unsubscribe from an event
  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  // Convenience: emit an event
  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  const value = {
    socket: socketRef.current,
    connected,
    on,
    off,
    emit,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
