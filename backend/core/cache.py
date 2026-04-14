import time

class SingletonMemCache:
    """
    Redis'e geçene kadar basit süreli bellek cache.
    Haber istekleri, finansal fiyat tekrarlarını önlemek için ideal.
    """
    def __init__(self):
        self.store = {}

    def get(self, key: str):
        if key in self.store:
            val, expiry = self.store[key]
            if expiry is None or expiry > time.time():
                return val
            del self.store[key]
        return None

    def set(self, key: str, value, ttl_seconds: int = 3600):
        expiry = time.time() + ttl_seconds if ttl_seconds else None
        self.store[key] = (value, expiry)

# Global tekil instance (Singleton)
cache = SingletonMemCache()
