import uuid
import logging
from contextlib import contextmanager
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.paypal.client import get_paypal_client
from app.config import settings
from app.models.paypal_action import PayPalAction

logger = logging.getLogger("mandate.paypal.orders")


@contextmanager
def get_db_context(db: Optional[Session] = None):
    if db is not None:
        yield db
    else:
        try:
            import app.db as db_mod
            session = db_mod.SessionLocal()
            try:
                yield session
            finally:
                session.close()
        except Exception as exc:
            logger.warning("Could not establish database context for PayPalAction ledger: %s", exc)
            yield None


def check_cached_action(session: Optional[Session], request_id: str) -> Optional[Dict[str, Any]]:
    if session is None:
        return None
    try:
        record = session.query(PayPalAction).filter(PayPalAction.request_id == request_id).first()
        if record and record.status == "COMPLETED" and record.response_body:
            return record.response_body
    except Exception as exc:
        logger.warning("Error querying cached PayPalAction for %s: %s", request_id, exc)
    return None


def start_or_resume_action(
    session: Optional[Session],
    request_id: str,
    action: str,
    escrow_id: Optional[str] = None,
    request_body: Optional[Dict[str, Any]] = None
) -> Optional[PayPalAction]:
    if session is None:
        return None
    try:
        record = session.query(PayPalAction).filter(PayPalAction.request_id == request_id).first()
        if not record:
            record = PayPalAction(
                request_id=request_id,
                escrow_id=escrow_id,
                action=action,
                request_body=request_body,
                status="PENDING"
            )
            session.add(record)
            session.commit()
            session.refresh(record)
        return record
    except Exception as exc:
        logger.warning("Could not persist PENDING PayPalAction for %s: %s", request_id, exc)
        try:
            session.rollback()
        except Exception:
            pass
        return None


def complete_action(session: Optional[Session], record: Optional[PayPalAction], response_body: Dict[str, Any]):
    if session is None or record is None:
        return
    try:
        record.status = "COMPLETED"
        record.response_body = response_body
        session.commit()
    except Exception as exc:
        logger.warning("Could not update PayPalAction %s to COMPLETED: %s", record.request_id, exc)
        try:
            session.rollback()
        except Exception:
            pass


def fail_action(session: Optional[Session], record: Optional[PayPalAction], error_detail: str):
    if session is None or record is None:
        return
    try:
        record.status = "FAILED"
        record.response_body = {"error": error_detail}
        session.commit()
    except Exception as exc:
        logger.warning("Could not update PayPalAction %s to FAILED: %s", record.request_id, exc)
        try:
            session.rollback()
        except Exception:
            pass


