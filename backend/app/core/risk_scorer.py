import re
import unicodedata
import logging
from typing import List, Any, Tuple, Optional
from pydantic import BaseModel, Field
from app.llm.provider import get_llm_provider
from app.llm.prompts.risk_scorer import (
    PROMPT_VERSION,
    RISK_SCORER_SYSTEM_PROMPT,
    RISK_SCORER_USER_PROMPT_TEMPLATE,
)

logger = logging.getLogger("mandate.risk_scorer")


class RiskScoreOutput(BaseModel):
    risk_score: float = Field(..., ge=0.0, le=1.0)
    flags: List[str] = Field(default_factory=list)
    recommendation: str = Field(..., description="ALLOW, ESCALATE, or BLOCK")
    reasoning: str
    model_name: str = "mock"
    prompt_version: str = PROMPT_VERSION


HOMOGLYPH_MAP = str.maketrans({
    'а': 'a', 'с': 'c', 'е': 'e', 'і': 'i', 'ј': 'j', 'о': 'o', 'р': 'p', 'ѕ': 's', 'у': 'y', 'х': 'x',
    'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'І': 'I', 'Ј': 'J', 'К': 'K', 'М': 'M', 'О': 'O',
    'Р': 'P', 'Т': 'T', 'Х': 'X', 'Ү': 'Y'
})


def normalize_untrusted_text(text: Optional[str]) -> str:
    """
    Unicode NFKC normalization and strip zero-width / invisible control characters
    and bidi override characters to prevent unicode-smuggling attacks.
    """
    if not text:
        return ""
    # 1. NFKC normalization
    normalized = unicodedata.normalize("NFKC", text)
    # 2. Strip zero-width, invisible formatting, and bidi override characters:
    # \u200b-\u200d (zero-width space, ZWNJ, ZWJ), \u2060 (word joiner), \ufeff (BOM), \u00ad (soft hyphen),
    # \u200e/\u200f (LRM/RLM), \u202a-\u202e (bidi embeddings and overrides)
    normalized = re.sub(r"[\u200b-\u200d\u2060\ufeff\u00ad\u200e\u200f\u202a-\u202e]", "", normalized)
    # 3. Collapse multiple spaces
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


