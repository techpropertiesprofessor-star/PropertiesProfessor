import React, { createContext, useState, useEffect } from 'react';
import { authAPI } from '../api/client';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await authAPI.verifyToken();
          setUser(response.data.user);
        } catch (err) {
          const status = err.response?.status;
          // Only remove token on actual auth failures (401/403)
          // Keep token on network errors or server issues — user may just be offline or server cold-starting
          if (status === 401 || status === 403) {
            localStorage.removeItem('token');
            setError('Session expired');
          } else if (!err.response) {
            // Network error — keep token, let user retry
            console.warn('[Auth] Network error during token verify, keeping session');
          } else {
            // Other server errors (500, 503) — keep token
            console.warn('[Auth] Server error during token verify:', status);
          }
        }
      }
      setLoading(false);
    };

    verifyToken();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      setError(null);
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Login failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint to set user offline
      await authAPI.logout();
    } catch (err) {
      console.error('Logout API error:', err);
    }
    
    localStorage.removeItem('token');
    setUser(null);
  };

  const updateUser = (updatedData) => {
    setUser(prev => ({ ...prev, ...updatedData }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, setError, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
