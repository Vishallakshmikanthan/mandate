"""
Mandate SDK - The Trust Layer for AI Agents That Spend Money.
Official Python client library for integrating autonomous agents with Mandate.
"""
from .client import MandateClient
from .models import (
    RuleReason,
    PaymentIntentResult,
    MandateBalanceResult,
    DeliverableResult
)
from .exceptions import (
    MandateError,
    IntentBlockedError,
    AuthenticationError,
    PermissionDeniedError,
    ResourceNotFoundError
)

__version__ = "1.0.0"
__all__ = [
    "MandateClient",
    "RuleReason",
    "PaymentIntentResult",
    "MandateBalanceResult",
    "DeliverableResult",
    "MandateError",
    "IntentBlockedError",
    "AuthenticationError",
    "PermissionDeniedError",
    "ResourceNotFoundError"
]
