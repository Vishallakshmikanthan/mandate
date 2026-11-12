# Mandate Compliance & Payment Architecture Notes

> **Disclaimer:** This document is for technical and architectural informational purposes only and does not constitute legal, financial, or regulatory compliance advice. Consult qualified legal counsel before conducting live commercial transactions or operating in production with real customer funds.

---

## 1. Fund Custody & Flow of Funds

### Mandate Never Holds or Custodies Funds
- **Non-Custodial Architecture:** Mandate does not act as a money transmitter or escrow agent under state/federal money transmitter laws (MTL). Mandate never receives, holds, transmits, or possesses funds at any time.
- **PayPal Escrow/Authorization:** All authorizations, escrow holds, dispute resolutions, and settlements are executed directly through **PayPal (Orders v2 / Payments v2)**.
- **Agent Capability Boundaries:** Buyer autonomous agents never hold PayPal API credentials, client secrets, access tokens, or direct payment capabilities. Their sole capability is posting structured payment intents to the Mandate Gateway.

---

## 2. Counterparty Payee Routing in Orders v2

In PayPal Orders v2 (`POST /v2/checkout/orders`), funds can be routed to a designated seller counterparty by specifying the `payee` object within the purchase unit:

```json
{
  "intent": "AUTHORIZE",
  "purchase_units": [
    {
      "reference_id": "intent_id_12345",
      "amount": {
        "currency_code": "USD",
        "value": "120.00"
      },
      "payee": {
        "email_address": "seller@example.com",
        "merchant_id": "2ABC123XYZ456"
      }
    }
  ]
}
```

### Sandbox Environment Path
- In the PayPal Sandbox, specifying `payee` (with either `email_address` or `merchant_id`) routes the payout directly to that sandbox seller account upon authorization capture.
- Does **not** require platform or marketplace partner verification in sandbox, allowing automated end-to-end multi-agent testing.

### Production Environment Prerequisites
In live production, paying a third-party seller requires platform partner onboarding:
1. **PayPal Multiparty / Partner Platform Onboarding:**
   - The platform operator must register for **PayPal Complete Payments for Marketplaces and Platforms** (or PayPal Partner Solutions).
   - Platform account must be approved for marketplace seller routing (`PAYMENT` and/or `SHARED_VAULT` capabilities).
2. **Seller KYC and Merchant Onboarding:**
   - Sellers/counterparties must undergo onboarding and OAuth consent linking their PayPal merchant account to the platform.
   - Alternatively, API calls routing to sellers must include third-party delegated authorization (`PayPal-Auth-Assertion`).
3. **Platform Fee / Split Payouts:**
   - If platform fees or fee splits are levied, partner platform fee configurations must be specified in `payment_instruction.platform_fees`.

---

## 3. Checklist for Live-Money Pilots

Before initiating a live-money pilot with real currency:
- [ ] Legal counsel review on marketplace exemption vs money transmission licensing.
- [ ] Production PayPal partner onboarding complete with verified multiparty payee permissions.
- [ ] Counterparty identity verification (KYC/KYB) workflow integrated for verified counterparty onboarding.
- [ ] Terms of Service and Escrow Arbitration Agreement accepted by human principals of buyer and seller agents.
- [ ] Webhook signature verification strictly enforced in production (`APP_ENV=prod`).
- [ ] Asymmetric mandate signing with KMS-managed keys.
