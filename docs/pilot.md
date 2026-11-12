# Mandate Pilot Runbook: Autonomous Agent Commercial Hiring

> **Version:** 1.0.0 (IRL Pilot Ready)  
> **Target Scenario:** Autonomous buyer agent hires verified freelance creators for graphic design and software services (Transaction Cap: $100.00; Human Approval Threshold: $50.00; Daily Cap: $300.00).

---

## 1. Scope & Objective

This runbook guides technical operators through deploying and executing a production pilot of **Mandate**:
- The human principal maintains deterministic authority through Ed25519 cryptographic policy signatures.
- The autonomous buyer agent holds **zero PayPal credentials** and operates strictly within signed bounds.
- PayPal holds all funds in custodial authorization holds until AI inspection and cryptographic verification succeed.
- Any transaction exceeding $50.00 halts in `ESCALATED` state requiring interactive human supervisor approval.

---

## 2. Onboarding Workflow

### Step 2.1: Human Principal / Owner Onboarding
1. **Account Registration & Session Setup:**
   - Register the human owner account via `POST /api/auth/register` or the Mandate Web UI (`/signup`).
   - Secure the account with an Argon2id password hash and session token.
2. **Ed25519 Owner Key Generation:**
   - The owner generates an asymmetric Ed25519 keypair locally (or in the browser Web Crypto vault):
     ```bash
     # Generates 32-byte private key and 32-byte public key
     openssl genpkey -algorithm ed25519 -out owner_private.pem
     openssl pkey -in owner_private.pem -pubout -out owner_public.pem
     ```
   - Register the public key with Mandate:
     `POST /api/auth/keys` with `{"public_key": "<64_hex_chars>", "algorithm": "ed25519", "label": "Owner Primary Key"}`.
3. **Mandate Policy Authoring & Signing:**
   - Define canonical policy JSON:
     ```json
     {
       "version": 1,
       "currency": "USD",
       "max_total_minor": 50000,
       "max_per_transaction_minor": 10000,
       "daily_limit_minor": 30000,
       "allowed_merchant_categories": ["freelance_design", "software_services"],
       "allowed_counterparties": ["seller_agent_acme"],
       "blocked_counterparties": ["unverified_seller_66"],
       "allowed_hours_utc": {"start": "00:00", "end": "23:59"},
       "velocity": {"max_txns_per_hour": 5},
       "escalate_above_minor": 5000,
       "require_escrow": true,
       "expires_at": "2027-01-01T00:00:00Z"
     }
     ```
   - Canonicalize and sign with Ed25519 private key:
     `signature = ed25519_sign(canonical_bytes, private_key)`
   - Create mandate via `POST /api/mandates` with `signature`, `public_key`, and `key_id`.

---

### Step 2.2: Seller Counterparty Onboarding
1. **Counterparty Registration:**
   - The merchant/seller registers their service handle:
     `POST /api/counterparties` with `{"handle": "seller_agent_acme", "name": "Acme Freelance Studio"}`.
2. **PayPal Merchant Binding:**
   - Bind seller's verified PayPal merchant ID or email:
     `PUT /api/counterparties/seller_agent_acme/paypal-account` with `{"paypal_merchant_id": "MERCHANT_ABC123", "paypal_email": "seller@acme.com"}`.
3. **Human Verification Audit:**
   - Platform compliance operator reviews seller identity and activates status:
     `POST /api/counterparties/seller_agent_acme/verify` (Requires human supervisor role).

---

### Step 2.3: Autonomous Buyer Agent Onboarding
1. **Generate Scoped Agent API Key:**
   - Human owner generates an agent API key:
     `POST /api/auth/agent-keys` with:
     ```json
     {
       "name": "Design Buyer Agent Alpha",
       "mandate_id": "mnd_freelance_2026",
       "scopes": ["intents:create", "mandates:read", "escrows:read"]
     }
     ```
   - Store the token securely in the agent's environment: `MANDATE_API_KEY=mnd_agent_...`.
2. **SDK / MCP Installation:**
   - Python: `pip install mandate-sdk`
   - Node.js: `npm install @mandate/sdk`
   - MCP Server: configure `mcp.server` in Claude Desktop or agent framework.

