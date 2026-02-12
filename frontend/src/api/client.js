import axios from "axios";

/**
 * =====================================================
 * API BASE CONFIG (Next.js SAME-ORIGIN)
 * =====================================================
 */
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});


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
    api.post("/auth/login", { email, password }),
  logout: () => api.post("/auth/logout"),
  getProfile: () => api.get("/auth/profile"),
  verifyToken: () => api.post("/auth/verify-token"),
  changePassword: ({ userId, oldPassword, newPassword }) =>
    api.post("/auth/change-password", {
      userId,
      oldPassword,
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
  getAll: () => api.get("/employees"),
  getBasic: () => api.get("/employees/basic"),
  getById: (id) => api.get(`/employees/${id}`),
  updateProfile: (id, data) => api.put(`/employees/${id}`, data),
  // Update online status (socketId / isOnline)
  updateOnlineStatus: (payload) => api.put('/employees/status/online', payload),
};

/**
 * =====================================================
 * ATTENDANCE APIs
 * =====================================================
 */
export const attendanceAPI = {
  checkIn: (payload = {}) =>
    api.post("/attendance/check-in", payload),
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
    api.post(`/tasks/${id}/unpin-manager`)
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

  // Media
  listUnitMedia: (id) =>
    api.get(`/inventory/units/${id}/media`),

  uploadUnitMedia: (id, formData) =>
    api.post(`/inventory/units/${id}/media`, formData),

  deleteUnitMedia: (id, mediaId) =>
    api.delete(`/inventory/units/${id}/media/${mediaId}`),

  // PDF
  generatePDF: (id) =>
    api.get(`/inventory/units/${id}/pdf`, {
      responseType: "blob",
    }),
};

/**
 * =====================================================
 * LEAD APIs
 * =====================================================
 */
export const leadAPI = {
  getAll: (params) =>
    api.get("/leads", { params }),
  getById: (id) =>
    api.get(`/leads/${id}`),
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
