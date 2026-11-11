# REST API Reference: MANDATE

Base URL: `http://localhost:8000/api`

---

## 1. System Health & Realtime

### `GET /health`
Returns system status, active database dialect, and provider connectivity.
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-11-12T01:30:00Z",
  "database": "sqlite",
  "paypal_mode": "sandbox",
  "llm_provider": "gemini"
}
```

### `GET /stream`
Server-Sent Events (SSE) feed emitting realtime timeline updates for all agent interactions, policy verdicts, PayPal transactions, and escrow transitions.

---

## 2. Mandates

### `POST /mandates`
Creates a new spending policy and computes its HMAC signature.
```json
{
  "owner_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "agent_id": "buyer_agent_alpha",
  "policy": {
    "version": 1,
    "currency": "USD",
    "max_total_minor": 50000,
    "max_per_transaction_minor": 20000,
    "daily_limit_minor": 30000,
    "allowed_merchant_categories": ["freelance_design", "software_services"],
    "allowed_counterparties": ["seller_agent_acme"],
    "blocked_counterparties": ["unverified_seller_66"],
    "allowed_hours_utc": {"start": "06:00", "end": "22:00"},
    "velocity": {"max_txns_per_hour": 3},
    "escalate_above_minor": 15000,
    "require_escrow": true,
    "expires_at": "2026-12-31T23:59:59Z"
  }
}
```

### `GET /mandates/{id}`
Retrieves mandate policy, verification status, and cumulative spend-to-date.

### `POST /mandates/{id}/revoke`
Emergency kill-switch. Transitions status to `REVOKED`. Subsequent intents are blocked immediately.

---

## 3. Payment Intents & Gateway

### `POST /intents`
Submits a payment intent to the Mandate Gateway. Executes Policy Engine rules and Risk Scorer.
```json
{
  "mandate_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "counterparty": "seller_agent_acme",
  "merchant_category": "freelance_design",
  "amount_minor": 12000,
  "currency": "USD",
  "description": "Logo design package (3 concepts + vectors)",
  "source_context": "Seller: 'I can deliver the 3 logo variations and vectors for $120 within 2 hours.'"
}
```

Response:
```json
{
  "id": "7fa85f64-5717-4562-b3fc-2c963f66afa6",
  "decision": "APPROVED",
  "risk_score": 0.05,
  "decision_reasons": [
    {"rule": "R1_MANDATE_VALID", "passed": true, "detail": "Signature verified and mandate active"},
    {"rule": "R2_PER_TRANSACTION_CAP", "passed": true, "detail": "Amount $120.00 <= Cap $200.00"},
    {"rule": "R3_TOTAL_BUDGET", "passed": true, "detail": "Cumulative $120.00 <= Budget $500.00"}
  ],
  "escrow_id": "9fa85f64-5717-4562-b3fc-2c963f66afa6"
}
```

---

## 4. Escrow & AI Arbitration

### `GET /escrows/{id}`
Returns the current escrow state, PayPal order ID, authorization ID, hold expiry timestamp, and deliverables.

### `POST /escrows/{id}/deliver`
Seller agent submits the completed deliverable.
```json
{
  "content_ref": "https://storage.example.com/deliverables/logo_v1.zip",
  "submission_notes": "Delivered 3 logo concepts with scalable SVGs and PNG exports."
}
```

### `POST /escrows/{id}/arbitrate`
Triggers the AI Arbiter against the escrow acceptance criteria. Automatically captures PayPal funds on `PASS` or voids on `FAIL`.

### `POST /escrows/{id}/human-decision`
Human supervisor decision for `ESCALATED` or `NEEDS_HUMAN` escrows.
```json
{
  "action": "APPROVE",
  "notes": "Verified client specifications manually; release authorized."
}
```

---

## 5. Demo Scenarios & Red-Team

### `POST /scenarios/{name}/run`
Runs an automated end-to-end scenario:
- `happy_path`: Compliant negotiation, gateway approval, authorization hold, deliverable passing arbitration, PayPal capture.
- `injection_attack`: Adversarial prompt-injection attack, deterministic pre-filter & policy block, zero funds touched.
- `bad_delivery_dispute`: Compliant authorization hold, substandard seller deliverable, arbiter failure, PayPal void/refund.
- `red_team`: Batch execution of 20+ adversarial prompt injections with real-time block rate statistics.

### `GET /redteam/stats`
Returns aggregate statistics of adversarial tests: attempted, blocked, escalated, and block rate percentage.

---

## 6. Audit Trail

### `GET /audit`
Returns paginated, chronologically ordered audit logs.

### `GET /audit/verify`
Recalculates SHA-256 hashes across the entire chain from genesis to head and asserts integrity.
```json
{
  "valid": true,
  "total_records": 42,
  "head_hash": "c5f3e2b10a4...",
  "verified_at": "2026-11-12T01:31:00Z"
}
```
