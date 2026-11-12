"""
Telemetry and Operational Health API Endpoints.
Exposes:
- GET /api/metrics: aggregated operational metrics (decisions, PayPal, LLM, webhooks)
- GET /api/alerts: live alerts on stuck escrows, expiring holds, webhook failures, and audit tampering
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db import get_db
from app.core.telemetry import metrics

router = APIRouter(tags=["Telemetry & Metrics"])


@router.get("/metrics")
def get_operational_metrics():
    """Retrieve operational metrics including decision distributions, PayPal latencies, and LLM costs."""
    return metrics.get_summary()


@router.get("/alerts")
def get_operational_alerts(db: Session = Depends(get_db)):
    """Retrieve active system health and integrity alerts."""
    active_alerts = metrics.get_active_alerts(db)
    return {
        "status": "warning" if active_alerts else "ok",
        "total_active_alerts": len(active_alerts),
        "alerts": active_alerts
    }
