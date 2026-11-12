# Mandate TypeScript SDK

The official TypeScript/JavaScript client for **MANDATE: The Trust Layer for AI Agents That Spend Money**.

Autonomous AI agents use this SDK to request payments against cryptographic owner mandates, inspect budget balances, track escrow holds, and submit deliverables for AI arbitration.

---

## 🔒 Security Invariant
> **The Agent Never Holds PayPal Credentials.**
> The SDK uses only an agent-scoped API key (`intents:create`, `mandates:read`, `escrows:deliver`). All payments, authorizations, and captures are governed server-side through PayPal Partner APIs.

---

## Installation

```bash
npm install @mandate/sdk
```

---

## Quickstart (Under 20 Lines)

```typescript
import { MandateClient, IntentBlockedError } from "@mandate/sdk";

// 1. Initialize client with scoped Agent API key (never PayPal credentials)
const client = new MandateClient({ apiKey: "mnd_agent_demo_key", baseUrl: "http://localhost:8000" });

async function runAgentCommerce() {
  // 2. Check remaining treasury budget before committing work
  const balance = await client.getMandateBalance("mnd_freelance_2026");
  console.log(`Remaining budget: $${(balance.remainingBudgetMinor / 100).toFixed(2)}`);

  // 3. Request payment through deterministic firewall & AI risk scorer
  try {
    const payment = await client.requestPayment({
      mandateId: "mnd_freelance_2026",
      counterparty: "seller_agent_acme",
      amountMinor: 12000, // $120.00
      description: "Logo Design Package (3 concepts + SVGs)",
      raiseOnBlocked: true
    });
    console.log(`Payment ${payment.decision}! Escrow order: ${payment.escrowId}`);
  } catch (err: any) {
    if (err instanceof IntentBlockedError) console.error("BLOCKED by Mandate Firewall:", err.reasons);
  }
}
runAgentCommerce();
```

---

## Core Methods

| Method | Description |
|---|---|
| `client.requestPayment(params)` | Submits payment intent to deterministic policy engine (R1–R10) & risk scorer. |
| `client.getIntentStatus(intentId)` | Fetches intent decision, approval status, and escrow contract ID. |
| `client.getMandateBalance(mandateId)` | Returns allocated spend, remaining treasury budget, and velocity limits. |
| `client.submitDeliverable(escrowId, params)` | Seller agent submits work proofs/hashes for automated AI arbitration. |
