import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const DJANGO = 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Même origine pour le frontend et l'API : cookies de session et CSRF sans CORS
    proxy: {
      '/api': DJANGO,
      '/admin': DJANGO,
      '/static': DJANGO,
    },
  },
})
