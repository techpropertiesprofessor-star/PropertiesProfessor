import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const adminApi = {
  // Activity logs
  getActivityLogs: (params) => api.get('/api/admin/logs/activity', { params }),
  
  // API logs
  getApiLogs: (params) => api.get('/api/admin/logs/api', { params }),
  
  // System metrics
  getSystemMetrics: (params) => api.get('/api/admin/metrics/system', { params }),
  
  // Health checks
  getHealthChecks: (params) => api.get('/api/admin/health', { params }),
  
  // Crash logs
  getCrashLogs: (params) => api.get('/api/admin/logs/crashes', { params }),
  
  // Analytics
  getAnalytics: (params) => api.get('/api/admin/analytics', { params }),
  
  // Bandwidth
  getBandwidthByUser: (params) => api.get('/api/admin/bandwidth/users', { params }),
  
  // Queue stats
  getQueueStats: () => api.get('/api/admin/queue/stats'),
  
  // BIOS
  getBiosStatus: () => api.get('/api/bios/status'),
  getBiosComponentHealth: (component) => api.get(`/api/bios/health/${component}`),
  getBiosCrashes: () => api.get('/api/bios/crashes'),
  getBiosCrashTimeline: () => api.get('/api/bios/crashes/timeline'),
  getBiosDatabaseDiagnostics: () => api.get('/api/bios/diagnostics/database'),
  getBiosProcessMetrics: () => api.get('/api/bios/diagnostics/process'),
  getBiosFullDiagnostics: () => api.get('/api/bios/diagnostics/full'),
  getBiosApiHealth: () => api.get('/api/bios/api-health'),
  getBiosStorage: () => api.get('/api/bios/storage'),
  getBiosDiagnose: () => api.get('/api/bios/diagnose'),
  getBiosErrorLogs: (hours = 24, type = 'all') => api.get(`/api/bios/error-logs?hours=${hours}&type=${type}&limit=100`),
  getBiosDiagnosticReport: () => api.get('/api/bios/diagnostic-report'),

  // Auth
  login: (credentials) => api.post('/api/auth/login', credentials),
};

export default api;
