"use client";

import React, { useState, useEffect } from "react";
import { Shield, Key, AlertOctagon, CheckCircle2, Copy, Check, Plus, RefreshCw } from "lucide-react";

interface MandateItem {
  id: string;
  owner_id: string;
  agent_id: string;
  policy: Record<string, any>;
  signature: string;
  status: string;
  spent_to_date_minor: number;
  remaining_budget_minor: number;
  created_at: string;
}

export const MandateBuilder: React.FC = () => {
  const [mandates, setMandates] = useState<MandateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form State
  const [ownerId, setOwnerId] = useState("human_principal_vishal");
  const [agentId, setAgentId] = useState("buyer_agent_alpha");
  const [maxPerTxn, setMaxPerTxn] = useState(200);
  const [maxTotal, setMaxTotal] = useState(500);
  const [dailyLimit, setDailyLimit] = useState(300);
  const [escalateAbove, setEscalateAbove] = useState(150);
  const [counterparty, setCounterparty] = useState("seller_agent_acme");
  const [blockedCounterparty, setBlockedCounterparty] = useState("unverified_seller_66");
  const [categories, setCategories] = useState("freelance_design, software_services");
  const [velocity, setVelocity] = useState(5);

  const fetchMandates = async () => {
    try {
      const res = await fetch("/api/mandates");
      if (res.ok) {
        const data = await res.json();
        setMandates(data);
      }
    } catch (err) {
      console.error("Failed to load mandates:", err);
    }
  };

  useEffect(() => {
    fetchMandates();
  }, []);

  const currentPolicy = {
    version: 1,
    currency: "USD",
    max_total_minor: maxTotal * 100,
    max_per_transaction_minor: maxPerTxn * 100,
    daily_limit_minor: dailyLimit * 100,
    allowed_merchant_categories: categories.split(",").map((c) => c.trim()).filter(Boolean),
    allowed_counterparties: [counterparty].filter(Boolean),
    blocked_counterparties: [blockedCounterparty].filter(Boolean),
    allowed_hours_utc: { start: "00:00", end: "23:59" },
    velocity: { max_txns_per_hour: velocity },
    escalate_above_minor: escalateAbove * 100,
    require_escrow: true,
    expires_at: "2026-12-31T23:59:59Z",
  };

  const canonicalJson = JSON.stringify(currentPolicy, null, 2);

  const handleCreateMandate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mandates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_id: ownerId,
          agent_id: agentId,
          policy: currentPolicy,
        }),
      });
      if (res.ok) {
        await fetchMandates();
      }
    } catch (err) {
      console.error("Failed to create mandate:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const res = await fetch(`/api/mandates/${id}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Emergency killswitch triggered from dashboard" }),
      });
      if (res.ok) {
        await fetchMandates();
      }
    } catch (err) {
      console.error("Failed to revoke mandate:", err);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(canonicalJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <span>Cryptographic Spending Mandate Builder</span>
          </h2>
          <p className="text-xs text-slate-400">
            Define deterministic financial constraints and sign them with HMAC-SHA256 before granting agent spend ability.
          </p>
        </div>
        <button
          onClick={fetchMandates}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs hover:bg-slate-800 transition-colors self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Controls */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider pb-2 border-b border-slate-800">
            Policy Specification
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 font-medium block mb-1">Human Principal ID</label>
              <input
                type="text"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 font-medium block mb-1">Autonomous Agent ID</label>
              <input
                type="text"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-slate-400 font-medium block mb-1">Per-Txn Cap ($)</label>
              <input
                type="number"
                value={maxPerTxn}
                onChange={(e) => setMaxPerTxn(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 font-medium block mb-1">Lifetime Budget ($)</label>
              <input
                type="number"
                value={maxTotal}
                onChange={(e) => setMaxTotal(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 font-medium block mb-1">24h Daily Limit ($)</label>
              <input
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 font-medium block mb-1">Escalate Above ($)</label>
              <input
                type="number"
                value={escalateAbove}
                onChange={(e) => setEscalateAbove(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 font-medium block mb-1">Velocity (Txns/Hr)</label>
              <input
                type="number"
                value={velocity}
                onChange={(e) => setVelocity(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 font-medium block mb-1">Whitelist Counterparty</label>
              <input
                type="text"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 font-medium block mb-1">Blacklist Counterparty</label>
              <input
                type="text"
                value={blockedCounterparty}
                onChange={(e) => setBlockedCounterparty(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-red-300 font-mono focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="text-slate-400 font-medium block mb-1">Allowed Categories</label>
            <input
              type="text"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:border-blue-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleCreateMandate}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{loading ? "Signing & Storing..." : "Sign & Register Mandate"}</span>
          </button>
        </div>

        {/* Live Canonical Preview */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs">
                <Key className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-bold text-slate-200 uppercase tracking-wider">
                  Canonical JSON & HMAC Preview
                </span>
              </div>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-800/80 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className="mt-3 p-3 rounded-xl bg-black/70 border border-slate-800/80 max-h-[360px] overflow-y-auto">
              <pre className="text-[11px] font-mono text-cyan-300 whitespace-pre-wrap">{canonicalJson}</pre>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-blue-950/20 border border-blue-800/30 text-xs text-blue-300">
            <div className="flex items-center gap-1.5 font-semibold mb-1">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              <span>HMAC-SHA256 Cryptographic Binding</span>
            </div>
            <p className="text-[11px] text-blue-300/80 leading-relaxed">
              Every mandate policy is normalized and signed using the server's private key. The Mandate Gateway refuses any intent if the policy payload does not match its signature.
            </p>
          </div>
        </div>
      </div>

      {/* Active Mandates Table */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800">
        <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider mb-3">
          Active Mandates & Spend Balances
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono">
                <th className="pb-2">Mandate ID</th>
                <th className="pb-2">Agent</th>
                <th className="pb-2">Per-Txn Cap</th>
                <th className="pb-2">Spend / Budget</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Signature</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {mandates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500 font-sans">
                    No mandates configured yet.
                  </td>
                </tr>
              ) : (
                mandates.map((m) => {
                  const isRevoked = m.status === "REVOKED";
                  return (
                    <tr key={m.id} className="text-slate-300 hover:bg-slate-900/40">
                      <td className="py-3 font-semibold text-blue-400 truncate max-w-[120px]">{m.id}</td>
                      <td className="py-3 text-slate-300">{m.agent_id}</td>
                      <td className="py-3 text-slate-200">
                        ${(m.policy.max_per_transaction_minor / 100).toFixed(2)}
                      </td>
                      <td className="py-3 text-emerald-400 font-bold">
                        ${(m.spent_to_date_minor / 100).toFixed(2)} / $
                        {(m.policy.max_total_minor / 100).toFixed(2)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isRevoked
                              ? "bg-red-500/10 text-red-400 border-red-500/30"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 text-[10px] text-slate-500 truncate max-w-[120px]">
                        {m.signature.slice(0, 16)}...
                      </td>
                      <td className="py-3 text-right">
                        {!isRevoked && (
                          <button
                            onClick={() => handleRevoke(m.id)}
                            className="px-2.5 py-1 rounded bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-[10px] font-bold transition-colors inline-flex items-center gap-1"
                          >
                            <AlertOctagon className="w-3 h-3" />
                            <span>Killswitch</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
