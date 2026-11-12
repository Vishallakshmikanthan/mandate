import pytest
from datetime import datetime, timezone
from app.core.mandate_signing import (
    generate_ed25519_keypair,
    sign_policy_ed25519,
    verify_policy_ed25519,
    sign_policy_hmac,
    verify_mandate_signature,
    canonicalize_policy,
)
from app.core.policy_engine import evaluate_policy_rules
from app.models.mandate import Mandate
from app.models.user import User
from app.models.user_key import UserKey
from app.core.auth import hash_password, create_session_token


@pytest.fixture
def test_policy():
    return {
        "version": 1,
        "currency": "USD",
        "max_total_minor": 100000,
        "max_per_transaction_minor": 25000,
        "daily_limit_minor": 50000,
        "allowed_merchant_categories": ["freelance_design", "software_services"],
        "allowed_counterparties": ["seller_agent_verified"],
        "blocked_counterparties": ["scammer_bot"],
        "allowed_hours_utc": {"start": "00:00", "end": "23:59"},
        "velocity": {"max_txns_per_hour": 10},
        "escalate_above_minor": 15000,
        "require_escrow": True,
        "expires_at": "2030-01-01T00:00:00Z",
    }


def test_ed25519_keypair_generation_and_verification(test_policy):
    priv_hex, pub_hex = generate_ed25519_keypair()
    assert len(priv_hex) == 64
    assert len(pub_hex) == 64

    # Sign canonical policy
    sig = sign_policy_ed25519(test_policy, priv_hex)
    assert len(sig) == 128  # 64 bytes = 128 hex chars

    # Verify signature
    assert verify_policy_ed25519(test_policy, sig, pub_hex) is True

    # Tampered policy must fail
    tampered = dict(test_policy)
    tampered["max_per_transaction_minor"] = 999999
    assert verify_policy_ed25519(tampered, sig, pub_hex) is False

    # Wrong public key must fail
    _, wrong_pub = generate_ed25519_keypair()
    assert verify_policy_ed25519(test_policy, sig, wrong_pub) is False


def test_hmac_rejected_outside_demo(test_policy):
    hmac_sig = sign_policy_hmac(test_policy, "super_secret_signing_key_32_bytes_min!")

    # Allowed in demo mode
    assert verify_mandate_signature(
        policy_data=test_policy,
        signature=hmac_sig,
        signing_key="super_secret_signing_key_32_bytes_min!",
        algorithm="hmac-sha256",
        app_env="demo"
    ) is True

    # Strictly rejected in prod mode
    assert verify_mandate_signature(
        policy_data=test_policy,
        signature=hmac_sig,
        signing_key="super_secret_signing_key_32_bytes_min!",
        algorithm="hmac-sha256",
        app_env="prod"
    ) is False


