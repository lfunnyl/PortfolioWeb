import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // .env dosyalarını yükle (VITE_ önekli olanları değil, Hepsini almak için '' boş string geçiyoruz)
  // Üçüncü parametre '' ise tüm değişkenleri yükler
  const env = loadEnv(mode, process.cwd(), '');
  
  // Production'da env değişkeni Railway URL'ini içerir, geliştirmede varsayılan kullanılır
  const BACKEND_URL = env.VITE_API_BASE || 'http://127.0.0.1:8000';

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'PortfolioWeb',
          short_name: 'Portföy',
          description: 'Kişisel Finans ve Portföy Takip Uygulaması',
          theme_color: '#0a1020',
          background_color: '#0d1525',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'pwa-512x512.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            },
            {
              src: 'pwa-512x512.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
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

