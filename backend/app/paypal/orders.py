import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from app.paypal.client import get_paypal_client
from app.config import settings


async def create_paypal_order(
    intent_id: str,
    amount_minor: int,
    currency: str = "USD",
    description: str = "Mandate AI Agent Service Escrow",
    payee_email: Optional[str] = None,
    payee_merchant_id: Optional[str] = None,
    return_url: Optional[str] = None,
    cancel_url: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a PayPal order with intent: AUTHORIZE.
    Funds are held in escrow and not captured immediately.
    Sets payee on the purchase unit if counterparty payee details are provided.
    Sets experience_context in payment_source.paypal for return and cancel URLs.
    """
    payee_dict: Dict[str, str] = {}
    if payee_email:
        payee_dict["email_address"] = payee_email
    if payee_merchant_id:
        payee_dict["merchant_id"] = payee_merchant_id

    effective_return_url = return_url or f"{settings.FRONTEND_ORIGIN}/app/escrows"
    effective_cancel_url = cancel_url or f"{settings.FRONTEND_ORIGIN}/app/escrows"

    client = get_paypal_client()
    if client.simulation_mode:
        order_id = f"ORD-SANDBOX-{uuid.uuid4().hex[:12].upper()}"
        return {
            "order_id": order_id,
            "status": "CREATED",
            "approve_url": f"https://www.sandbox.paypal.com/checkoutnow?token={order_id}",
            "amount_minor": amount_minor,
            "currency": currency,
            "payee": payee_dict if payee_dict else None,
            "return_url": effective_return_url,
            "cancel_url": effective_cancel_url
        }

    amount_str = f"{amount_minor / 100:.2f}"
    purchase_unit: Dict[str, Any] = {
        "reference_id": intent_id,
        "description": description[:127],
        "amount": {
            "currency_code": currency.upper(),
            "value": amount_str
        }
    }
    if payee_dict:
        purchase_unit["payee"] = payee_dict

    experience_context = {
        "brand_name": "Mandate Escrow",
        "locale": "en-US",
        "shipping_preference": "NO_SHIPPING",
        "user_action": "CONTINUE",
        "return_url": effective_return_url,
        "cancel_url": effective_cancel_url
    }

    payload = {
        "intent": "AUTHORIZE",
        "purchase_units": [purchase_unit],
        "payment_source": {
            "paypal": {
                "experience_context": experience_context
            }
        }
    }
    idempotency_key = f"{intent_id}-CREATE"
    resp = await client.request("POST", "/v2/checkout/orders", json_data=payload, idempotency_key=idempotency_key)

    order_id = resp["id"]
    approve_url = None
    for link in resp.get("links", []):
        if link.get("rel") == "approve":
            approve_url = link.get("href")
            break

    return {
        "order_id": order_id,
        "status": resp.get("status", "CREATED"),
        "approve_url": approve_url or f"https://www.sandbox.paypal.com/checkoutnow?token={order_id}",
        "amount_minor": amount_minor,
        "currency": currency,
        "payee": payee_dict if payee_dict else None,
        "return_url": effective_return_url,
        "cancel_url": effective_cancel_url
    }


async def authorize_paypal_order(
    order_id: str,
    intent_id: str
) -> Dict[str, Any]:
    """
    Authorize funds against an approved PayPal order.
    Transitions funds into a verified hold state.
    """
    client = get_paypal_client()
    if client.simulation_mode:
        auth_id = f"AUTH-SANDBOX-{uuid.uuid4().hex[:12].upper()}"
        expires_at = datetime.now(timezone.utc) + timedelta(days=29)
        return {
            "authorization_id": auth_id,
            "status": "CREATED",
            "hold_expires_at": expires_at.isoformat()
        }

    idempotency_key = f"{intent_id}-AUTHORIZE"
    resp = await client.request("POST", f"/v2/checkout/orders/{order_id}/authorize", idempotency_key=idempotency_key)

    # Extract authorization details
    try:
        auth_unit = resp["purchase_units"][0]["payments"]["authorizations"][0]
        auth_id = auth_unit["id"]
        status = auth_unit.get("status", "CREATED")
        expiration_time = auth_unit.get("expiration_time")
        return {
            "authorization_id": auth_id,
            "status": status,
            "hold_expires_at": expiration_time
        }
    except (KeyError, IndexError) as exc:
        raise RuntimeError(f"Unexpected PayPal authorization response shape: {resp}") from exc


async def capture_paypal_authorization(
    authorization_id: str,
    intent_id: str,
    amount_minor: Optional[int] = None,
    currency: str = "USD"
) -> Dict[str, Any]:
    """
    Capture all or part of the authorized funds when the Arbiter approves delivery.
    """
    client = get_paypal_client()
    if client.simulation_mode:
        cap_id = f"CAP-SANDBOX-{uuid.uuid4().hex[:12].upper()}"
        return {
            "capture_id": cap_id,
            "status": "COMPLETED",
            "captured_amount_minor": amount_minor
        }

    idempotency_key = f"{intent_id}-CAPTURE"
    payload = {}
    if amount_minor is not None:
        payload["amount"] = {
            "currency_code": currency.upper(),
            "value": f"{amount_minor / 100:.2f}"
        }

    resp = await client.request(
        "POST",
        f"/v2/payments/authorizations/{authorization_id}/capture",
        json_data=payload if payload else None,
        idempotency_key=idempotency_key
    )

    return {
        "capture_id": resp.get("id"),
        "status": resp.get("status", "COMPLETED"),
        "captured_amount_minor": amount_minor
    }


async def void_paypal_authorization(
    authorization_id: str,
    intent_id: str
) -> Dict[str, Any]:
    """
    Void the authorization hold when delivery fails arbitration or is disputed.
    Immediately releases the hold back to the buyer without settling.
    """
    client = get_paypal_client()
    if client.simulation_mode:
        return {
            "status": "VOIDED",
            "authorization_id": authorization_id
        }

    idempotency_key = f"{intent_id}-VOID"
    await client.request(
        "POST",
        f"/v2/payments/authorizations/{authorization_id}/void",
        idempotency_key=idempotency_key
    )

    return {
        "status": "VOIDED",
        "authorization_id": authorization_id
    }
