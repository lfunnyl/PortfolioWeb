<div align="center">

# 📈 PortfolioWeb

### Tüm Yatırımlarınız. Tek Ekran. Yapay Zeka Destekli.

**Hisse, kripto, döviz, mevduat ve pasif gelirlerinizi tek bir uygulamada yönetin.**  
Makine öğrenmesi algoritmaları, gerçek zamanlı fiyat akışları ve akıllı analizlerle portföyünüzün kontrolünü elinize alın.

[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20iOS%20%7C%20Android-blueviolet?style=for-the-badge)]()
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)]()
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-61DAFB?style=for-the-badge&logo=react)]()
[![Status](https://img.shields.io/badge/Status-Beta%20%E2%80%94%20Aktif%20Geliştirme-orange?style=for-the-badge)]()
[![Live Demo](https://img.shields.io/badge/🌐%20Canlı%20Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://portfolio-web-sooty-kappa.vercel.app/)

### 🌐 [portfolio-web-sooty-kappa.vercel.app](https://portfolio-web-sooty-kappa.vercel.app/)

</div>

---

## 🎯 Uygulama Hakkında

PortfolioWeb; Türkiye'deki yatırımcılar için tasarlanmış, **yapay zeka ve veri bilimi** destekli bir **kişisel fintech uygulamasıdır**. Amaç basit: tüm varlıklarınız (hisse, kripto, kira geliri, mevduat, cüzdanlar) tek bir yerden, canlı olarak takip edilsin; sistem sizi destekleyen akıllı analizler sunsun.

> ⚠️ **Yatırım tavsiyesi değildir.** Algoritmalar istatistiksel olasılıkları yansıtır, kesinlik bildirmez.

---

## 🌟 Ne Yapabilirsiniz?

### 💼 Varlık Yönetimi
| Özellik | Durum |
|---|---|
| BIST & Global Hisse Takibi | ✅ Aktif |
| Kripto Para Portföyü | ✅ Aktif |
| Döviz & Yatırım Fonu Takibi | ✅ Aktif |
| Opsiyon İzleme (Pro) | ✅ Aktif |
| Cüzdan & Broker Entegrasyonu (Binance, EVM) | ✅ Aktif |

### 💸 Pasif Gelir Takibi
| Özellik | Durum |
|---|---|
| Kira Geliri Kaydı | ✅ Aktif |
| Mevduat Faizi Takibi | ✅ Aktif |
| Otomatik Temettü & Staking | ✅ Aktif |
| DRIP Bileşik Getiri Simülatörü | ✅ Aktif |

### 🤖 Yapay Zeka & Analiz
| Özellik | Durum |
|---|---|
| ML Fiyat Tahminleri (SES + Drift) | ✅ Aktif |
| Monte Carlo Senaryoları (10.000 simülasyon) | ✅ Aktif |
| RSI & MACD Algoritmik Sinyaller | ✅ Aktif |
| Haber NER — Dolaylı Risk Bildirimi | ✅ Aktif |
| Akıllı Vergi Hasadı (Tax-Loss Harvesting) | ✅ Aktif |
| Enflasyondan Arındırılmış Reel Getiri | ✅ Aktif |
| Hedef Takip & Progress Bar | ✅ Aktif |
| Portföy Korelasyon Matrisi (Heatmap) | 🔜 Geliştiriliyor |
| FinBERT Duygu Analizi | 🔜 Geliştiriliyor |
| LLM Destekli Haber Özeti (Gemini / RAG) | 🔜 Geliştiriliyor |
| Nedensel Çıkarım (Causal Inference) | 🔜 Geliştiriliyor |
| Davranışsal Profil Analizi (Behavioral ML) | 🔜 Geliştiriliyor |

### 📱 Platform & Altyapı
| Özellik | Durum |
|---|---|
| Web Uygulaması (PWA) | ✅ Aktif |
| Bulut Senkronizasyonu (Çok Cihazlı) | ✅ Aktif |
| JWT Kimlik Doğrulama & Kayıt | ✅ Aktif |
| AES-256 Şifrelemeli API Anahtar Saklama | ✅ Aktif |
| Cloudflare Turnstile Anti-Spam | ✅ Aktif |
| iOS Uygulaması (App Store) | 🔜 Planlanıyor |
| Android Uygulaması (Google Play) | 🔜 Planlanıyor |

---

## 💡 Öne Çıkan Özellik: "Tek Ekran" Vizyonu

> *İnsanların tüm varlıklarını en kolay şekilde tek bir yerden görebilmesi.*

Çoğu yatırımcı; biri bankada, biri borsada, biri kriptoda, biri kirada olmak üzere parçalı bir tablo görür. PortfolioWeb, bu parçaları **tek bir net değer (Net Worth)** ekranında birleştirerek gerçek finansal durumunuzu anında görmenizi sağlar.

---

## 🏗️ Teknik Mimari

```
┌─────────────────────────────────────────────────────┐
│                    KULLANICI                        │
│         Web / PWA / iOS / Android                   │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────┐
│              React 18 + TypeScript                  │
│         (Vite, Recharts, PWA, Capacitor)            │
└──────────────────────┬──────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────┐
│           FastAPI (Python 3.10+)                    │
│   Auth │ Prices │ Portfolio │ ML │ News │ Wallets   │
└───────┬──────────────────────────────┬──────────────┘
        │                              │
┌───────▼──────────┐        ┌──────────▼──────────────┐
│  PostgreSQL DB   │        │  Dış Servisler           │
│  (Production)    │        │  yfinance, Binance API   │
│  SQLite (Dev)    │        │  Etherscan RPC, ML Models│
└──────────────────┘        └─────────────────────────┘
```

---

## 🔐 Güvenlik Mimarisi

- **JWT** ile oturum yönetimi (Access + Refresh Token)
- **Bcrypt** ile şifre hashleme
- **AES-256 (Fernet)** ile API anahtarı şifreleme
- **Cloudflare Turnstile** ile bot koruması
- **CORS** kısıtlaması (sadece izin verilen domainler)
- **Rate Limiting** (IP başına dakikada 60 istek)
- Tüm hassas veri `.env` içinde, asla kaynak kodda değil

---

## 💰 Abonelik Planları *(Planlanıyor)*

| Özellik | Ücretsiz | Premium |
|---|:---:|:---:|
| Varlık Sayısı | 10'a kadar | Sınırsız |
| Bulut Senkronizasyonu | ✅ | ✅ |
| Temel Fiyat Takibi | ✅ | ✅ |
| ML Tahminleri & Sinyaller | ❌ | ✅ |
| Cüzdan & Broker Entegrasyonu | ❌ | ✅ |
| Pasif Gelir Modülü | ❌ | ✅ |
| Vergi Hasadı Algoritması | ❌ | ✅ |
| Aylık Fiyat | Ücretsiz | Yakında açıklanacak |

---

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Frontend | React 18, TypeScript, Vite, Recharts |
| Mobil | Capacitor (iOS & Android) |
| Backend | FastAPI, Python 3.10+ |
| Veritabanı | PostgreSQL (prod) / SQLite (dev) |
| ORM & Migration | SQLAlchemy, Alembic |
| ML & Analiz | yfinance, Scikit-learn, Prophet |
| Kimlik Doğrulama | JWT, Bcrypt, Fernet |
| Deploy | Vercel (frontend) + Railway (backend) |
| CI/CD | GitHub Actions |

---

## 🚀 Geliştirici Kurulumu

<details>
<summary><b>Yerel ortamda çalıştırmak için tıklayın</b></summary>

### Gereksinimler
- Node.js v18+
- Python 3.10+

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # .env içindeki SECRET_KEY'i güncelleyin
alembic upgrade head        # Veritabanı tablolarını oluştur
python run.py               # http://localhost:8000
```

### Frontend
```bash
npm install
npm run dev                 # http://localhost:5173
```

> Detaylı production deployment için → **[DEPLOYMENT.md](./DEPLOYMENT.md)**

</details>

---

## 📊 Performans Hedefleri (Production KPI)

| Metrik | Hedef |
|---|---|
| API Yanıt Süresi (P95) | < 200ms |
| Uptime | %99.9 |
| Eş Zamanlı Kullanıcı | 1.000+ |
| Mobil Lighthouse Skoru | > 85 |
| Güvenlik Açığı | 0 kritik |

---

## 🗺️ Yol Haritası

Ürünün tüm fazlarını ve önceliklendirmeyi görmek için → **[ROADMAP.md](./ROADMAP.md)**

---

<div align="center">

**© 2026 PortfolioWeb — Tüm Hakları Saklıdır**

*Bu uygulama yatırım tavsiyesi sunmaz. Geçmiş veriler gelecekteki performansı garanti etmez.*

</div>
