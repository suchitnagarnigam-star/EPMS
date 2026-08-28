import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Proxy API calls to local backend during development
      // Only used when VITE_API_URL is set to '' (empty) in .env.local
      '/kpis': 'http://localhost:8000',
      '/works': 'http://localhost:8000',
      '/contractors': 'http://localhost:8000',
      '/quality': 'http://localhost:8000',
      '/sync': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
})
