/**
 * API URL yardımcısı — Cloud Functions endpoint'lerine yönlendirir.
 *
 * Geliştirme: Firebase local emulator (http://localhost:5001/...)
 * Production: Cloud Functions URL (https://europe-west1-PROJECT.cloudfunctions.net/...)
 */

const FUNCTIONS_BASE = (import.meta as any).env.VITE_FUNCTIONS_BASE as string | undefined;

// Emulator base URL (firebase emulators:start çalışırken)
const EMULATOR_BASE = 'http://localhost:5001';

/**
 * Cloud Function URL'i oluşturur.
 * @param functionName - Fonksiyon adı (örn: 'pricesBulk', 'newsGet')
 */
export function functionUrl(functionName: string): string {
  if (FUNCTIONS_BASE) {
    // Production: Cloud Functions URL
    return `${FUNCTIONS_BASE}/${functionName}`;
  }
  // Geliştirme: Firebase emulator
  // Emulator URL formatı: http://localhost:5001/PROJECT_ID/REGION/FUNCTION_NAME
  const projectId = (import.meta as any).env.VITE_FIREBASE_PROJECT_ID ?? 'demo-project';
  return `${EMULATOR_BASE}/${projectId}/europe-west1/${functionName}`;
}

/**
 * @deprecated Railway backend kaldırıldı. Lütfen functionUrl() kullanın.
 */
export function apiUrl(_path: string): string {
  console.warn('[apiUrl] Deprecated: Bu fonksiyon artık kullanılmamalıdır. functionUrl() kullanın.');
  return '';
}
