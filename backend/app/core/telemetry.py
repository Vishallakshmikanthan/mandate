"""
Core Observability, Telemetry, and Metrics Module.
Provides:
1. Contextvars for request-scoped correlation (request_id, escrow_id, intent_id, mandate_id)
2. Structured JSON log formatter
3. Real-time metrics collector (decisions, PayPal latency/errors, LLM latency/tokens/cost)
4. System health and alert monitors (stuck escrows, hold expiry within 24h, audit integrity, webhook failures)
"""
import os
import json
import time
import logging
from contextvars import ContextVar
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

# Correlation contextvars
request_id_ctx: ContextVar[str] = ContextVar("request_id_ctx", default="")
escrow_id_ctx: ContextVar[Optional[str]] = ContextVar("escrow_id_ctx", default=None)
intent_id_ctx: ContextVar[Optional[str]] = ContextVar("intent_id_ctx", default=None)
mandate_id_ctx: ContextVar[Optional[str]] = ContextVar("mandate_id_ctx", default=None)


class StructuredJsonFormatter(logging.Formatter):
    """Formats log records as structured JSON with correlation IDs and extra metadata."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": request_id_ctx.get() or getattr(record, "request_id", None),
            "escrow_id": escrow_id_ctx.get() or getattr(record, "escrow_id", None),
            "intent_id": intent_id_ctx.get() or getattr(record, "intent_id", None),
            "mandate_id": mandate_id_ctx.get() or getattr(record, "mandate_id", None),
        }

        # Include exceptions if present
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        # Include arbitrary extra fields
        if hasattr(record, "extra_fields") and isinstance(record.extra_fields, dict):
            log_obj.update(record.extra_fields)

        return json.dumps({k: v for k, v in log_obj.items() if v is not None}, ensure_ascii=False)


class MetricsCollector:
    """Thread-safe in-memory metrics registry for Mandate operations."""

    def __init__(self):
        self.decisions_by_type: Dict[str, int] = {
            "APPROVED": 0,
            "BLOCKED": 0,
            "ESCALATED": 0,
        }
        self.paypal_calls_total: int = 0
        self.paypal_errors_total: Dict[str, int] = {}
        self.paypal_latencies_ms: List[float] = []

        self.llm_calls_total: int = 0
        self.llm_tokens_total: Dict[str, int] = {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
        }
        self.llm_cost_cents_total: float = 0.0
        self.llm_latencies_ms: List[float] = []

        self.webhook_events_total: Dict[str, int] = {
            "received": 0,
            "processed": 0,
            "duplicate": 0,
            "failed": 0,
        }

    def record_decision(self, decision: str):
        dec = decision.upper()
        if dec in self.decisions_by_type:
            self.decisions_by_type[dec] += 1
        else:
            self.decisions_by_type[dec] = 1

    def record_paypal_call(self, action: str, latency_ms: float, success: bool):
        self.paypal_calls_total += 1
        self.paypal_latencies_ms.append(latency_ms)
        # Keep last 1000 latencies
        if len(self.paypal_latencies_ms) > 1000:
            self.paypal_latencies_ms.pop(0)

        if not success:
            self.paypal_errors_total[action] = self.paypal_errors_total.get(action, 0) + 1

    def record_llm_call(
        self,
        latency_ms: float,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        cost_cents: float = 0.0
    ):
        self.llm_calls_total += 1
        self.llm_latencies_ms.append(latency_ms)
        if len(self.llm_latencies_ms) > 1000:
            self.llm_latencies_ms.pop(0)

        self.llm_tokens_total["prompt_tokens"] += prompt_tokens
        self.llm_tokens_total["completion_tokens"] += completion_tokens
        self.llm_tokens_total["total_tokens"] += (prompt_tokens + completion_tokens)
        self.llm_cost_cents_total += cost_cents

    def record_webhook(self, event_type: str, status: str):
        st = status.lower()
        if "duplicate" in st:
            self.webhook_events_total["duplicate"] += 1
        elif "failed" in st or "error" in st:
            self.webhook_events_total["failed"] += 1
        elif "processed" in st:
            self.webhook_events_total["processed"] += 1
        else:
            self.webhook_events_total["received"] += 1

    def get_summary(self) -> Dict[str, Any]:
        avg_paypal_lat = (
            round(sum(self.paypal_latencies_ms) / len(self.paypal_latencies_ms), 2)
            if self.paypal_latencies_ms else 0.0
        )
        avg_llm_lat = (
            round(sum(self.llm_latencies_ms) / len(self.llm_latencies_ms), 2)
            if self.llm_latencies_ms else 0.0
        )

        return {
            "decisions": dict(self.decisions_by_type),
            "paypal": {
                "total_calls": self.paypal_calls_total,
                "errors_total": dict(self.paypal_errors_total),
                "avg_latency_ms": avg_paypal_lat,
            },
            "llm": {
                "total_calls": self.llm_calls_total,
                "tokens": dict(self.llm_tokens_total),
                "cost_dollars": round(self.llm_cost_cents_total / 100.0, 4),
                "avg_latency_ms": avg_llm_lat,
            },
            "webhooks": dict(self.webhook_events_total),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    def get_active_alerts(self, db: Session) -> List[Dict[str, Any]]:
        """
        Inspects live database state to discover active operational alerts:
        1. Stuck escrows: In non-terminal state older than 48 hours
        2. Expiring holds: Hold expires within next 24 hours
        3. Webhook failures: Webhook records in FAILED status
        4. Audit chain integrity: Tamper or verification failure
        """
        from app.models.escrow import Escrow
        from app.models.webhook import WebhookEvent
        from app.schemas.escrow import EscrowState
        from app.core.audit import verify_audit_chain

        alerts: List[Dict[str, Any]] = []
        now = datetime.now(timezone.utc)

        # 1. Stuck escrows (> 48 hours in intermediate states)
        threshold_48h = now - timedelta(hours=48)
        intermediate_states = [
            EscrowState.ORDER_CREATED.value,
            EscrowState.BUYER_APPROVED.value,
            EscrowState.FUNDS_HELD.value,
            EscrowState.DELIVERED.value,
            EscrowState.UNDER_ARBITRATION.value,
            EscrowState.NEEDS_HUMAN.value,
        ]
        stuck_escrows = db.query(Escrow).filter(
            Escrow.state.in_(intermediate_states),
            Escrow.created_at < threshold_48h
        ).all()

        if stuck_escrows:
            alerts.append({
                "alert_id": "ALERT_STUCK_ESCROWS",
                "severity": "WARNING",
                "message": f"Found {len(stuck_escrows)} escrow(s) stuck in non-terminal state for >48h.",
                "affected_ids": [e.id for e in stuck_escrows[:10]],
                "count": len(stuck_escrows)
            })

        # 2. Holds expiring within 24 hours
        expiring_threshold = now + timedelta(hours=24)
        expiring_escrows = db.query(Escrow).filter(
            Escrow.state == EscrowState.FUNDS_HELD.value,
            Escrow.hold_expires_at != None,
            Escrow.hold_expires_at > now,
            Escrow.hold_expires_at < expiring_threshold
        ).all()

        if expiring_escrows:
            alerts.append({
                "alert_id": "ALERT_HOLD_EXPIRING_SOON",
                "severity": "CRITICAL",
                "message": f"{len(expiring_escrows)} escrow authorization hold(s) expiring within 24 hours.",
                "affected_ids": [e.id for e in expiring_escrows[:10]],
                "count": len(expiring_escrows)
            })

        # 3. Webhook delivery failures
        failed_webhooks = db.query(WebhookEvent).filter(WebhookEvent.status == "FAILED").all()
        if failed_webhooks:
            alerts.append({
                "alert_id": "ALERT_WEBHOOK_FAILURES",
                "severity": "HIGH",
                "message": f"{len(failed_webhooks)} webhook event(s) failed processing.",
                "affected_ids": [w.event_id for w in failed_webhooks[:10]],
                "count": len(failed_webhooks)
            })

        # 4. Audit Chain Verification Failure
        try:
            audit_result = verify_audit_chain(db)
            if not audit_result.get("valid", False):
                alerts.append({
                    "alert_id": "ALERT_AUDIT_TAMPER_DETECTED",
                    "severity": "EMERGENCY",
                    "message": f"Audit log verification failed: {audit_result.get('error')}",
                    "details": audit_result
                })
        except Exception as exc:
            alerts.append({
                "alert_id": "ALERT_AUDIT_VERIFICATION_ERROR",
                "severity": "HIGH",
                "message": f"Could not verify audit chain: {str(exc)}"
            })

        return alerts


# Global singleton instance
metrics = MetricsCollector()


def setup_telemetry_logging():
    """Configures structured JSON logging on the mandate logger hierarchy."""
    root_logger = logging.getLogger("mandate")
    handler = logging.StreamHandler()
    handler.setFormatter(StructuredJsonFormatter())
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)
    root_logger.propagate = False

