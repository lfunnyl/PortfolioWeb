# 📈 PortfolioWeb

**PortfolioWeb**, yatırımlarınızı tek bir noktadan yönetmenizi, makine öğrenmesi ve veri bilimi algoritmalarıyla geleceğe dönük analizler yapmanızı sağlayan kapsamlı ve profesyonel bir portföy yönetim platformudur. Geleneksel varlıklardan kripto paralara, opsiyonlardan pasif gelir akışlarına kadar geniş bir yelpazede yatırım takibi sunar.

> 🚧 **Not:** Bu proje şu anda aktif geliştirme aşamasındadır. Temel özellikler tamamlanmış olup, ileri düzey veri bilimi (Data Science) modülleri ve mobil entegrasyonlar üzerinde çalışmalar devam etmektedir.

---

## ✨ Öne Çıkan Özellikler

### 📊 Mevcut Özellikler (Aktif)
- **Çoklu Varlık Takibi:** Hisse senetleri (BIST ve Global), kripto paralar, yatırım fonları ve döviz takibi.
- **Bulut Senkronizasyonu (Cloud Sync):** JWT tabanlı kimlik doğrulama ile cihazlar arası kesintisiz veri aktarımı. Verileriniz güvende ve her an yanınızda.
- **Pasif Gelir Modülü:** Kira gelirleri, banka mevduat faizleri, staking ve temettü ödemelerini otomatik takip eden sistem.
- **Cüzdan ve Broker Entegrasyonu:** EVM uyumlu kripto cüzdanları (Metamask vs.) ve borsa entegrasyon altyapısı (Binance API).
- **Gelişmiş Makine Öğrenmesi Tahminleri:** Zaman serisi analizi (Time Series Forecasting) ile hisse/kripto fiyatları için gelecek tahminleri ve güven aralıkları (Monte Carlo Simülasyonları).
- **Algoritmik Sinyaller & Teknik Analiz:** RSI, MACD göstergeleri ile otomatik Al/Sat sinyalleri üretimi.
- **Yapay Zeka Destekli Haber Analizi (NER):** Varlık Çıkarımı (Named Entity Recognition) ile haberlerin hisseler üzerindeki dolaylı etkilerini tespit eden akıllı sistem.
- **Canlı Fiyat ve Haber Servisi:** Python tabanlı arka planda (yfinance üzerinden) çalışan, performans için önbelleklenmiş (cache) fiyat ve haber motoru.
- **Güçlü Şifreleme:** API anahtarları gibi hassas veriler için AES-256 (Fernet) şifrelemesi.

### 🚀 Gelecek Özellikler (Yol Haritası)
- **Akıllı Vergi Hasadı (Tax-Loss Harvesting):** Yıl sonu vergi optimizasyonu için otomatik zarar realizasyonu önerileri.
- **Enflasyondan Arındırılmış Reel Getiri:** TÜİK/ENAG verileri ile portföyün enflasyon karşısındaki gerçek durumunun hesaplanması.
- **Portföy Korelasyon Matrisi:** Varlıkların birbirleriyle etkileşimini (Pearson Korelasyonu) gösteren risk ısı haritaları.
- **Duygu Analizi (FinBERT):** Haber ve sosyal medya akışlarını analiz ederek hisse senedi üzerinde "Pozitif/Negatif" duygu skoru çıkartma.
- **Nedensel Çıkarım (Causal Inference):** "Kazancınızın %80'i kur artışından kaynaklı" gibi derin matematiksel analizler.
- **Davranışsal Analiz (Behavioral ML):** Yatırımcının FOMO ve panik satışı gibi psikolojik profilini analiz eden makine öğrenmesi modelleri.
- **Mobil Uygulama (PWA & Capacitor):** iOS ve Android için tam uyumlu, bildirim destekli yerel (native) deneyim.

---

## 🛠️ Teknoloji Yığını (Tech Stack)

**Frontend (Kullanıcı Arayüzü):**
- React 18 & TypeScript
- Vite (Hızlı build ve HMR)
- Recharts (Gelişmiş finansal grafikler)
- PWA (Progressive Web App) Desteği

