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
    <div className="space-y-8 max-w-[1400px] mx-auto py-4">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/[0.08] gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
            Protocol Configuration
          </span>
          <h2 className="text-2xl sm:text-3xl font-normal tracking-tightest text-white mt-1">
            Mandate Policy Builder
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-xl">
            Define deterministic financial bounds and sign them with HMAC-SHA256 before granting an autonomous agent spending authority.
          </p>
        </div>
        <button
          onClick={fetchMandates}
          className="ref-circle-btn self-start"
          title="Refresh Mandates"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Builder Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Controls (7 cols) */}
        <div className="lg:col-span-7 ref-glass-card rounded-2xl p-6 sm:p-7 border border-white/[0.08] space-y-5">
          <div className="pb-3 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
              Policy Parameters
            </span>
            <span className="text-[10px] font-mono text-neutral-500">JSON-Schema v1</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-neutral-400 font-mono text-[10px] uppercase block mb-1">
                Human Principal ID
              </label>
              <input
                type="text"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-3.5 py-2 text-white font-mono focus:border-white/40 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-neutral-400 font-mono text-[10px] uppercase block mb-1">
                Autonomous Agent ID
              </label>
              <input
                type="text"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-3.5 py-2 text-white font-mono focus:border-white/40 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-neutral-400 font-mono text-[10px] uppercase block mb-1">
                Per-Txn Cap ($)
              </label>
              <input
                type="number"
                value={maxPerTxn}
                onChange={(e) => setMaxPerTxn(Number(e.target.value))}
                className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-3.5 py-2 text-white font-mono focus:border-white/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-neutral-400 font-mono text-[10px] uppercase block mb-1">
                Total Budget ($)
              </label>
              <input
                type="number"
                value={maxTotal}
                onChange={(e) => setMaxTotal(Number(e.target.value))}
                className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-3.5 py-2 text-white font-mono focus:border-white/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-neutral-400 font-mono text-[10px] uppercase block mb-1">
                24h Daily Limit ($)
              </label>
              <input
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-3.5 py-2 text-white font-mono focus:border-white/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-neutral-400 font-mono text-[10px] uppercase block mb-1">
                Escalate Above ($)
              </label>
              <input
                type="number"
                value={escalateAbove}
                onChange={(e) => setEscalateAbove(Number(e.target.value))}
                className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-3.5 py-2 text-white font-mono focus:border-white/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-neutral-400 font-mono text-[10px] uppercase block mb-1">
                Velocity (Txns/Hr)
              </label>
              <input
                type="number"
                value={velocity}
                onChange={(e) => setVelocity(Number(e.target.value))}
                className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-3.5 py-2 text-white font-mono focus:border-white/40 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-neutral-400 font-mono text-[10px] uppercase block mb-1">
                Allowed Counterparty
              </label>
              <input
                type="text"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-3.5 py-2 text-white font-mono focus:border-white/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-neutral-400 font-mono text-[10px] uppercase block mb-1">
                Blacklisted Counterparty
              </label>
              <input
                type="text"
                value={blockedCounterparty}
                onChange={(e) => setBlockedCounterparty(e.target.value)}
                className="w-full bg-red-950/20 border border-red-500/30 rounded-xl px-3.5 py-2 text-red-300 font-mono focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="text-neutral-400 font-mono text-[10px] uppercase block mb-1">
              Allowed Merchant Categories
            </label>
            <input
              type="text"
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-3.5 py-2 text-white font-mono focus:border-white/40 focus:outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={handleCreateMandate}
              disabled={loading}
              className="ref-pill-primary w-full py-3 text-xs uppercase tracking-wider font-mono cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? "Signing & Storing..." : "Sign & Register Mandate"}</span>
            </button>
          </div>
        </div>

        {/* Live Canonical Preview (5 cols) */}
        <div className="lg:col-span-5 ref-glass-card rounded-2xl p-6 sm:p-7 border border-white/[0.08] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                Canonical JSON & HMAC
              </span>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-1 text-[11px] font-mono text-neutral-400 hover:text-white px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-black/80 border border-white/[0.06] max-h-[360px] overflow-y-auto no-scrollbar">
              <pre className="text-[11px] font-mono text-neutral-300 whitespace-pre-wrap leading-relaxed">
                {canonicalJson}
              </pre>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-xs">
            <div className="flex items-center gap-2 font-mono text-xs text-white mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-neutral-300" />
              <span className="uppercase tracking-wider">Cryptographic Binding</span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-relaxed font-sans mt-1">
              Every spending policy is normalized and signed with HMAC-SHA256. The Mandate Gateway validates signatures prior to processing intent requests.
            </p>
          </div>
        </div>
      </div>

      {/* Active Mandates Table */}
      <div className="ref-glass-card rounded-2xl p-6 sm:p-7 border border-white/[0.08]">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
          <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
            Active Mandates & Spend Balances
          </span>
          <span className="text-[10px] font-mono text-neutral-500">
            {mandates.length} registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-neutral-400 uppercase text-[10px] font-mono">
                <th className="pb-3">Mandate ID</th>
                <th className="pb-3">Agent</th>
                <th className="pb-3">Per-Txn Cap</th>
                <th className="pb-3">Spend / Budget</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Signature</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] font-mono">
              {mandates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-500 font-sans">
                    No mandates configured yet.
                  </td>
                </tr>
              ) : (
                mandates.map((m) => {
                  const isRevoked = m.status === "REVOKED";
                  return (
                    <tr key={m.id} className="text-neutral-300 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 font-medium text-white truncate max-w-[120px]">{m.id}</td>
                      <td className="py-3 text-neutral-400">{m.agent_id}</td>
                      <td className="py-3 text-white">
                        ${(m.policy.max_per_transaction_minor / 100).toFixed(2)}
                      </td>
                      <td className="py-3 text-emerald-400 font-medium">
                        ${(m.spent_to_date_minor / 100).toFixed(2)} / $
                        {(m.policy.max_total_minor / 100).toFixed(2)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${isRevoked
                              ? "bg-red-500/10 text-red-400 border-red-500/30"
                              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 text-[10px] text-neutral-500 truncate max-w-[120px]">
                        {m.signature.slice(0, 16)}...
                      </td>
                      <td className="py-3 text-right">
                        {!isRevoked && (
                          <button
                            onClick={() => handleRevoke(m.id)}
                            className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-[10px] font-mono font-medium transition-colors inline-flex items-center gap-1 cursor-pointer"
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
