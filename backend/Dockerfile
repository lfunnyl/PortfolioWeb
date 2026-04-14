# PortfolioWeb Backend — Dockerfile
# ─────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Bağımlılıkları yükle (önce cache'leme için ayrı katman)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Uygulama kodunu kopyala
COPY . .

# PORT ortam değişkeni Railway tarafından otomatik atanır
ENV PORT=8000

# Sunucuyu başlat
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]
