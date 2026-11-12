import pytest
from datetime import datetime, timezone, timedelta
from app.core.policy_engine import evaluate_policy_rules, compute_deterministic_verdict
from app.core.mandate_signing import sign_policy

SECRET_KEY = "test_super_secure_secret_key_32_bytes_min!"


def run_eval(policy, amount=12000, currency="USD", counterparty="seller_agent_acme",
             category="freelance_design", spent_total=0, spent_24h=0, velocity_txns=0,
             status="ACTIVE", signing_key=SECRET_KEY, now=None, counterparty_record="DEFAULT"):
    sig = sign_policy(policy, SECRET_KEY)
    if counterparty_record == "DEFAULT":
        counterparty_record = {"id": "cp_default_id", "handle": counterparty, "status": "VERIFIED"}
    results = evaluate_policy_rules(
        policy=policy,
        mandate_signature=sig,
        mandate_status=status,
        signing_key=signing_key,
        amount_minor=amount,
        currency=currency,
        counterparty=counterparty,
        merchant_category=category,
        spent_to_date_minor=spent_total,
        rolling_24h_spend_minor=spent_24h,
        txns_in_last_hour=velocity_txns,
        now_utc=now,
        counterparty_record=counterparty_record
    )
    verdict = compute_deterministic_verdict(results)
    return verdict, {r.rule: r.passed for r in results}


def test_r1_mandate_valid_and_expired(sample_policy):
    # Active & valid
    verdict, rules = run_eval(sample_policy)
    assert rules["R1_MANDATE_VALID"] is True
    assert verdict == "APPROVED"

    # Revoked status
    verdict, rules = run_eval(sample_policy, status="REVOKED")
    assert rules["R1_MANDATE_VALID"] is False
    assert verdict == "BLOCKED"

    # Invalid signature
    verdict, rules = run_eval(sample_policy, signing_key="corrupt_key")
    assert rules["R1_MANDATE_VALID"] is False
    assert verdict == "BLOCKED"

    # Expired mandate
    expired_policy = dict(sample_policy)
    expired_policy["expires_at"] = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat().replace("+00:00", "Z")
    verdict, rules = run_eval(expired_policy)
    assert rules["R1_MANDATE_VALID"] is False
    assert verdict == "BLOCKED"


def test_r2_per_transaction_cap_boundaries(sample_policy):
    # Cap is 20000 ($200.00)
    # Exactly at boundary: 20000 -> PASS
    verdict, rules = run_eval(sample_policy, amount=20000)
    assert rules["R2_PER_TRANSACTION_CAP"] is True
    assert verdict in ("APPROVED", "ESCALATED")

    # 1 cent under boundary: 19999 -> PASS
    verdict, rules = run_eval(sample_policy, amount=19999)
    assert rules["R2_PER_TRANSACTION_CAP"] is True

    # 1 cent over boundary: 20001 -> BLOCK
    verdict, rules = run_eval(sample_policy, amount=20001)
    assert rules["R2_PER_TRANSACTION_CAP"] is False
    assert verdict == "BLOCKED"


def test_r3_total_budget_cap(sample_policy):
    # Max total: 50000 ($500.00)
    # Spent 40000, attempt 10000 -> projected 50000 == PASS
    verdict, rules = run_eval(sample_policy, amount=10000, spent_total=40000)
    assert rules["R3_TOTAL_BUDGET"] is True

    # Spent 45000, attempt 6000 -> projected 51000 == BLOCK
    verdict, rules = run_eval(sample_policy, amount=6000, spent_total=45000)
    assert rules["R3_TOTAL_BUDGET"] is False
    assert verdict == "BLOCKED"


def test_r4_daily_limit(sample_policy):
    # Daily limit: 30000 ($300.00)
    # Spent 25000 in 24h, attempt 5000 -> 30000 == PASS
    verdict, rules = run_eval(sample_policy, amount=5000, spent_24h=25000)
    assert rules["R4_DAILY_LIMIT"] is True

    # Spent 25000 in 24h, attempt 6000 -> 31000 == BLOCK
    verdict, rules = run_eval(sample_policy, amount=6000, spent_24h=25000)
    assert rules["R4_DAILY_LIMIT"] is False
    assert verdict == "BLOCKED"


