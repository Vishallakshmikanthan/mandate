"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { Scale, CheckCircle2, XCircle, AlertTriangle, ArrowRight, FileText } from "lucide-react";
import { demoStore, EscrowItem } from "@/lib/demo-store";
import { formatMoney } from "@/lib/money";

export default function DisputesPage() {
  const [escrows, setEscrows] = useState<EscrowItem[]>([]);
  const [filter, setFilter] = useState<"all" | "disputed" | "verified">("all");

  useEffect(() => {
    setEscrows(demoStore.getEscrows());
    const unsub = demoStore.subscribe(() => setEscrows(demoStore.getEscrows()));
    return unsub;
  }, []);

  const verdicts = escrows.filter((e) => e.verdict !== undefined);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-purple-400">
            Autonomous Arbitration
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-1">
            Disputes & Arbiter Verdicts
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Automated multi-criteria evaluations of deliverables against contract specifications.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
          {["all", "verified", "disputed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase transition-colors ${
                filter === f ? "bg-white/[0.12] text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {verdicts.length === 0 ? (
          <GlassCard className="p-8 text-center text-xs font-mono text-neutral-400">
            No arbiter verdicts generated yet. Run Scenario C (Bad Delivery Dispute) to inspect an automated dispute.
          </GlassCard>
        ) : (
          verdicts.map((e) => (
            <GlassCard key={e.id} className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-white/[0.08]">
                <div>
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-purple-400" />
                    <span className="font-mono font-bold text-white text-sm">{e.id}</span>
                    <StatusPill status={e.state} size="sm" />
                    <span className="text-xs font-mono text-cyan-300">Merchant: {e.counterparty}</span>
                  </div>
                  <h3 className="text-base font-semibold text-white mt-1">{e.spec.title}</h3>
                </div>

                <div className="text-right">
                  <span className="text-xl font-mono font-bold text-white tabular-nums">
                    {formatMoney(e.amount_minor)}
                  </span>
                  <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                    Arbiter Confidence: {((e.verdict?.confidence || 0) * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Verdict Explanation */}
              <p className="text-xs text-neutral-300 leading-relaxed italic bg-white/[0.02] p-3 rounded-xl border border-white/[0.06]">
                &quot;{e.verdict?.explanation}&quot;
              </p>

              {/* Criteria breakdown */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                  Criteria Evaluation Ledger
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {e.verdict?.criteria_results.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white flex items-center gap-1.5 truncate">
                          {c.passed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                          )}
                          <span className="truncate">{c.description}</span>
                        </span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                            c.passed ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
                          }`}
                        >
                          {c.passed ? "PASS" : "FAIL"}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-neutral-400 pl-5">{c.evidence}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Link
                  href={`/app/escrows/${e.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:underline"
                >
                  <span>Open Full Escrow Audit Trail</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
}

