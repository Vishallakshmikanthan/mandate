"""
Mandate Python SDK Client.
Thin, type-safe client for autonomous agents that spend money.
"""
from typing import Optional
import httpx

from .models import (
    RuleReason,
    PaymentIntentResult,
    MandateBalanceResult,
    DeliverableResult
)
from .exceptions import (
    MandateError,
    IntentBlockedError,
    AuthenticationError,
    PermissionDeniedError,
    ResourceNotFoundError
)


class MandateClient:
    """
    Synchronous client for communicating with the Mandate Gateway.
    Holds ONLY a scoped agent API key or token, NEVER PayPal credentials.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "http://localhost:8000",
        timeout: float = 30.0
    ):
        self.api_key = api_key.strip()
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "mandate-python-sdk/1.0.0"
        }

    def _handle_error(self, resp: httpx.Response):
        if resp.status_code == 401:
            raise AuthenticationError("Invalid or missing Mandate API Key.")
        elif resp.status_code == 403:
            raise PermissionDeniedError(f"Access forbidden: {resp.text}")
        elif resp.status_code == 404:
            raise ResourceNotFoundError(f"Resource not found: {resp.text}")
        elif resp.is_error:
            raise MandateError(f"Mandate Gateway Error ({resp.status_code}): {resp.text}")

    def request_payment(
        self,
        mandate_id: str,
        counterparty: str,
        amount_minor: int,
        currency: str = "USD",
        merchant_category: str = "general_commerce",
        description: str = "",
        source_context: Optional[str] = None,
        raise_on_blocked: bool = False
    ) -> PaymentIntentResult:
        """
        Submit a commercial payment intent to the Mandate Gateway.
        Evaluates deterministic policy engine rules (R1-R10) and LLM risk scorer.
        If APPROVED, an escrow order is automatically prepared.
        If BLOCKED, returns detailed reasons and risk score (or raises IntentBlockedError).
        """
        url = f"{self.base_url}/api/intents"
        payload = {
            "mandate_id": mandate_id,
            "counterparty": counterparty,
            "amount_minor": amount_minor,
            "currency": currency,
            "merchant_category": merchant_category,
            "description": description,
            "source_context": source_context
        }

        with httpx.Client(timeout=self.timeout) as client:
            resp = client.post(url, json=payload, headers=self._headers)
            self._handle_error(resp)
            data = resp.json()

        reasons = [
            RuleReason(
                rule=r.get("rule", ""),
                name=r.get("name", ""),
                passed=r.get("passed", False),
                detail=r.get("detail", "")
            )
            for r in data.get("decision_reasons", [])
        ]

        result = PaymentIntentResult(
            intent_id=data["id"],
            mandate_id=data["mandate_id"],
            counterparty=data["counterparty"],
            amount_minor=data["amount_minor"],
            currency=data["currency"],
            decision=data["decision"],
            risk_score=data.get("risk_score", 0.0),
            reasons=reasons,
            escrow_id=data.get("escrow_id"),
            paypal_order_id=data.get("paypal_order_id"),
            paypal_approval_url=data.get("paypal_approval_url"),
            flags=data.get("flags", [])
        )

        if raise_on_blocked and result.is_blocked:
            raise IntentBlockedError(
                f"Payment intent blocked by Mandate Gateway: {', '.join(result.blocking_reasons)}",
                reasons=result.blocking_reasons,
                risk_score=result.risk_score
            )

        return result

    def get_intent_status(self, intent_id: str) -> PaymentIntentResult:
        """Retrieve the latest status, decision, and reasons for a payment intent."""
        url = f"{self.base_url}/api/intents/{intent_id}"
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.get(url, headers=self._headers)
            self._handle_error(resp)
            data = resp.json()

        reasons = [
            RuleReason(
                rule=r.get("rule", ""),
                name=r.get("name", ""),
                passed=r.get("passed", False),
                detail=r.get("detail", "")
            )
            for r in data.get("decision_reasons", [])
        ]

        return PaymentIntentResult(
            intent_id=data["id"],
            mandate_id=data["mandate_id"],
            counterparty=data["counterparty"],
            amount_minor=data["amount_minor"],
            currency=data["currency"],
            decision=data["decision"],
            risk_score=data.get("risk_score", 0.0),
            reasons=reasons,
            escrow_id=data.get("escrow_id"),
            paypal_order_id=data.get("paypal_order_id"),
            paypal_approval_url=data.get("paypal_approval_url"),
            flags=data.get("flags", [])
        )

    def get_mandate_balance(self, mandate_id: str) -> MandateBalanceResult:
        """Query real-time budget, spent to date, and velocity constraints for a mandate."""
        url = f"{self.base_url}/api/mandates/{mandate_id}"
        with httpx.Client(timeout=self.timeout) as client:
            resp = client.get(url, headers=self._headers)
            self._handle_error(resp)
            data = resp.json()

        policy = data.get("policy", {})
        return MandateBalanceResult(
            mandate_id=data["id"],
            currency=policy.get("currency", "USD"),
            max_total_minor=policy.get("max_total_minor", 0),
            spent_to_date_minor=data.get("spent_to_date_minor", 0),
            remaining_budget_minor=data.get("remaining_budget_minor", 0),
            max_per_transaction_minor=policy.get("max_per_transaction_minor", 0),
            daily_limit_minor=policy.get("daily_limit_minor", 0),
            is_active=(data.get("status") == "ACTIVE")
        )

    def submit_deliverable(
        self,
        escrow_id: str,
        content_ref: str,
        submission_notes: Optional[str] = None
    ) -> DeliverableResult:
        """
        Seller agent submits work deliverable (content reference, asset URI, or hash).
        Advances escrow state to DELIVERED and queues AI arbitration inspection.
        """
        url = f"{self.base_url}/api/escrows/{escrow_id}/deliver"
        payload = {
            "content_ref": content_ref,
            "submission_notes": submission_notes
        }

        with httpx.Client(timeout=self.timeout) as client:
            resp = client.post(url, json=payload, headers=self._headers)
            self._handle_error(resp)
            data = resp.json()

        deliverables = data.get("deliverables", [])
        latest = deliverables[-1] if deliverables else {}

        return DeliverableResult(
            deliverable_id=latest.get("id", ""),
            escrow_id=data["id"],
            sha256=latest.get("sha256"),
            status=data["state"],
            created_at=latest.get("created_at", "")
        )
