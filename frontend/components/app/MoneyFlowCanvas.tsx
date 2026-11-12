"use client";

import React, { useEffect, useRef } from "react";
import { formatMoney } from "@/lib/money";
import { ArrowRight, Bot, Lock, CheckCircle2, RotateCcw } from "lucide-react";

interface MoneyFlowCanvasProps {
  amountMinor: number;
  state?: string | null;
  decision?: string | null;
  className?: string;
}

export const MoneyFlowCanvas: React.FC<MoneyFlowCanvasProps> = ({
  amountMinor = 12000,
  state = "HELD",
  decision = "APPROVED",
  className = "",
}) => {
  const normState = (state || "HELD").toUpperCase();
  const isBlocked = decision === "BLOCKED";
  const isRefunded = normState === "REFUNDED";
  const isReleased = normState === "RELEASED";

  return (
    <div className={`p-6 rounded-2xl bg-white/[0.04] border border-white/[0.1] relative overflow-hidden ${className}`}>
      {/* Background glow based on status */}
      <div
        className={`absolute -right-20 -bottom-20 w-60 h-60 rounded-full blur-[80px] pointer-events-none opacity-20 ${
          isBlocked ? "bg-rose-500" : isRefunded ? "bg-purple-500" : isReleased ? "bg-emerald-500" : "bg-cyan-500"
        }`}
      />

      <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/[0.08]">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
            Escrow Settlement Mechanics
          </span>
          <h4 className="text-base font-semibold text-white tracking-tight mt-0.5">
            Two-Phase PayPal Custody Flow
          </h4>
        </div>
        <div className="font-mono text-sm font-bold text-white tabular-nums px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.1]">
          {formatMoney(amountMinor)}
        </div>
      </div>

      {/* Nodes layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center relative z-10">
        {/* Node 1: Buyer Agent alpha */}
        <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.1] flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mb-2">
            <Bot className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-white">buyer_agent_alpha</span>
          <span className="text-[10px] font-mono text-neutral-400 mt-0.5">Mandate Protected</span>
        </div>

        {/* Node 2: PayPal Hold (Escrow Lock) */}
        <div
          className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${
            isBlocked
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
              isBlocked
                ? "bg-rose-500/20 text-rose-400"
                : "bg-cyan-500/20 text-cyan-400"
            }`}
          >
            <Lock className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-white">PayPal Orders v2</span>
          <span className="text-[10px] font-mono mt-0.5">
            {isBlocked ? "0 Calls Made (Safe)" : "Authorization Hold"}
          </span>
        </div>

        {/* Node 3: Seller or Refund Destination */}
        <div
          className={`p-4 rounded-xl border flex flex-col items-center text-center ${
            isRefunded
              ? "bg-purple-500/10 border-purple-500/30"
              : isReleased
              ? "bg-emerald-500/10 border-emerald-500/30"
              : "bg-white/[0.04] border-white/[0.1]"
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
              isRefunded
                ? "bg-purple-500/20 text-purple-400"
                : isReleased
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-white/[0.08] text-neutral-400"
            }`}
          >
            {isRefunded ? (
              <RotateCcw className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
          <span className="text-xs font-semibold text-white">
            {isRefunded ? "Refund to Buyer" : "seller_agent_acme"}
          </span>
          <span className="text-[10px] font-mono text-neutral-400 mt-0.5">
            {isRefunded ? "Void on Dispute" : isReleased ? "Settled & Captured" : "Awaiting Verification"}
          </span>
        </div>
      </div>

      {/* Explanatory banner */}
      <div className="mt-5 p-3 rounded-xl bg-black/40 border border-white/[0.06] text-[11px] font-mono text-neutral-400 flex items-center justify-between">
        <span>Protocol Guarantee:</span>
        <span className="text-neutral-200">
          {isBlocked
            ? "Deterministic rules halted payment before PayPal contact."
            : isRefunded
            ? "AI Arbiter failed criterion; authorized hold automatically voided."
            : isReleased
            ? "AI Arbiter verified delivery against spec; captured in full."
            : "Funds securely held in escrow; seller cannot access without Arbiter proof."}
        </span>
      </div>
    </div>
  );
};

