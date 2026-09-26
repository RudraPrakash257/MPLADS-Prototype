import axios from 'axios';

// Prefer explicit env; in Vite dev, empty baseURL uses the /api proxy.
// Fallback to direct backend URL if proxy is unavailable.
const defaultBase =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://127.0.0.1:8000';

export const apiClient = axios.create({
  baseURL: defaultBase,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});