def test_r5_counterparty_allowlist_and_blocklist(sample_policy):
    # 1. Allowed & Verified: "seller_agent_acme" -> PASS
    verdict, rules = run_eval(sample_policy, counterparty="seller_agent_acme")
    assert rules["R5_COUNTERPARTY"] is True

    # 2. Unregistered/non-existent counterparty -> BLOCK
    verdict, rules = run_eval(sample_policy, counterparty="unregistered_vendor", counterparty_record=None)
    assert rules["R5_COUNTERPARTY"] is False
    assert verdict == "BLOCKED"

    # 3. Exists but UNVERIFIED status -> BLOCK
    unverified_cp = {"id": "cp_unverified", "handle": "seller_agent_acme", "status": "UNVERIFIED"}
    verdict, rules = run_eval(sample_policy, counterparty="seller_agent_acme", counterparty_record=unverified_cp)
    assert rules["R5_COUNTERPARTY"] is False
    assert verdict == "BLOCKED"

    # 4. Unlisted seller (verified, but not in whitelist): "unknown_vendor_99" -> BLOCK
    verdict, rules = run_eval(sample_policy, counterparty="unknown_vendor_99")
    assert rules["R5_COUNTERPARTY"] is False
    assert verdict == "BLOCKED"

    # 5. Explicit blacklist: "unverified_seller_66" -> BLOCK
    verdict, rules = run_eval(sample_policy, counterparty="unverified_seller_66")
    assert rules["R5_COUNTERPARTY"] is False
    assert verdict == "BLOCKED"


def test_r6_merchant_category(sample_policy):
    # Allowed: "freelance_design" -> PASS
    verdict, rules = run_eval(sample_policy, category="freelance_design")
    assert rules["R6_CATEGORY"] is True

    # Disallowed: "gambling_casino" -> BLOCK
    verdict, rules = run_eval(sample_policy, category="gambling_casino")
    assert rules["R6_CATEGORY"] is False
    assert verdict == "BLOCKED"


def test_r7_time_window_restriction(sample_policy):
    time_restricted_policy = dict(sample_policy)
    time_restricted_policy["allowed_hours_utc"] = {"start": "09:00", "end": "17:00"}

    # Midday 12:00 UTC -> PASS
    midday = datetime(2026, 11, 12, 12, 0, 0, tzinfo=timezone.utc)
    verdict, rules = run_eval(time_restricted_policy, now=midday)
    assert rules["R7_TIME_WINDOW"] is True

    # Midnight 02:00 UTC -> BLOCK
    night = datetime(2026, 11, 12, 2, 0, 0, tzinfo=timezone.utc)
    verdict, rules = run_eval(time_restricted_policy, now=night)
    assert rules["R7_TIME_WINDOW"] is False
    assert verdict == "BLOCKED"


def test_r8_velocity_limit(sample_policy):
    # Velocity limit: 5 txns/hour
    # 4 previous txns, attempting 5th -> PASS
    verdict, rules = run_eval(sample_policy, velocity_txns=4)
    assert rules["R8_VELOCITY"] is True

    # 5 previous txns, attempting 6th -> BLOCK
    verdict, rules = run_eval(sample_policy, velocity_txns=5)
    assert rules["R8_VELOCITY"] is False
    assert verdict == "BLOCKED"


def test_r9_escalation_threshold(sample_policy):
    # Escalate above: 15000 ($150.00)
    # $120.00 (12000 minor) -> APPROVED (no escalation)
    verdict, rules = run_eval(sample_policy, amount=12000)
    assert rules["R9_ESCALATION_THRESHOLD"] is True
    assert verdict == "APPROVED"

    # $180.00 (18000 minor) -> ESCALATED
    verdict, rules = run_eval(sample_policy, amount=18000)
    assert rules["R9_ESCALATION_THRESHOLD"] is False
    assert verdict == "ESCALATED"


def test_r10_currency_match(sample_policy):
    # Mandate uses USD
    verdict, rules = run_eval(sample_policy, currency="USD")
    assert rules["R10_CURRENCY"] is True

    # Intent requests EUR -> BLOCK
    verdict, rules = run_eval(sample_policy, currency="EUR")
    assert rules["R10_CURRENCY"] is False
    assert verdict == "BLOCKED"
