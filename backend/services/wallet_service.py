import requests
import hmac
import hashlib
import time
from typing import List, Dict, Any
from core.encryption import decrypt_value
import models

BINANCE_BASE_URL = "https://api.binance.com"


class WalletService:

    # ──────────────────────────────────────────────────────────────────────────
    # Binance Spot Balance (HMAC-SHA256 İmzalı)
    # ──────────────────────────────────────────────────────────────────────────
    @staticmethod
    def _binance_sign(secret: str, query_string: str) -> str:
        """Binance API için HMAC-SHA256 imza üretir."""
        return hmac.new(
            secret.encode("utf-8"),
            query_string.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    @staticmethod
    def get_binance_balances(api_key_enc: str, api_secret_enc: str) -> List[Dict[str, Any]]:
        """
        Binance Spot hesabındaki sıfır olmayan bakiyeleri çeker.
        - Yalnızca 'salt okuma' (read-only) yetkili API anahtarı gerektirir.
        - İmzalama: HMAC-SHA256 (Binance v3 standartları).
        """
        if not api_key_enc or not api_secret_enc:
            return []

        api_key = decrypt_value(api_key_enc)
        api_secret = decrypt_value(api_secret_enc)

        if not api_key or not api_secret:
            return []

        try:
            timestamp = int(time.time() * 1000)
            query_string = f"timestamp={timestamp}"
            signature = WalletService._binance_sign(api_secret, query_string)

            url = f"{BINANCE_BASE_URL}/api/v3/account"
            headers = {"X-MBX-APIKEY": api_key}
            params = {"timestamp": timestamp, "signature": signature}

            res = requests.get(url, headers=headers, params=params, timeout=10)

            if res.status_code == 200:
                data = res.json()
                # Sıfırdan büyük bakiyeleri döndür
                balances = [
                    b for b in data.get("balances", [])
                    if float(b.get("free", 0)) + float(b.get("locked", 0)) > 0
                ]
                return balances

            elif res.status_code == 401:
                print(f"Binance API: Geçersiz API anahtarı. ({res.text})")
            else:
                print(f"Binance API hatası [{res.status_code}]: {res.text}")

        except requests.exceptions.Timeout:
            print("Binance API: İstek zaman aşımına uğradı.")
        except Exception as e:
            print(f"Binance fetch error: {e}")

        return []

    # ──────────────────────────────────────────────────────────────────────────
    # EVM (Ethereum / MetaMask) Bakiye
    # ──────────────────────────────────────────────────────────────────────────
    @staticmethod
    def get_evm_balances(address: str) -> List[Dict[str, Any]]:
        """
        Cloudflare ETH RPC ile bir EVM cüzdanının ETH bakiyesini çeker.
        Private key gerektirmez — sadece açık adres (public address).
        """
        if not address:
            return []
        try:
            url = "https://cloudflare-eth.com"
            payload = {
                "jsonrpc": "2.0",
                "method": "eth_getBalance",
                "params": [address, "latest"],
                "id": 1,
            }
            res = requests.post(url, json=payload, timeout=10)
            if res.ok:
                data = res.json()
                result = data.get("result")
                if result:
                    wei = int(result, 16)
                    eth = wei / 10**18
                    return [{"asset": "ETH", "free": eth, "locked": 0}]
        except Exception as e:
            print(f"EVM fetch error: {e}")
        return []

    # ──────────────────────────────────────────────────────────────────────────
    # Yönlendirici — hangi provider → hangi metod
    # ──────────────────────────────────────────────────────────────────────────
    @staticmethod
    def sync_connector(connector: models.BrokerConnector) -> List[Dict[str, Any]]:
        """
        Aktif bir connector'ı tetikleyerek bakiyeleri döndürür.
        Dönen her dict: {"asset": str, "free": float, "locked": float}
        """
        if connector.provider == "binance":
            return WalletService.get_binance_balances(
                connector.api_key, connector.api_secret
            )
        elif connector.provider in ["metamask", "ethereum", "etherscan"]:
            return WalletService.get_evm_balances(connector.wallet_address)
        return []