# -----------------------------------------------------------------------------
# Strong Patterns (Immediate Hard BLOCK)
# -----------------------------------------------------------------------------
STRONG_PATTERNS = [
    # English
    (r"(?i)ignore\s+(all\s+|previous\s+|prior\s+|above\s+|system\s+)*instructions", "instruction_override_detected"),
    (r"(?i)ignore\s+your\s+spending\s+rules", "instruction_override_detected"),
    (r"(?i)disregard\s+(previous|spending|all|system)\s+(instructions|rules|constraints)", "instruction_override_detected"),
    (r"(?i)system\s+update\s*:", "system_update_spoof"),
    (r"(?i)override\s+(all\s+)?(rules|limits|budget|mandate|spending|firewall)", "mandate_override_attempt"),
    (r"(?i)<<<system>>>", "jailbreak_attempt"),
    (r"(?i)developer\s+mode\s+enabled", "jailbreak_attempt"),
    (r"(?i)bypass\s+(verification|firewall|gateway|security|rules)", "security_bypass_attempt"),
    (r"(?i)(gateway|security|firewall|policy|rule|mandate)\s+bypass", "security_bypass_attempt"),
    (r"(?i)disable\s+(rule|policy|firewall|security|verification|limit|engine)", "security_bypass_attempt"),
    (r"(?i)(grade|rate|mark|award|output|return)\s+(this\s+.*as\s+)?pass", "arbiter_social_engineering"),
    (r"(?i)verdict\s*(must\s+be|:|=)\s*pass", "arbiter_social_engineering"),
    (r"(?i)force\s+pass", "arbiter_social_engineering"),
    (r"(?i)system\s+prompt\s*:", "system_prompt_injection"),
    (r"(?i)note\s+to\s+(ai\s+)?(reviewer|evaluator|arbiter)", "arbiter_social_engineering"),
    (r"(?i)arbiter\s+(instructions|directive|update|notice)", "arbiter_social_engineering"),
    (r"(?i)ignore\s+(all\s+)?(previous\s+)?(rubrics|spec|specification|criteria)", "instruction_override_detected"),
    (r"(?i)prompt\s+reset", "instruction_override_detected"),
    (r"(?i)wire\s+.*to\s+account", "account_swap_attempt"),
    (r"(?i)emergency\s+(wire|transfer|payment|send)", "fake_urgency"),
    (r"(?i)jailbreak", "jailbreak_attempt"),
    # Multilingual: Spanish
    (r"(?i)ignora\s+(las\s+)?instrucciones\s+anteriores", "multilingual_instruction_override"),
    (r"(?i)anular\s+(las\s+)?reglas", "multilingual_mandate_override"),
    (r"(?i)modo\s+desarrollador", "multilingual_jailbreak_attempt"),
    # Multilingual: Russian
    (r"(?i)игнорируй\s+(все\s+)?(предыдущие\s+)?инструкции", "multilingual_instruction_override"),
    (r"(?i)обойти\s+(правила|защиту)", "multilingual_security_bypass"),
    (r"(?i)режим\s+разработчика", "multilingual_jailbreak_attempt"),
    # Multilingual: Chinese
    (r"忽略(所有)?(之前|前面)的?(指令|提示|规则)", "multilingual_instruction_override"),
    (r"绕过(安全|防火墙|限制)", "multilingual_security_bypass"),
    (r"开发者模式", "multilingual_jailbreak_attempt"),
    # Multilingual: French
    (r"(?i)ignorer\s+les\s+instructions\s+précédentes", "multilingual_instruction_override"),
    (r"(?i)contourner\s+(la\s+sécurité|les\s+règles)", "multilingual_security_bypass"),
    # Multilingual: German
    (r"(?i)ignoriere\s+(alle\s+)?vorherigen?\s+anweisungen", "multilingual_instruction_override"),
    (r"(?i)übersteuerung\s+der\s+regeln", "multilingual_mandate_override"),
    # Multilingual: Portuguese
    (r"(?i)ignorar\s+(todas\s+as\s+)?instruções\s+anteriores", "multilingual_instruction_override"),
    # Multilingual: Italian
    (r"(?i)ignora\s+(le\s+|tutte\s+le\s+)?istruzioni", "multilingual_instruction_override"),
    # Multilingual: Dutch
    (r"(?i)negeer\s+(alle\s+)?(eerdere\s+)?instructies", "multilingual_instruction_override"),
    # Multilingual: Swedish
    (r"(?i)ignorera\s+(alla\s+)?tidigare\s+instruktioner", "multilingual_instruction_override"),
    # Multilingual: Polish
    (r"(?i)zignoruj\s+(wszystkie\s+)?poprzednie\s+instrukcje", "multilingual_instruction_override"),
    # Multilingual: Turkish
    (r"(?i)talimatları\s+yok\s+say", "multilingual_instruction_override"),
    # Multilingual: Vietnamese
    (r"(?i)bỏ\s+qua\s+tất\s+cả\s+hướng\s+dẫn", "multilingual_instruction_override"),
    # Multilingual: Japanese
    (r"(すべての)?(指示|ルール|命令)を無視", "multilingual_instruction_override"),
    # Multilingual: Korean
    (r"(모든\s+)?(이전\s+)?지침(을)?\s*무시", "multilingual_instruction_override"),
    # Multilingual: Arabic
    (r"تجاهل\s+(كافة|جميع)?\s*التعليمات", "multilingual_instruction_override"),
    # Multilingual: Greek
    (r"(?i)αγνοήστε\s+όλες\s+τις\s+προηγούμενες\s+οδηγίες", "multilingual_instruction_override"),
    # Multilingual: Hebrew
    (r"התעלם\s+מכל\s+ההוראות", "multilingual_instruction_override"),
    # Multilingual: Danish & Norwegian
    (r"(?i)ignorer\s+(alle\s+)?tidligere\s+(instruktioner|instruksjoner)", "multilingual_instruction_override"),
    # Multilingual: Finnish
    (r"(?i)ohita\s+kaikki\s+aiemmat\s+ohjeet", "multilingual_instruction_override"),
]

# -----------------------------------------------------------------------------
# Weak Patterns (Raise score toward ESCALATE to reduce false positives)
# -----------------------------------------------------------------------------
WEAK_PATTERNS = [
    (r"(?i)emergency\s+(wire|transfer|payment|send|fund)", "fake_urgency"),
    (r"(?i)wire\s+.*to\s+account", "account_swap_attempt"),
    (r"(?i)transfer\s+.*immediately", "fake_urgency"),
    (r"(?i)critical\s+security\s+alert", "social_engineering_urgency"),
    (r"(?i)urgent\s+(invoice|payment|bill|action\s+required)", "urgency_flag"),
    (r"(?i)pago\s+urgente", "multilingual_urgency_flag"),
    (r"(?i)transferir\s+inmediatamente", "multilingual_urgency_flag"),
    (r"(?i)срочный\s+перевод", "multilingual_urgency_flag"),
    (r"紧急付款", "multilingual_urgency_flag"),
    (r"立即转账", "multilingual_urgency_flag"),
    (r"(?i)paiement\s+urgent", "multilingual_urgency_flag"),
    (r"(?i)dringende\s+zahlung", "multilingual_urgency_flag"),
]


