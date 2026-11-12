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
