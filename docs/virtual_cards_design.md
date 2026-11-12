# Architectural Design Document: Dynamic Single-Use Virtual Cards for Autonomous Agents

> **Document Status:** Design Proposal / Architectural RFC (Not for Implementation Prior to Legal Review)  
> **Author:** Mandate Architecture Team  
> **Target Capabilities:** Extending Mandate's Deterministic Trust Layer Beyond PayPal to Any Visa / Mastercard Merchant

---

## 1. Executive Summary & Problem Context

While PayPal covers extensive peer-to-peer, freelance, and partner merchant ecosystems, autonomous agents frequently require purchasing services from commercial entities that exclusively accept card payments:
- Cloud infrastructure providers (AWS, Google Cloud, Cloudflare)
- Specialized developer APIs and micro-services
- SaaS subscriptions and domain registrars
- Ad networks and computing clusters

To enable autonomous agent spending across arbitrary web merchants while strictly preserving the **Mandate Trust Guarantees** (deterministic spending limits, zero credential leakage, fail-closed enforcement), we evaluate **Dynamic Single-Use / Merchant-Locked Virtual Commercial Cards** integrated with **Just-In-Time (JIT) Authorization Gateways**.

---

## 2. High-Level System Architecture

```
+---------------------------------------------------------------------------------------------+
|                                    MANDATE GATEWAY                                          |
|                                                                                             |
|  +---------------------+        +--------------------+        +--------------------------+  |
|  |  Ed25519 Mandate    |        |  Spend Ledger &    |        |  Tamper-Evident          |  |
|  |  Policy Engine      |------->|  Row-Locked Limits |------->|  Hash-Chained Audit Log  |  |
|  |  (Rules R1 - R10)   |        |  (Minor Integer)   |        |  (SHA-256 Checkpoints)   |  |
|  +---------------------+        +--------------------+        +--------------------------+  |
+--------------------------------------------^------------------------------------------------+
                                             |
                  Synchronous Real-Time Auth Webhook (<= 2,000ms)
                                             |
+--------------------------------------------v------------------------------------------------+
|                         CARD ISSUING PLATFORM (Stripe Issuing / Lithic)                      |
|                                                                                             |
|   1. Cardholder PAN Request            2. Visa / Mastercard Auth       3. JIT Funding Event |
|      (Single-Use Token)                   (Merchant Category, Amount)     (Approve / Decline)|
+--------------------------------------------^------------------------------------------------+
                                             | Real-Time ISO 8583 Authorization
                                             |
                                  +---------------------+
                                  |   Online Merchant   |
                                  |   (AWS, SaaS, etc.) |
                                  +---------------------+
```

---

## 3. Just-In-Time (JIT) Authorization Workflow

### Step 1: Pre-Intent Card Token Provisioning
1. The autonomous agent submits a preliminary payment intent to Mandate:
   `POST /api/intents/virtual-card` with `mandate_id`, `target_merchant`, `amount_minor`.
2. Mandate validates that the request is compliant with the mandate policy (Rules R1, R2, R3, R4, R5, R6, R7, R8, R10).
3. Mandate calls the Card Issuing Partner API (e.g., Stripe Issuing or Lithic) to generate an ephemeral, single-use virtual card number:
   - **Spending Limit:** Hard-capped at exactly `amount_minor` (or strict budget).
   - **Merchant Control:** Locked to the target merchant name or Merchant Category Code (MCC).
   - **Expiration:** Set to expire within 15–30 minutes if unused.
   - **Single-Use Flag:** Automatically deactivated after first authorization.
4. The agent receives ephemeral card details (PAN, CVV, Exp) to complete the checkout on the merchant's portal.

### Step 2: Real-Time JIT Authorization Evaluation
1. The merchant submits an authorization charge through the card network (Visa / Mastercard).
2. The card network routes the real-time authorization request to the Issuing Partner.
3. The Issuing Partner emits an ultra-low-latency HTTP webhook (`authorization.request`) to the Mandate Gateway with a strict **2,000 millisecond response deadline**.
4. The Mandate Gateway executes synchronous atomic checks:
   - **Row-Lock Spend Ledger:** Validates that total lifetime budget and 24h rolling velocity limits are not breached by concurrent transactions.
   - **Amount Matching:** Asserts authorized amount $\le$ approved intent minor units.
   - **MCC Validation:** Asserts merchant category matches policy allowlist.
