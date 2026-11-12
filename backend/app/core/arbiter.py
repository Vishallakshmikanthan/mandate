import json
import logging
from typing import Dict, Any, Optional
from app.schemas.escrow import ArbiterVerdictOutput
from app.llm.provider import get_llm_provider
from app.llm.prompts.arbiter import (
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
    Impartial AI Arbiter evaluation.
    Scrutinizes submitted deliverable against contract spec acceptance criteria.
    Enforces confidence threshold: confidence < 0.70 forces NEEDS_HUMAN.
    """
    spec_json = json.dumps(spec, indent=2)
    user_prompt = ARBITER_USER_PROMPT_TEMPLATE.format(
        spec_json=spec_json,
        submission_notes=submission_notes or "No additional notes provided by seller.",
        content_ref=content_ref
    )

    provider = get_llm_provider()

    try:
        verdict_output: ArbiterVerdictOutput = await provider.complete_json(
            system_prompt=ARBITER_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            response_model=ArbiterVerdictOutput
        )
        verdict_output.model = getattr(provider, "model_name", "mock")
        verdict_output.prompt_version = "arbiter_v1.0"
    except Exception as exc:
        logger.error("Arbiter evaluation failed, defaulting to NEEDS_HUMAN: %s", exc)
        return ArbiterVerdictOutput(
            verdict="NEEDS_HUMAN",
            confidence=0.0,
            criteria_results=[],
            partial_ratio=0.0,
            explanation=f"Arbiter automated evaluation encountered an error ({type(exc).__name__}). Escalated for human adjudication.",
            model=getattr(provider, "model_name", "mock"),
            prompt_version="arbiter_v1.0"
        )

    # Enforce confidence cutoff rule
    if verdict_output.confidence < 0.70 and verdict_output.verdict != "NEEDS_HUMAN":
        verdict_output.verdict = "NEEDS_HUMAN"
        verdict_output.explanation = (
            f"Automated confidence ({verdict_output.confidence:.2f}) was below 0.70 threshold. "
            f"Escalated to human supervisor for manual review. {verdict_output.explanation}"
        )

    return verdict_output
