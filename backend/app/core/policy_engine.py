from datetime import datetime, timezone, time
from typing import List, Dict, Any, Optional
from app.schemas.intent import RuleEvaluationResult
from app.schemas.mandate import MandatePolicy
from app.core.mandate_signing import verify_mandate_signature


def parse_time_str(time_str: str) -> time:
    """Parse 'HH:MM' string to datetime.time."""
    parts = time_str.strip().split(":")
    return time(hour=int(parts[0]), minute=int(parts[1]))


def evaluate_policy_rules(
    policy: Dict[str, Any],
    mandate_signature: str,
    mandate_status: str,
    signing_key: str,
    amount_minor: int,
    currency: str,
    counterparty: str,
    merchant_category: str,
    spent_to_date_minor: int = 0,
    rolling_24h_spend_minor: int = 0,
    txns_in_last_hour: int = 0,
    now_utc: Optional[datetime] = None,
    counterparty_record: Optional[Any] = None,
    mandate_public_key: Optional[str] = None,
    mandate_algorithm: Optional[str] = None,
    mandate_owner_id: Optional[str] = None,
    owner_public_keys: Optional[List[str]] = None,
) -> List[RuleEvaluationResult]:
    """
    Pure deterministic evaluation of Rules R1 through R10.
    Returns all evaluation results so the caller / dashboard sees full diagnostics.
    """
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)

    results: List[RuleEvaluationResult] = []

    # --------------------------------------------------------------------------
    # R1: Mandate Valid (Signature, Status, Expiry)
    # --------------------------------------------------------------------------
    algo = mandate_algorithm
    if not algo or (algo == "ed25519" and not mandate_public_key):
        algo = "ed25519" if mandate_public_key else "hmac-sha256"
    sig_ok = verify_mandate_signature(
        policy_data=policy,
        signature=mandate_signature,
        signing_key=signing_key,
        public_key=mandate_public_key,
        algorithm=algo,
    )

    owner_binding_ok = True
    if sig_ok and mandate_public_key and owner_public_keys is not None:
        if mandate_public_key not in owner_public_keys:
            owner_binding_ok = False

    status_ok = (mandate_status == "ACTIVE")

    # Expiration check
    expires_at_val = policy.get("expires_at")
    if isinstance(expires_at_val, str):
        expires_at = datetime.fromisoformat(expires_at_val.replace("Z", "+00:00"))
    elif isinstance(expires_at_val, datetime):
        expires_at = expires_at_val
    else:
        expires_at = now_utc

    # Make expires_at timezone aware if naive
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    not_expired = (now_utc <= expires_at)

    r1_passed = sig_ok and owner_binding_ok and status_ok and not_expired
    if not sig_ok:
        from app.config import settings
        if algo == "hmac-sha256" and settings.APP_ENV != "demo":
            r1_detail = "HMAC signature rejected: only Ed25519 asymmetric signatures are allowed outside demo environment."
        else:
            r1_detail = "Cryptographic signature verification failed (possible tampering detected)."
    elif not owner_binding_ok:
        r1_detail = f"Mandate signed with an unauthorized key not belonging to owner '{mandate_owner_id}'."
    elif not status_ok:
        r1_detail = f"Mandate status is {mandate_status} (must be ACTIVE)."
    elif not not_expired:
        r1_detail = f"Mandate expired at {expires_at.isoformat()}."
    else:
        detail_algo = "Ed25519 asymmetric" if algo == "ed25519" else "HMAC"
        r1_detail = f"{detail_algo} signature verified, mandate ACTIVE, not expired."
    results.append(RuleEvaluationResult(rule="R1_MANDATE_VALID", passed=r1_passed, detail=r1_detail))

    # --------------------------------------------------------------------------
    # R2: Per-Transaction Cap
    # --------------------------------------------------------------------------
    max_per_txn = policy.get("max_per_transaction_minor", 0)
    r2_passed = (amount_minor <= max_per_txn)
    r2_detail = (
        f"Amount ${amount_minor/100:.2f} <= Cap ${max_per_txn/100:.2f}"
        if r2_passed
        else f"Amount ${amount_minor/100:.2f} exceeds per-transaction cap of ${max_per_txn/100:.2f} by ${(amount_minor - max_per_txn)/100:.2f}."
    )
    results.append(RuleEvaluationResult(rule="R2_PER_TRANSACTION_CAP", passed=r2_passed, detail=r2_detail))

    # --------------------------------------------------------------------------
    # R3: Total Budget Cap
    # --------------------------------------------------------------------------
    max_total = policy.get("max_total_minor", 0)
    projected_total = spent_to_date_minor + amount_minor
    r3_passed = (projected_total <= max_total)
    r3_detail = (
        f"Projected lifetime spend ${projected_total/100:.2f} <= Budget ${max_total/100:.2f}"
        if r3_passed
        else f"Projected lifetime spend ${projected_total/100:.2f} exceeds total budget of ${max_total/100:.2f}."
    )
    results.append(RuleEvaluationResult(rule="R3_TOTAL_BUDGET", passed=r3_passed, detail=r3_detail))

    # --------------------------------------------------------------------------
    # R4: Rolling 24-Hour Daily Limit
    # --------------------------------------------------------------------------
    daily_limit = policy.get("daily_limit_minor", max_total)
    projected_daily = rolling_24h_spend_minor + amount_minor
    r4_passed = (projected_daily <= daily_limit)
    r4_detail = (
        f"Projected 24h spend ${projected_daily/100:.2f} <= Daily limit ${daily_limit/100:.2f}"
        if r4_passed
        else f"Projected 24h spend ${projected_daily/100:.2f} exceeds daily limit of ${daily_limit/100:.2f}."
    )
    results.append(RuleEvaluationResult(rule="R4_DAILY_LIMIT", passed=r4_passed, detail=r4_detail))

    # --------------------------------------------------------------------------
    # R5: Counterparty Check (Registry verification, Allowlist & Blocklist)
    # --------------------------------------------------------------------------
    allowed_counterparties = policy.get("allowed_counterparties", []) or []
    blocked_counterparties = policy.get("blocked_counterparties", []) or []

    cp_id = None
    cp_handle = None
    cp_status = None

    if counterparty_record is not None:
        if isinstance(counterparty_record, dict):
            cp_id = counterparty_record.get("id")
            cp_handle = counterparty_record.get("handle")
            cp_status = counterparty_record.get("status")
        else:
            cp_id = getattr(counterparty_record, "id", None)
            cp_handle = getattr(counterparty_record, "handle", None)
            cp_status = getattr(counterparty_record, "status", None)

    identifiers = {x for x in (counterparty, cp_handle, cp_id) if x}
    is_blocked = bool(identifiers.intersection(blocked_counterparties))
    is_allowed = (not allowed_counterparties) or bool(identifiers.intersection(allowed_counterparties))

    if counterparty_record is None:
        r5_passed = False
        r5_detail = f"Counterparty '{counterparty}' does not exist in counterparty registry."
    elif cp_status != "VERIFIED":
        r5_passed = False
        r5_detail = f"Counterparty '{counterparty}' exists but is not verified (status: '{cp_status}')."
    elif is_blocked:
        r5_passed = False
        r5_detail = f"Counterparty '{counterparty}' is explicitly listed on the blacklist."
    elif not is_allowed:
        r5_detail = f"Counterparty '{counterparty}' is not in the allowed counterparties whitelist: {allowed_counterparties}."
        r5_passed = False
    else:
        r5_passed = True
        r5_detail = f"Counterparty '{counterparty}' is registered, VERIFIED, and authorized."
    results.append(RuleEvaluationResult(rule="R5_COUNTERPARTY", passed=r5_passed, detail=r5_detail))

    # --------------------------------------------------------------------------
    # R6: Merchant Category Check
    # --------------------------------------------------------------------------
    allowed_categories = policy.get("allowed_merchant_categories", []) or []
    r6_passed = (not allowed_categories) or (merchant_category in allowed_categories)
    r6_detail = (
        f"Category '{merchant_category}' is permitted in policy."
        if r6_passed
        else f"Category '{merchant_category}' not in allowed categories: {allowed_categories}."
    )
    results.append(RuleEvaluationResult(rule="R6_CATEGORY", passed=r6_passed, detail=r6_detail))

    # --------------------------------------------------------------------------
    # R7: Allowed Hours Time Window (UTC)
    # --------------------------------------------------------------------------
    hours_window = policy.get("allowed_hours_utc")
    if hours_window and isinstance(hours_window, dict) and "start" in hours_window and "end" in hours_window:
        start_time = parse_time_str(hours_window["start"])
        end_time = parse_time_str(hours_window["end"])
        curr_time = now_utc.time()

        if start_time <= end_time:
            in_window = start_time <= curr_time <= end_time
        else:
            # Spans overnight
            in_window = curr_time >= start_time or curr_time <= end_time

        r7_passed = in_window
        r7_detail = (
            f"Current UTC time {curr_time.strftime('%H:%M')} is within window [{hours_window['start']} - {hours_window['end']}]."
            if r7_passed
            else f"Current UTC time {curr_time.strftime('%H:%M')} is outside allowed window [{hours_window['start']} - {hours_window['end']}]."
        )
    else:
        r7_passed = True
        r7_detail = "No operating time window restriction specified (24/7 allowed)."
    results.append(RuleEvaluationResult(rule="R7_TIME_WINDOW", passed=r7_passed, detail=r7_detail))

    # --------------------------------------------------------------------------
    # R8: Velocity Limit (Max Transactions Per Hour)
    # --------------------------------------------------------------------------
    velocity = policy.get("velocity")
    if velocity and isinstance(velocity, dict) and "max_txns_per_hour" in velocity:
        max_rate = velocity["max_txns_per_hour"]
        r8_passed = (txns_in_last_hour < max_rate)
        r8_detail = (
            f"Transactions in last hour ({txns_in_last_hour}) < velocity cap ({max_rate})."
            if r8_passed
            else f"Velocity limit exceeded: {txns_in_last_hour} transactions in the last hour exceeds limit of {max_rate}."
        )
    else:
        r8_passed = True
        r8_detail = "No transaction velocity limit configured."
    results.append(RuleEvaluationResult(rule="R8_VELOCITY", passed=r8_passed, detail=r8_detail))

    # --------------------------------------------------------------------------
    # R9: Escalation Threshold
    # --------------------------------------------------------------------------
    escalate_above = policy.get("escalate_above_minor")
    if escalate_above is not None and amount_minor > escalate_above:
        r9_passed = False  # Triggers ESCALATED
        r9_detail = f"Amount ${amount_minor/100:.2f} exceeds escalation threshold ${escalate_above/100:.2f}. Human review required."
    else:
        r9_passed = True
        threshold_str = f"${escalate_above/100:.2f}" if escalate_above else "N/A"
        r9_detail = f"Amount ${amount_minor/100:.2f} does not trigger escalation threshold ({threshold_str})."
    results.append(RuleEvaluationResult(rule="R9_ESCALATION_THRESHOLD", passed=r9_passed, detail=r9_detail))

    # --------------------------------------------------------------------------
    # R10: Currency Match
    # --------------------------------------------------------------------------
    mandate_currency = policy.get("currency", "USD").upper()
    intent_currency = currency.upper()
    r10_passed = (intent_currency == mandate_currency)
    r10_detail = (
        f"Currency '{intent_currency}' matches mandate '{mandate_currency}'."
        if r10_passed
        else f"Currency mismatch: intent uses '{intent_currency}' but mandate permits '{mandate_currency}'."
    )
    results.append(RuleEvaluationResult(rule="R10_CURRENCY", passed=r10_passed, detail=r10_detail))

    return results


def compute_deterministic_verdict(evaluation_results: List[RuleEvaluationResult]) -> str:
    """
    Compute the overall deterministic decision from rule results.
    - If any of R1-R8 or R10 failed -> BLOCKED.
    - Else if R9 failed -> ESCALATED.
    - Else -> APPROVED.
    """
    for res in evaluation_results:
        if not res.passed:
            if res.rule == "R9_ESCALATION_THRESHOLD":
                continue  # Handled after blocking rules
            return "BLOCKED"

    # Check if R9 triggered escalation
    for res in evaluation_results:
        if res.rule == "R9_ESCALATION_THRESHOLD" and not res.passed:
            return "ESCALATED"

    return "APPROVED"
