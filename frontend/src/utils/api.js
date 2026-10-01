/**
 * api.js — SafeguardIQ Enterprise central axios instance with auto token refresh
 * Place in: frontend/src/utils/api.js
 *
 * Import this instead of axios directly:
 *   import api from '../utils/api';
 *   api.get('/violations/archive')  // token + refresh handled automatically
 */
import axios from 'axios';

const BASE_URL = '/api/v1';

// ── Create axios instance ──────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// ── Request interceptor — attach current token ─────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('safeg_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Track if a refresh is already in progress ──────────────────
let isRefreshing = false;
let failedQueue  = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

// ── Response interceptor — auto refresh on 401 ─────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only retry once, only on 401, skip auth endpoints
    const is401         = error.response?.status === 401;
    const alreadyRetried = original._retry;
    const isAuthRoute   = original.url?.includes('/auth/login') ||
                          original.url?.includes('/auth/refresh');

    if (!is401 || alreadyRetried || isAuthRoute) {
      return Promise.reject(error);
    }

    // If refresh already in progress, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(token => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }).catch(err => Promise.reject(err));
    }

    original._retry = true;
    isRefreshing    = true;

    const refreshToken = localStorage.getItem('safeg_refresh');

    if (!refreshToken) {
      // No refresh token — force logout
      isRefreshing = false;
      forceLogout();
      return Promise.reject(error);
    }

    try {
      const res = await axios.post(`${BASE_URL}/auth/refresh-token`, {
        refreshToken,
      });

      const newToken        = res.data?.data?.accessToken;
      const newRefreshToken = res.data?.data?.refreshToken;

      if (!newToken) throw new Error('No token in refresh response');

      // Save new tokens
      localStorage.setItem('safeg_token',   newToken);
      if (newRefreshToken) {
        localStorage.setItem('safeg_refresh', newRefreshToken);
      }

      // Update default header
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      original.headers.Authorization             = `Bearer ${newToken}`;

      processQueue(null, newToken);
      return api(original);

    } catch (refreshError) {
      processQueue(refreshError, null);
      forceLogout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ── Force logout on refresh failure ───────────────────────────
function forceLogout() {
  ['safeg_token','safeg_refresh','safeg_user','safeg_tenant','safeg_plan']
    .forEach(k => localStorage.removeItem(k));
  // Redirect to login — works even without React Router access
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

export default api;
