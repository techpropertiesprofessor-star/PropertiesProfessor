import axios from "axios";

/**
 * =====================================================
 * API BASE CONFIG (Next.js SAME-ORIGIN)
 * =====================================================
 * All requests go to Next.js API routes:
 * /api/...
 * NO localhost
 */
const api = axios.create({
  baseURL: "/api",
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
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * =====================================================
 * AUTH APIs ✅ (FIXED)
 * =====================================================
 */
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (email, password) =>
    api.post("/auth/login", { email, password }), // 👉 /api/auth/login
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
  uploadDocument: (id, formData) =>
    api.post(`/employees/${id}/documents`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getDocuments: (id) => api.get(`/employees/${id}/documents`),
  verifyDocument: (docId) =>
    api.put(`/employees/documents/${docId}/verify`),
  activateEmployee: (id) =>
    api.put(`/employees/${id}/activate`),
  updateOnlineStatus: (data) =>
    api.put("/employees/status/online", data),
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
  getLeaveRequests: () =>
    api.get("/attendance/leave-requests/mine"),
  getAllLeaveRequests: () =>
    api.get("/attendance/leave-requests"),
  approveLeave: (id) =>
    api.put(`/attendance/leave-requests/${id}/approve`),
  rejectLeave: (id) =>
    api.put(`/attendance/leave-requests/${id}/reject`),
  requestLeave: (data) =>
    api.post("/leaves", {
      fromDate: data.start_date,
      toDate: data.end_date,
      reason: data.reason,
      leaveType: data.leave_type,
    }),
  getGeofence: () =>
    api.get("/attendance/geofence"),
};

/**
 * =====================================================
 * TASK APIs
 * =====================================================
 */
export const taskAPI = {
  create: (data) => api.post("/tasks", data),
  getAll: (params = {}) => api.get("/tasks", { params }),
  getAllTasks: () => api.get("/tasks/all"),
  getById: (id) => api.get(`/tasks/${id}`),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  updateStatusByEmployee: (id, data) =>
    api.put(`/tasks/${id}/update-status`, data),
  addComment: (id, comment) =>
    api.post(`/tasks/${id}/comments`, { comment }),
  getComments: (id) =>
    api.get(`/tasks/${id}/comments`),
  pinByManager: (id) =>
    api.post(`/tasks/${id}/pin-manager`),
  pinByEmployee: (id) =>
    api.post(`/tasks/${id}/pin-employee`),
  unpinByManager: (id) =>
    api.post(`/tasks/${id}/unpin-manager`),
  unpinByEmployee: (id) =>
    api.post(`/tasks/${id}/unpin-employee`),
  getTasksByDate: (empId, date) =>
    api.get(`/tasks/employee/${empId}/date/${date}`),
  getBacklog: (empId) =>
    api.get(`/tasks/employee/${empId}/backlog`),
  getStats: (empId) =>
    api.get(`/tasks/employee/${empId}/stats`),
  autoArchive: () =>
    api.post("/tasks/auto-archive"),
};

/**
 * =====================================================
 * INVENTORY APIs ✅ (FIXED & CLEAN)
 * =====================================================
 */
export const inventoryAPI = {
  // Projects
  getProjects: (params) =>
    api.get("/inventory/projects", { params }),
  createProject: (data) =>
    api.post("/inventory/projects", data),

  // Towers
  getTowers: (projectId) =>
    api.get(`/inventory/projects/${projectId}/towers`),
  createTower: (projectId, data) =>
    api.post(`/inventory/projects/${projectId}/towers`, data),

  // Units
  createUnit: (data) =>
    api.post("/inventory/units", data),
  getStats: (projectId) =>
    api.get("/inventory/stats", {
      params: { project_id: projectId },
    }),

  // Media
  listUnitMedia: (id) =>
    api.get(`/inventory/units/${id}/media`),
  uploadUnitMedia: (id, files, caption) => {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    if (caption) form.append("caption", caption);

    return api.post(
      `/inventory/units/${id}/media`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
  },
  deleteUnitMedia: (id, mediaId) =>
    api.delete(
      `/inventory/units/${id}/media/${mediaId}`
    ),

  // Sharing
  enableUnitShare: (id) =>
    api.post(`/inventory/units/${id}/share`),

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
  upload: (formData) =>
    api.post("/leads/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getAll: (params) =>
    api.get("/leads", { params }),
  getById: (id) =>
    api.get(`/leads/${id}`),
  update: (id, data) =>
    api.put(`/leads/${id}`, data),
  updateRemarks: (id, remarks) =>
    api.put(`/leads/${id}/remarks`, { remarks }),
  assign: (id, employeeId) =>
    api.post(`/leads/${id}/assign`, {
      assignedTo: employeeId,
    }),
  getUploadHistory: () =>
    api.get("/leads/uploads/history"),
  create: (data) =>
    api.post("/leads", data),
  download: ({ start, end }) =>
    api.get("/leads/download", {
      params: { start, end },
      responseType: "blob",
    }),
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
  getUnreadCount: () =>
    api.get("/notifications/unread/count"),
  getCountsByType: () =>
    api.get("/notifications/counts-by-type"),
  markTeamChatAsRead: () =>
    api.put("/notifications/team-chat/mark-read"),
};

/**
 * =====================================================
 * CHAT APIs
 * =====================================================
 */
export const chatAPI = {
  getChatList: () =>
    api.get("/chat/chats"),
  getMessages: (params) =>
    api.get("/chat/messages", { params }),
  sendMessage: (data) =>
    api.post("/chat/message", data),
  markAsDelivered: (messageId) =>
    api.post("/chat/message/delivered", {
      messageId,
    }),
  markAsSeen: (messageId) =>
    api.post("/chat/message/seen", {
      messageId,
    }),
  markChatAsSeen: (userId) =>
    api.post("/chat/chat/seen", {
      userId,
    }),
  uploadAttachment: (formData) =>
    api.post("/chat/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
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
  getEventsByDate: (date) =>
    api.get(`/calendar/events/date/${date}`),
  createEvent: (data) =>
    api.post("/calendar/events", data),
  updateEvent: (id, data) =>
    api.put(`/calendar/events/${id}`, data),
  deleteEvent: (id) =>
    api.delete(`/calendar/events/${id}`),
};

export default api;
