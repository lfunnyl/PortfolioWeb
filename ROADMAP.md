# 🗺️ PortfolioWeb — Ürün Yol Haritası
> Son Güncelleme: 2026-04-14  
> Hedef: Çok kullanıcılı, Android & iOS'ta yayınlanabilir, ticari bir fintech platformu

---

## ✅ TAMAMLANDI

- [x] React/Vite frontend kurulumu
- [x] FastAPI backend altyapısı (routers, services, models)
- [x] JWT tabanlı kullanıcı kaydı ve girişi (Auth)
- [x] SQLite ile kalıcı veri saklama
- [x] Portföy bulut senkronizasyonu (Buluta Yaz / Buluttan Çek)
- [x] Backend tabanlı fiyat servisi (yfinance + SQLite cache)
- [x] Backend tabanlı haber servisi (yfinance + 1 saatlik cache)
- [x] Opsiyon takibi (Pro sekmesi, cloud sync)
- [x] Cüzdan & Broker bağlantı altyapısı (Binance API, EVM cüzdan)
- [x] API key'ler için AES-256 (Fernet) şifrelemesi

---

## 🔴 FAZ 1 — Production-Ready Altyapı (ÖNCELİKLİ)

### 1.1 SECRET_KEY Güvenliği
- [ ] `.env` dosyasına güçlü, rastgele bir `SECRET_KEY` oluştur
- [ ] `.env.example` dosyası hazırla (gerçek değerler olmadan)
- [ ] `.gitignore`'a `.env` ekle

### 1.2 SQLite → PostgreSQL Migrasyonu
- [ ] `alembic` ile migration sistemi kur
- [ ] `DATABASE_URL` ayarını PostgreSQL destekli hale getir
- [ ] Lokal geliştirme: SQLite, Production: PostgreSQL çalışsın
- [ ] Tüm model ilişkilerini PostgreSQL uyumlu test et

### 1.3 API Güvenliği
- [ ] `slowapi` ile rate limiting (IP başına dakikada 60 istek)
- [ ] CORS ayarını `"*"` yerine production domain'e sabitle
- [ ] Input validation (Pydantic strict mode)
- [ ] SQL injection ve XSS koruması audit'i

### 1.4 E-posta Doğrulama & Şifre Sıfırlama
- [ ] Kayıt sonrası e-posta doğrulama linki (SMTP / SendGrid)
- [ ] "Şifremi unuttum" → e-posta ile sıfırlama akışı
- [ ] Frontend modal'ları (verify email, reset password)

---

## 🟡 FAZ 2 — Canlı Sunucu Deployment

### 2.1 Backend Deployment (Railway / Render)
- [ ] `Dockerfile` veya `railway.json` hazırla
- [ ] Production environment variables yönetimi
- [ ] PostgreSQL hosted instance bağlantısı (Railway DB / Supabase)
- [ ] Health check endpoint test

### 2.2 Frontend Deployment (Vercel / Netlify)
- [ ] `vite.config.ts`'de API proxy'yi production URL'e yönlendir
- [ ] Build optimizasyonu (`npm run build`)
- [ ] Custom domain bağlantısı

### 2.3 CI/CD Pipeline
- [ ] GitHub Actions ile otomatik test + deploy
- [ ] Branch koruması (main branch'e direkt push engeli)

---

## 🟠 FAZ 3 — Mobil Hazırlık

### 3.1 Responsive UI İyileştirmesi
- [ ] Tüm tablet ve telefon ekranlarında layout kontrolü
- [ ] Touch-friendly buton ve input boyutları (min 44px)
- [ ] Mobil navbar (hamburger menü veya bottom tab bar)
- [ ] Tablo görünümleri için yatay kaydırma veya kart görünümü

### 3.2 Capacitor Kurulumu
- [ ] `npm install @capacitor/core @capacitor/cli`
- [ ] Android Studio kurulumu ve `npx cap add android`
- [ ] Xcode kurulumu ve `npx cap add ios`
- [ ] Native plugin'ler: Biometric auth, push notifications, secure storage

### 3.3 Uygulama Mağazası Hazırlığı
- [ ] Uygulama ikonu ve splash screen tasarımı
- [ ] Gizlilik politikası sayfası (KVKK / GDPR uyumlu)
- [ ] Kullanım koşulları sayfası
- [ ] Google Play Store başvurusu ve APK yükleme
- [ ] Apple App Store başvurusu ve IPA yükleme

---

## 🟢 FAZ 4 — Monetizasyon & Büyüme

### 4.1 Abonelik Sistemi
- [ ] Ücretsiz Plan: Maks 10 varlık, temel analiz
- [ ] Premium Plan: Sınırsız varlık, Pro analiz, Cüzdan sync
- [ ] Stripe veya iyzico entegrasyonu
- [ ] Plan yönetimi backend'e eklenmeli (user.plan field)

### 4.2 İleri Veri Bilimi Modülleri
- [ ] Portföy Korelasyon Matrisi (Pearson Heat-map)
- [ ] FinBERT Duygu Analizi (haber → pozitif/negatif)
- [ ] LLM Destekli "Günün Özeti" (Gemini / OpenAI RAG)
- [ ] Monte Carlo Simülasyonu (10.000 senaryo)
- [ ] Kausal Çıkarım (FED faiz → portföy etkisi)

### 4.3 Otomasyon
- [ ] Binance python-binance ile tam imzalı API entegrasyonu
- [ ] Solana cüzdan bakiye okuma
- [ ] Temettü otomatik tespit ve kayıt
- [ ] Günlük snapshot otomatik alma (cron job)

---

## 📊 Teknik Hedefler (Production KPI)

| Metrik | Hedef |
|--------|-------|
| API Yanıt Süresi (P95) | < 200ms |
| Uptime | %99.9 |
| Eş Zamanlı Kullanıcı | 1.000+ |
| Mobil Lighthouse Skoru | > 85 |
| Güvenlik Açığı | 0 kritik |
