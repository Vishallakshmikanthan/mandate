"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { Bot, ArrowLeft, Shield, Clock, CreditCard, Lock, AlertTriangle } from "lucide-react";
import { fetchAgent, fetchPayments } from "@/lib/api";
import { Agent, PaymentIntentItem } from "@/lib/demo-store";
import { formatMoney } from "@/lib/money";

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id as string;
  const [agent, setAgent] = useState<Agent | null>(null);
  const [payments, setPayments] = useState<PaymentIntentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchAgent(agentId), fetchPayments()])
      .then(([agentData, allPayments]) => {
        if (mounted) {
          setAgent(agentData);
          setPayments(allPayments.filter((p) => p.agent_id === agentId));
        }
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [agentId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-xs text-neutral-400 font-mono">
        Loading agent details...
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <Bot className="w-12 h-12 text-neutral-500 mx-auto" />
        <h2 className="text-xl font-semibold text-white">Agent Not Found</h2>
        <p className="text-xs text-neutral-400">No agent exists with ID &quot;{agentId}&quot;.</p>
        <Link
          href="/app/agents"
          className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to registry
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Link
        href="/app/agents"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Agent Registry
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">{agent.name}</h1>
              <StatusPill status={agent.status} size="sm" />
            </div>
            <p className="text-xs font-mono text-neutral-400 mt-0.5">{agent.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/app/mandates/new"
            className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-white border border-white/[0.12] transition-colors"
          >
            Reassign Mandate
          </Link>
        </div>
      </div>

      {/* Agent Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-4">
          <span className="text-[10px] font-mono uppercase text-neutral-400">Total Spend Under Mandate</span>
          <p className="text-xl font-bold font-mono text-white tabular-nums mt-1">
            {formatMoney(agent.total_spend_minor)}
          </p>
          <span className="text-[10px] font-mono text-emerald-400">Within policy limit</span>
        </GlassCard>

        <GlassCard className="p-4">
          <span className="text-[10px] font-mono uppercase text-neutral-400">Transactions Handled</span>
          <p className="text-xl font-bold font-mono text-white tabular-nums mt-1">{agent.tx_count} txns</p>
          <span className="text-[10px] font-mono text-neutral-400">PayPal Orders v2</span>
        </GlassCard>

        <GlassCard className="p-4">
          <span className="text-[10px] font-mono uppercase text-neutral-400">Assigned Spending Policy</span>
          <p className="text-sm font-bold font-mono text-cyan-400 mt-1 truncate">
            {agent.mandate_id || "None Assigned"}
          </p>
          <span className="text-[10px] font-mono text-neutral-400">Cryptographically bound</span>
        </GlassCard>
      </div>

      {/* Payment History for this Agent */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-cyan-400" />
          Execution Log & Intents for this Agent
        </h3>

        {payments.length === 0 ? (
          <GlassCard className="p-8 text-center text-xs text-neutral-400 font-mono">
            No intents executed yet for this agent. Run a scenario to initiate payments.
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => (
              <GlassCard key={p.id} className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-white">{p.id}</span>
                    <StatusPill status={p.decision} size="sm" />
                    <span className="text-xs text-neutral-400 font-mono">→ {p.counterparty}</span>
                  </div>
                  <p className="text-xs text-neutral-300">{p.description}</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-white tabular-nums text-sm">
                    {formatMoney(p.amount_minor)}
                  </span>
                  <Link
                    href={`/app/payments/${p.id}`}
                    className="block text-[10px] font-mono text-cyan-400 hover:underline mt-0.5"
                  >
                    View decision →
                  </Link>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

