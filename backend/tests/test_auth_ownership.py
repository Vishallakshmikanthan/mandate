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
from app.core.mandate_signing import sign_policy
from app.core.auth import (
    hash_password,
    create_session_token,
    generate_api_key_pair,
    check_rate_limit
)


def test_user_registration_and_login(client: TestClient, db_session: Session):
    # 1. Register new human user
    reg_res = client.post("/api/auth/register", json={
        "email": "supervisor@testcorp.com",
        "password": "Password123!",
        "full_name": "Supervisor Jane"
    })
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "token" in reg_data
    assert reg_data["email"] == "supervisor@testcorp.com"
    token = reg_data["token"]

    # 2. Login
    login_res = client.post("/api/auth/login", json={
        "email": "supervisor@testcorp.com",
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    assert "token" in login_res.json()

    # 3. Access profile via session token
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["actor_type"] == "HUMAN"
    assert me_data["email"] == "supervisor@testcorp.com"


def test_agent_api_key_lifecycle_and_scoping(client: TestClient, db_session: Session):
    # 1. Create a human owner
    user = User(
        email="owner_keys@test.com",
        password_hash=hash_password("SecretPass123"),
        role="USER",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    human_token = create_session_token(user.id, user.email, user.role)

    # 2. Human creates scoped agent API key
    key_res = client.post(
        "/api/auth/api-keys",
        headers={"Authorization": f"Bearer {human_token}"},
        json={
            "name": "Design Agent Key",
            "scopes": ["intents:create", "intents:read"],
            "agent_id": "agent_auto_buyer"
        }
    )
    assert key_res.status_code == 201
    key_data = key_res.json()
    raw_key = key_data["raw_key"]
    key_id = key_data["id"]
    assert raw_key.startswith("mnd_")

    # 3. Agent calls /me using X-API-Key
    agent_me = client.get("/api/auth/me", headers={"X-API-Key": raw_key})
    assert agent_me.status_code == 200
    assert agent_me.json()["actor_type"] == "AGENT"
    assert agent_me.json()["scopes"] == ["intents:create", "intents:read"]

    # 4. Human lists keys
    list_keys = client.get("/api/auth/api-keys", headers={"Authorization": f"Bearer {human_token}"})
    assert list_keys.status_code == 200
    assert len(list_keys.json()) == 1

    # 5. Human revokes key
    del_res = client.delete(f"/api/auth/api-keys/{key_id}", headers={"Authorization": f"Bearer {human_token}"})
    assert del_res.status_code == 200

    # 6. Revoked key now returns 401
    revoked_me = client.get("/api/auth/me", headers={"X-API-Key": raw_key})
    assert revoked_me.status_code == 401


def test_owner_isolation_user_a_cannot_read_user_b_mandate(client: TestClient, db_session: Session):
    # Setup User A
    user_a = User(email="user_a@test.com", password_hash=hash_password("PassA123!"), role="USER", is_active=True)
    db_session.add(user_a)
    # Setup User B
    user_b = User(email="user_b@test.com", password_hash=hash_password("PassB123!"), role="USER", is_active=True)
    db_session.add(user_b)
    db_session.commit()

    token_a = create_session_token(user_a.id, user_a.email, user_a.role)
    token_b = create_session_token(user_b.id, user_b.email, user_b.role)

    # User A creates a mandate
    policy_a = {
        "max_per_transaction_minor": 10000,
        "daily_limit_minor": 10000,
        "max_total_minor": 10000,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "allowed_categories": ["software"],
        "allowed_counterparties": ["seller_agent_acme"]
    }
    sig_a = sign_policy(policy_a, settings.MANDATE_SIGNING_KEY)
    mandate_a = Mandate(
        owner_id=user_a.id,
        agent_id="agent_a",
        policy=policy_a,
        signature=sig_a,
        status="ACTIVE",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    db_session.add(mandate_a)
    db_session.commit()

    # User A can read own mandate
    r_a = client.get(f"/api/mandates/{mandate_a.id}", headers={"Authorization": f"Bearer {token_a}"})
    assert r_a.status_code == 200

    # CRITICAL: User B CANNOT read User A's mandate (must return 403 Forbidden)
    r_b = client.get(f"/api/mandates/{mandate_a.id}", headers={"Authorization": f"Bearer {token_b}"})
    assert r_b.status_code == 403

    # User B list_mandates does NOT contain User A's mandate
    list_b = client.get("/api/mandates", headers={"Authorization": f"Bearer {token_b}"})
    assert list_b.status_code == 200
    assert len(list_b.json()) == 0


def test_seller_deliver_requires_counterparty_binding(client: TestClient, db_session: Session):
    # Setup User and Mandate
    user = User(email="buyer_corp@test.com", password_hash=hash_password("PassBuyer123"), role="USER", is_active=True)
    db_session.add(user)
    db_session.commit()

    policy = {
        "max_per_tx_minor": 10000,
        "max_daily_minor": 10000,
        "total_budget_minor": 10000,
        "rate_limit_per_min": 10,
        "allowed_categories": ["software"],
        "allowed_counterparties": ["seller_agent_acme"]
    }
    sig = sign_policy(policy, settings.MANDATE_SIGNING_KEY)
    mandate = Mandate(
        owner_id=user.id,
        agent_id="agent_buyer",
        policy=policy,
        signature=sig,
        status="ACTIVE",
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    db_session.add(mandate)
    db_session.commit()

    intent = PaymentIntent(
        mandate_id=mandate.id,
        counterparty="seller_agent_acme",
        merchant_category="software",
        amount_minor=10000,
        currency="USD",
        description="Software service",
        decision="APPROVED"
    )
    db_session.add(intent)
    db_session.commit()

    escrow = Escrow(
        intent_id=intent.id,
        state=EscrowState.FUNDS_HELD.value,
        paypal_order_id="ORD-SELLER-1",
        paypal_authorization_id="AUTH-SELLER-1"
    )
    db_session.add(escrow)
    db_session.commit()

    # Generate API key for a different seller counterparty: "seller_evil_corp"
    raw_key_evil, key_evil = generate_api_key_pair(
        name="Evil Seller Key",
        owner_id=user.id,
        scopes=["escrows:deliver"],
        counterparty_handle="seller_evil_corp"
    )
    db_session.add(key_evil)

    # Generate API key for authorized seller: "seller_agent_acme"
    raw_key_acme, key_acme = generate_api_key_pair(
        name="Acme Seller Key",
        owner_id=user.id,
        scopes=["escrows:deliver"],
        counterparty_handle="seller_agent_acme"
    )
    db_session.add(key_acme)
    db_session.commit()

    # Evil seller attempts to deliver -> 403 Forbidden!
    r_evil = client.post(
        f"/api/escrows/{escrow.id}/deliver",
        headers={"X-API-Key": raw_key_evil},
        json={"content_ref": "https://evil.com/fake_asset.zip"}
    )
    assert r_evil.status_code == 403
    assert "cannot deliver" in r_evil.json()["detail"]

    # Authorized seller delivers -> 200 OK!
    r_acme = client.post(
        f"/api/escrows/{escrow.id}/deliver",
        headers={"X-API-Key": raw_key_acme},
        json={"content_ref": "https://acme.com/valid_asset.zip"}
    )
    assert r_acme.status_code == 200
    assert r_acme.json()["state"] == "DELIVERED"


def test_human_only_endpoints_reject_agent_keys(client: TestClient, db_session: Session):
    user = User(email="human_owner@test.com", password_hash=hash_password("Pass123!"), role="USER", is_active=True)
    db_session.add(user)
    db_session.commit()

    raw_key, key_model = generate_api_key_pair(
        name="Agent Buyer Key",
        owner_id=user.id,
        scopes=["intents:create", "escrows:deliver", "intents:read"]
    )
    db_session.add(key_model)
    db_session.commit()

    # 1. Agent attempts to create mandate -> 403 Forbidden!
    res_mandate = client.post(
        "/api/mandates",
        headers={"X-API-Key": raw_key},
        json={
            "agent_id": "rogue_agent",
            "owner_id": user.id,
            "policy": {
                "max_per_transaction_minor": 5000,
                "max_daily_minor": 10000,
                "max_total_minor": 20000,
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                "allowed_categories": ["software"],
                "allowed_counterparties": ["seller_agent_acme"]
            }
        }
    )
    assert res_mandate.status_code == 403
    assert "requires a human supervisor" in res_mandate.json()["detail"]

    # 2. Agent attempts counterparty management -> 403 Forbidden!
    res_cp = client.post(
        "/api/counterparties",
        headers={"X-API-Key": raw_key},
        json={"handle": "new_merchant"}
    )
    assert res_cp.status_code == 403


def test_routes_reject_unauthenticated_in_non_demo_env(client: TestClient, db_session: Session):
    """
    CRITICAL ACCEPTANCE CRITERIA:
    When APP_ENV != 'demo', unauthenticated access to write endpoints is rejected with 401.
    """
    orig_env = settings.APP_ENV
    try:
        settings.APP_ENV = "dev"

        # No auth header -> 401 Unauthorized
        r1 = client.post("/api/intents", json={})
        assert r1.status_code == 401

        r2 = client.post("/api/mandates", json={})
        assert r2.status_code == 401

        r3 = client.get("/api/auth/me")
        assert r3.status_code == 401
    finally:
        settings.APP_ENV = orig_env
