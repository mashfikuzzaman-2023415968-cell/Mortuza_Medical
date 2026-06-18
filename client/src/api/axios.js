import axios from 'axios';

// SECURITY TRADEOFF: the JWT is kept in localStorage, which is convenient and
// fine for this course project but is readable by JavaScript (so a successful
// XSS could exfiltrate it). In production, an httpOnly, Secure, SameSite cookie
// is the more XSS-resistant choice. The server is the real security boundary —
// it re-verifies the token's signature and the user's role on every request;
// the frontend role/token checks are for UX only.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
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
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