def run_injection_prefilter(text: Optional[str]) -> Tuple[bool, List[str], float]:
    """
    Deterministic pre-filter distinguishing between:
    - STRONG patterns (hard BLOCK, 0.98 score)
    - WEAK patterns (ESCALATE, 0.65 score) to avoid false-positive hard blocks
    """
    if not text:
        return False, [], 0.0

    normalized = normalize_untrusted_text(text)

    # 1. Check strong patterns
    strong_flags = []
    for pattern, flag in STRONG_PATTERNS:
        if re.search(pattern, normalized):
            if flag not in strong_flags:
                strong_flags.append(flag)

    # 1b. Check transliterated homoglyphs to detect unicode-smuggled English attacks (e.g. іgnоrе)
    latin_view = normalized.translate(HOMOGLYPH_MAP)
    if latin_view != normalized:
        for pattern, flag in STRONG_PATTERNS:
            if re.search(pattern, latin_view):
                if flag not in strong_flags:
                    strong_flags.append(flag)

    # 1c. Check de-spaced text to detect spaced character evasion (e.g. i g n o r e)
    despaced = re.sub(r"(?<=\b[a-zA-Z])\s+(?=[a-zA-Z]\b)", "", latin_view)
    if despaced != latin_view:
        for pattern, flag in STRONG_PATTERNS:
            if re.search(pattern, despaced):
                if flag not in strong_flags:
                    strong_flags.append(flag)

    if strong_flags:
        return True, strong_flags, 0.98

    # 2. Check weak patterns
    weak_flags = []
    for pattern, flag in WEAK_PATTERNS:
        if re.search(pattern, normalized):
            if flag not in weak_flags:
                weak_flags.append(flag)

    if weak_flags:
        return True, weak_flags, 0.65

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
    source_context: Optional[str] = None,
    llm_provider: Optional[Any] = None
) -> RiskScoreOutput:
    """
    Evaluate risk of payment intent using NFKC normalization, deterministic prefilter,
    and LLM scorer. Strictly obeys tighten-only invariant and fails closed on error.
    """
    clean_desc = normalize_untrusted_text(description)
    clean_ctx = normalize_untrusted_text(source_context)
    combined_text = f"{clean_desc} {clean_ctx}"

    prefilter_hit, prefilter_flags, prefilter_score = run_injection_prefilter(combined_text)

    # Format user prompt
    user_prompt = RISK_SCORER_USER_PROMPT_TEMPLATE.format(
        counterparty=counterparty,
        merchant_category=merchant_category,
        amount_minor=amount_minor,
        amount_dollars=amount_minor / 100.0,
        currency=currency,
        description=clean_desc,
        source_context=clean_ctx or "No upstream chat context provided."
    )

    provider = llm_provider or get_llm_provider()

    try:
        output: RiskScoreOutput = await provider.complete_json(
            system_prompt=RISK_SCORER_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_model=RiskScoreOutput
        )
        output.model_name = getattr(provider, "model_name", "mock")
        output.prompt_version = PROMPT_VERSION
    except Exception as exc:
        logger.error("LLM Risk Scorer failed, failing closed: %s", exc)
        return RiskScoreOutput(
            risk_score=0.90,
            flags=["llm_evaluation_failed", "fail_closed_active"],
            recommendation="BLOCK",
            reasoning=f"LLM risk scoring failed ({type(exc).__name__}). System failed closed for security.",
            model_name=getattr(provider, "model_name", "mock"),
            prompt_version=PROMPT_VERSION
        )

    # Apply deterministic prefilter tighten-only overrides
    if prefilter_hit:
        combined_flags = list(set(output.flags + prefilter_flags))
        if prefilter_score >= 0.80:
            return RiskScoreOutput(
                risk_score=max(output.risk_score, prefilter_score),
                flags=combined_flags,
                recommendation="BLOCK",
                reasoning=f"Deterministic injection pre-filter triggered hard BLOCK: {', '.join(prefilter_flags)}. {output.reasoning}",
                model_name=getattr(provider, "model_name", "mock"),
                prompt_version=PROMPT_VERSION
            )
        else:
            final_rec = "BLOCK" if output.recommendation == "BLOCK" else "ESCALATE"
            return RiskScoreOutput(
                risk_score=max(output.risk_score, prefilter_score),
                flags=combined_flags,
                recommendation=final_rec,
                reasoning=f"Deterministic pre-filter triggered ESCALATE: {', '.join(prefilter_flags)}. {output.reasoning}",
                model_name=getattr(provider, "model_name", "mock"),
                prompt_version=PROMPT_VERSION
            )

    return output
