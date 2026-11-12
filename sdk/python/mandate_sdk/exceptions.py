"""
Mandate SDK Exceptions.
"""
from typing import List


class MandateError(Exception):
    """Base exception for all Mandate SDK operations."""
    pass


class IntentBlockedError(MandateError):
    """
    Raised when a payment request is rejected by the Mandate Gateway.
    Surfaces the exact deterministic rule violations and risk factors to the agent.
    """
    def __init__(self, message: str, reasons: List[str], risk_score: float):
        super().__init__(message)
        self.reasons = reasons
        self.risk_score = risk_score


class AuthenticationError(MandateError):
    """Raised when an agent API key or token is invalid or expired."""
    pass


class PermissionDeniedError(MandateError):
    """Raised when an agent lacks required scopes or accesses another tenant's resource."""
    pass


class ResourceNotFoundError(MandateError):
    """Raised when the requested mandate, intent, or escrow does not exist."""
    pass
