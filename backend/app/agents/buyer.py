import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("mandate.agents.buyer")


class BuyerAgent:
    """
    Autonomous Buyer Agent acting under a signed Mandate.
    Key Security Architecture:
    - The Buyer Agent NEVER possesses PayPal API credentials or raw private keys.
    - It can only propose PaymentIntent objects to the Mandate Gateway.
    - System prompts advise it on limits, but the Mandate Gateway enforces them unconditionally.
    """

    def __init__(self, agent_id: str = "buyer_agent_alpha", mandate_id: Optional[str] = None):
        self.agent_id = agent_id
        self.mandate_id = mandate_id

    def formulate_initial_offer(self, service_description: str, budget_minor: int) -> Dict[str, Any]:
        """Formulate an initial inquiry and offer to sellers."""
        return {
            "service": service_description,
            "proposed_budget_minor": budget_minor,
            "currency": "USD",
            "message": f"Hello, I am looking to commission '{service_description}'. My target budget is ${budget_minor/100:.2f}."
        }

    def evaluate_counter_offer(self, counter_offer: Dict[str, Any], max_tolerable_minor: int) -> Dict[str, Any]:
        """Evaluate a seller's quote or counter-offer."""
        price_minor = counter_offer.get("price_minor", 0)
        if price_minor <= max_tolerable_minor:
            return {
                "accepted": True,
                "agreed_price_minor": price_minor,
                "message": f"Offer of ${price_minor/100:.2f} is acceptable. Proceeding to submit intent to Mandate Gateway."
            }
        else:
            return {
                "accepted": False,
                "agreed_price_minor": None,
                "message": f"Quote of ${price_minor/100:.2f} exceeds our budget ceiling of ${max_tolerable_minor/100:.2f}."
            }
