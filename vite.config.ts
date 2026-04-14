import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Production'da VITE_API_BASE env değişkeni Railway URL'ini içerir
// Geliştirmede proxy kullanılır (backend localhost:8000)
const BACKEND_URL = process.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Yahoo Finance proxy (eski sistem için)
      '/api/yahoo': {
        target: 'https://query2.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, '')
      },
      // FastAPI Backend
      '/api/backend': {
        target: BACKEND_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/backend/, '/api')
      }
    }
  },
  build: {
    // Production build optimizasyonları
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Büyük kütüphaneleri ayrı chunk'lara böl (daha hızlı yükleme)
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'chart-vendor': ['recharts'],
        }
      }
    }
  }
})

