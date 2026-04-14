/**
 * API URL yardımcısı — geliştirme ve production ortamlarında doğru URL'i üretir.
 *
 * Geliştirme: Vite proxy /api/backend → localhost:8000/api (proxy üzerinden)
 * Production: VITE_API_BASE env değişkeni Railway URL'ini içerir, direkt istek atılır
 */

// Production'da Vercel env var'dan gelir, dev'de boş kalır (proxy kullanır)
const API_BASE = (import.meta as any).env.VITE_API_BASE;

/**
 * Backend endpoint URL'i oluşturur.
 * @param path - "/auth/login" gibi /api sonrası yol
 */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (API_BASE) {
    // Production: direkt Railway'e git (örn: https://...railway.app/api/auth/login)
    return `${API_BASE}/api${normalizedPath}`;
  }

  // Geliştirme: Vite proxy üzerinden git
  return `/api/backend${normalizedPath}`;
}
