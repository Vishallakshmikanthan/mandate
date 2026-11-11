import hmac
import hashlib
import json
from datetime import datetime
from typing import Any, Dict


def serialize_value(v: Any) -> Any:
    """Normalize values for canonical JSON representation."""
    if isinstance(v, datetime):
        return v.isoformat().replace("+00:00", "Z")
    if isinstance(v, dict):
        return {k: serialize_value(val) for k, val in sorted(v.items())}
    if isinstance(v, list):
        return [serialize_value(x) for x in v]
    return v


def canonicalize_policy(policy_data: Dict[str, Any]) -> str:
    """
    Produce deterministic canonical JSON string:
    - Alphabetically sorted keys
    - Normalized values
    - No whitespace between delimiters
    """
    normalized = {k: serialize_value(v) for k, v in sorted(policy_data.items())}
    return json.dumps(normalized, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sign_policy(policy_data: Dict[str, Any], secret_key: str) -> str:
    """Compute HMAC-SHA256 hex signature over canonical policy JSON."""
    canonical_str = canonicalize_policy(policy_data)
    key_bytes = secret_key.encode("utf-8")
    data_bytes = canonical_str.encode("utf-8")
    return hmac.new(key_bytes, data_bytes, hashlib.sha256).hexdigest()


def verify_mandate_signature(policy_data: Dict[str, Any], signature: str, secret_key: str) -> bool:
    """Constant-time verification of HMAC-SHA256 signature."""
    if not signature:
        return False
    expected_sig = sign_policy(policy_data, secret_key)
    return hmac.compare_digest(signature.lower(), expected_sig.lower())
