import asyncio
import time
import uuid
import logging
import random
from typing import Dict, Any, Optional
import httpx
from app.config import settings

logger = logging.getLogger("mandate.paypal")


class PayPalClient:
    """
    PayPal REST API v2 Client for Sandbox Orders, Authorizations, Captures, and Voids.
    Includes token caching with refresh, idempotency headers, exponential retry backoff,
    and fallback sandbox simulation mode for reproducible testing.
    """

    def __init__(self, http_client: Optional[httpx.AsyncClient] = None):
        self.base_url = settings.PAYPAL_BASE_URL.rstrip("/")
        self.client_id = settings.PAYPAL_CLIENT_ID
        self.client_secret = settings.PAYPAL_CLIENT_SECRET
        self.simulation_mode = (
            settings.PAYPAL_SIMULATION_MODE or
            not self.client_id or
            not self.client_secret or
            self.client_id.startswith("your_")
        )
        self._cached_token: Optional[str] = None
        self._token_expiry: float = 0.0
        self._http_client = http_client

    def _get_client(self) -> httpx.AsyncClient:
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(timeout=20.0)
        return self._http_client

    async def close(self):
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()

    async def get_access_token(self) -> str:
        """Fetch or refresh OAuth2 access token using client credentials."""
        if self.simulation_mode:
            return "simulated_paypal_sandbox_oauth_token"

        now = time.time()
        if self._cached_token and now < (self._token_expiry - 60):
            return self._cached_token

        url = f"{self.base_url}/v1/oauth2/token"
        client = self._get_client()
        resp = await client.post(
            url,
            auth=(self.client_id, self.client_secret),
            data={"grant_type": "client_credentials"},
            headers={"Accept": "application/json", "Accept-Language": "en_US"},
        )
        resp.raise_for_status()
        data = resp.json()
        self._cached_token = data["access_token"]
        self._token_expiry = now + float(data.get("expires_in", 3600))
        return self._cached_token

    async def request(
        self,
        method: str,
        path: str,
        json_data: Optional[Dict[str, Any]] = None,
        idempotency_key: Optional[str] = None,
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """Execute authenticated PayPal API request with idempotency & retry on network errors, 429, and 5xx."""
        token = await self.get_access_token()
        url = f"{self.base_url}{path}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        if idempotency_key:
            headers["PayPal-Request-Id"] = idempotency_key

        backoff = 0.05
        client = self._get_client()

        for attempt in range(max_retries):
            try:
                resp = await client.request(method, url, json=json_data, headers=headers)

                # Invalidate token and retry once if unauthorized
                if resp.status_code in (401, 403) and attempt == 0 and not self.simulation_mode:
                    self._cached_token = None
                    token = await self.get_access_token()
                    headers["Authorization"] = f"Bearer {token}"
                    continue

                # Retry only on 429 (rate limit) or 5xx (server error)
                if resp.status_code == 429 or resp.status_code >= 500:
                    if attempt < max_retries - 1:
                        jitter = random.uniform(0.01, 0.05)
                        await asyncio.sleep(backoff + jitter)
                        backoff *= 2
                        continue
                    else:
                        resp.raise_for_status()

                # Do NOT retry 4xx errors
                if 400 <= resp.status_code < 500:
                    resp.raise_for_status()

                resp.raise_for_status()
                if resp.status_code == 204:
                    return {"status": "SUCCESS"}
                return resp.json()

            except (httpx.NetworkError, httpx.TimeoutException) as exc:
                if attempt < max_retries - 1:
                    jitter = random.uniform(0.01, 0.05)
                    await asyncio.sleep(backoff + jitter)
                    backoff *= 2
                    continue
                else:
                    logger.error("PayPal API network error on final attempt %s: %s", path, exc)
                    raise
            except httpx.HTTPStatusError as exc:
                logger.error("PayPal API HTTP error %s: %s", path, exc)
                raise

        raise RuntimeError(f"PayPal request to {path} exceeded max retries.")


_paypal_client_instance = None


def get_paypal_client() -> PayPalClient:
    global _paypal_client_instance
    if _paypal_client_instance is None:
        _paypal_client_instance = PayPalClient()
    return _paypal_client_instance
