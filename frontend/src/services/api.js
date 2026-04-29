import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me')
};

export const adminAPI = {
  bulkEntry: (data) => api.post('/admin/bulk-entry', { data }),
  getDrivers: () => api.get('/admin/drivers'),
  getBuses: () => api.get('/admin/buses'),
  getRoutes: () => api.get('/admin/routes'),
  getStats: () => api.get('/admin/stats')
};

export const driverAPI = {
  getMyBus: () => api.get('/driver/my-bus'),
  startTrip: () => api.post('/driver/start-trip'),
  stopTrip: () => api.post('/driver/stop-trip'),
  updateSeats: (availableSeats) => api.put('/driver/update-seats', { availableSeats }),
  saveLocation: (lat, lng) => api.post('/driver/location', { lat, lng })
};

export const trackingAPI = {
  getRoutes: () => api.get('/tracking/routes'),
  getBusesByRoute: (routeId) => api.get(`/tracking/buses/${routeId}`),
  getActiveBuses: () => api.get('/tracking/active-buses'),
  getBusDetails: (busId) => api.get(`/tracking/bus/${busId}`),
  getRouteDetails: (routeId) => api.get(`/tracking/route/${routeId}`)
};

export const sosAPI = {
  sendSOS: (data) => api.post('/sos', data)
};

export default api;
