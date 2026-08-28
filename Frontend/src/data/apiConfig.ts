/**
 * Central API configuration.
 * Reads from VITE_API_URL env variable, falls back to the Render deployment.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, '') ||
  'https://epms-m755.onrender.com';
