// =====================================================================
// frontend/src/services/api.js — Axios API client
// =====================================================================
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,
});

// ── Attach token from localStorage to every request ──
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Handle 401 globally (auto-logout) ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ──────────────────────────────────────────────────────────────────────
// Auth API
// ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  register:       (data) => api.post('/auth/register', data),
  login:          (data) => api.post('/auth/login', data),
  logout:         ()     => api.post('/auth/logout'),
  me:             ()     => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword:  (data) => api.post('/auth/reset-password', data),
};

// ──────────────────────────────────────────────────────────────────────
// Print Job API
// ──────────────────────────────────────────────────────────────────────
export const jobsAPI = {
  create: (formData, onProgress) =>
    api.post('/printjobs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }),
  list:   (params) => api.get('/printjobs', { params }),
  get:    (id)     => api.get(`/printjobs/${id}`),
  cancel: (id)     => api.patch(`/printjobs/${id}/cancel`),
  retry:  (id)     => api.patch(`/printjobs/${id}/retry`),
};

// ──────────────────────────────────────────────────────────────────────
// Printers API
// ──────────────────────────────────────────────────────────────────────
export const printersAPI = {
  list:         ()          => api.get('/printers'),
  get:          (id)        => api.get(`/printers/${id}`),
  create:       (data)      => api.post('/printers', data),
  update:       (id, data)  => api.patch(`/printers/${id}`, data),
  delete:       (id)        => api.delete(`/printers/${id}`),
};

// ──────────────────────────────────────────────────────────────────────
// Admin API
// ──────────────────────────────────────────────────────────────────────
export const adminAPI = {
  dashboard:    () => api.get('/admin/dashboard'),
  serverStatus: () => api.get('/admin/server-status'),
  activityLogs: (params) => api.get('/admin/activity-logs', { params }),
  allJobs:      (params) => api.get('/admin/all-jobs', { params }),
};

// ──────────────────────────────────────────────────────────────────────
// Users API
// ──────────────────────────────────────────────────────────────────────
export const usersAPI = {
  profile:        ()      => api.get('/users/profile'),
  updateProfile:  (data)  => api.patch('/users/profile', data),
  changePassword: (data)  => api.patch('/users/change-password', data),
  list:           (params) => api.get('/users', { params }),
  toggleUser:     (id)    => api.patch(`/users/${id}/toggle`),
};

export default api;