async def create_paypal_order(
    intent_id: str,
    amount_minor: int,
    currency: str = "USD",
    description: str = "Mandate AI Agent Service Escrow",
    payee_email: Optional[str] = None,
    payee_merchant_id: Optional[str] = None,
    return_url: Optional[str] = None,
    cancel_url: Optional[str] = None,
    escrow_id: Optional[str] = None,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Create a PayPal order with intent: AUTHORIZE.
    Funds are held in escrow and not captured immediately.
    Sets payee on the purchase unit if counterparty payee details are provided.
    Sets experience_context in payment_source.paypal for return and cancel URLs.
    Idempotent and crash-safe via deterministic request_id in paypal_actions.
    """
    request_id = f"{intent_id}-CREATE_ORDER-{amount_minor}"

    with get_db_context(db) as session:
        cached = check_cached_action(session, request_id)
        if cached:
            logger.info("Returning cached PayPal order for request_id=%s", request_id)
            return cached

        payee_dict: Dict[str, str] = {}
        if payee_email:
            payee_dict["email_address"] = payee_email
        if payee_merchant_id:
            payee_dict["merchant_id"] = payee_merchant_id

        effective_return_url = return_url or f"{settings.FRONTEND_ORIGIN}/app/escrows"
        effective_cancel_url = cancel_url or f"{settings.FRONTEND_ORIGIN}/app/escrows"

        req_body = {
            "amount_minor": amount_minor,
            "currency": currency,
            "payee": payee_dict if payee_dict else None,
            "description": description[:127],
            "return_url": effective_return_url,
            "cancel_url": effective_cancel_url
        }
        action_rec = start_or_resume_action(
            session=session,
            request_id=request_id,
            action="CREATE_ORDER",
            escrow_id=escrow_id,
            request_body=req_body
        )

        client = get_paypal_client()
        try:
            if client.simulation_mode:
                order_id = f"ORD-SANDBOX-{uuid.uuid4().hex[:12].upper()}"
                result = {
                    "order_id": order_id,
                    "status": "CREATED",
                    "approve_url": f"https://www.sandbox.paypal.com/checkoutnow?token={order_id}",
                    "amount_minor": amount_minor,
                    "currency": currency,
                    "payee": payee_dict if payee_dict else None,
                    "return_url": effective_return_url,
                    "cancel_url": effective_cancel_url
                }
            else:
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
                resp = await client.request(
                    "POST",
                    "/v2/checkout/orders",
                    json_data=payload,
                    idempotency_key=request_id
                )

                order_id = resp["id"]
                approve_url = None
                for link in resp.get("links", []):
                    if link.get("rel") == "approve":
                        approve_url = link.get("href")
                        break

                result = {
                    "order_id": order_id,
                    "status": resp.get("status", "CREATED"),
                    "approve_url": approve_url or f"https://www.sandbox.paypal.com/checkoutnow?token={order_id}",
                    "amount_minor": amount_minor,
                    "currency": currency,
                    "payee": payee_dict if payee_dict else None,
                    "return_url": effective_return_url,
                    "cancel_url": effective_cancel_url
                }

            complete_action(session, action_rec, result)
            return result

        except Exception as exc:
            fail_action(session, action_rec, str(exc))
            raise


async def authorize_paypal_order(
    order_id: str,
    intent_id: str,
    amount_minor: Optional[int] = None,
    escrow_id: Optional[str] = None,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Authorize funds against an approved PayPal order.
    Transitions funds into a verified hold state.
    Idempotent and crash-safe via deterministic request_id in paypal_actions.
    """
    request_id = f"{intent_id}-AUTHORIZE-{amount_minor or 0}"

    with get_db_context(db) as session:
        cached = check_cached_action(session, request_id)
        if cached:
            logger.info("Returning cached PayPal authorization for request_id=%s", request_id)
            return cached

        action_rec = start_or_resume_action(
            session=session,
            request_id=request_id,
            action="AUTHORIZE",
            escrow_id=escrow_id,
            request_body={"order_id": order_id}
        )

        client = get_paypal_client()
        try:
            if client.simulation_mode:
                auth_id = f"AUTH-SANDBOX-{uuid.uuid4().hex[:12].upper()}"
                expires_at = datetime.now(timezone.utc) + timedelta(days=29)
                result = {
                    "authorization_id": auth_id,
                    "status": "CREATED",
                    "hold_expires_at": expires_at.isoformat()
                }
            else:
                resp = await client.request(
                    "POST",
                    f"/v2/checkout/orders/{order_id}/authorize",
                    idempotency_key=request_id
                )

                try:
                    auth_unit = resp["purchase_units"][0]["payments"]["authorizations"][0]
                    auth_id = auth_unit["id"]
                    status = auth_unit.get("status", "CREATED")
                    expiration_time = auth_unit.get("expiration_time")
                    result = {
                        "authorization_id": auth_id,
                        "status": status,
                        "hold_expires_at": expiration_time
                    }
                except (KeyError, IndexError) as exc:
                    raise RuntimeError(f"Unexpected PayPal authorization response shape: {resp}") from exc

            complete_action(session, action_rec, result)
            return result

        except Exception as exc:
            fail_action(session, action_rec, str(exc))
            raise


async def capture_paypal_authorization(
    authorization_id: str,
    intent_id: str,
    amount_minor: Optional[int] = None,
    currency: str = "USD",
    final_capture: bool = True,
    escrow_id: Optional[str] = None,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Capture all or part of the authorized funds when the Arbiter approves delivery.
    When final_capture=True (Payments v2), capturing a partial amount automatically
    releases the remaining authorization hold, avoiding separate void calls.
    Idempotent and crash-safe via deterministic request_id in paypal_actions.
    """
    request_id = f"{intent_id}-CAPTURE-{amount_minor or 0}"

    with get_db_context(db) as session:
        cached = check_cached_action(session, request_id)
        if cached:
            logger.info("Returning cached PayPal capture for request_id=%s", request_id)
            return cached

        payload: Dict[str, Any] = {"final_capture": final_capture}
        if amount_minor is not None:
            payload["amount"] = {
                "currency_code": currency.upper(),
                "value": f"{amount_minor / 100:.2f}"
            }

        action_rec = start_or_resume_action(
            session=session,
            request_id=request_id,
            action="CAPTURE",
            escrow_id=escrow_id,
            request_body=payload
        )

        client = get_paypal_client()
        try:
            if client.simulation_mode:
                cap_id = f"CAP-SANDBOX-{uuid.uuid4().hex[:12].upper()}"
                result = {
                    "capture_id": cap_id,
                    "status": "COMPLETED",
                    "captured_amount_minor": amount_minor,
                    "final_capture": final_capture
                }
            else:
                resp = await client.request(
                    "POST",
                    f"/v2/payments/authorizations/{authorization_id}/capture",
                    json_data=payload,
                    idempotency_key=request_id
                )
                result = {
                    "capture_id": resp.get("id"),
                    "status": resp.get("status", "COMPLETED"),
                    "captured_amount_minor": amount_minor,
                    "final_capture": final_capture
                }

            complete_action(session, action_rec, result)
            return result

        except Exception as exc:
            fail_action(session, action_rec, str(exc))
            raise


async def void_paypal_authorization(
    authorization_id: str,
    intent_id: str,
    amount_minor: Optional[int] = None,
    escrow_id: Optional[str] = None,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Void the authorization hold when delivery fails arbitration or is rejected.
    Immediately releases the hold back to the buyer without settling.
    Idempotent and crash-safe via deterministic request_id in paypal_actions.
    """
    request_id = f"{intent_id}-VOID-{amount_minor or 0}"

    with get_db_context(db) as session:
        cached = check_cached_action(session, request_id)
        if cached:
            logger.info("Returning cached PayPal void for request_id=%s", request_id)
            return cached

        action_rec = start_or_resume_action(
            session=session,
            request_id=request_id,
            action="VOID",
            escrow_id=escrow_id,
            request_body={"authorization_id": authorization_id}
        )

        client = get_paypal_client()
        try:
            if client.simulation_mode:
                result = {
                    "status": "VOIDED",
                    "authorization_id": authorization_id
                }
            else:
                await client.request(
                    "POST",
                    f"/v2/payments/authorizations/{authorization_id}/void",
                    idempotency_key=request_id
                )
                result = {
                    "status": "VOIDED",
                    "authorization_id": authorization_id
                }

            complete_action(session, action_rec, result)
            return result

        except Exception as exc:
            fail_action(session, action_rec, str(exc))
            raise
