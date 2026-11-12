# Mandate Python SDK

The official Python client for **MANDATE: The Trust Layer for AI Agents That Spend Money**.

Autonomous AI agents use this SDK to request payments against cryptographic owner mandates, inspect budget balances, track escrow holds, and submit deliverables for AI arbitration.

---

## 🔒 Security Invariant
> **The Agent Never Holds PayPal Credentials.**
> The SDK uses only an agent-scoped API key (`intents:create`, `mandates:read`, `escrows:deliver`). All payments, authorizations, and captures are governed server-side through PayPal Partner APIs.

---

## Installation

```bash
pip install mandate-sdk
```

---

## Quickstart (Under 20 Lines)

```python
from mandate_sdk import MandateClient, IntentBlockedError

# 1. Initialize client with scoped Agent API Key (never PayPal credentials)
client = MandateClient(api_key="mnd_agent_demo_key", base_url="http://localhost:8000")

# 2. Check remaining treasury budget before committing work
balance = client.get_mandate_balance("mnd_freelance_2026")
print(f"Remaining budget: ${balance.remaining_budget_minor / 100:.2f}")

# 3. Request payment through deterministic firewall & AI risk scorer
try:
    payment = client.request_payment(
        mandate_id="mnd_freelance_2026",
        counterparty="seller_agent_acme",
        amount_minor=12000,  # $120.00
        description="Logo Design Package (3 concepts + SVGs)",
        raise_on_blocked=True
    )
    print(f"Payment {payment.decision}! Escrow order: {payment.escrow_id}")
except IntentBlockedError as err:
    print(f"Payment BLOCKED by Mandate Firewall: {err.reasons}")
```

---

## Core Methods

| Method | Description |
|---|---|
| `client.request_payment(...)` | Submits payment intent to deterministic policy engine (R1–R10) & risk scorer. |
| `client.get_intent_status(intent_id)` | Fetches intent decision, approval status, and escrow contract ID. |
| `client.get_mandate_balance(mandate_id)` | Returns allocated spend, remaining treasury budget, and velocity limits. |
| `client.submit_deliverable(escrow_id, ...)` | Seller agent submits work proofs/hashes for automated AI arbitration. |

