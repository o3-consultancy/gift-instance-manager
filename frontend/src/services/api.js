import axios from 'axios';

// Use relative URL in production so it works on any domain
const API_BASE_URL = import.meta.env.VITE_API_URL || (
  import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:4000/api'
);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

// Auth API
export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  verify: () => api.get('/auth/verify')
};

// Instances API
export const instancesAPI = {
  getAll: () => api.get('/instances'),
  getById: (id) => api.get(`/instances/${id}`),
  create: (data) => api.post('/instances', data),
  update: (id, data) => api.put(`/instances/${id}`, data),
  delete: (id) => api.delete(`/instances/${id}`),
  start: (id) => api.post(`/instances/${id}/start`),
  stop: (id) => api.post(`/instances/${id}/stop`),
  restart: (id) => api.post(`/instances/${id}/restart`),
  getLogs: (id, tail = 100) => api.get(`/instances/${id}/logs`, { params: { tail } }),
  getStats: (id) => api.get(`/instances/${id}/stats`),
  startAll: () => api.post('/instances/bulk/start'),
  stopAll: () => api.post('/instances/bulk/stop'),
  getAvailableImages: () => api.get('/instances/available-images')
};

// System API
export const systemAPI = {
  health: () => api.get('/system/health'),
  dockerInfo: () => api.get('/system/docker'),
  dockerTest: () => api.get('/system/docker/test'),
  getPorts: () => api.get('/system/ports'),
  getNextPort: () => api.get('/system/ports/next'),
  sync: () => api.post('/system/sync')
};

export default api;
