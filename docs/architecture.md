# System Architecture: MANDATE

**Mandate** is a cryptographic financial firewall and AI-arbitrated escrow layer that sits between autonomous AI agents and payment processors like PayPal.

---

## 1. High-Level Architecture Diagram

```
┌────────────────────────────────────────────────────────────┐
│              Next.js Realtime Dashboard                    │
│  Mandate Builder | Live Timeline | Escrow State | Audit    │
└───────────────▲────────────────────────────┬───────────────┘
                │ SSE (/api/stream)          │ REST Endpoints
┌───────────────┴────────────────────────────▼───────────────┐
│                      FastAPI Backend                       │
│                                                            │
│  ┌──────────────┐   ┌───────────────┐   ┌────────────────┐ │
│  │ Buyer Agent  │◄─►│ Negotiation   │◄─►│ Seller Agent   │ │
│  └──────┬───────┘   │ Orchestrator  │   └───────┬────────┘ │
│         │           └───────────────┘           │          │
│         ▼  payment intent                       │ deliver- │
│  ┌────────────────────────────┐                 │ able     │
│  │      MANDATE GATEWAY       │                 ▼          │
│  │ 1. HMAC Signature Check    │          ┌──────────────┐  │
│  │ 2. Policy Engine (R1-R10)  │          │  AI ARBITER  │  │
│  │ 3. Risk Scorer + PreFilter │          │ (Structured) │  │
│  │ 4. Deterministic Decision  │          └──────┬───────┘  │
│  └────────────┬───────────────┘                 │          │
│               ▼                                 ▼          │
│  ┌───────────────────────────────────────────────────────┐ │
│  │         Escrow State Machine & PayPal Client          │ │
│  └────────────────────┬──────────────────────────────────┘ │
│                       │             ▲ Webhook Delivery     │
│  ┌────────────────────▼─────────────┴──────┐               │
│  │ Postgres / SQLite Database              │               │
│  │ (Mandates, Intents, Escrows, Audit Log) │               │
│  └─────────────────────────────────────────┘               │
└───────────────────────┬────────────────────────────────────┘
                        ▼
            PayPal Sandbox REST APIs (v2)
       [Create Order | Authorize | Capture | Void]
```

---

## 2. Core Architectural Principles

1. **Deterministic Authority**: The deterministic Policy Engine has final authority over spend limits, whitelist counterparties, categories, and velocity. The LLM Risk Scorer operates in a **tighten-only** paradigm—it can escalate or block, but can never loosen or bypass deterministic rules.
2. **Fail-Closed Security**: In the event of network disruption, parsing errors, or LLM unavailability, the gateway defaults to `BLOCKED` or `ESCALATED`.
3. **Escrow Hold Instead of Direct Capture**: Agents are never handed direct payment capabilities. Transactions use PayPal's Orders v2 `intent: AUTHORIZE` flow to hold funds without settling.
4. **Independent AI Arbitration**: Delivered work is evaluated criterion-by-criterion against the agreed specification by an impartial Arbiter. Funds are captured only on approval, or voided on bad delivery.
5. **Tamper-Evident Hash-Chained Audit Trail**: Every event (intent, decision, rule evaluation, authorization, arbitration verdict) is appended to a cryptographic hash chain.

---

## 3. Data Flow Stages

### Phase 1: Mandate Creation & HMAC Signing
1. Human principal defines spending limits, counterparties, allowed hours, categories, and escalation threshold.
2. The policy is converted to a canonical JSON string (alphabetically sorted keys, no whitespace).
3. The server computes an HMAC-SHA256 signature using `MANDATE_SIGNING_KEY`.
4. Only signed mandates with status `ACTIVE` can authorize payment intents.

### Phase 2: Payment Intent & The Mandate Gateway
1. The Buyer Agent negotiates a transaction and issues a `PaymentIntent`.
2. The Mandate Gateway executes the 3-stage validation pipeline:
   - **Stage 1 (Signature & Status)**: Verifies HMAC signature, active status, expiration timestamp.
   - **Stage 2 (Policy Engine)**: Evaluates rules R1 through R10 in minor currency units (cents).
   - **Stage 3 (Risk Scorer & Pre-Filter)**: Scans source context for adversarial prompt-injection patterns (regex heuristics + structured LLM analysis).
3. Outcome:
   - `APPROVED`: Progresses to PayPal sandbox authorization.
   - `ESCALATED`: Routed to Human-in-the-Loop approval queue.
   - `BLOCKED`: Instantly rejected with explicit reasons. Zero funds leave PayPal.

### Phase 3: PayPal Authorization & Escrow Machine
1. An order is created on PayPal with `intent: AUTHORIZE`.
2. Buyer sandbox approval executes an authorization, holding the funds.
3. The Escrow state advances to `FUNDS_HELD`.

### Phase 4: Delivery & AI Arbitration
1. The Seller Agent submits the deliverable against the escrow spec.
2. State advances to `UNDER_ARBITRATION`.
3. The Arbiter evaluates each acceptance criterion separately:
   - If all pass with high confidence: calls PayPal `Capture` -> state `RELEASED`.
   - If criteria fail: calls PayPal `Void` -> state `REFUNDED`.
   - If partially satisfied: executes partial capture and voids remainder -> `PARTIALLY_RELEASED`.
   - If confidence < 0.7: marks `NEEDS_HUMAN` for manual override.
