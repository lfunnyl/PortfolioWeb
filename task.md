# Firebase Geçiş — Görev Listesi

## Aşama 1: Firebase Kurulum
- [x] Projeyi analiz et ve plan hazırla
- [x] `firebase` npm paketi kur
- [x] `src/lib/firebase.ts` oluştur
- [x] `.env.example` güncelle

## Aşama 2: Authentication (Firebase Auth)
- [x] `src/context/AuthContext.tsx` → Firebase Auth ile yeniden yaz
- [x] `App.tsx` içindeki eski token-tabanlı email verify / reset routing'i kaldır

## Aşama 3: Cloud Sync (Firestore)
- [x] `src/hooks/useCloudSync.ts` → Firestore SDK ile yeniden yaz
- [x] `src/utils/api.ts` → functionUrl() ile Cloud Functions'a yönlendir

## Aşama 4: Firebase Cloud Functions
- [x] `functions/` klasörü oluştur (Node.js)
- [x] `functions/src/prices.ts` — Yahoo Finance2 ile fiyat servisleri
- [x] `functions/src/news.ts` — Haber + sentiment + NER + AI özeti
- [x] `functions/src/index.ts` — Ana giriş noktası
- [x] `functions/package.json` + `tsconfig.json`

## Aşama 5: Frontend Servis Güncellemeleri
- [x] `src/services/priceService.ts` → Cloud Functions URL'lerine yönlendir
- [x] `src/services/newsService.ts` → Cloud Functions URL'lerine yönlendir
- [x] `src/services/historicalPriceService.ts` → Cloud Functions URL'lerine yönlendir
- [x] `src/services/chartService.ts` → Cloud Functions URL'lerine yönlendir

## Aşama 6: Yapılandırma Dosyaları
- [x] `firebase.json` oluştur
- [x] `.firebaserc` oluştur
- [x] `firestore.rules` oluştur
- [x] `firestore.indexes.json` oluştur
- [x] `vite.config.ts` güncelle (Railway proxy kaldırıldı)
- [x] `DEPLOYMENT.md` güncelle

## Aşama 7: Doğrulama (Son Kalanlar)
- [x] TypeScript derleme → HATA YOK ✅
- [x] Firebase Console projesi oluşturuldu mu? (KULLANICI)
- [x] `.env` dolduruldu mu? (KULLANICI)
- [x] `functions/` klasöründe `npm install` çalıştırıldı mı? (KULLANICI)
- [x] `firebase deploy --only functions` yapıldı mı? (KULLANICI)
- [ ] `npm run dev` ile lokal test yapıldı mı? (Kayıt ol/Giriş yap/Fiyatları test et)
- [ ] `backend/` klasörünü projeden sil (artık tamamen gereksiz)
