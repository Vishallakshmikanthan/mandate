import { demoStore, MandateItem, PaymentIntentItem, EscrowItem, AuditRecord } from "./demo-store";

const API_BASE = ""; // Relative to Next.js rewrites

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`, { cache: "no-store" });
    if (!res.ok) throw new Error("Health check failed");
    return await res.json();
  } catch (err) {
    return {
      status: "simulation",
      service: "mandate-gateway (demo mode)",
      version: "1.0.0",
      paypal_mode: "sandbox",
      llm_provider: "gemini",
      demo_replay_mode: true,
    };
  }
}

export async function fetchMandates(): Promise<MandateItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/mandates`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch mandates");
    const data = await res.json();
    return data.length > 0 ? data : demoStore.getMandates();
  } catch (err) {
    return demoStore.getMandates();
  }
}

export async function createMandate(payload: any): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/mandates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      demoStore.addMandate(data);
      return data;
    }
    throw new Error("Backend reject");
  } catch (err) {
    // Generate signature locally for offline demo mode
    const sig = "hmac_sha256_" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const newMandate: MandateItem = {
      id: "mnd_" + Math.random().toString(36).substring(2, 9),
      name: payload.policy.name || "Custom Mandate Policy",
      agent_id: payload.agent_id || "buyer_agent_alpha",
      owner_id: payload.owner_id || "usr_current",
      status: "ACTIVE",
      signature: sig,
      created_at: new Date().toISOString(),
      expires_at: payload.policy.expires_at || new Date(Date.now() + 365 * 86400000).toISOString(),
      spent_to_date_minor: 0,
      remaining_budget_minor: payload.policy.max_total_minor || 50000,
      policy: payload.policy,
    };
    demoStore.addMandate(newMandate);
    return newMandate;
  }
}

export async function revokeMandate(mandateId: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/mandates/${mandateId}/revoke`, { method: "POST" });
    if (res.ok) {
      demoStore.revokeMandate(mandateId);
      return await res.json();
    }
  } catch (err) {
    // fallback
  }
  demoStore.revokeMandate(mandateId);
  return { status: "REVOKED", id: mandateId };
}

export async function fetchPayments(): Promise<PaymentIntentItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/intents`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch intents");
    const data = await res.json();
    return data.length > 0 ? data : demoStore.getPayments();
  } catch (err) {
    return demoStore.getPayments();
  }
}

export async function fetchEscrows(): Promise<EscrowItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/escrows`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch escrows");
    const data = await res.json();
    return data.length > 0 ? data : demoStore.getEscrows();
  } catch (err) {
    return demoStore.getEscrows();
  }
}

export async function fetchAuditLogs(): Promise<AuditRecord[]> {
  try {
    const res = await fetch(`${API_BASE}/api/audit`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch audit");
    const data = await res.json();
    return data.length > 0 ? data : demoStore.getAudit();
  } catch (err) {
    return demoStore.getAudit();
  }
}

export async function runScenarioApi(scenarioKey: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/scenarios/${scenarioKey}/run`, { method: "POST" });
    if (res.ok) return await res.json();
  } catch (err) {
    // fallback simulated response
  }
  if (scenarioKey === "happy_path") {
    return {
      scenario: "happy_path",
      decision: "APPROVED",
      escrow_state: "RELEASED",
      risk_score: 0.05,
      flags: [],
      paypal_order_id: "ORDER_PP_789102",
      paypal_authorization_id: "AUTH_PP_441209",
      paypal_capture_id: "CAP_PP_990144",
      amount_minor: 12000,
    };
  } else if (scenarioKey === "injection_attack") {
    return {
      scenario: "injection_attack",
      decision: "BLOCKED",
      escrow_state: null,
      risk_score: 0.98,
      flags: ["ADVERSARIAL_INJECTION_DETECTED", "OVER_TRANSACTION_CAP"],
      paypal_order_id: null,
      amount_minor: 90000,
    };
  } else {
    return {
      scenario: "bad_delivery_dispute",
      decision: "APPROVED",
      escrow_state: "REFUNDED",
      risk_score: 0.12,
      flags: ["ARBITER_REJECTED_DELIVERABLE"],
      paypal_order_id: "ORDER_PP_331190",
      paypal_authorization_id: "AUTH_PP_119033",
      amount_minor: 12000,
    };
  }
}