**Backend (Sunucu & Veri Bilimi):**
- Python 3.10+
- FastAPI (Yüksek performanslı asenkron API)
- SQLAlchemy & Alembic (ORM ve Veritabanı Migrasyonları)
- SQLite (Geliştirme) / PostgreSQL (Canlı Ortam)
- yfinance & Özel API entegrasyonları

**Güvenlik & Doğrulama:**
- JWT (JSON Web Tokens)
- Cloudflare Turnstile (Anti-bot koruması)
- Bcrypt (Şifre hashleme) ve Fernet (Veri şifreleme)

---

## 🏗️ Proje Yapısı

```bash
PortfolioWeb/
├── backend/                # FastAPI Sunucu ve Veri Bilimi Modülleri
│   ├── main.py             # Uygulama giriş noktası
│   ├── routers/            # API uç noktaları (auth, prices, portfolio vs.)
│   ├── services/           # İş mantığı, ML modelleri ve veri çekme servisleri
│   ├── models/             # Veritabanı tabloları (SQLAlchemy)
│   └── requirements.txt    # Python bağımlılıkları
├── src/                    # React Frontend Kaynak Kodları
│   ├── components/         # Yeniden kullanılabilir UI bileşenleri
│   ├── pages/              # Ana uygulama sayfaları (Dashboard, Ayarlar vb.)
│   ├── services/           # Frontend API çağrıları
│   ├── store/              # State yönetimi
│   └── index.css           # Tasarım sistemi ve global stiller
├── public/                 # Statik dosyalar (İkonlar, PWA manifest)
├── ROADMAP.md              # Detaylı ürün yol haritası
├── DEPLOYMENT.md           # Sunucu kurulum rehberi
└── cozulecekler.txt        # Geliştirme notları ve çözülecek sorunlar
```

---

## 💻 Kurulum ve Çalıştırma (Yerel Geliştirme)

Projeyi kendi bilgisayarınızda çalıştırmak için aşağıdaki adımları izleyin.

### 1. Gereksinimler
- Node.js (v18+)
- Python (v3.10+)
- Git

### 2. Backend Kurulumu

```bash
# Backend klasörüne geçin
cd backend

# Python bağımlılıklarını yükleyin
pip install -r requirements.txt

# Çevre değişkenleri dosyasını oluşturun
cp .env.example .env
# Not: .env dosyasındaki SECRET_KEY ve diğer ayarları kendi ortamınıza göre güncelleyin.

# Veritabanı tablolarını oluşturun (Migration)
alembic upgrade head

# FastAPI sunucusunu başlatın
python run.py
# Sunucu varsayılan olarak http://localhost:8000 adresinde çalışacaktır.
```

### 3. Frontend Kurulumu

Yeni bir terminal açın ve proje ana dizininde şu komutları çalıştırın:

```bash
# Node paketlerini yükleyin
npm install

# Geliştirme sunucusunu başlatın
npm run dev
# Frontend varsayılan olarak http://localhost:5173 adresinde çalışacaktır.
```

---

## 🌐 Canlı Ortam Kurulumu (Deployment)

Projenin üretim (production) ortamına aktarılması için `DEPLOYMENT.md` dosyasında detaylı talimatlar bulunmaktadır. Özetle:

- **Backend:** Railway veya Render üzerinden Docker veya doğrudan GitHub entegrasyonu ile (PostgreSQL kullanarak) yayınlanır.
- **Frontend:** Vercel veya Netlify üzerine `npm run build` komutu ile deploy edilir. VITE_API_BASE çevre değişkeni backend URL'sine ayarlanmalıdır.

---

## 📜 Lisans ve Kullanım Şartları

Bu proje kişisel/ticari yatırım takibi vizyonu ile geliştirilmektedir. Bütün hakları saklıdır.

*Yatırım tavsiyesi değildir. Sistem içindeki öngörü algoritmaları istatistiksel olasılıkları yansıtır, kesinlik bildirmez.*
