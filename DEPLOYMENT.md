# Firebase Deployment Kılavuzu
# ===============================================

## Yerel Geliştirme

### Ön Koşullar
```bash
# Firebase CLI kurulu olmalı (bir kereye mahsus)
npm install -g firebase-tools

# Firebase hesabına giriş yap
firebase login
```

### 1. Firebase Projesi Oluştur (bir kereye mahsus)
1. [console.firebase.google.com](https://console.firebase.google.com) → "Add project"
2. **Authentication** → "Get started" → Email/Password provider'ı aktif et
3. **Firestore** → "Create database" → "Start in production mode" → region: **europe-west1**
4. **Project Settings** → "Your apps" → Web app ekle → Config bilgilerini kopyala

### 2. .env Dosyasını Oluştur
```bash
cp .env.example .env
# .env dosyasını aç ve Firebase config bilgilerini doldur
```

### 3. Cloud Functions Bağımlılıklarını Kur
```bash
cd functions
npm install
```

### 4. Frontend'i Başlat
```bash
# Proje kök dizininde
npm run dev
```

### 5. (İsteğe Bağlı) Firebase Emulator ile Lokal Test
```bash
# functions klasöründe build
cd functions && npm run build

# Kök dizinde emulator başlat
firebase emulators:start --only functions,firestore,auth
```

---

## Production Deployment

### 1. Firebase Projesini Yapılandır
```bash
# .firebaserc dosyasını güncelle
firebase use YOUR_PROJECT_ID
```

### 2. Cloud Functions'ı Deploy Et
```bash
# Functions bağımlılıklarını kur ve derle
cd functions
npm install
npm run build
cd ..

# Sadece Functions deploy et
firebase deploy --only functions
```

Functions deploy sonrası URL şu formatta olur:
```
https://europe-west1-YOUR_PROJECT_ID.cloudfunctions.net/pricesBulk
```

### 3. Firestore Kurallarını Deploy Et
```bash
firebase deploy --only firestore:rules
```

### 4. Frontend'i Build Et ve Deploy Et
```bash
# .env dosyasında VITE_FUNCTIONS_BASE'i ayarla:
# VITE_FUNCTIONS_BASE=https://europe-west1-YOUR_PROJECT_ID.cloudfunctions.net

npm run build
firebase deploy --only hosting
```

### 5. Hepsini Aynı Anda Deploy Et
```bash
firebase deploy
```

---

## Firestore Güvenlik Kuralları

`firestore.rules` dosyasında tanımlı. Kullanıcılar sadece kendi `/users/{uid}/data/portfolio` dökümanlarına erişebilir.

---

## Cloud Functions Ortam Değişkenleri

Gemini AI özeti için GEMINI_API_KEY gereklidir:
```bash
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY"

# Ya da Firebase Console → Functions → Secrets kullan
```

---

## Versiyon Kontrol Kuralları

- `.env` asla git'e gönderilmez!
- `functions/lib/` (derleme çıktıları) git'e gönderilmez
- `main` branch'e direkt push yasak
- Her özellik için `feature/ozellik-adi` branch'i aç
- PR açarak merge et
