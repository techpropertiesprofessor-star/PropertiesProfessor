import axios from "axios";

/**
 * =====================================================
 * API BASE CONFIG (Next.js SAME-ORIGIN)
 * =====================================================
 */
const api = axios.create({
  baseURL: "https://propertiesprofessor.onrender.com/api",
  withCredentials: false,
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
 * TASK APIs
 * =====================================================
 */
export const taskAPI = {
  create: (data) => api.post("/tasks", data),
  getAll: (params = {}) => api.get("/tasks", { params }),
  getById: (id) => api.get(`/tasks/${id}`),
  update: (id, data) => api.put(`/tasks/${id}`, data),
};

/**
 * =====================================================
 * INVENTORY APIs
 * =====================================================
 */
export const inventoryAPI = {
  getProjects: (params) =>
    api.get("/inventory/projects", { params }),
  createProject: (data) =>
    api.post("/inventory/projects", data),
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
