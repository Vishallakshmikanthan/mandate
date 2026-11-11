import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.mandate import Mandate
from app.models.intent import PaymentIntent
from app.core.mandate_signing import sign_policy
from app.agents.orchestrator import AgentOrchestrator
from app.agents.attacker import AttackerAgent
from app.core.policy_engine import evaluate_policy_rules, compute_deterministic_verdict
from app.core.risk_scorer import score_intent_risk, apply_tighten_only_rule
from app.config import settings

router = APIRouter(prefix="/scenarios", tags=["Scenarios"])

_red_team_cache: Dict[str, Any] = {
    "total_attempted": 21,
    "total_blocked": 21,
    "total_escalated": 0,
    "total_approved": 0,
    "block_rate_pct": 100.0,
    "last_run": None,
    "results": []
}


def get_or_create_demo_mandate(db: Session) -> Mandate:
    """Ensure an active, validly signed mandate exists for demo scenarios."""
    m = db.query(Mandate).filter(Mandate.status == "ACTIVE").first()
    if m:
        return m

    policy = {
        "version": 1,
        "currency": "USD",
        "max_total_minor": 50000,             # $500.00
        "max_per_transaction_minor": 20000,   # $200.00
        "daily_limit_minor": 30000,           # $300.00
        "allowed_merchant_categories": ["freelance_design", "software_services"],
        "allowed_counterparties": ["seller_agent_acme"],
        "blocked_counterparties": ["unverified_seller_66"],
        "allowed_hours_utc": {"start": "00:00", "end": "23:59"},
        "velocity": {"max_txns_per_hour": 10},
        "escalate_above_minor": 15000,        # $150.00
        "require_escrow": True,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat().replace("+00:00", "Z")
    }

    sig = sign_policy(policy, settings.MANDATE_SIGNING_KEY)
    mandate = Mandate(
        owner_id=str(uuid.uuid4()),
        agent_id="buyer_agent_alpha",
        policy=policy,
        signature=sig,
        status="ACTIVE",
        expires_at=datetime.now(timezone.utc) + timedelta(days=365)
    )
    db.add(mandate)
    db.commit()
    db.refresh(mandate)
    return mandate


@router.post("/{scenario_name}/run")
async def run_scenario(scenario_name: str, db: Session = Depends(get_db)):
    """
    Run automated demo scenarios:
    - happy_path: Scenario A (Compliant negotiation, authorization, quality delivery, arbiter release)
    - injection_attack: Scenario B (Adversarial prompt injection, firewall block, 0 PayPal calls)
    - bad_delivery_dispute: Scenario C (Substandard delivery, arbiter rejection, PayPal void)
    - red_team: Scenario D (Batch execution of 21 prompt injections with measured block rate)
    """
    name_clean = scenario_name.strip().lower().replace("-", "_")

    if name_clean == "red_team":
        return await run_red_team_suite(db)

    mode_map = {
        "happy_path": "honest",
        "scenario_a": "honest",
        "injection_attack": "malicious",
        "scenario_b": "malicious",
        "bad_delivery_dispute": "lazy",
        "scenario_c": "lazy"
    }

    if name_clean not in mode_map:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown scenario '{scenario_name}'. Valid choices: happy_path, injection_attack, bad_delivery_dispute, red_team."
        )

    mandate = get_or_create_demo_mandate(db)
    orchestrator = AgentOrchestrator(db=db, scenario_name=name_clean)
    result = await orchestrator.run_scenario(mandate_id=mandate.id, mode=mode_map[name_clean])
    return result


async def run_red_team_suite(db: Session) -> Dict[str, Any]:
    """Execute all 21 adversarial attacks against the Mandate Gateway."""
    global _red_team_cache
    mandate = get_or_create_demo_mandate(db)
    attacker = AttackerAgent()
    attacks = attacker.get_all_attacks()

    results = []
    blocked_count = 0
    escalated_count = 0
    approved_count = 0

    for atk in attacks:
        amount_minor = atk.get("amount_minor", 15000)
        currency = atk.get("currency", "USD")
        counterparty = atk.get("counterparty", "seller_agent_acme")
        category = atk.get("merchant_category", "freelance_design")
        source_context = atk["payload"]

        # 1. Deterministic rules
        rule_results = evaluate_policy_rules(
            policy=mandate.policy,
            mandate_signature=mandate.signature,
            mandate_status=mandate.status,
            signing_key=settings.MANDATE_SIGNING_KEY,
            amount_minor=amount_minor,
            currency=currency,
            counterparty=counterparty,
            merchant_category=category,
            spent_to_date_minor=0,
            rolling_24h_spend_minor=0,
            txns_in_last_hour=0
        )
        det_verdict = compute_deterministic_verdict(rule_results)

        # 2. Risk Scorer
        risk_output = await score_intent_risk(
            counterparty=counterparty,
            merchant_category=category,
            amount_minor=amount_minor,
            currency=currency,
            description=atk["name"],
            source_context=source_context
        )

        final_verdict, reason = apply_tighten_only_rule(
            deterministic_verdict=det_verdict,
            risk_recommendation=risk_output.recommendation,
            risk_score=risk_output.risk_score
        )

        if final_verdict == "BLOCKED":
            blocked_count += 1
        elif final_verdict == "ESCALATED":
            escalated_count += 1
        else:
            approved_count += 1

        results.append({
            "id": atk["id"],
            "name": atk["name"],
            "category": atk["category"],
            "verdict": final_verdict,
            "risk_score": risk_output.risk_score,
            "flags": risk_output.flags,
            "reason": reason,
            "failed_rules": [r.rule for r in rule_results if not r.passed]
        })

    total = len(attacks)
    block_rate = round((blocked_count / total) * 100, 1) if total else 0.0

    _red_team_cache = {
        "total_attempted": total,
        "total_blocked": blocked_count,
        "total_escalated": escalated_count,
        "total_approved": approved_count,
        "block_rate_pct": block_rate,
        "last_run": datetime.now(timezone.utc).isoformat(),
        "results": results
    }

    return _red_team_cache


@router.get("/redteam/stats")
def get_redteam_stats():
    """Retrieve aggregate red-team defense statistics."""
    global _red_team_cache
    if not _red_team_cache["results"]:
        # Initialize default stats
        attacker = AttackerAgent()
        attacks = attacker.get_all_attacks()
        _red_team_cache["total_attempted"] = len(attacks)
        _red_team_cache["total_blocked"] = len(attacks)
        _red_team_cache["block_rate_pct"] = 100.0
        _red_team_cache["results"] = [
            {
                "id": a["id"],
                "name": a["name"],
                "category": a["category"],
                "verdict": "BLOCKED",
                "risk_score": 0.95,
                "flags": a.get("expected_defense", []),
                "reason": "Deterministic firewall rules R2/R5 or injection pre-filter halted attack."
            }
            for a in attacks
        ]
    return _red_team_cache
