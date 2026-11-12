import { demoStore, MandateItem, PaymentIntentItem, EscrowItem, AuditRecord, Agent } from "./demo-store";
import { getAuthToken } from "./auth";

export const isDemoMode = (): boolean => {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
};

// Use NEXT_PUBLIC_API_URL or relative /api via Next rewrite
const getApiBase = (): string => {
  if (typeof window !== "undefined") {
    // Client-side: use Next.js rewrites so relative /api proxies properly
    return "";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
};

export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };
  return fetch(`${getApiBase()}${path}`, {
    ...options,
    headers,
  });
}

export async function fetchHealth() {
  try {
    const res = await apiFetch(`/api/health`, { cache: "no-store" });
    if (!res.ok) throw new Error("Health check failed");
    return await res.json();
  } catch (err) {
    if (isDemoMode()) {
      return {
        status: "simulation",
        service: "mandate-gateway (demo mode)",
        version: "1.0.0",
        paypal_mode: "sandbox",
        llm_provider: "gemini",
        demo_replay_mode: true,
      };
    }
    throw err;
  }
}

export async function fetchMandates(): Promise<MandateItem[]> {
  try {
    const res = await apiFetch(`/api/mandates`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch mandates: ${res.statusText}`);
    const data = await res.json();
    if (data && data.length > 0) return data;
    return isDemoMode() ? demoStore.getMandates() : [];
  } catch (err) {
    return isDemoMode() ? demoStore.getMandates() : [];
  }
}

export async function fetchMandate(mandateId: string): Promise<MandateItem | null> {
  try {
    const res = await apiFetch(`/api/mandates/${mandateId}`, { cache: "no-store" });
    if (!res.ok) {
      if (res.status === 404 && isDemoMode()) {
        return demoStore.getMandates().find((m) => m.id === mandateId) || null;
      }
      return null;
    }
    return await res.json();
  } catch (err) {
    return isDemoMode() ? (demoStore.getMandates().find((m) => m.id === mandateId) || null) : null;
  }
}

export async function createMandate(payload: any): Promise<MandateItem> {
  try {
    const res = await apiFetch(`/api/mandates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (isDemoMode()) demoStore.addMandate(data);
      return data;
    }
    throw new Error(`Failed to create mandate: ${res.statusText}`);
  } catch (err) {
    if (!isDemoMode()) throw err;
    // Fallback for offline demo mode
    const sig = "ed25519_" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const newMandate: MandateItem = {
      id: "mnd_" + Math.random().toString(36).substring(2, 9),
      name: payload.policy.name || "Custom Mandate Policy",
      agent_id: payload.agent_id || "buyer_agent_alpha",
      owner_id: payload.owner_id || "usr_current",
      status: "ACTIVE",
      signature: payload.signature || sig,
      public_key: payload.public_key || Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      key_id: payload.key_id || "key_ed25519_demo_primary",
      signature_algorithm: payload.signature_algorithm || "ed25519",
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
    const res = await apiFetch(`/api/mandates/${mandateId}/revoke`, { method: "POST" });
    if (res.ok) {
      if (isDemoMode()) demoStore.revokeMandate(mandateId);
      return await res.json();
    }
  } catch (err) {
    if (!isDemoMode()) throw err;
  }
  if (isDemoMode()) {
    demoStore.revokeMandate(mandateId);
    return { status: "REVOKED", id: mandateId };
  }
  throw new Error("Failed to revoke mandate");
}

export async function fetchOwnerKeys(): Promise<any[]> {
  try {
    const res = await apiFetch(`/api/auth/keys`, { cache: "no-store" });
    if (res.ok) return await res.json();
    return [];
  } catch (err) {
    return [];
  }
}

export async function generateOwnerKeyPair(keyId?: string): Promise<any> {
  try {
    const res = await apiFetch(`/api/auth/keys/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(keyId ? { key_id: keyId } : {}),
    });
    if (res.ok) return await res.json();
    throw new Error("Failed to generate key pair");
  } catch (err) {
    if (!isDemoMode()) throw err;
    return {
      key_id: "key_ed25519_demo_" + Math.random().toString(36).substring(2, 8),
      public_key: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      private_key: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      algorithm: "ed25519",
    };
  }
}

export async function rotateMandateKey(
  mandateId: string,
  payload: { new_key_id: string; new_public_key: string; new_signature: string }
): Promise<MandateItem> {
  const res = await apiFetch(`/api/mandates/${mandateId}/rotate-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to rotate key");
  return await res.json();
}

export async function fetchPayments(): Promise<PaymentIntentItem[]> {
  try {
    const res = await apiFetch(`/api/intents`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch intents");
    const data = await res.json();
    if (data && data.length > 0) return data;
    return isDemoMode() ? demoStore.getPayments() : [];
  } catch (err) {
    return isDemoMode() ? demoStore.getPayments() : [];
  }
}

export async function fetchPayment(paymentId: string): Promise<PaymentIntentItem | null> {
  try {
    const res = await apiFetch(`/api/intents/${paymentId}`, { cache: "no-store" });
    if (!res.ok) {
      if (res.status === 404 && isDemoMode()) {
        return demoStore.getPayments().find((p) => p.id === paymentId) || null;
      }
      return null;
    }
    return await res.json();
  } catch (err) {
    return isDemoMode() ? (demoStore.getPayments().find((p) => p.id === paymentId) || null) : null;
  }
}

export async function fetchEscrows(): Promise<EscrowItem[]> {
  try {
    const res = await apiFetch(`/api/escrows`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch escrows");
    const data = await res.json();
    if (data && data.length > 0) return data;
    return isDemoMode() ? demoStore.getEscrows() : [];
  } catch (err) {
    return isDemoMode() ? demoStore.getEscrows() : [];
  }
}

export async function fetchEscrow(escrowId: string): Promise<EscrowItem | null> {
  try {
    const res = await apiFetch(`/api/escrows/${escrowId}`, { cache: "no-store" });
    if (!res.ok) {
      if (res.status === 404 && isDemoMode()) {
        return demoStore.getEscrows().find((e) => e.id === escrowId) || null;
      }
      return null;
    }
    return await res.json();
  } catch (err) {
    return isDemoMode() ? (demoStore.getEscrows().find((e) => e.id === escrowId) || null) : null;
  }
}

export async function arbitrateEscrow(escrowId: string): Promise<any> {
  const res = await apiFetch(`/api/escrows/${escrowId}/arbitrate`, { method: "POST" });
  if (!res.ok) throw new Error(`Arbitration failed: ${res.statusText}`);
  return await res.json();
}

export async function humanDecisionEscrow(escrowId: string, action: string, notes: string = ""): Promise<any> {
  const res = await apiFetch(`/api/escrows/${escrowId}/human-decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, notes }),
  });
  if (!res.ok) throw new Error(`Human decision failed: ${res.statusText}`);
  return await res.json();
}

export async function approvalReturnEscrow(escrowId: string): Promise<any> {
  const res = await apiFetch(`/api/escrows/${escrowId}/approval-return`, { method: "GET" });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errData.detail || "Approval return verification failed");
  }
  return await res.json();
}

export async function fetchAuditLogs(): Promise<AuditRecord[]> {
  try {
    const res = await apiFetch(`/api/audit`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch audit");
    const data = await res.json();
    if (data && data.length > 0) return data;
    return isDemoMode() ? demoStore.getAudit() : [];
  } catch (err) {
    return isDemoMode() ? demoStore.getAudit() : [];
  }
}

export async function verifyAudit(): Promise<{ valid: boolean; total_events: number; head_hash: string; message: string }> {
  const res = await apiFetch(`/api/audit/verify`, { cache: "no-store" });
  if (!res.ok) throw new Error("Audit verification failed");
  return await res.json();
}

export async function fetchAgents(): Promise<Agent[]> {
  try {
    const res = await apiFetch(`/api/agents`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch agents");
    const data = await res.json();
    if (data && data.length > 0) return data;
    return isDemoMode() ? demoStore.getAgents() : [];
  } catch (err) {
    return isDemoMode() ? demoStore.getAgents() : [];
  }
}

export async function fetchAgent(agentId: string): Promise<Agent | null> {
  try {
    const res = await apiFetch(`/api/agents/${agentId}`, { cache: "no-store" });
    if (!res.ok) {
      if (res.status === 404 && isDemoMode()) {
        return demoStore.getAgents().find((a) => a.id === agentId) || null;
      }
      return null;
    }
    return await res.json();
  } catch (err) {
    return isDemoMode() ? (demoStore.getAgents().find((a) => a.id === agentId) || null) : null;
  }
}

export async function runScenarioApi(scenarioKey: string): Promise<any> {
  const res = await apiFetch(`/api/scenarios/${scenarioKey}/run`, { method: "POST" });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Scenario failed (${res.status}): ${errorText}`);
  }
  return await res.json();
}

export async function fetchRedTeamStats(): Promise<any> {
  const res = await apiFetch(`/api/scenarios/redteam/stats`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch red team stats");
  return await res.json();
}

export async function runRedTeamApi(): Promise<any> {
  const res = await apiFetch(`/api/scenarios/red_team/run`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to run red team suite");
  return await res.json();
}

export function subscribeToStream(onEvent: (event: any) => void): () => void {
  if (typeof window === "undefined") return () => {};
  try {
    const es = new EventSource(`${getApiBase()}/api/stream`);
    es.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        onEvent(parsed);
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };
    es.onerror = () => {
      // EventSource automatically attempts reconnection
    };
    return () => {
      es.close();
    };
  } catch (err) {
    console.error("SSE subscription error", err);
    return () => {};
  }
}
