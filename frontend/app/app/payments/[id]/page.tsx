"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { RuleChecklist } from "@/components/app/RuleChecklist";
import { RiskGauge } from "@/components/app/RiskGauge";
import {
  CreditCard,
  ArrowLeft,
  Copy,
  Check,
  Lock,
  AlertTriangle,
  ShieldCheck,
  Bot,
  ExternalLink,
} from "lucide-react";
import { demoStore, PaymentIntentItem } from "@/lib/demo-store";
import { formatMoney } from "@/lib/money";

export default function PaymentDetailPage() {
  const params = useParams();
  const paymentId = params.id as string;
  const [payment, setPayment] = useState<PaymentIntentItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const found = demoStore.getPayments().find((p) => p.id === paymentId);
    setPayment(found || null);
  }, [paymentId]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!payment) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <CreditCard className="w-12 h-12 text-neutral-500 mx-auto" />
        <h2 className="text-xl font-semibold text-white">Payment Intent Not Found</h2>
        <Link
          href="/app/payments"
          className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to payments
        </Link>
      </div>
    );
  }

  const isBlocked = payment.decision === "BLOCKED";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Link
        href="/app/payments"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Payment Intents
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold font-mono text-white">{payment.id}</span>
            <StatusPill status={payment.decision} />
          </div>
          <p className="text-xs text-neutral-400 mt-1 font-mono">
            {payment.agent_id} → {payment.counterparty} • Evaluated {new Date(payment.created_at).toLocaleString()}
          </p>
        </div>

        <div className="text-right">
          <span className="text-3xl font-mono font-bold text-white tabular-nums">
            {formatMoney(payment.amount_minor)}
          </span>
          <span className="text-xs font-mono text-neutral-400 block mt-0.5">
            Category: {payment.merchant_category}
          </span>
        </div>
      </div>

      {/* Shockwave notice if blocked */}
      {isBlocked && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-start gap-3 shadow-[0_0_25px_rgba(244,63,94,0.2)]">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white block">FINANCIAL FIREWALL HALTED THIS INTENT</span>
            <p className="mt-1 leading-relaxed text-rose-200">
              Deterministic rule failure detected. Mandate prevented funds authorization. Zero calls were made to PayPal APIs.
            </p>
          </div>
        </div>
      )}

      {/* Grid: Rules Checklist + AI Risk Evaluation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 10 Rules Checklist (7 cols) */}
        <div className="lg:col-span-7">
          <GlassCard className="p-6">
            <RuleChecklist rules={payment.decision_reasons} />
          </GlassCard>
        </div>

        {/* Right Column: AI Risk Scorer + Source Context (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <GlassCard className="p-6">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 block text-center mb-2">
              LLM Risk Scorer (Tighten-Only Engine)
            </span>
            <RiskGauge score={payment.risk_score} flags={payment.flags} />
          </GlassCard>

          {/* Source context prompt inspection */}
          <GlassCard className="p-6 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
              Agent Trigger Prompt
            </span>
            <div className="p-3 rounded-xl bg-black/50 border border-white/[0.08] text-xs font-mono text-neutral-300 leading-relaxed">
              {payment.source_context ? (
                <span className="text-rose-300 font-semibold">{payment.source_context}</span>
              ) : (
                <span className="text-neutral-400">&quot;{payment.description}&quot;</span>
              )}
            </div>
          </GlassCard>

          {/* PayPal Integration IDs */}
          {payment.paypal_order_id && (
            <GlassCard className="p-5 space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                PayPal Orders v2 Linkage
              </span>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/[0.06]">
                  <span className="text-neutral-400 text-[11px]">Order ID:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white">{payment.paypal_order_id}</span>
                    <button
                      onClick={() => copyToClipboard(payment.paypal_order_id!, "order")}
                      className="text-neutral-400 hover:text-white"
                    >
                      {copiedId === "order" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {payment.paypal_authorization_id && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/[0.06]">
                    <span className="text-neutral-400 text-[11px]">Auth ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white">{payment.paypal_authorization_id}</span>
                      <button
                        onClick={() => copyToClipboard(payment.paypal_authorization_id!, "auth")}
                        className="text-neutral-400 hover:text-white"
                      >
                        {copiedId === "auth" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

