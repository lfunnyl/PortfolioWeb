import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // .env dosyalarını yükle (VITE_ önekli olanları değil, Hepsini almak için '' boş string geçiyoruz)
  // Üçüncü parametre '' ise tüm değişkenleri yükler
  const env = loadEnv(mode, process.cwd(), '');
  
  // Production'da env değişkeni Railway URL'ini içerir, geliştirmede varsayılan kullanılır
  const BACKEND_URL = env.VITE_API_BASE || 'http://127.0.0.1:8000';

  return {
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
  }
})

