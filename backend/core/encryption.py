from cryptography.fernet import Fernet
import base64
from core.config import settings
import hashlib

# Derive a fixed 32-byte key from our SECRET_KEY for Fernet
def get_encryption_key():
    # Use SHA256 to derive a fixed length key from whatever SECRET_KEY is
    hasher = hashlib.sha256()
    hasher.update(settings.SECRET_KEY.encode())
    return base64.urlsafe_b64encode(hasher.digest())

fernet = Fernet(get_encryption_key())

def encrypt_value(value: str) -> str:
    if not value: return ""
    return fernet.encrypt(value.encode()).decode()

def decrypt_value(encrypted_value: str) -> str:
    if not encrypted_value: return ""
    try:
        return fernet.decrypt(encrypted_value.encode()).decode()
    except Exception:
        return "[Decryption Error]"
