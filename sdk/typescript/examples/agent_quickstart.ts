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
