import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE });

// Inject JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nishy_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401, but ignore Spotify token endpoints which use 401 to indicate "not connected to spotify"
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (
      err.response?.status === 401 && 
      !err.config.url?.includes('/spotify') &&
      window.location.pathname !== '/login'
    ) {
      localStorage.removeItem('nishy_token');
      localStorage.removeItem('nishy_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