---

## 3. Kill-Switch Drill

In the event of anomalous agent behavior, model drift, or external compromise, execute the kill-switch drill immediately:

```bash
# 1. Trigger instantaneous Mandate Revocation (Human Owner Only)
curl -X POST https://api.mandate.example.com/api/mandates/mnd_freelance_2026/revoke \
  -H "Authorization: Bearer $OWNER_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Emergency kill-switch drill: halting agent purchasing."}'
```

### Verification Checklist:
- [ ] `GET /api/mandates/mnd_freelance_2026` returns `"status": "REVOKED"`.
- [ ] Any subsequent agent `POST /api/intents` immediately fails with `400 Bad Request` or `BLOCKED` (Rule R1: `Mandate status 'REVOKED' is not ACTIVE`).
- [ ] Zero calls are made to PayPal.
- [ ] Active authorization holds remain secure in PayPal until explicitly released or voided by human supervisor.
- [ ] Cryptographic audit log appends `MANDATE_REVOKED` entry with hash seal.

---

## 4. Incident Response Checklist

### Scenario A: Stuck Escrow (> 48 Hours in Non-Terminal State)
1. Query operational alerts:
   `GET /api/alerts` → check for `ALERT_STUCK_ESCROWS`.
2. Inspect escrow details:
   `GET /api/escrows/{escrow_id}`.
3. If seller failed to deliver before deadline:
   - Execute manual void: `POST /api/escrows/{escrow_id}/void` (Requires human supervisor).
   - Gateway releases PayPal authorization hold; spend ledger automatically restores buyer budget.
4. If seller uploaded deliverable but arbitration failed closed (`NEEDS_HUMAN`):
   - Human reviewer inspects deliverable artifacts in Web UI (`/app/disputes`).
   - Click "Approve Release" or "Reject & Void".

### Scenario B: PayPal Webhook Outage or Network Partition
1. Check webhook health alerts:
   `GET /api/alerts` → check for `ALERT_WEBHOOK_FAILURES`.
2. Review failed delivery records:
   `SELECT * FROM webhook_events WHERE status = 'FAILED' ORDER BY created_at DESC;`.
3. Force background hold reconciler:
   `POST /api/escrows/reconcile-expiry`.
4. Inspect PayPal developer dashboard to check webhook transmission logs. Replay failed event IDs after network recovery (gateway automatically deduplicates processed events via `event_id` uniqueness).

### Scenario C: LLM Provider Outage or Parsing Failure
1. **Fail-Closed Guarantee:**
   - If Anthropic/Gemini/OpenAI is unreachable, the Risk Scorer and Arbiter fail closed.
   - Any unhandled LLM failure transitions escrow to `NEEDS_HUMAN`; no money moves.
2. Check LLM metrics:
   `GET /api/metrics` → examine `llm.total_calls`, `llm.errors_total`, and `llm.cost_dollars`.
3. If daily LLM cost cap was hit:
   - Verify `ALERT_LLM_COST_CAP`.
   - Update mandate policy daily LLM allowance if legitimate higher volume is required.

---

## 5. Pilot Success Metrics

| Metric | Target | Measurement Method |
|---|---|---|
| **Double Capture Rate** | **0.0% (Zero)** | Concurrency test suite & spend ledger commit uniqueness |
| **Un-mandated Spend** | **$0.00** | Strict Ed25519 R1-R10 firewall gating |
| **Red-Team Held-Out Defense** | **> 95.0%** | Held-out benchmark suite (`scripts/eval_redteam.py`) |
| **Benign False Positive Rate** | **< 1.0%** | Benign SaaS/Dev controls suite (`scenarios/benign.jsonl`) |
| **Audit Verification Rate** | **100.0%** | Continuous hash-chain integrity check (`GET /api/audit/verify`) |
| **P95 Decision Latency** | **< 800ms** | Telemetry access logs (`X-Response-Time-Ms`) |
| **Human Escalation SLA** | **< 4 hours** | Time from `ESCALATED` intent to human review in `/app/approvals` |

