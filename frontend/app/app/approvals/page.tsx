"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { fetchPayments, humanDecisionEscrow, subscribeToStream } from "@/lib/api";
import { PaymentIntentItem } from "@/lib/demo-store";
import { formatMoney } from "@/lib/money";

export default function ApprovalsPage() {
  const [escalated, setEscalated] = useState<PaymentIntentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const allPayments = await fetchPayments();
      setEscalated(allPayments.filter((p) => p.decision === "ESCALATED"));
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

  const handleApprove = async (payment: PaymentIntentItem) => {
    setProcessingId(payment.id);
    try {
      if (payment.escrow_id) {
        await humanDecisionEscrow(payment.escrow_id, "APPROVE", "Approved by human principal via queue");
      }
      setEscalated((prev) => prev.filter((e) => e.id !== payment.id));
      alert("Payment approved and released!");
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (payment: PaymentIntentItem) => {
    setProcessingId(payment.id);
    try {
      if (payment.escrow_id) {
        await humanDecisionEscrow(payment.escrow_id, "REJECT", "Rejected by human principal via queue");
      }
      setEscalated((prev) => prev.filter((e) => e.id !== payment.id));
      alert("Payment rejected.");
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
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

      {loading ? (
        <div className="py-12 text-center text-xs text-neutral-400 font-mono">
          Loading approval queue...
        </div>
      ) : escalated.length === 0 ? (
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
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/25">
                    ESCALATED
                  </span>
                  <span className="text-xs font-mono text-neutral-400">{item.id}</span>
                </div>
                <h3 className="text-lg font-medium text-white">{item.description}</h3>
                <div className="flex items-center gap-4 text-xs text-neutral-400">
                  <span>Agent: <strong className="text-neutral-200">{item.agent_id}</strong></span>
                  <span>Counterparty: <strong className="text-neutral-200">{item.counterparty}</strong></span>
                  <span>Amount: <strong className="font-mono text-white">{formatMoney(item.amount_minor)}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleReject(item)}
                  disabled={processingId === item.id}
                  className="px-4 py-2 rounded-full text-xs font-medium text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(item)}
                  disabled={processingId === item.id}
                  className="px-5 py-2 rounded-full text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-100 transition shadow-sm"
                >
                  {processingId === item.id ? "Processing..." : "Approve & Pay"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