def test_policy_edited_directly_in_db_fails_r1(db_session, test_policy):
    """Acceptance criterion: a policy edited directly in the DB fails R1."""
    priv_hex, pub_hex = generate_ed25519_keypair()
    sig = sign_policy_ed25519(test_policy, priv_hex)

    # Create owner and register key
    owner = User(
        id="usr_owner_ed25519_test",
        email="ed25519_owner@example.com",
        password_hash=hash_password("password123"),
        role="USER"
    )
    user_key = UserKey(
        id="uk_test_1",
        user_id=owner.id,
        key_id="key_ed25519_v1",
        public_key=pub_hex,
        algorithm="ed25519",
        status="ACTIVE"
    )
    mandate = Mandate(
        id="mnd_ed25519_test_1",
        owner_id=owner.id,
        agent_id="buyer_agent_1",
        policy=dict(test_policy),
        signature=sig,
        public_key=pub_hex,
        key_id="key_ed25519_v1",
        signature_algorithm="ed25519",
        status="ACTIVE",
        expires_at=datetime(2030, 1, 1, tzinfo=timezone.utc)
    )
    db_session.add_all([owner, user_key, mandate])
    db_session.commit()

    # Initial evaluation: R1 passes
    res = evaluate_policy_rules(
        policy=mandate.policy,
        mandate_signature=mandate.signature,
        mandate_status=mandate.status,
        signing_key="dummy_key",
        amount_minor=10000,
        currency="USD",
        counterparty="seller_agent_verified",
        merchant_category="freelance_design",
        mandate_public_key=mandate.public_key,
        mandate_algorithm=mandate.signature_algorithm,
        mandate_owner_id=mandate.owner_id,
        owner_public_keys=[pub_hex],
    )
    r1 = next(r for r in res if r.rule == "R1_MANDATE_VALID")
    assert r1.passed is True
    assert "Ed25519 asymmetric signature verified" in r1.detail

    # Directly modify policy in the DB (simulating insider or attacker DB modification)
    mandate.policy = dict(mandate.policy)
    mandate.policy["max_total_minor"] = 99999999
    db_session.commit()

    # Re-evaluate: R1 MUST FAIL due to signature mismatch
    res_tampered = evaluate_policy_rules(
        policy=mandate.policy,
        mandate_signature=mandate.signature,
        mandate_status=mandate.status,
        signing_key="dummy_key",
        amount_minor=10000,
        currency="USD",
        counterparty="seller_agent_verified",
        merchant_category="freelance_design",
        mandate_public_key=mandate.public_key,
        mandate_algorithm=mandate.signature_algorithm,
        mandate_owner_id=mandate.owner_id,
        owner_public_keys=[pub_hex],
    )
    r1_tampered = next(r for r in res_tampered if r.rule == "R1_MANDATE_VALID")
    assert r1_tampered.passed is False
    assert "Cryptographic signature verification failed" in r1_tampered.detail


def test_mandate_signed_by_another_users_key_fails(db_session, test_policy):
    """Acceptance criterion: a mandate signed by another user's key fails."""
    # User A (legitimate mandate owner)
    priv_a, pub_a = generate_ed25519_keypair()
    owner_a = User(
        id="usr_legit_owner_a",
        email="owner_a@example.com",
        password_hash=hash_password("password123"),
        role="USER"
    )
    key_a = UserKey(
        id="uk_owner_a",
        user_id=owner_a.id,
        key_id="key_a",
        public_key=pub_a,
        algorithm="ed25519",
        status="ACTIVE"
    )

    # User B (unauthorized third-party / attacker)
    priv_b, pub_b = generate_ed25519_keypair()
    owner_b = User(
        id="usr_attacker_b",
        email="attacker_b@example.com",
        password_hash=hash_password("password123"),
        role="USER"
    )
    key_b = UserKey(
        id="uk_owner_b",
        user_id=owner_b.id,
        key_id="key_b",
        public_key=pub_b,
        algorithm="ed25519",
        status="ACTIVE"
    )
    db_session.add_all([owner_a, key_a, owner_b, key_b])
    db_session.commit()

    # User B signs policy with Key B
    sig_by_b = sign_policy_ed25519(test_policy, priv_b)

    # Mandate is labeled as owned by User A, but signed with Key B
    mandate_spoofed = Mandate(
        id="mnd_spoofed_owner",
        owner_id=owner_a.id,
        agent_id="buyer_agent_1",
        policy=dict(test_policy),
        signature=sig_by_b,
        public_key=pub_b,
        key_id="key_b",
        signature_algorithm="ed25519",
        status="ACTIVE",
        expires_at=datetime(2030, 1, 1, tzinfo=timezone.utc)
    )
    db_session.add(mandate_spoofed)
    db_session.commit()

    # When evaluating R1 for User A's mandate, owner_public_keys only has User A's keys: [pub_a]
    res = evaluate_policy_rules(
        policy=mandate_spoofed.policy,
        mandate_signature=mandate_spoofed.signature,
        mandate_status=mandate_spoofed.status,
        signing_key="dummy_key",
        amount_minor=10000,
        currency="USD",
        counterparty="seller_agent_verified",
        merchant_category="freelance_design",
        mandate_public_key=mandate_spoofed.public_key,
        mandate_algorithm=mandate_spoofed.signature_algorithm,
        mandate_owner_id=mandate_spoofed.owner_id,
        owner_public_keys=[pub_a],  # Only User A's keys are registered for this owner
    )
    r1 = next(r for r in res if r.rule == "R1_MANDATE_VALID")
    assert r1.passed is False
    assert "not belonging to owner" in r1.detail


