import os
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.core.audit import verify_audit_chain, GENESIS_HASH
from app.core.mandate_signing import (
    canonicalize_policy,
    generate_ed25519_keypair,
    sign_policy_ed25519,
    verify_policy_ed25519,
)

logger = logging.getLogger("mandate.checkpoint")

# In-memory store fallback for fast testing & environments without persistent disk
_IN_MEMORY_CHECKPOINTS: List[Dict[str, Any]] = []

# Persistent system audit anchoring keypair (Ed25519)
_SYSTEM_AUDIT_PRIV: Optional[str] = None
_SYSTEM_AUDIT_PUB: Optional[str] = None


def get_checkpoint_keypair() -> tuple[str, str]:
    """Get or generate the system audit checkpoint signing keypair."""
    global _SYSTEM_AUDIT_PRIV, _SYSTEM_AUDIT_PUB
    if _SYSTEM_AUDIT_PRIV is None or _SYSTEM_AUDIT_PUB is None:
        priv_env = os.environ.get("AUDIT_CHECKPOINT_PRIVATE_KEY")
        pub_env = os.environ.get("AUDIT_CHECKPOINT_PUBLIC_KEY")
        if priv_env and pub_env:
            _SYSTEM_AUDIT_PRIV = priv_env
            _SYSTEM_AUDIT_PUB = pub_env
        else:
            _SYSTEM_AUDIT_PRIV, _SYSTEM_AUDIT_PUB = generate_ed25519_keypair()
    return _SYSTEM_AUDIT_PRIV, _SYSTEM_AUDIT_PUB


def get_checkpoint_storage_dir() -> str:
    """Directory path for external immutable audit checkpoints."""
    d = os.environ.get("AUDIT_CHECKPOINT_DIR", os.path.join("data", "checkpoints"))
    os.makedirs(d, exist_ok=True)
    return d


def clear_checkpoints_for_testing() -> None:
    """Reset checkpoint state (for test isolation)."""
    global _IN_MEMORY_CHECKPOINTS
    _IN_MEMORY_CHECKPOINTS.clear()
    storage_dir = get_checkpoint_storage_dir()
    if os.path.exists(storage_dir):
        import shutil
        shutil.rmtree(storage_dir, ignore_errors=True)


def publish_checkpoint(db: Session, force: bool = False) -> Dict[str, Any]:
    """
    Produce a signed cryptographic checkpoint of the current audit head
    and publish it outside the database to external immutable storage.
    """
    priv_hex, pub_hex = get_checkpoint_keypair()

    latest_entry = db.query(AuditLog).order_by(AuditLog.id.desc()).first()
    record_count = db.query(AuditLog).count()
    head_hash = latest_entry.hash if latest_entry else GENESIS_HASH
    now_ts = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    checkpoint_id = f"chk_{uuid.uuid4().hex[:16]}"
    checkpoint_payload = {
        "checkpoint_id": checkpoint_id,
        "head_hash": head_hash,
        "record_count": record_count,
        "timestamp": now_ts,
        "algorithm": "ed25519",
        "public_key": pub_hex,
    }

    # Sign canonical checkpoint JSON with Ed25519
    signature = sign_policy_ed25519(checkpoint_payload, priv_hex)
    checkpoint_payload["signature"] = signature

    # 1. Publish to in-memory log
    _IN_MEMORY_CHECKPOINTS.append(dict(checkpoint_payload))

    # 2. Publish to external file storage (outside DB)
    try:
        storage_dir = get_checkpoint_storage_dir()
        chk_file = os.path.join(storage_dir, f"{checkpoint_id}.json")
        with open(chk_file, "w", encoding="utf-8") as f:
            json.dump(checkpoint_payload, f, indent=2)

        latest_pointer = os.path.join(storage_dir, "latest.json")
        with open(latest_pointer, "w", encoding="utf-8") as f:
            json.dump(checkpoint_payload, f, indent=2)
    except Exception as e:
        logger.warning(f"Could not write external checkpoint file: {e}")

    logger.info(f"Published audit checkpoint {checkpoint_id} (count={record_count}, head={head_hash[:16]}...)")
    return checkpoint_payload


