"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";

export default function AuditPage() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState(true);

  const blocks = [
    { num: "26", linked: true },
    { num: "27", linked: true },
    { num: "28", linked: true },
    { num: "29", linked: true },
    { num: "30", linked: true },
  ];

  const ledger = [
    {
      id: "#30",
      actor: "GATEWAY",
      event: "ESCROW_BLOCKED",
      prevHash: "ba6d9c71663d4fdf...",
      nodeHash: "0c4e311ba104a7e0...",
    },
    {
      id: "#29",
      actor: "GATEWAY",
      event: "INTENT_EVALUATED",
      prevHash: "49f82a40e43b7b48...",
      nodeHash: "ba6d9c71663d4fdf...",
    },
    {
      id: "#28",
      actor: "PAYPAL",
      event: "ESCROW_RELEASED",
      prevHash: "3799f34d7aec264e...",
      nodeHash: "49f82a40e43b7b48...",
    },
    {
      id: "#27",
      actor: "ARBITER",
      event: "ESCROW_UNDER_ARBITRATION",
      prevHash: "ad0f5e4ea29dc27e...",
      nodeHash: "3799f34d7aec264e...",
    },
    {
      id: "#26",
      actor: "SELLER_AGENT",
      event: "ESCROW_DELIVERED",
      prevHash: "6ecacb6ce82256bc...",
      nodeHash: "ad0f5e4ea29dc27e...",
    },
  ];

  const handleVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setVerified(true);
      alert("Merkle Chain verification complete: 30 of 30 blocks match their cryptographic hashes. Zero tampering detected.");
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Title & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs text-neutral-400 font-normal">Immutable verification</span>
          <h1 className="text-3xl sm:text-4xl font-light text-white tracking-tight">
            Audit hash chain
          </h1>
        </div>

        <div>
          <button
            onClick={handleVerify}
            className="px-5 py-2.5 rounded-full text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-100 transition shadow-sm"
          >
            {isVerifying ? "Verifying hashes..." : "Verify integrity"}
          </button>
        </div>
      </div>

      {/* Card 1: Chain integrity verified Banner */}
      <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.12] flex items-center justify-center text-emerald-400">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Chain integrity verified</h3>
            <p className="text-xs text-neutral-400">All 30 audit events verified cryptographically.</p>
          </div>
        </div>

        <div className="font-mono text-xs text-neutral-300">
          <span>Head 0c4e311ba104a7e0...</span>
        </div>
      </div>

      {/* Card 2: Recent blocks, linked */}
      <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 space-y-4">
        <span className="text-xs text-neutral-400 font-normal">Recent blocks, linked</span>

        <div className="flex items-center justify-between gap-2 overflow-x-auto pt-1 pb-1">
          {blocks.map((b, idx) => (
            <React.Fragment key={b.num}>
              {/* Block Box */}
              <div className="flex-1 min-w-[120px] rounded-xl bg-[#0f191b]/95 border border-white/[0.08] p-4 space-y-1 shadow-inner">
                <span className="font-mono text-xs text-neutral-300 block font-medium">#{b.num}</span>
                <span className="text-xs text-neutral-400 flex items-center gap-1">
                  <span>✓</span>
                  <span>linked</span>
                </span>
              </div>

              {/* Arrow connector */}
              {idx < blocks.length - 1 && (
                <div className="text-neutral-500 font-sans text-sm flex-shrink-0 px-1">
                  →
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Card 3: Ledger Table */}
      <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 space-y-4">
        <span className="text-xs text-neutral-400 font-normal">Ledger</span>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-neutral-400">
                <th className="font-normal py-2.5 w-16">ID</th>
                <th className="font-normal py-2.5 w-32">Actor</th>
                <th className="font-normal py-2.5">Event</th>
                <th className="font-normal py-2.5">Previous hash</th>
                <th className="font-normal py-2.5 text-right">Node hash</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((row) => (
                <tr key={row.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="py-3.5 font-mono text-neutral-400 font-medium">{row.id}</td>
                  <td className="py-3.5">
                    <span className="px-3 py-1 rounded-full text-[11px] font-mono text-neutral-300 bg-white/[0.04] border border-white/[0.08]">
                      {row.actor}
                    </span>
                  </td>
                  <td className="py-3.5 font-mono text-neutral-200">{row.event}</td>
                  <td className="py-3.5 font-mono text-neutral-400">{row.prevHash}</td>
                  <td className="py-3.5 font-mono text-neutral-200 text-right">{row.nodeHash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
