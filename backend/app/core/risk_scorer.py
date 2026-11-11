import re
import logging
from typing import List, Dict, Any, Tuple, Optional
from pydantic import BaseModel, Field
from app.llm.provider import get_llm_provider
from app.llm.prompts.risk_scorer import (
    RISK_SCORER_SYSTEM_PROMPT,
    RISK_SCORER_USER_PROMPT_TEMPLATE,
)

logger = logging.getLogger("mandate.risk_scorer")


class RiskScoreOutput(BaseModel):
    risk_score: float = Field(..., ge=0.0, le=1.0)
    flags: List[str] = Field(default_factory=list)
    recommendation: str = Field(..., description="ALLOW, ESCALATE, or BLOCK")
    reasoning: str


# Comprehensive adversarial injection patterns
INJECTION_PATTERNS = [
    (r"(?i)ignore\s+(all\s+)?(previous|prior|above|system)\s+instructions", "instruction_override_detected"),
    (r"(?i)ignore\s+your\s+spending\s+rules", "instruction_override_detected"),
    (r"(?i)system\s+update", "system_update_spoof"),
    (r"(?i)override\s+(all\s+)?(rules|limits|budget|mandate|spending)", "mandate_override_attempt"),
    (r"(?i)emergency\s+(wire|transfer|payment|send)", "fake_urgency"),
    (r"(?i)wire\s+.*to\s+account", "account_swap_attempt"),
    (r"(?i)transfer\s+.*immediately", "fake_urgency"),
    (r"(?i)new\s+system\s+directive", "instruction_override_detected"),
    (r"(?i)(arbiter|system)\s+instructions?\s+update", "instruction_override_detected"),
    (r"(?i)<<<SYSTEM>>>", "jailbreak_attempt"),
    (r"(?i)grade\s+this\s+deliverable\s+as.*pass", "arbiter_social_engineering"),
    (r"(?i)bypass\s+(verification|firewall|gateway|rules)", "security_bypass_attempt"),
    (r"(?i)disregard\s+(previous|spending|all)\s+constraints", "instruction_override_detected"),
    (r"(?i)developer\s+mode\s+enabled", "jailbreak_attempt"),
    (r"(?i)critical\s+security\s+alert.*transfer", "social_engineering"),
]


def run_injection_prefilter(text: Optional[str]) -> Tuple[bool, List[str], float]:
    """
    Deterministic regex pre-filter for adversarial prompt injections.
    Short-circuits or raises risk score before/alongside LLM evaluation.
    """
    if not text:
        return False, [], 0.0

    detected_flags = []
    for pattern, flag in INJECTION_PATTERNS:
        if re.search(pattern, text):
            if flag not in detected_flags:
                detected_flags.append(flag)

    if detected_flags:
        return True, detected_flags, 0.98

    return False, [], 0.0


def apply_tighten_only_rule(
    deterministic_verdict: str,
    risk_recommendation: str,
    risk_score: float
) -> Tuple[str, str]:
    """
    Core security invariant: LLM and Risk Scorer can ONLY tighten decisions.
    Tightening order: APPROVED -> ESCALATED -> BLOCKED.
    The LLM cannot loosen a BLOCKED or ESCALATED verdict under any circumstance.
    """
    if deterministic_verdict == "BLOCKED":
        return "BLOCKED", "Deterministic policy engine rule failed. Policy engine has final authority."

    # If deterministic is ESCALATED:
    if deterministic_verdict == "ESCALATED":
        if risk_recommendation == "BLOCK" or risk_score >= 0.80:
            return "BLOCKED", f"Deterministic engine escalated, but Risk Scorer escalated to BLOCK (score: {risk_score:.2f})."
        return "ESCALATED", "Escalated for human review by policy engine threshold."

    # If deterministic is APPROVED:
    if deterministic_verdict == "APPROVED":
        if risk_recommendation == "BLOCK" or risk_score >= 0.80:
            return "BLOCKED", f"Deterministic rules passed, but Risk Scorer flagged severe threat (score: {risk_score:.2f})."
        elif risk_recommendation == "ESCALATE" or risk_score >= 0.50:
            return "ESCALATED", f"Deterministic rules passed, but Risk Scorer flagged anomaly requiring human review (score: {risk_score:.2f})."
        return "APPROVED", "All deterministic checks passed and risk score is low."

    return deterministic_verdict, "Standard evaluation completed."


async def score_intent_risk(
    counterparty: str,
    merchant_category: str,
    amount_minor: int,
    currency: str,
    description: str,
    source_context: Optional[str] = None
) -> RiskScoreOutput:
    """
    Evaluate risk of payment intent using deterministic pre-filter and LLM scorer.
    """
    combined_text = f"{description or ''} {source_context or ''}"
    prefilter_hit, prefilter_flags, prefilter_score = run_injection_prefilter(combined_text)

    # Format user prompt
    user_prompt = RISK_SCORER_USER_PROMPT_TEMPLATE.format(
        counterparty=counterparty,
        merchant_category=merchant_category,
        amount_minor=amount_minor,
        amount_dollars=amount_minor / 100.0,
        currency=currency,
        description=description,
        source_context=source_context or "No upstream chat context provided."
    )

    provider = get_llm_provider()

    try:
        output: RiskScoreOutput = await provider.complete_json(
            system_prompt=RISK_SCORER_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_model=RiskScoreOutput
        )
    except Exception as exc:
        logger.error("LLM Risk Scorer failed, failing closed: %s", exc)
        # Fail-closed principle: if LLM fails, block or escalate
        return RiskScoreOutput(
            risk_score=0.85,
            flags=["llm_evaluation_failed", "fail_closed_active"],
            recommendation="BLOCK",
            reasoning=f"LLM risk scoring failed ({type(exc).__name__}). System failed closed for security."
        )

    # If deterministic pre-filter detected injection, guarantee it overrides to BLOCK
    if prefilter_hit:
        combined_flags = list(set(output.flags + prefilter_flags))
        return RiskScoreOutput(
            risk_score=max(output.risk_score, prefilter_score),
            flags=combined_flags,
            recommendation="BLOCK",
            reasoning=f"Deterministic injection pre-filter triggered: {', '.join(prefilter_flags)}. {output.reasoning}"
        )

    return output