def get_latest_external_checkpoint() -> Optional[Dict[str, Any]]:
    """Retrieve the latest external signed audit checkpoint."""
    # Check in-memory store first
    if _IN_MEMORY_CHECKPOINTS:
        return _IN_MEMORY_CHECKPOINTS[-1]

    # Check external file storage
    try:
        storage_dir = get_checkpoint_storage_dir()
        latest_pointer = os.path.join(storage_dir, "latest.json")
        if os.path.exists(latest_pointer):
            with open(latest_pointer, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"Could not read latest external checkpoint: {e}")

    return None


def verify_checkpoint_signature(checkpoint: Dict[str, Any]) -> bool:
    """Verify cryptographic Ed25519 signature on an external checkpoint."""
    sig = checkpoint.get("signature")
    pub_key = checkpoint.get("public_key")
    if not sig or not pub_key:
        return False

    payload_to_verify = {
        "checkpoint_id": checkpoint["checkpoint_id"],
        "head_hash": checkpoint["head_hash"],
        "record_count": checkpoint["record_count"],
        "timestamp": checkpoint["timestamp"],
        "algorithm": checkpoint.get("algorithm", "ed25519"),
        "public_key": pub_key,
    }
    return verify_policy_ed25519(payload_to_verify, sig, pub_key)


def verify_audit_against_checkpoints(db: Session) -> Dict[str, Any]:
    """
    Verify the audit log integrity against both the internal hash chain
    and the latest external signed anchor checkpoint.
    Detects if the database chain was modified or completely rewritten.
    """
    # 1. Verify internal chain continuity
    internal_res = verify_audit_chain(db)
    if not internal_res["valid"]:
        internal_res["checkpoint_verified"] = False
        internal_res["external_checkpoint"] = None
        return internal_res

    latest_chk = get_latest_external_checkpoint()
    if not latest_chk:
        internal_res["checkpoint_verified"] = None
        internal_res["external_checkpoint"] = None
        internal_res["message"] += " (No external anchor checkpoints recorded yet)"
        return internal_res

    # 2. Verify signature on the checkpoint itself
    if not verify_checkpoint_signature(latest_chk):
        return {
            "valid": False,
            "total_records": internal_res["total_records"],
            "head_hash": internal_res.get("head_hash"),
            "verified_at": datetime.now(timezone.utc),
            "broken_link_id": None,
            "checkpoint_verified": False,
            "external_checkpoint": latest_chk,
            "message": "External checkpoint signature verification failed: anchor tampering detected!"
        }

    chk_count = latest_chk["record_count"]
    chk_head_hash = latest_chk["head_hash"]
    total_db_records = internal_res["total_records"]

    # 3. Check for database truncation
    if total_db_records < chk_count:
        return {
            "valid": False,
            "total_records": total_db_records,
            "head_hash": internal_res.get("head_hash"),
            "verified_at": datetime.now(timezone.utc),
            "broken_link_id": None,
            "checkpoint_verified": False,
            "external_checkpoint": latest_chk,
            "message": f"External checkpoint mismatch: database has {total_db_records} records, but external anchor records {chk_count} records. Database truncation detected!"
        }

    # 4. Check record hash at checkpoint's height
    if chk_count == 0:
        target_hash = GENESIS_HASH
        anchored_entry = None
    else:
        anchored_entry = db.query(AuditLog).order_by(AuditLog.id.asc()).offset(chk_count - 1).first()
        target_hash = anchored_entry.hash if anchored_entry else None

    if target_hash != chk_head_hash:
        return {
            "valid": False,
            "total_records": total_db_records,
            "head_hash": internal_res.get("head_hash"),
            "verified_at": datetime.now(timezone.utc),
            "broken_link_id": anchored_entry.id if anchored_entry else None,
            "checkpoint_verified": False,
            "external_checkpoint": latest_chk,
            "message": f"External checkpoint mismatch: anchor head hash '{chk_head_hash[:16]}...' does not match database record hash '{str(target_hash)[:16]}...' at count {chk_count}. Entire chain rewrite detected!"
        }

    # All checks passed
    internal_res["checkpoint_verified"] = True
    internal_res["external_checkpoint"] = latest_chk
    internal_res["message"] += f" Verified against external anchor checkpoint '{latest_chk.get('checkpoint_id')}'."
    return internal_res
