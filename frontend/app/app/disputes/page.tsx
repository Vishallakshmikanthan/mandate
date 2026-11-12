"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { Scale, CheckCircle2, XCircle, AlertTriangle, ArrowRight, FileText } from "lucide-react";
import { fetchEscrows, subscribeToStream } from "@/lib/api";
import { EscrowItem } from "@/lib/demo-store";
import { formatMoney } from "@/lib/money";

export default function DisputesPage() {
  const [escrows, setEscrows] = useState<EscrowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "disputed" | "verified">("all");

  const loadData = async () => {
    try {
      const data = await fetchEscrows();
      setEscrows(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToStream(() => {
      loadData();
    });
    return unsub;
  }, []);

  const verdicts = escrows.filter((e) => {
    const hasVerdict = e.verdict !== undefined || (e.verdicts && e.verdicts.length > 0) || e.state === "UNDER_ARBITRATION" || e.state === "REFUNDED";
    if (!hasVerdict) return false;
    const isDisputed = e.verdict?.verdict === "FAIL" || e.state === "REFUNDED" || e.state === "VOIDED";
    if (filter === "disputed") return isDisputed;
    if (filter === "verified") return !isDisputed;
    return true;
  });

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
          {(["all", "verified", "disputed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
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
        {loading ? (
          <GlassCard className="p-8 text-center text-xs font-mono text-neutral-400">
            Loading arbiter verdicts...
          </GlassCard>
        ) : verdicts.length === 0 ? (
          <GlassCard className="p-8 text-center text-xs font-mono text-neutral-400">
            No arbiter verdicts generated yet. Run Scenario C (Bad Delivery Dispute) or arbitrate an escrow to inspect an automated dispute.
          </GlassCard>
        ) : (
          verdicts.map((e) => {
            const v = e.verdict || (e.verdicts && e.verdicts[e.verdicts.length - 1]);
            const isDisputed = v?.verdict === "FAIL" || e.state === "REFUNDED" || e.state === "VOIDED";
            return (
              <GlassCard key={e.id} className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                  <div className="flex items-center gap-2">
                    <Scale className={`w-4 h-4 ${isDisputed ? "text-rose-400" : "text-emerald-400"}`} />
                    <span className="font-mono text-xs text-white font-semibold">{e.id}</span>
                    <span className="text-xs text-neutral-400">· Intent: {e.intent_id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${isDisputed ? "bg-rose-500/10 text-rose-300 border border-rose-500/25" : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25"}`}>
                      {v?.verdict || e.state}
                    </span>
                    <span className="font-mono text-xs text-white font-semibold">
                      {formatMoney(e.amount_minor || 12000)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="space-y-1">
                    <span className="text-neutral-400 block text-[11px]">Explanation</span>
                    <p className="text-neutral-200">
                      {v?.explanation || (isDisputed ? "Deliverable failed quality or completeness checks. Funds refunded." : "All contract deliverables passed automated verification. Funds released.")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-neutral-400 block text-[11px]">Confidence & Model</span>
                    <p className="text-neutral-200">
                      Confidence: {v?.confidence ? `${(v.confidence * 100).toFixed(0)}%` : "92%"} · Model: {v?.model || "arbiter-core-v1"}
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Link
                    href={`/app/escrows/${e.id}`}
                    className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200 transition"
                  >
                    <span>View full escrow inspection</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </GlassCard>
            );
          })
        )}
      </div>
    </div>
  );
}
