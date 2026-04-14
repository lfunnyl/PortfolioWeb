import requests
from typing import List, Dict, Any
from core.encryption import decrypt_value
import models

class WalletService:
    @staticmethod
    def get_binance_balances(api_key_enc: str, api_secret_enc: str) -> List[Dict[str, Any]]:
        """
        Fetches spot balances from Binance.
        """
        api_key = decrypt_value(api_key_enc)
        api_secret = decrypt_value(api_secret_enc)
        
        if not api_key or not api_secret: return []
        
        # Real implementation would use hmac signing. 
        # For now, let's provide the structure and a placeholder.
        # senior-level: we should use the official binance library or signed requests.
        try:
            # Placeholder for signed request logic
            # binance_client = Client(api_key, api_secret)
            # return binance_client.get_account()['balances']
            return [] 
        except Exception as e:
            print(f"Binance fetch error: {e}")
            return []

    @staticmethod
    def get_evm_balances(address: str) -> List[Dict[str, Any]]:
        """
        Fetches ETH balance using a public RPC.
        """
        if not address: return []
        try:
            # We can use public RPCs like Cloudflare or Ankr
            url = "https://cloudflare-eth.com"
            payload = {
                "jsonrpc": "2.0",
                "method": "eth_getBalance",
                "params": [address, "latest"],
                "id": 1
            }
            res = requests.post(url, json=payload, timeout=10)
            if res.ok:
                data = res.json()
                wei = int(data['result'], 16)
                eth = wei / 10**18
                return [{"asset": "ETH", "free": eth}]
        except Exception as e:
            print(f"EVM fetch error: {e}")
        return []

    @staticmethod
    def sync_connector(connector: models.BrokerConnector) -> List[Dict[str, Any]]:
        if connector.provider == 'binance':
            return WalletService.get_binance_balances(connector.api_key, connector.api_secret)
        elif connector.provider in ['metamask', 'ethereum', 'etherscan']:
            return WalletService.get_evm_balances(connector.wallet_address)
        return []
