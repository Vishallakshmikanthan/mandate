import pytest
import httpx
from app.paypal.client import PayPalClient


@pytest.mark.asyncio
async def test_paypal_client_5xx_then_200_succeeds():
    """5xx then 200 succeeds within retry limit."""
    call_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return httpx.Response(500, json={"error": "Internal Server Error"})
        return httpx.Response(200, json={"status": "APPROVED", "id": "ORDER_123"})

    transport = httpx.MockTransport(handler)
    http_client = httpx.AsyncClient(transport=transport)
    client = PayPalClient(http_client=http_client)
    client.simulation_mode = True  # Avoid needing real token network call

    result = await client.request("GET", "/v2/checkout/orders/ORDER_123", max_retries=3)
    assert result["status"] == "APPROVED"
    assert call_count == 2
    await client.close()


@pytest.mark.asyncio
async def test_paypal_client_repeated_5xx_raises_after_max_retries():
    """Repeated 5xx errors raise after max_retries attempts."""
    call_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        return httpx.Response(503, json={"error": "Service Unavailable"})

    transport = httpx.MockTransport(handler)
    http_client = httpx.AsyncClient(transport=transport)
    client = PayPalClient(http_client=http_client)
    client.simulation_mode = True

    with pytest.raises(httpx.HTTPStatusError):
        await client.request("POST", "/v2/checkout/orders", max_retries=3)

    assert call_count == 3
    await client.close()


@pytest.mark.asyncio
async def test_paypal_client_400_does_not_retry():
    """Client errors (400 Bad Request) must NOT be retried."""
    call_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        return httpx.Response(400, json={"error": "INVALID_REQUEST", "message": "Malformed purchase unit"})

    transport = httpx.MockTransport(handler)
    http_client = httpx.AsyncClient(transport=transport)
    client = PayPalClient(http_client=http_client)
    client.simulation_mode = True

    with pytest.raises(httpx.HTTPStatusError) as exc_info:
        await client.request("POST", "/v2/checkout/orders", max_retries=3)

    assert exc_info.value.response.status_code == 400
    assert call_count == 1  # Exactly one attempt, no retries
    await client.close()


@pytest.mark.asyncio
async def test_paypal_client_same_idempotency_key_sent_on_retry():
    """The same PayPal-Request-Id header is sent on every retry."""
    captured_keys = []

    def handler(request: httpx.Request) -> httpx.Response:
        key = request.headers.get("PayPal-Request-Id")
        captured_keys.append(key)
        if len(captured_keys) < 3:
            return httpx.Response(500, json={"error": "Transient Server Error"})
        return httpx.Response(200, json={"status": "COMPLETED"})

    transport = httpx.MockTransport(handler)
    http_client = httpx.AsyncClient(transport=transport)
    client = PayPalClient(http_client=http_client)
    client.simulation_mode = True

    target_key = "intent_789-capture-12000"
    result = await client.request(
        "POST",
        "/v2/payments/authorizations/AUTH_1/capture",
        idempotency_key=target_key,
        max_retries=3
    )

    assert result["status"] == "COMPLETED"
    assert len(captured_keys) == 3
    assert all(k == target_key for k in captured_keys)
    await client.close()