def test_mandate_key_rotation_via_api(client, db_session, test_policy):
    """Test key rotation endpoint updating signature, public_key, and key_id."""
    # 1. Register user
    reg_resp = client.post("/api/auth/register", json={
        "email": "rotator@example.com",
        "password": "strongpassword123",
        "full_name": "Key Rotator"
    })
    assert reg_resp.status_code == 201
    token = reg_resp.json()["token"]
    user_id = reg_resp.json()["user_id"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Key 1
    priv_1, pub_1 = generate_ed25519_keypair()
    sig_1 = sign_policy_ed25519(test_policy, priv_1)

    mandate_resp = client.post("/api/mandates", json={
        "owner_id": user_id,
        "agent_id": "buyer_agent_rotate",
        "policy": test_policy,
        "public_key": pub_1,
        "signature": sig_1,
        "key_id": "key_v1",
        "signature_algorithm": "ed25519"
    }, headers=headers)
    assert mandate_resp.status_code == 201
    mandate_data = mandate_resp.json()
    assert mandate_data["public_key"] == pub_1
    assert mandate_data["key_id"] == "key_v1"

    # 3. Generate Key 2 and sign
    priv_2, pub_2 = generate_ed25519_keypair()
    sig_2 = sign_policy_ed25519(test_policy, priv_2)

    # 4. Call rotate-key endpoint
    rotate_resp = client.post(f"/api/mandates/{mandate_data['id']}/rotate-key", json={
        "new_key_id": "key_v2",
        "new_public_key": pub_2,
        "new_signature": sig_2,
    }, headers=headers)
    assert rotate_resp.status_code == 200
    rotated_data = rotate_resp.json()
    assert rotated_data["key_id"] == "key_v2"
    assert rotated_data["public_key"] == pub_2
    assert rotated_data["signature"] == sig_2

    # 5. Check in DB that old key is marked ROTATED and new key is ACTIVE
    old_key = db_session.query(UserKey).filter(UserKey.key_id == "key_v1").first()
    new_key = db_session.query(UserKey).filter(UserKey.key_id == "key_v2").first()
    assert old_key.status == "ROTATED"
    assert new_key.status == "ACTIVE"


def test_mandate_creation_with_another_users_key_rejected(client, db_session, test_policy):
    """User B cannot create a mandate using User A's public key."""
    # Register User A
    resp_a = client.post("/api/auth/register", json={
        "email": "user_a@example.com",
        "password": "password12345"
    })
    token_a = resp_a.json()["token"]
    user_a_id = resp_a.json()["user_id"]

    # Register User B
    resp_b = client.post("/api/auth/register", json={
        "email": "user_b@example.com",
        "password": "password12345"
    })
    token_b = resp_b.json()["token"]

    # User A registers a key
    priv_a, pub_a = generate_ed25519_keypair()
    reg_key_resp = client.post("/api/auth/keys", json={
        "key_id": "key_user_a",
        "public_key": pub_a,
        "algorithm": "ed25519"
    }, headers={"Authorization": f"Bearer {token_a}"})
    assert reg_key_resp.status_code == 201

    # User B tries to create a mandate using User A's public key
    sig = sign_policy_ed25519(test_policy, priv_a)
    resp = client.post("/api/mandates", json={
        "owner_id": user_a_id,
        "agent_id": "buyer_agent_exploit",
        "policy": test_policy,
        "public_key": pub_a,
        "signature": sig,
        "key_id": "key_user_a",
        "signature_algorithm": "ed25519"
    }, headers={"Authorization": f"Bearer {token_b}"})

    # Must be rejected with 403 Forbidden
    assert resp.status_code == 403
    assert "belongs to another user" in resp.json()["detail"]
