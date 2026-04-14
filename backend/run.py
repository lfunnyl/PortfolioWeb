import sys
import os
import uvicorn

# Bulundulan dizini (backend) zorla Python arama yollarına (Path) ekler.
# Bu sayede Windows üzerindeki "No module named routers", "No module named database" gibi Path sorunları çözülür.
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

if __name__ == "__main__":
    print("Backend sunucusu başlatılıyor...")
    print(f"Python Yolu (Path) şuraya ayarlandı: {current_dir}")
    
    # uygulamanın main.py içindeki "app" objesi kullanılarak başlatılması
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