5. **Gateway Decision:**
   - If compliant: Responds `{ "action": "approve" }` in $< 300\text{ms}$. Funds are reserved in the spend ledger.
   - If non-compliant or anomaly detected: Responds `{ "action": "decline", "reason": "mandate_policy_violation" }`.

---

## 4. Escrow & Arbitration Lifecycle on Card Rails

Unlike PayPal's two-stage authorization and capture framework (which natively permits up to 29 days of custodial holds), credit card rails operate under different standard settlement mechanics:

| Dimension | PayPal Orders v2 Escrow | Virtual Cards (Visa / Mastercard) |
|---|---|---|
| **Hold Mechanism** | Extended Authorization Hold (`intent: AUTHORIZE`) | Standard Authorization Hold (`auth_capture`) |
| **Maximum Hold Duration** | Up to 29 days | Standard 7 days (extended to 30 days only for select MCCs like hotels/car rental) |
| **Settlement Velocity** | Captured explicitly by Mandate API after AI arbitration | Merchant auto-captures on settlement cutoff (typically 24–48 hours) |
| **Dispute Mechanism** | Server-side programmatic Void / Refund API | Visa / Mastercard Chargeback disputes (chargeback fee + 30-90 day timeline) |

### Proposed Escrow Emulation on Virtual Cards:
1. **Pre-Auth Capture Split (< 7 Days Delivery):**
   - For services delivered within 7 calendar days, the authorization remains uncaptured.
   - When the agent submits the deliverable, the AI Arbiter inspects the assets.
   - If PASS: Mandate triggers the merchant capture or allows the pre-auth to settle.
   - If FAIL: Mandate immediately reverses/voids the card authorization hold before settlement.
2. **Post-Settlement Autonomous Escrow (> 7 Days Delivery):**
   - For long-running deliverables, funds settle to the merchant.
   - Contracts must include automated refund API clauses or require merchant counterparty pre-registration with programmatic refund webhooks.

---

## 5. Security Invariants & Attack Mitigations

1. **Zero Permanent Credential Exposure:**
   - Agents never receive physical cards or reusable corporate credit lines.
   - Every card token is single-use and auto-destructs after one authorization.
2. **Merchant Category & Exact Amount Locking:**
   - If an agent generates a card for a $35 SaaS subscription and a malicious actor attempts to charge $500 or charge at an ad network, the card network declines at the gateway level.
3. **PCI-DSS Scope Isolation:**
   - Mandate servers never store unencrypted Primary Account Numbers (PANs) or Card Verification Values (CVVs).
   - Card data is tokenized using PCI-DSS Level 1 compliant client libraries (e.g. Stripe Elements or Lithic Web SDK) directly in browser memory or ephemeral micro-containers.
4. **Autonomous Loop Protection:**
   - JIT authorization handlers enforce per-mandate velocity limits ($N$ charges per hour) to neutralize automated looping scripts or prompt-induced split-amount attacks.

---

## 6. Regulatory & Program Compliance Requirements

Prior to implementing or testing virtual cards with live capital:

1. **Card Program Sponsorship:**
   - Requires formal partnership agreement with an authorized banking institution / BaaS provider (e.g. Stripe Treasury, Lithic, Evolve Bank & Trust, Cross River Bank).
2. **Commercial Entity KYB:**
   - The operating business must pass Know-Your-Business (KYB) and anti-money laundering (AML) underwriting.
3. **Cardholder CIP / KYC:**
   - Compliance review must clarify whether the human principal or the autonomous software entity is categorized as the "Cardholder" under the Customer Identification Program (CIP).
4. **Chargeback & Fraud Risk Allocation:**
   - Strict contractual terms defining financial liability between the human principal and the platform in the event of merchant non-delivery.

---

## 7. Recommended Implementation Phases

1. **Phase 1 (Current):** Focus strictly on **PayPal Auth & Capture** for vetted marketplaces and counterparty agents.
2. **Phase 2 (Design & Sandbox Evaluation):** Implement sandbox JIT authorization webhook listener with mock card issuing payloads in test harness.
3. **Phase 3 (Pilot Onboarding):** Following regulatory memorandum, launch restricted pilot for cloud infrastructure SaaS spend only (AWS/GCP) with $100 single-use limits.

