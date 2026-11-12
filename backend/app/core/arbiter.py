import json
import asyncio
import logging
from typing import Dict, Any, Optional
from app.schemas.escrow import ArbiterVerdictOutput
from app.llm.provider import get_llm_provider
from app.llm.prompts.arbiter import (
    PROMPT_VERSION,
    ARBITER_SYSTEM_PROMPT,
    ARBITER_USER_PROMPT_TEMPLATE,
)

logger = logging.getLogger("mandate.arbiter")


async def evaluate_deliverable_arbitration(
    spec: Dict[str, Any],
    content_ref: str,
    submission_notes: Optional[str] = None
) -> ArbiterVerdictOutput:
    """
    Impartial AI Arbiter evaluation with dual-run self-consistency verification.
    Executes two independent runs at temperature 0:
    - Any disagreement in verdict -> automatically forces NEEDS_HUMAN.
    - If both agree on PARTIAL -> selects the lower partial release ratio.
    - If confidence < 0.70 -> forces NEEDS_HUMAN.
    """
    spec_json = json.dumps(spec, indent=2)
    user_prompt = ARBITER_USER_PROMPT_TEMPLATE.format(
        spec_json=spec_json,
        submission_notes=submission_notes or "No additional notes provided by seller.",
        content_ref=content_ref
    )

    provider = get_llm_provider()

    async def _single_run() -> ArbiterVerdictOutput:
        try:
            verdict_output: ArbiterVerdictOutput = await provider.complete_json(
                system_prompt=ARBITER_SYSTEM_PROMPT,
                user_prompt=user_prompt,
                response_model=ArbiterVerdictOutput
            )
            verdict_output.model = getattr(provider, "model_name", "mock")
            verdict_output.prompt_version = PROMPT_VERSION
            return verdict_output
        except Exception as exc:
            logger.error("Arbiter evaluation run failed: %s", exc)
            return ArbiterVerdictOutput(
                verdict="NEEDS_HUMAN",
                confidence=0.0,
                criteria_results=[],
                partial_ratio=0.0,
                explanation=f"Arbiter automated evaluation failed ({type(exc).__name__}). Escalated to human supervisor.",
                model=getattr(provider, "model_name", "mock"),
                prompt_version=PROMPT_VERSION
            )

    # Execute two independent evaluation runs (Self-Consistency Protocol)
    eval1, eval2 = await asyncio.gather(_single_run(), _single_run())

    # Self-consistency comparison
    if eval1.verdict != eval2.verdict:
        logger.warning(
            "Arbiter self-consistency disagreement: '%s' vs '%s'. Forcing NEEDS_HUMAN.",
            eval1.verdict, eval2.verdict
        )
        return ArbiterVerdictOutput(
            verdict="NEEDS_HUMAN",
            confidence=min(eval1.confidence, eval2.confidence),
            criteria_results=eval1.criteria_results or eval2.criteria_results,
            partial_ratio=min(eval1.partial_ratio, eval2.partial_ratio),
            explanation=(
                f"Arbiter self-consistency disagreement: Run 1 evaluated '{eval1.verdict}' "
                f"while Run 2 evaluated '{eval2.verdict}'. Escalated for human review."
            ),
            model=getattr(provider, "model_name", "mock"),
            prompt_version=PROMPT_VERSION
        )

    # Both runs agreed on verdict
    final_verdict = eval1.verdict
    final_confidence = min(eval1.confidence, eval2.confidence)
    final_partial_ratio = min(eval1.partial_ratio, eval2.partial_ratio)
    final_criteria = eval1.criteria_results
    final_explanation = eval1.explanation

    # Enforce confidence cutoff rule (< 0.70 forces NEEDS_HUMAN)
    if final_confidence < 0.70 and final_verdict != "NEEDS_HUMAN":
        final_verdict = "NEEDS_HUMAN"
        final_explanation = (
            f"Automated confidence ({final_confidence:.2f}) was below 0.70 threshold. "
            f"Escalated to human supervisor for manual review. {final_explanation}"
        )

    return ArbiterVerdictOutput(
        verdict=final_verdict,
        confidence=final_confidence,
        criteria_results=final_criteria,
        partial_ratio=final_partial_ratio,
        explanation=final_explanation,
        model=getattr(provider, "model_name", "mock"),
        prompt_version=PROMPT_VERSION
    )
