import axios from "axios";

/**
 * =====================================================
 * API BASE CONFIG (Next.js SAME-ORIGIN)
 * =====================================================
 */
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  // withCredentials NOT needed — auth is via Authorization: Bearer header (JWT),
  // not cookies. Removing this allows CORS to use origin:* (cross-origin works everywhere)
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Helper: Retry a request up to `retries` times with exponential backoff.
 * Handles Render cold-start timeouts and network blips on production domain.
 */
async function retryRequest(requestFn, retries = 2, delayMs = 2000) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await requestFn();
    } catch (err) {
      const isNetworkError = !err.response; // no response = network/timeout issue
      const isServerWaking = err.response?.status >= 500;
      const isLastAttempt = i === retries;

      if (isLastAttempt || (!isNetworkError && !isServerWaking)) {
        throw err;
      }
      console.warn(`[API] Request failed (attempt ${i + 1}/${retries + 1}), retrying in ${delayMs}ms...`, err.message);
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
}


/**
 * =====================================================
 * REQUEST INTERCEPTOR (Attach JWT Token if exists)
 * =====================================================
 */
api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    // Auto-detect FormData — DELETE Content-Type so browser sets it with boundary
    if (config.data instanceof FormData) {
      // Use AxiosHeaders API (.delete) for Axios 1.x compatibility
      if (config.headers && typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
      } else if (config.headers) {
        delete config.headers['Content-Type'];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * =====================================================
 * AUTH APIs
 * =====================================================
 */
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (email, password) =>
    retryRequest(() => api.post("/auth/login", { email, password })),
  logout: () => api.post("/auth/logout"),
  getProfile: () => api.get("/auth/profile"),
  verifyToken: () => retryRequest(() => api.post("/auth/verify-token")),
  updateProfile: (formData) => api.put("/auth/update-profile", formData),
  changePassword: ({ userId, currentPassword, newPassword }) =>
    api.put("/auth/change-password", {
      userId,
      currentPassword,
      newPassword,
    }),
};

/**
 * =====================================================
 * USER APIs
 * =====================================================
 */
export const userAPI = {
  getAll: () => api.get("/users"),
};

/**
 * =====================================================
 * EMPLOYEE APIs
 * =====================================================
 */
export const employeeAPI = {
  getAll: () => api.get(`/employees?_t=${Date.now()}`),
  getBasic: () => api.get("/employees/basic"),
  getById: (id) => api.get(`/employees/${id}`),
  updateProfile: (id, data) => api.put(`/employees/${id}`, data),
  // Update online status (socketId / isOnline)
  updateOnlineStatus: (payload) => api.put('/employees/status/online', payload),
  delete: (id) => api.delete(`/employees/${id}`),
  // Manager-only: reset employee password
  resetPassword: (employeeId, data) => api.post(`/employees/reset-password/${employeeId}`, data),
  // Manager-only: toggle team attendance access
  toggleAttendanceAccess: (employeeId, data) => api.patch(`/employees/toggle-attendance-access/${employeeId}`, data),
};

/**
 * =====================================================
 * PAYROLL APIs — RBAC Protected
 * =====================================================
 */
export const payrollAPI = {
  // ADMIN only: set basic salary for an employee
  setBasicSalary: (data) => api.post('/payroll/set-salary', data),
  // ADMIN & MANAGER: generate single employee payroll
  generate: (data) => api.post('/payroll/generate', data),
  // ADMIN & MANAGER: generate bulk payroll for all employees
  generateAll: (data) => api.post('/payroll/generate-all', data),
  // ALL (controller enforces employee-own-only)
  getAll: (params) => api.get('/payroll', { params }),
  // ALL (controller enforces employee-own-only)
  getById: (id) => api.get(`/payroll/${id}`),
  // ADMIN & MANAGER: summary stats
  getSummary: (params) => api.get('/payroll/summary', { params }),
  // ADMIN only: edit bonus/incentives
  update: (id, data) => api.put(`/payroll/${id}`, data),
  // ADMIN only: mark as paid
  markPaid: (id) => api.put(`/payroll/${id}/pay`),
  // ADMIN only: delete salary record
  delete: (id) => api.delete(`/payroll/${id}`),
};

/**
 * =====================================================
 * PROFESSIONAL PAYROLL APIs — /api/pro-payroll
 * =====================================================
 */
export const proPayrollAPI = {
  // Salary Structure CRUD
  createSalaryStructure: (data) => api.post('/pro-payroll/salary-structure', data),
  getSalaryStructures: () => api.get('/pro-payroll/salary-structures'),
  updateSalaryStructure: (id, data) => api.put(`/pro-payroll/salary-structure/${id}`, data),
  deleteSalaryStructure: (id) => api.delete(`/pro-payroll/salary-structure/${id}`),
  assignStructure: (data) => api.post('/pro-payroll/assign-structure', data),

  // Payroll Generation
  generate: (employeeId, data) => api.post(`/pro-payroll/generate/${employeeId}`, data),
  generateAll: (data) => api.post('/pro-payroll/generate-all', data),

  // Workflow
  approve: (id) => api.post(`/pro-payroll/approve/${id}`),
  markPaid: (id) => api.post(`/pro-payroll/mark-paid/${id}`),

  // Queries
  getAllPayrolls: (params) => api.get('/pro-payroll/all-payrolls', { params }),
  getPayroll: (employeeId, params) => api.get(`/pro-payroll/${employeeId}`, { params }),
  getDashboard: (params) => api.get('/pro-payroll/dashboard', { params }),

  // PDF Payslip
  downloadSlip: (id) => api.get(`/pro-payroll/slip/${id}`, { responseType: 'arraybuffer' }),

  // Excel Export
  exportExcel: (params) => api.get('/pro-payroll/export-excel', { params, responseType: 'arraybuffer' }),

  // Delete
  delete: (id) => api.delete(`/pro-payroll/${id}`),

  // Employee Receipts (Paid payrolls)
  getMyReceipts: () => api.get('/pro-payroll/my-receipts'),
  getReceiptById: (id) => api.get(`/pro-payroll/receipt/${id}`),
  downloadReceiptPDF: (id) => api.get(`/pro-payroll/slip/${id}`, { responseType: 'arraybuffer' }),
};

/**
 * =====================================================
 * ATTENDANCE APIs
 * =====================================================
 */
export const attendanceAPI = {
  checkIn: (payload = {}) =>
    api.post("/attendance/check-in", payload),
  checkOut: () =>
    api.post("/attendance/check-out"),
  getHistory: () =>
    api.get("/attendance/history/mine"),
};

/**
 * =====================================================
 * TASK APIs ✅ (WITH PIN SUPPORT)
 * =====================================================
 */
export const taskAPI = {
  create: (data) => api.post("/tasks", data),

  getAll: (params = {}) =>
    api.get("/tasks", { params }),

  getById: (id) =>
    api.get(`/tasks/${id}`),

  update: (id, data) =>
    api.put(`/tasks/${id}`, data),

  updateStatusByEmployee: (id, data) =>
    api.put(`/tasks/${id}/update-status`, data),

  // ✅ PIN / UNPIN SUPPORT
  pinByEmployee: (id) =>
    api.post(`/tasks/${id}/pin-employee`),

  unpinByEmployee: (id) =>
    api.post(`/tasks/${id}/unpin-employee`),

  pinByManager: (id) =>
    api.post(`/tasks/${id}/pin-manager`),

  unpinByManager: (id) =>
    api.post(`/tasks/${id}/unpin-manager`),

  // Get stats for an employee
  getStats: (empId) =>
    api.get(`/tasks/employee/${empId}/stats`),

  // Get backlog for an employee
  getBacklog: (empId) =>
    api.get(`/tasks/employee/${empId}/backlog`)
};
/**
 * =====================================================
 * INVENTORY APIs ✅ (FULL VERSION)
 * =====================================================
 */
export const inventoryAPI = {

  // Projects
  getProjects: (params) =>
    api.get("/inventory/projects", { params }),

  createProject: (data) =>
    api.post("/inventory/projects", data),
  
  getUnit: (id) =>
  api.get(`/inventory/units/${id}`),


  // Towers
getTowers: (projectId) =>
  api.get(`/inventory/projects/${projectId}/towers`),

createTower: (projectId, data) =>
  api.post(`/inventory/projects/${projectId}/towers`, data),


  // Units
  createUnit: (data) =>
    api.post("/inventory/units", data),

  updateUnit: (id, data) =>
    api.put(`/inventory/units/${id}`, data),

  // Default listing (paginated/default) and separate advanced search
  getUnits: (params = {}) =>
    api.get("/inventory/units", { params }),

  searchUnits: (params = {}) =>
    api.get("/inventory/search", { params }),

  // Stats
  getStats: () =>
    api.get("/inventory/stats"),

  // Batch thumbnails from DO Spaces — silently return empty if endpoint not deployed yet
  getUnitThumbnails: (unitIds) =>
    api.post('/inventory/thumbnails', { unitIds })
      .catch(() => api.post('/inventory/units/thumbnails', { unitIds }))
      .catch(() => ({ data: { thumbnails: {} } })), // silent fallback

  // Media — DigitalOcean Spaces
  listUnitMedia: (id) =>
    retryRequest(() => api.get(`/inventory/units/${id}/media`)),

  uploadUnitMedia: (id, formData) =>
    retryRequest(
      () =>
        api.post(`/inventory/units/${id}/media`, formData, {
          timeout: 180000, // 3 min for large files (Render cold-start + upload)
        }),
      1, // only 1 retry for uploads (to avoid duplicate uploads)
      5000
    ),

  deleteUnitMedia: (id, mediaId) =>
    api.delete(`/inventory/units/${id}/media/${encodeURIComponent(mediaId)}`),

  // PDF
  generatePDF: (id) =>
    api.get(`/inventory/units/${id}/pdf`, {
      responseType: "blob",
    }),
};

/**
 * =====================================================
 * STORAGE APIs (DigitalOcean Spaces)
 * =====================================================
 */
export const storageAPI = {
  // Upload files via backend to Spaces (with retry)
  upload: (inventoryId, formData) =>
    retryRequest(
      () =>
        api.post(`/storage/upload/${inventoryId}`, formData, {
          timeout: 180000, // 3 min for large files
        }),
      1,
      5000
    ),

  // List files for an inventory unit (with retry)
  list: (inventoryId) =>
    retryRequest(() => api.get(`/storage/list/${inventoryId}`)),

  // Get presigned download URL
  getDownloadUrl: (key) =>
    retryRequest(() => api.get(`/storage/download`, { params: { key } })),

  // Delete a file
  delete: (key) =>
    api.delete(`/storage/delete`, { params: { key } }),

  // Get presigned upload URL (for direct browser upload)
  presignUpload: (inventoryId, filename, contentType) =>
    api.post(`/storage/presign-upload`, { inventoryId, filename, contentType }),
};

/**
 * =====================================================
 * LEAD APIs
 * =====================================================
 */
export const leadAPI = {
  getAll: (params) =>
    api.get("leads", { params }),

  getById: (id) =>
    api.get(`leads/${id}`),

  create: (data) =>
    api.post("leads", data),

  assign: (id, employeeId) =>
    api.post(`leads/${id}/assign`, {
      assignedTo: employeeId
    }),

  updateRemarks: (leadId, remarks, note) =>
    api.put(`leads/${leadId}/remarks`, { remarks, note }),

  updateProperty: (leadId, propertyId) =>
    api.put(`leads/${leadId}/property`, { propertyId }),

  download: ({ start, end }) =>
    api.get("leads/download", {
      params: { start, end },
      responseType: 'blob'
    })
};

/**
 * =====================================================
 * PROPERTY APIs (Lead → Property deep link)
 * =====================================================
 */
export const propertyAPI = {
  getById: (id) =>
    api.get(`/property/${id}`),

  list: () =>
    api.get('/property/list'),
};


/**
 * =====================================================
 * CALLER APIs  ✅ (THIS WAS MISSING)
 * =====================================================
 */
export const callerAPI = {
  import: (formData) =>
    api.post("/callers/import", formData),
  getList: (params = {}) =>
    api.get("/callers", { params }),
  getById: (id) =>
    api.get(`/callers/${id}`),
  create: (data) =>
    api.post("/callers", data),
  update: (id, data) =>
    api.put(`/callers/${id}`, data),
  recordResponse: (id, data) =>
    api.post(`/callers/${id}/response`, data),
  getAllResponses: () =>
    api.get("/callers/responses/all"),
};

/**
 * =====================================================
 * NOTIFICATION APIs
 * =====================================================
 */
export const notificationAPI = {
  getAll: () => api.get("/notifications"),
  markAsRead: (id) =>
    api.put(`/notifications/${id}/read`),
  getUnreadCount: () => api.get("/notifications/unread/count"),
  getCountsByType: () => api.get("/notifications/counts-by-type"),
  markTeamChatAsRead: () => api.put("/notifications/team-chat/mark-read"),
  markSectionAsRead: (section) => api.put(`/notifications/section/${section}/mark-read`),
};

/**
 * =====================================================
 * CHAT APIs
 * =====================================================
 */
export const chatAPI = {
  getChatList: () =>
    api.get("/chat/chats"),
  sendMessage: (data) =>
    api.post("/chat/message", data),
  getMessages: (params = {}) =>
    api.get('/chat/messages', { params }),
  markChatAsSeen: (userId) =>
    api.post('/chat/seen', { userId }),
  markAsDelivered: (messageId) =>
    api.post('/message/delivered', { messageId }),
  markAsSeen: (messageId) =>
    api.post('/message/seen', { messageId }),
};

/**
 * =====================================================
 * CALENDAR APIs
 * =====================================================
 */
export const calendarAPI = {
  getEvents: (year, month) =>
    api.get("/calendar/events", {
      params: { year, month },
    }),
  createEvent: (data) => api.post("/calendar/events", data),
  updateEvent: (id, data) => api.put(`/calendar/events/${id}`, data),
  deleteEvent: (id) => api.delete(`/calendar/events/${id}`),
};

/**
 * =====================================================
 * REMINDER APIs
 * =====================================================
 */
export const reminderAPI = {
  getTodayReminders: () => api.get("/reminders/today"),
};

export default api;

export const leaveAPI = {
  requestLeave: (data) => api.post("/leaves", data),

  getMyLeaves: () => api.get("/leaves/my"),

  getAllLeaves: () => api.get("/leaves/all"),

  approveLeave: (id) =>
    api.patch(`/leaves/${id}/approve`),

  rejectLeave: (id) =>
    api.patch(`/leaves/${id}/reject`),
};

/**
 * =====================================================
 * NAS (Network Attached Storage) APIs
 * =====================================================
 */
export const nasAPI = {
  // Folders
  listFolders: () => api.get('/nas/folders'),
  createFolder: (data) => api.post('/nas/folders', data),
  getFolder: (folderId) => api.get(`/nas/folders/${folderId}`),
  updateFolder: (folderId, data) => api.put(`/nas/folders/${folderId}`, data),
  deleteFolder: (folderId) => api.delete(`/nas/folders/${folderId}`),

  // Files
  uploadFiles: (folderId, formData) =>
    api.post(`/nas/folders/${folderId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 min for large video uploads
    }),

  deleteFile: (folderId, fileKey) =>
    api.delete(`/nas/folders/${folderId}/files/${encodeURIComponent(fileKey)}`),
};
