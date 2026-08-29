import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const TOKEN_KEY = 'taskflow_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiError(e) {
  const d = e?.response?.data?.detail;
  if (!d) return e?.message || 'Something went wrong.';
  if (typeof d === 'string') return d;
  if (Array.isArray(d)) return d.map((x) => x?.msg || JSON.stringify(x)).join(' ');
  return JSON.stringify(d);
}

export function getWsUrl() {
  const backend = BACKEND_URL || '';
  const wsBase = backend.replace(/^http/, 'ws');
  const token = getToken();
  return `${wsBase}/api/ws?token=${encodeURIComponent(token || '')}`;
}
