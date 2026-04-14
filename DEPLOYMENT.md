# Deployment Kılavuzu (Türkçe)
# ===============================================

## Yerel Geliştirme

### Backend Başlatma
```bash
cd backend
pip install -r requirements.txt

# .env dosyasını oluştur (bir kereye mahsus)
cp .env.example .env
# .env dosyasını düzenle ve SECRET_KEY'i değiştir!

# Veritabanı migration'larını uygula
alembic upgrade head

# Sunucuyu başlat
python run.py
```

### Frontend Başlatma
```bash
npm install
npm run dev
```

---

## Production Deployment (Railway)

### 1. Railway'e Backend Deploy

1. https://railway.app adresine git, GitHub ile giriş yap
2. "New Project" → "Deploy from GitHub repo" → bu repo'yu seç
3. Root klasör = `/backend`
4. Environment Variables kısmına şunları ekle:

```
SECRET_KEY=<güçlü rastgele anahtar — python -c "import secrets; print(secrets.token_hex(32))">
DATABASE_URL=<Railway sana PostgreSQL URL verecek>
ENVIRONMENT=production
ALLOWED_ORIGINS=https://siteadresin.com
```

5. Railway otomatik PostgreSQL veritabanı eklemek için:
   "Add Plugin" → "PostgreSQL" → `DATABASE_URL` otomatik eklenir

6. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### 2. Vercel'e Frontend Deploy

1. https://vercel.com → "Import Project" → GitHub repo'yu seç
2. Root klasör = `/` (portfolioweb klasörü)
3. Build command: `npm run build`
4. Environment Variables:
   ```
   VITE_API_BASE=https://sening-railway-backend-url.railway.app
   ```

5. `vite.config.ts` içindeki proxy ayarını production URL'e yönlendir

---

## Versiyon Kontrol Kuralları

- `.env` asla git'e gönderilmez!
- `main` branch'e direkt push yasak
- Her özellik için `feature/ozellik-adi` branch'i aç
- PR açarak merge et

---

## Veritabanı Migration Komutları

```bash
# Yeni migration oluştur (model değişikliklerinden sonra)
alembic revision --autogenerate -m "Açıklama"

# Güncel sürüme yükselt
alembic upgrade head

# Bir önceki sürüme geri al
alembic downgrade -1

# Tüm migration geçmişini gör
alembic history
```
