import hmac
import hashlib
import json
from datetime import datetime
from typing import Any, Dict, Optional, Tuple
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)


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


# -----------------------------------------------------------------------------
# Asymmetric Ed25519 Signatures (Production Standard)
# -----------------------------------------------------------------------------

def generate_ed25519_keypair() -> Tuple[str, str]:
    """
    Generate an Ed25519 key pair for a human mandate owner.
    Returns (private_key_hex, public_key_hex) as 64-character lowercase hex strings.
    """
    priv = Ed25519PrivateKey.generate()
    priv_hex = priv.private_bytes_raw().hex()
    pub_hex = priv.public_key().public_bytes_raw().hex()
    return priv_hex, pub_hex


def sign_policy_ed25519(policy_data: Dict[str, Any], private_key_hex: str) -> str:
    """
    Compute Ed25519 signature over canonical policy JSON.
    Returns 128-character lowercase hex signature.
    """
    canonical_str = canonicalize_policy(policy_data)
    data_bytes = canonical_str.encode("utf-8")
    priv_bytes = bytes.fromhex(private_key_hex)
    priv = Ed25519PrivateKey.from_private_bytes(priv_bytes)
    sig_bytes = priv.sign(data_bytes)
    return sig_bytes.hex()


def verify_policy_ed25519(policy_data: Dict[str, Any], signature_hex: str, public_key_hex: str) -> bool:
    """
    Verify Ed25519 signature against canonical policy JSON.
    """
    if not signature_hex or not public_key_hex:
        return False
    try:
        canonical_str = canonicalize_policy(policy_data)
        data_bytes = canonical_str.encode("utf-8")
        pub_bytes = bytes.fromhex(public_key_hex)
        sig_bytes = bytes.fromhex(signature_hex)
        pub = Ed25519PublicKey.from_public_bytes(pub_bytes)
        pub.verify(sig_bytes, data_bytes)
        return True
    except Exception:
        return False


# -----------------------------------------------------------------------------
# Symmetric HMAC-SHA256 Signatures (Demo Environment Only)
# -----------------------------------------------------------------------------

def sign_policy_hmac(policy_data: Dict[str, Any], secret_key: str) -> str:
    """Compute HMAC-SHA256 hex signature over canonical policy JSON."""
    canonical_str = canonicalize_policy(policy_data)
    key_bytes = secret_key.encode("utf-8")
    data_bytes = canonical_str.encode("utf-8")
    return hmac.new(key_bytes, data_bytes, hashlib.sha256).hexdigest()


def verify_policy_hmac(policy_data: Dict[str, Any], signature: str, secret_key: str) -> bool:
    """Constant-time verification of HMAC-SHA256 signature."""
    if not signature or not secret_key:
        return False
    expected_sig = sign_policy_hmac(policy_data, secret_key)
    return hmac.compare_digest(signature.lower(), expected_sig.lower())


# Backward-compatible alias for demo mode
sign_policy = sign_policy_hmac


# -----------------------------------------------------------------------------
# Unified Mandate Signature Verification (Rule R1)
# -----------------------------------------------------------------------------

def verify_mandate_signature(
    policy_data: Dict[str, Any],
    signature: str,
    signing_key: Optional[str] = None,
    public_key: Optional[str] = None,
    algorithm: Optional[str] = None,
    app_env: Optional[str] = None,
) -> bool:
    """
    Verify mandate cryptographic signature:
    - If algorithm is 'ed25519' or public_key is provided, verifies using Ed25519.
    - If algorithm is 'hmac-sha256' or public_key is omitted:
      ALLOWED ONLY when APP_ENV == 'demo'. In dev/prod, HMAC signatures are rejected.
    """
    if not signature:
        return False

    from app.config import settings
    env = app_env or settings.APP_ENV

    algo = algorithm
    if not algo or (algo == "ed25519" and not public_key):
        algo = "ed25519" if public_key else "hmac-sha256"

    if algo == "ed25519":
        if not public_key:
            return False
        return verify_policy_ed25519(policy_data, signature, public_key)
    elif algo == "hmac-sha256":
        # Section P3-03: Keep HMAC only for APP_ENV=demo
        if env != "demo":
            return False
        if not signing_key:
            return False
        return verify_policy_hmac(policy_data, signature, signing_key)

    return False
