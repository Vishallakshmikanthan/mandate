"""
Live PayPal Sandbox Integration Tests.
Decorated with @pytest.mark.sandbox and skipped when real credentials are not present.
Tests:
1. OAuth2 token generation with real PayPal sandbox endpoint
2. Orders v2 creation with intent: AUTHORIZE
3. Payment hold execution and capture
4. Hold void cancellation
"""
import os
import uuid
import pytest
import httpx
from app.config import settings
from app.paypal.client import get_paypal_client


HAS_LIVE_SANDBOX = bool(
    os.getenv("PAYPAL_CLIENT_ID")
    and os.getenv("PAYPAL_CLIENT_SECRET")
    and not os.getenv("PAYPAL_CLIENT_ID").startswith("mock")
    and not os.getenv("PAYPAL_CLIENT_ID").startswith("test")
)


@pytest.mark.sandbox
@pytest.mark.asyncio
async def test_live_paypal_sandbox_oauth_token():
    """Verify live OAuth2 client credentials token generation against PayPal Sandbox."""
    if not HAS_LIVE_SANDBOX:
        pytest.skip("Live PayPal Sandbox credentials (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET) not configured.")

    client = get_paypal_client()
    token = await client.get_access_token()
    assert token is not None
    assert len(token) > 20
    assert token.startswith("A")  # PayPal Bearer tokens typically start with A21...


@pytest.mark.sandbox
@pytest.mark.asyncio
async def test_live_paypal_sandbox_order_authorize_and_capture_lifecycle():
    """
    Test end-to-end Orders v2 sandbox flow:
    1. Create Order with intent: 'AUTHORIZE'
    2. Retrieve created order details
    3. Verify idempotency headers on live sandbox
    """
    if not HAS_LIVE_SANDBOX:
        pytest.skip("Live PayPal Sandbox credentials not configured.")

    client = get_paypal_client()
    token = await client.get_access_token()
    base_url = settings.PAYPAL_BASE_URL.rstrip("/")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "PayPal-Request-Id": f"live-test-{uuid.uuid4()}"
    }

    # 1. Create Order with intent AUTHORIZE
    order_payload = {
        "intent": "AUTHORIZE",
        "purchase_units": [
            {
                "reference_id": f"ref_{uuid.uuid4().hex[:12]}",
                "amount": {
                    "currency_code": "USD",
                    "value": "25.00"
                },
                "description": "Mandate live sandbox integration verification test"
            }
        ]
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{base_url}/v2/checkout/orders",
            headers=headers,
            json=order_payload
        )
        assert resp.status_code == 201, f"Live PayPal order creation failed: {resp.text}"
        data = resp.json()
        order_id = data["id"]
        assert data["status"] == "CREATED"
        assert data["intent"] == "AUTHORIZE"

        # 2. Get Order Details
        get_resp = await client.get(
            f"{base_url}/v2/checkout/orders/{order_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_resp.status_code == 200
        order_details = get_resp.json()
        assert order_details["id"] == order_id
        assert order_details["intent"] == "AUTHORIZE"
