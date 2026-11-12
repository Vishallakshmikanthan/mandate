"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  FileCheck,
  ArrowLeft,
  Key,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { demoStore, MandateItem } from "@/lib/demo-store";
import { formatMoney } from "@/lib/money";

export default function MandateDetailPage() {
  const params = useParams();
  const mandateId = params.id as string;
  const router = useRouter();
  const [mandate, setMandate] = useState<MandateItem | null>(null);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    const found = demoStore.getMandates().find((m) => m.id === mandateId);
    setMandate(found || null);
  }, [mandateId]);

  const handleRevoke = () => {
    if (confirm("Are you sure you want to revoke this mandate? In-flight and subsequent intents will be halted at Rule R1.")) {
      setRevoking(true);
      demoStore.revokeMandate(mandateId);
      setTimeout(() => {
        setRevoking(false);
        const updated = demoStore.getMandates().find((m) => m.id === mandateId);
        setMandate(updated || null);
      }, 500);
    }
  };

  if (!mandate) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <FileCheck className="w-12 h-12 text-neutral-500 mx-auto" />
        <h2 className="text-xl font-semibold text-white">Mandate Not Found</h2>
        <Link
          href="/app/mandates"
          className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to mandates
        </Link>
      </div>
    );
  }

  const spentPct = Math.min(
    100,
    Math.round((mandate.spent_to_date_minor / (mandate.policy.max_total_minor || 1)) * 100)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Link
        href="/app/mandates"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Mandates
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">{mandate.name}</h1>
              <StatusPill status={mandate.status} size="sm" />
            </div>
            <p className="text-xs font-mono text-neutral-400 mt-0.5">
              ID: {mandate.id} • Bound to Agent: {mandate.agent_id}
            </p>
          </div>
        </div>

        {mandate.status === "ACTIVE" && (
          <button
            onClick={handleRevoke}
            disabled={revoking}
            className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-mono font-semibold transition-all hover:scale-105"
          >
            {revoking ? "Revoking..." : "Revoke Mandate Immediately"}
          </button>
        )}
      </div>

      {/* Spend Budget Progress */}
      <GlassCard className="p-6">
        <div className="flex justify-between text-xs font-mono mb-2">
          <span className="text-neutral-300">Budget Consumed ({spentPct}%)</span>
          <span className="text-white font-bold tabular-nums">
            {formatMoney(mandate.spent_to_date_minor)} / {formatMoney(mandate.policy.max_total_minor)}
          </span>
        </div>
        <div className="h-2.5 w-full bg-white/[0.08] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              mandate.status === "REVOKED" ? "bg-rose-500" : "brand-gradient-bg"
            }`}
            style={{ width: `${spentPct}%` }}
          />
        </div>
        <div className="text-[11px] font-mono text-neutral-400 flex justify-between pt-2">
          <span>Remaining: {formatMoney(mandate.remaining_budget_minor)}</span>
          <span>Per-Txn Cap: {formatMoney(mandate.policy.max_per_transaction_minor)}</span>
          <span>Escalate Above: {formatMoney(mandate.policy.escalate_above_minor)}</span>
        </div>
      </GlassCard>

      {/* Signature and Verification */}
      <GlassCard className="p-6 space-y-3">
        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
          <Key className="w-3.5 h-3.5 text-cyan-400" />
          Cryptographic HMAC-SHA256 Signature
        </span>
        <div className="p-3 rounded-xl bg-black/60 border border-white/[0.08] text-xs font-mono text-cyan-300 break-all select-all">
          {mandate.signature}
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed">
          This digital seal binds the policy to the owner secret. If any variable is modified outside
          the Mandate signing gateway, Rule R1 halts the transaction with 0 calls to PayPal.
        </p>
      </GlassCard>

      {/* Policy Details JSON */}
      <GlassCard className="p-6 space-y-3">
        <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
          Canonical Policy Definition
        </span>
        <pre className="p-4 rounded-xl bg-black/60 border border-white/[0.08] text-xs font-mono text-neutral-300 overflow-x-auto leading-relaxed">
          {JSON.stringify(mandate.policy, null, 2)}
        </pre>
      </GlassCard>
    </div>
  );
}

