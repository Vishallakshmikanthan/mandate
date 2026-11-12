"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Shield, ArrowRight } from "lucide-react";
import { fetchMandates, subscribeToStream } from "@/lib/api";
import { MandateItem } from "@/lib/demo-store";
import { formatMoney } from "@/lib/money";

export default function MandatesListPage() {
  const [mandates, setMandates] = useState<MandateItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await fetchMandates();
      setMandates(data);
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
          <span className="text-xs text-neutral-400 font-normal">Cryptographic spending policies</span>
          <h1 className="text-3xl sm:text-4xl font-light text-white tracking-tight">
            Mandate policies
          </h1>
          <p className="text-xs text-neutral-400 font-normal">
            Deterministic rule enforcement bounds, budget caps, and allowed counterparties.
          </p>
        </div>

        <div>
          <Link
            href="/app/mandates/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-100 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create mandate</span>
          </Link>
        </div>
      </div>

      {/* Mandates Table Card */}
      <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 space-y-4">
        <span className="text-xs text-neutral-400 font-normal">Active & historical mandates</span>

        {loading ? (
          <div className="py-12 text-center text-xs text-neutral-400 font-mono">
            Loading spending mandates...
          </div>
        ) : mandates.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <Shield className="w-10 h-10 text-neutral-500 mx-auto" />
            <span className="text-sm text-neutral-200 font-medium block">No mandates enrolled yet</span>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              A mandate binds an autonomous agent to a cryptographically signed policy specifying budget limits, merchant categories, and counterparties.
            </p>
            <div className="pt-2">
              <Link
                href="/app/mandates/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-white text-neutral-900 hover:bg-neutral-100"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create first mandate</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-neutral-400">
                  <th className="font-normal py-2.5">Policy / ID</th>
                  <th className="font-normal py-2.5">Agent</th>
                  <th className="font-normal py-2.5">Total Budget</th>
                  <th className="font-normal py-2.5">Spent / Remaining</th>
                  <th className="font-normal py-2.5">Per-Txn Cap</th>
                  <th className="font-normal py-2.5">Status</th>
                  <th className="font-normal py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {mandates.map((m) => {
                  const policy = m.policy || {};
                  const maxTotal = policy.max_total_minor || 50000;
                  const perTxn = policy.max_per_transaction_minor || 20000;
                  const spent = m.spent_to_date_minor || 0;
                  return (
                    <tr key={m.id} className="border-b border-white/[0.04] last:border-0">
                      <td className="py-3.5">
                        <Link href={`/app/mandates/${m.id}`} className="hover:text-white font-medium text-white block">
                          {m.name || "Custom Policy"}
                        </Link>
                        <span className="font-mono text-[11px] text-neutral-400">{m.id.slice(0, 14)}...</span>
                      </td>
                      <td className="py-3.5 text-neutral-300 font-mono">{m.agent_id}</td>
                      <td className="py-3.5 font-mono text-white font-medium">{formatMoney(maxTotal)}</td>
                      <td className="py-3.5 font-mono text-neutral-300">
                        {formatMoney(spent)} / {formatMoney(Math.max(0, maxTotal - spent))}
                      </td>
                      <td className="py-3.5 font-mono text-neutral-300">{formatMoney(perTxn)}</td>
                      <td className="py-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                            m.status === "ACTIVE"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-300 border border-rose-500/25"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <Link
                          href={`/app/mandates/${m.id}`}
                          className="inline-flex items-center gap-1 text-xs text-neutral-300 hover:text-white underline"
                        >
                          <span>Manage</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
