/**
 * Central API configuration.
 * Reads from VITE_API_URL env variable, falls back to local backend in DEV or Render deployment in PROD.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, '') ||
  (import.meta.env.DEV ? 'http://localhost:8000' : 'https://epms-m755.onrender.com');
