"""
Core Cost Control and Safety Guards Module.
Enforces:
1. Per-mandate daily LLM cost caps to prevent runaway AI spending.
2. Per-negotiation / per-scenario turn caps to prevent infinite autonomous agent loops.
"""
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger("mandate.cost_control")


class CostControlError(Exception):
    """Base exception for cost control violations."""
    pass


class LLMCostCapExceededError(CostControlError):
    """Raised when an operation would exceed the mandate's daily LLM cost cap."""
    pass


class NegotiationTurnCapExceededError(CostControlError):
    """Raised when an agent-to-agent negotiation loop exceeds maximum turn depth."""
    pass


class CostController:
    """Tracks and enforces LLM usage costs and scenario turn caps."""

    def __init__(self, default_daily_cost_cap_cents: float = 500.0, default_max_turns: int = 10):
        self.default_daily_cost_cap_cents = default_daily_cost_cap_cents
        self.default_max_turns = default_max_turns

        # In-memory daily cost tracking: (mandate_id, YYYY-MM-DD) -> total_cents
        self._daily_costs_cents: Dict[str, float] = {}

        # In-memory turn tracking: scenario_or_conv_id -> turn_count
        self._turns: Dict[str, int] = {}

    def _get_day_key(self, mandate_id: str) -> str:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        return f"{mandate_id}:{today}"

    def get_current_daily_cost_cents(self, mandate_id: str) -> float:
        return self._daily_costs_cents.get(self._get_day_key(mandate_id), 0.0)

    def check_and_record_llm_cost(
        self,
        mandate_id: str,
        cost_cents: float,
        mandate_policy: Optional[Dict[str, Any]] = None
    ) -> float:
        """
        Validates whether adding cost_cents exceeds the mandate's daily LLM budget.
        If exceeded, raises LLMCostCapExceededError (fail-closed).
        Otherwise, records the cost and returns the updated daily total.
        """
        day_key = self._get_day_key(mandate_id)
        current_spent = self._daily_costs_cents.get(day_key, 0.0)

        # Allow mandate policy to override default daily cap
        cap_cents = self.default_daily_cost_cap_cents
        if mandate_policy and "daily_llm_cost_cap_cents" in mandate_policy:
            cap_cents = float(mandate_policy["daily_llm_cost_cap_cents"])

        projected = current_spent + cost_cents
        if projected > cap_cents:
            logger.error(
                "Mandate %s exceeded daily LLM cost cap: current=%.2f¢, proposed=%.2f¢, cap=%.2f¢",
                mandate_id, current_spent, cost_cents, cap_cents
            )
            raise LLMCostCapExceededError(
                f"Mandate daily LLM cost cap of ${cap_cents/100:.2f} exceeded "
                f"(current spend: ${current_spent/100:.2f}, attempted: +${cost_cents/100:.2f}). "
                "Operation halted to protect treasury."
            )

        self._daily_costs_cents[day_key] = projected
        return projected

    def increment_and_check_turns(
        self,
        session_id: str,
        max_turns: Optional[int] = None
    ) -> int:
        """
        Increments conversation turn count and asserts turn limit.
        If turn limit exceeded, raises NegotiationTurnCapExceededError.
        """
        limit = max_turns if max_turns is not None else self.default_max_turns
        current = self._turns.get(session_id, 0) + 1
        self._turns[session_id] = current

        if current > limit:
            logger.warning("Session %s exceeded max turn cap (%d > %d)", session_id, current, limit)
            raise NegotiationTurnCapExceededError(
                f"Autonomous negotiation exceeded maximum allowable turns ({current}/{limit}). "
                "Halted loop and escalated to human supervisor."
            )

        return current

    def reset_session(self, session_id: str):
        """Clears turn counters for a completed or aborted session."""
        self._turns.pop(session_id, None)


# Global singleton instance
cost_controller = CostController()

