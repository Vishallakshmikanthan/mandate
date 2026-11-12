"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { demoStore, PaymentIntentItem } from "@/lib/demo-store";
import { formatMoney } from "@/lib/money";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentIntentItem[]>([]);

  useEffect(() => {
    setPayments(demoStore.getPayments());
    const unsub = demoStore.subscribe(() => setPayments(demoStore.getPayments()));
    return unsub;
  }, []);

  return (
    <div className="space-y-6">
      {/* Title & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs text-neutral-400 font-normal">Deterministic gateway</span>
          <h1 className="text-3xl sm:text-4xl font-light text-white tracking-tight">
            Payment transactions
          </h1>
          <p className="text-xs text-neutral-400 font-normal">
            Real-time evaluated payment intents with 10-rule verification ledger.
          </p>
        </div>
      </div>

      {/* Payments Table Card */}
      <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 space-y-4">
        <span className="text-xs text-neutral-400 font-normal">Transaction history</span>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-neutral-400">
                <th className="font-normal py-2.5">Intent ID</th>
                <th className="font-normal py-2.5">Agent</th>
                <th className="font-normal py-2.5">Counterparty</th>
                <th className="font-normal py-2.5">Amount</th>
                <th className="font-normal py-2.5">Risk</th>
                <th className="font-normal py-2.5">Decision</th>
                <th className="font-normal py-2.5 text-right">Escrow</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="py-3.5 font-mono text-neutral-400 font-medium">
                    <Link href={`/app/payments/${p.id}`} className="hover:text-white transition">
                      {p.id.slice(0, 14)}...
                    </Link>
                  </td>
                  <td className="py-3.5 text-neutral-300">{p.agent_id}</td>
                  <td className="py-3.5 text-neutral-200">{p.counterparty}</td>
                  <td className="py-3.5 font-mono text-white font-medium">{formatMoney(p.amount_minor)}</td>
                  <td className="py-3.5 font-mono text-neutral-300">{(p.risk_score * 100).toFixed(0)}%</td>
                  <td className="py-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                        p.decision === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : p.decision === "BLOCKED"
                          ? "bg-rose-500/10 text-rose-300 border border-rose-500/25"
                          : "bg-amber-500/10 text-amber-300 border border-amber-500/25"
                      }`}
                    >
                      {p.decision}
                    </span>
                  </td>
                  <td className="py-3.5 text-right font-mono text-neutral-400">
                    {p.escrow_id ? (
                      <Link href={`/app/escrows/${p.escrow_id}`} className="hover:text-white underline">
                        {p.escrow_id.slice(0, 12)}...
                      </Link>
                    ) : (
                      "None"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
