"""
Comprehensive Authentication and Authorization Matrix Test Suite.
Verifies access control across every route in the Mandate API:
1. Unauthenticated requests receive 401 Unauthorized
2. Agent tokens calling human-only routes receive 403 Forbidden
3. Scoped agent keys without required permissions receive 403 Forbidden
4. Seller deliver endpoints reject keys not bound to that escrow's counterparty
5. Cross-tenant isolation: User A cannot read or modify User B's resources
"""
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from starlette.testclient import TestClient

from app.models.user import User
from app.models.api_key import APIKey
from app.models.mandate import Mandate
from app.models.intent import PaymentIntent
from app.models.escrow import Escrow
from app.models.counterparty import Counterparty
from app.schemas.escrow import EscrowState
from app.config import settings
from app.core.auth import hash_password, create_session_token, generate_api_key_pair
from app.core.mandate_signing import generate_ed25519_keypair, sign_policy_ed25519


@pytest.fixture
def auth_fixture(db_session: Session):
    """Sets up two distinct users (User A, User B) and multiple scoped agent keys."""
    # User A (Alice)
    user_a = User(
        email=f"alice_{uuid.uuid4().hex[:6]}@matrix.com",
        password_hash=hash_password("Pass123!"),
        role="USER",
        is_active=True
    )
    # User B (Bob)
    user_b = User(
        email=f"bob_{uuid.uuid4().hex[:6]}@matrix.com",
        password_hash=hash_password("Pass123!"),
        role="USER",
        is_active=True
    )
    db_session.add_all([user_a, user_b])
    db_session.commit()

    token_a = create_session_token(user_a.id, user_a.email, user_a.role)
    token_b = create_session_token(user_b.id, user_b.email, user_b.role)

    # Agent Key for User A with intents:read only (no write)
    raw_read_key, read_key_rec = generate_api_key_pair(
        name="Read-Only Agent Key",
        owner_id=user_a.id,
        scopes=["intents:read"],
        agent_id="agent_reader"
    )

    # Agent Key for User A with intents:create
    raw_buyer_key, buyer_key_rec = generate_api_key_pair(
        name="Buyer Agent Key",
        owner_id=user_a.id,
        scopes=["intents:create", "intents:read"],
        agent_id="agent_buyer"
    )

    # Seller Key bound to 'seller_counterparty_x'
    raw_seller_key_x, seller_key_x_rec = generate_api_key_pair(
        name="Seller X Key",
        owner_id=user_a.id,
        scopes=["escrows:deliver"],
        counterparty_handle="seller_counterparty_x",
        agent_id="agent_seller_x"
    )

    # Seller Key bound to 'seller_counterparty_y' (unrelated seller)
    raw_seller_key_y, seller_key_y_rec = generate_api_key_pair(
        name="Seller Y Key",
        owner_id=user_a.id,
        scopes=["escrows:deliver"],
        counterparty_handle="seller_counterparty_y",
        agent_id="agent_seller_y"
    )

    db_session.add_all([read_key_rec, buyer_key_rec, seller_key_x_rec, seller_key_y_rec])
    db_session.commit()

    # User A Mandate
    priv_hex, pub_hex = generate_ed25519_keypair()
    pol_a = {
        "currency": "USD",
        "max_per_transaction_minor": 15000,
        "max_total_minor": 50000,
        "daily_limit_minor": 30000,
        "escalate_above_minor": 10000,
        "allowed_counterparties": ["seller_counterparty_x"],
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat().replace("+00:00", "Z")
    }
    sig_a = sign_policy_ed25519(pol_a, priv_hex)
    mandate_a = Mandate(
        owner_id=user_a.id,
        agent_id="agent_buyer",
        policy=pol_a,
        signature=sig_a,
        public_key=pub_hex,
        signature_algorithm="ed25519",
        status="ACTIVE",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    db_session.add(mandate_a)
    db_session.commit()

    # User A Intent & Escrow
    intent_a = PaymentIntent(
        mandate_id=mandate_a.id,
        amount_minor=12000,
        currency="USD",
        counterparty="seller_counterparty_x",
        merchant_category="software",
        description="Software development milestone",
        decision="APPROVED"
    )
    db_session.add(intent_a)
    db_session.commit()

    escrow_a = Escrow(
        intent_id=intent_a.id,
        state=EscrowState.FUNDS_HELD.value,
        spec={"title": "Software milestone", "criteria": ["Criteria 1"]},
        hold_expires_at=datetime.now(timezone.utc) + timedelta(days=29)
    )
    db_session.add(escrow_a)
    db_session.commit()

    return {
        "user_a": user_a,
        "user_b": user_b,
        "token_a": token_a,
        "token_b": token_b,
        "raw_read_key": raw_read_key,
        "raw_buyer_key": raw_buyer_key,
        "raw_seller_key_x": raw_seller_key_x,
        "raw_seller_key_y": raw_seller_key_y,
        "mandate_a": mandate_a,
        "intent_a": intent_a,
        "escrow_a": escrow_a,
    }


def test_unauthenticated_requests_return_401(client: TestClient, auth_fixture: dict, monkeypatch):
    """Every protected endpoint without Authorization or X-API-Key returns 401 outside demo mode."""
    monkeypatch.setattr(settings, "APP_ENV", "dev")
    escrow_id = auth_fixture["escrow_a"].id
    mandate_id = auth_fixture["mandate_a"].id
    intent_id = auth_fixture["intent_a"].id

    protected_endpoints = [
        ("GET", "/api/auth/me"),
        ("GET", "/api/auth/api-keys"),
        ("POST", "/api/auth/api-keys"),
        ("GET", "/api/auth/keys"),
        ("POST", "/api/auth/keys"),
        ("GET", "/api/mandates"),
        ("POST", "/api/mandates"),
        ("GET", f"/api/mandates/{mandate_id}"),
        ("POST", f"/api/mandates/{mandate_id}/revoke"),
        ("POST", f"/api/mandates/{mandate_id}/rotate-key"),
        ("GET", "/api/intents"),
        ("POST", "/api/intents"),
        ("GET", f"/api/intents/{intent_id}"),
        ("GET", "/api/escrows"),
        ("GET", f"/api/escrows/{escrow_id}"),
        ("POST", f"/api/escrows/{escrow_id}/deliver"),
        ("POST", f"/api/escrows/{escrow_id}/deliver-file"),
        ("POST", f"/api/escrows/{escrow_id}/human-decision"),
        ("GET", "/api/counterparties"),
        ("POST", "/api/counterparties"),
        ("GET", "/api/audit"),
        ("POST", "/api/audit/checkpoint"),
        ("GET", "/api/audit/checkpoint/latest"),
    ]

    for method, path in protected_endpoints:
        if method == "GET":
            resp = client.get(path)
        else:
            resp = client.post(path, json={})
        assert resp.status_code == 401, f"Expected 401 for unauthenticated {method} {path}, got {resp.status_code}"


def test_human_only_endpoints_reject_agent_keys_with_403(client: TestClient, auth_fixture: dict):
    """Agent keys must receive 403 on human-only administrative endpoints."""
    agent_key = auth_fixture["raw_buyer_key"]
    headers = {"X-API-Key": agent_key}
    mandate_id = auth_fixture["mandate_a"].id
    escrow_id = auth_fixture["escrow_a"].id

    human_only_routes = [
        ("POST", "/api/mandates", {"policy": {}, "signature": "mock", "agent_id": "test"}),
        ("POST", f"/api/mandates/{mandate_id}/revoke", {}),
        ("POST", f"/api/mandates/{mandate_id}/rotate-key", {"new_public_key": "k", "key_id": "k1"}),
        ("POST", f"/api/escrows/{escrow_id}/human-decision", {"decision": "RELEASE"}),
        ("POST", "/api/counterparties", {"handle": "new_vendor", "status": "VERIFIED"}),
        ("POST", "/api/audit/checkpoint", {}),
        ("POST", "/api/auth/api-keys", {"name": "sub", "scopes": []}),
        ("GET", "/api/auth/api-keys", None),
        ("GET", "/api/auth/keys", None),
        ("POST", "/api/auth/keys", {"public_key": "pub", "algorithm": "ed25519"}),
    ]

    for method, path, body in human_only_routes:
        if method == "POST":
            resp = client.post(path, headers=headers, json=body or {})
        else:
            resp = client.get(path, headers=headers)
        assert resp.status_code == 403, f"Expected 403 Forbidden for agent key on {method} {path}, got {resp.status_code}"


def test_agent_scope_restrictions_enforced(client: TestClient, auth_fixture: dict):
    """An agent key with only 'intents:read' cannot create intents."""
    read_only_key = auth_fixture["raw_read_key"]
    mandate_id = auth_fixture["mandate_a"].id

    # 1. Calling GET /api/intents with read scope works
    get_res = client.get("/api/intents", headers={"X-API-Key": read_only_key})
    assert get_res.status_code == 200

    # 2. Calling POST /api/intents with read-only scope is rejected with 403
    post_res = client.post(
        "/api/intents",
        headers={"X-API-Key": read_only_key},
        json={
            "mandate_id": mandate_id,
            "amount_minor": 5000,
            "currency": "USD",
            "counterparty": "seller_counterparty_x",
            "merchant_category": "software",
            "description": "Unauthorized intent attempt"
        }
    )
    assert post_res.status_code == 403
    assert "scope" in post_res.json()["detail"].lower()


def test_seller_deliver_requires_bound_counterparty_key(client: TestClient, auth_fixture: dict):
    """
    POST /api/escrows/{id}/deliver strictly requires a seller agent key
    bound to that escrow's specific counterparty.
    """
    escrow_id = auth_fixture["escrow_a"].id
    seller_key_x = auth_fixture["raw_seller_key_x"]
    seller_key_y = auth_fixture["raw_seller_key_y"]
    buyer_key = auth_fixture["raw_buyer_key"]

    payload = {
        "content_ref": "https://storage.example.com/assets/delivery.zip",
        "submission_notes": "Completed deliverables"
    }

    # 1. Buyer key cannot call deliver (lacks escrows:deliver scope) -> 403
    res_buyer = client.post(f"/api/escrows/{escrow_id}/deliver", headers={"X-API-Key": buyer_key}, json=payload)
    assert res_buyer.status_code == 403

    # 2. Seller Y key (bound to counterparty Y, not X) is rejected with 403
    res_seller_y = client.post(f"/api/escrows/{escrow_id}/deliver", headers={"X-API-Key": seller_key_y}, json=payload)
    assert res_seller_y.status_code == 403
    assert "bound to counterparty" in res_seller_y.json()["detail"].lower()

    # 3. Seller X key (bound to counterparty X) is authorized
    res_seller_x = client.post(f"/api/escrows/{escrow_id}/deliver", headers={"X-API-Key": seller_key_x}, json=payload)
    assert res_seller_x.status_code == 200


def test_cross_tenant_owner_isolation(client: TestClient, auth_fixture: dict):
    """
    User B (Bob) cannot read, inspect, or modify User A's (Alice) resources.
    Returns 404 (or 403) to prevent resource existence disclosure.
    """
    token_b = auth_fixture["token_b"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    mandate_a_id = auth_fixture["mandate_a"].id
    intent_a_id = auth_fixture["intent_a"].id
    escrow_a_id = auth_fixture["escrow_a"].id

    # 1. Bob cannot read Alice's mandate
    res_man = client.get(f"/api/mandates/{mandate_a_id}", headers=headers_b)
    assert res_man.status_code in (404, 403)

    # 2. Bob cannot revoke Alice's mandate
    res_rev = client.post(f"/api/mandates/{mandate_a_id}/revoke", headers=headers_b)
    assert res_rev.status_code in (404, 403)

    # 3. Bob cannot read Alice's intent
    res_int = client.get(f"/api/intents/{intent_a_id}", headers=headers_b)
    assert res_int.status_code in (404, 403)

    # 4. Bob cannot read Alice's escrow
    res_esc = client.get(f"/api/escrows/{escrow_a_id}", headers=headers_b)
    assert res_esc.status_code in (404, 403)

    # 5. Bob's list queries return empty
    list_man = client.get("/api/mandates", headers=headers_b)
    assert list_man.status_code == 200
    assert len(list_man.json()) == 0

    list_int = client.get("/api/intents", headers=headers_b)
    assert list_int.status_code == 200
    assert len(list_int.json()) == 0

    list_esc = client.get("/api/escrows", headers=headers_b)
    assert list_esc.status_code == 200
    assert len(list_esc.json()) == 0
