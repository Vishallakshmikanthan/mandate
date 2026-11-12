"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { fetchEscrows, subscribeToStream } from "@/lib/api";
import { EscrowItem } from "@/lib/demo-store";
import { formatMoney } from "@/lib/money";

export default function EscrowsPage() {
  const [escrows, setEscrows] = useState<EscrowItem[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      {/* Title & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs text-neutral-400 font-normal">PayPal Orders v2</span>
          <h1 className="text-3xl sm:text-4xl font-light text-white tracking-tight">
            Escrow settlements
          </h1>
          <p className="text-xs text-neutral-400 font-normal">
            Autonomous funds holds, deliverables inspection, and AI arbiter release.
          </p>
        </div>
      </div>

      {/* Escrows Table Card */}
      <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 space-y-4">
        <span className="text-xs text-neutral-400 font-normal">All active & settled escrows</span>

        {loading ? (
          <div className="py-12 text-center text-xs text-neutral-400 font-mono">
            Loading escrows...
          </div>
        ) : escrows.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <span className="text-sm text-neutral-200 font-medium block">No escrows found</span>
            <p className="text-xs text-neutral-400">
              When an approved intent requires escrow, a two-step PayPal Orders v2 hold is initiated and tracked here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-neutral-400">
                  <th className="font-normal py-2.5">Escrow ID</th>
                  <th className="font-normal py-2.5">Intent ID</th>
                  <th className="font-normal py-2.5">State</th>
                  <th className="font-normal py-2.5">Amount</th>
                  <th className="font-normal py-2.5">Buyer</th>
                  <th className="font-normal py-2.5">Seller</th>
                  <th className="font-normal py-2.5 text-right">PayPal Order</th>
                </tr>
              </thead>
              <tbody>
                {escrows.map((e) => (
                  <tr key={e.id} className="border-b border-white/[0.04] last:border-0">
                    <td className="py-3.5 font-mono text-neutral-300 font-medium">
                      <Link href={`/app/escrows/${e.id}`} className="hover:text-white underline">
                        {e.id.slice(0, 14)}...
                      </Link>
                    </td>
                    <td className="py-3.5 font-mono text-neutral-400">
                      {e.intent_id ? e.intent_id.slice(0, 12) + "..." : "—"}
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                          e.state === "RELEASED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : e.state === "REFUNDED" || e.state === "VOIDED"
                            ? "bg-rose-500/10 text-rose-300 border border-rose-500/25"
                            : e.state === "FUNDS_HELD" || e.state === "DELIVERED" || e.state === "UNDER_ARBITRATION"
                            ? "bg-amber-500/10 text-amber-300 border border-amber-500/25"
                            : "bg-white/[0.05] text-neutral-300 border border-white/[0.1]"
                        }`}
                      >
                        {e.state}
                      </span>
                    </td>
                    <td className="py-3.5 font-mono text-white font-medium">{formatMoney(e.amount_minor)}</td>
                    <td className="py-3.5 text-neutral-300">{e.buyer_agent_id || "buyer_agent"}</td>
                    <td className="py-3.5 text-neutral-200">{e.counterparty}</td>
                    <td className="py-3.5 text-right font-mono text-neutral-400">
                      {e.paypal_order_id ? (
                        <span className="text-cyan-300/80">{e.paypal_order_id.slice(0, 14)}</span>
                      ) : (
                        "Pending"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
