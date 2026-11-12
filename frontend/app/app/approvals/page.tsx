"use client";

import React, { useState, useEffect } from "react";
import { demoStore, PaymentIntentItem } from "@/lib/demo-store";
import { formatMoney } from "@/lib/money";

export default function ApprovalsPage() {
  const [escalated, setEscalated] = useState<PaymentIntentItem[]>([]);

  useEffect(() => {
    const list = demoStore.getPayments().filter((p) => p.decision === "ESCALATED");
    setEscalated(list);
    const unsub = demoStore.subscribe(() => {
      const updated = demoStore.getPayments().filter((p) => p.decision === "ESCALATED");
      setEscalated(updated);
    });
    return unsub;
  }, []);

  const handleApprove = (id: string) => {
    demoStore.recordPayment({
      agent_id: "buyer_agent_alpha",
      counterparty: "freelance_specialist",
      amount_minor: 18000,
      currency: "USD",
      merchant_category: "software_services",
      description: "Approved by Human Principal",
      decision: "APPROVED",
      risk_score: 0.1,
      flags: [],
      rules_evaluated: [],
    });
    setEscalated(escalated.filter((e) => e.id !== id));
    alert("Payment approved and routed to PayPal!");
  };

  const handleReject = (id: string) => {
    setEscalated(escalated.filter((e) => e.id !== id));
    alert("Payment rejected.");
  };

  return (
    <div className="space-y-6">
      {/* Title & Action Row */}
      <div className="space-y-1">
        <span className="text-xs text-neutral-400 font-normal">Human in the loop</span>
        <h1 className="text-3xl sm:text-4xl font-light text-white tracking-tight">
          Approval queue
        </h1>
        <p className="text-xs text-neutral-400 font-normal">
          Transactions flagged by Rule R9 (escalate above threshold) or AI Arbiter low confidence.
        </p>
      </div>

      {escalated.length === 0 ? (
        <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-12 text-center space-y-2">
          <span className="text-sm text-neutral-200 font-medium block">All clear</span>
          <p className="text-xs text-neutral-400">Zero payments currently waiting for human approval.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {escalated.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-neutral-400">{item.id.slice(0, 16)}...</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/25">
                    Needs approval
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white">{item.description}</h3>
                <p className="text-xs text-neutral-400">
                  Agent: <span className="text-neutral-200">{item.agent_id}</span> · Counterparty:{" "}
                  <span className="text-neutral-200">{item.counterparty}</span>
                </p>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono text-xl text-white font-semibold">
                  {formatMoney(item.amount_minor)}
                </span>
                <button
                  onClick={() => handleReject(item.id)}
                  className="px-4 py-2 rounded-full text-xs text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(item.id)}
                  className="px-5 py-2 rounded-full text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-100 transition shadow-sm"
                >
                  Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
