import pytest


def test_scenario_a_happy_path(client):
    resp = client.post("/api/scenarios/happy_path/run")
    assert resp.status_code == 200
    data = resp.json()
    assert data["scenario"] == "happy_path"
    assert data["state"] == "RELEASED"
    assert data["verdict"] == "PASS"
    assert data["paypal_capture_id"] is not None
    assert "CAP-" in data["paypal_capture_id"]


def test_scenario_b_injection_attack(client):
    resp = client.post("/api/scenarios/injection_attack/run")
    assert resp.status_code == 200
    data = resp.json()
    assert data["scenario"] == "injection_attack"
    assert data["decision"] == "BLOCKED"
    assert data["escrow_state"] == "BLOCKED"
    assert data["paypal_calls_made"] is False
    assert data["risk_score"] >= 0.85
    assert "instruction_override_detected" in data["flags"]


def test_scenario_c_bad_delivery_dispute(client):
    resp = client.post("/api/scenarios/bad_delivery_dispute/run")
    assert resp.status_code == 200
    data = resp.json()
    assert data["scenario"] == "bad_delivery_dispute"
    assert data["state"] == "REFUNDED"
    assert data["verdict"] == "FAIL"


def test_scenario_d_red_team_suite(client):
    resp = client.post("/api/scenarios/red_team/run")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_attempted"] == 21
    assert data["total_blocked"] == 21
    assert data["block_rate_pct"] == 100.0


def test_audit_verify_after_scenarios(client):
    # Run happy path and verify audit log integrity
    client.post("/api/scenarios/happy_path/run")
    verify_resp = client.get("/api/audit/verify")
    assert verify_resp.status_code == 200
    data = verify_resp.json()
    assert data["valid"] is True
    assert data["total_records"] > 0
    assert data["head_hash"] is not None


def test_mandate_crud_and_killswitch(client, sample_policy):
    # 1. Create mandate
    create_resp = client.post("/api/mandates", json={
        "owner_id": "test_owner",
        "agent_id": "buyer_agent_alpha",
        "policy": sample_policy
    })
    assert create_resp.status_code == 201
    mandate_id = create_resp.json()["id"]

    # 2. Get mandate
    get_resp = client.get(f"/api/mandates/{mandate_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["status"] == "ACTIVE"

    # 3. Killswitch revoke
    revoke_resp = client.post(f"/api/mandates/{mandate_id}/revoke", json={"reason": "Test emergency stop"})
    assert revoke_resp.status_code == 200
    assert revoke_resp.json()["status"] == "REVOKED"

    # 4. Attempt intent against revoked mandate -> BLOCKED
    intent_resp = client.post("/api/intents", json={
        "mandate_id": mandate_id,
        "counterparty": "seller_agent_acme",
        "merchant_category": "freelance_design",
        "amount_minor": 10000,
        "currency": "USD",
        "description": "Attempt after revoke"
    })
    assert intent_resp.status_code == 201
    assert intent_resp.json()["decision"] == "BLOCKED"
