/**
 * Manager Analytics API Service
 * Handles all API calls for manager analytics dashboard
 */

import axios from 'axios';

// Analytics API base URL (backend routes are at /api/manager-analytics)
const API_BASE_URL = 'http://localhost:5000/api';
const ANALYTICS_BASE = `${API_BASE_URL}/manager-analytics`;

// Create axios instance with auth token
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

class AnalyticsService {
  /**
   * Get all analytics data at once (for initial load)
   */
  async getAllAnalytics() {
    try {
      const response = await axios.get(`${ANALYTICS_BASE}/all`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('[ANALYTICS_SERVICE] getAllAnalytics error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get task status overview
   */
  async getTaskStatus() {
    try {
      const response = await axios.get(`${ANALYTICS_BASE}/task-status`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('[ANALYTICS_SERVICE] getTaskStatus error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get employee task load
   */
  async getEmployeeLoad() {
    try {
      const response = await axios.get(`${ANALYTICS_BASE}/employee-load`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('[ANALYTICS_SERVICE] getEmployeeLoad error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get leads funnel
   */
  async getLeadsFunnel() {
    try {
      const response = await axios.get(`${ANALYTICS_BASE}/leads-funnel`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('[ANALYTICS_SERVICE] getLeadsFunnel error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get lead source analysis
   */
  async getLeadSources() {
    try {
      const response = await axios.get(`${ANALYTICS_BASE}/lead-sources`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('[ANALYTICS_SERVICE] getLeadSources error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get inventory status
   */
  async getInventoryStatus() {
    try {
      const response = await axios.get(`${ANALYTICS_BASE}/inventory-status`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('[ANALYTICS_SERVICE] getInventoryStatus error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get call activity
   */
  async getCallActivity() {
    try {
      const response = await axios.get(`${ANALYTICS_BASE}/call-activity`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('[ANALYTICS_SERVICE] getCallActivity error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get performance KPIs
   */
  async getPerformanceKPIs() {
    try {
      const response = await axios.get(`${ANALYTICS_BASE}/kpis`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('[ANALYTICS_SERVICE] getPerformanceKPIs error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get alerts and exceptions
   */
  async getAlerts() {
    try {
      const response = await axios.get(`${ANALYTICS_BASE}/alerts`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('[ANALYTICS_SERVICE] getAlerts error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error
      const message = error.response.data?.message || 'An error occurred';
      const status = error.response.status;
      
      if (status === 403) {
        return new Error('Access denied. Manager privileges required.');
      } else if (status === 401) {
        return new Error('Authentication required. Please login again.');
      } else {
        return new Error(message);
      }
    } else if (error.request) {
      // Request made but no response
      return new Error('Unable to connect to server. Please check your connection.');
    } else {
      // Something else happened
      return new Error(error.message || 'An unexpected error occurred');
    }
  }
}

export default new AnalyticsService();
