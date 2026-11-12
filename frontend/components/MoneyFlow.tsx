"use client";

import React from "react";
import { Lock, CheckCircle, RefreshCw, XCircle, Bot, User, ArrowRight, ShieldCheck } from "lucide-react";

interface MoneyFlowProps {
  amountMinor: number;
  state: string | null;
  decision: string | null;
}

export const MoneyFlow: React.FC<MoneyFlowProps> = ({ amountMinor, state, decision }) => {
  const amountStr = `$${(amountMinor / 100).toFixed(2)}`;

  const isHeld = state === "FUNDS_HELD" || state === "DELIVERED" || state === "UNDER_ARBITRATION";
  const isReleased = state === "RELEASED";
  const isRefunded = state === "REFUNDED";
  const isBlocked = decision === "BLOCKED";

  return (
    <div className="ref-glass-card rounded-2xl p-6 border border-white/[0.08]">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
            Escrow Settlement Path
          </span>
          <h4 className="text-sm font-medium text-white tracking-tight mt-0.5">
            Cryptographic Custody Flow
          </h4>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono text-neutral-400 block uppercase">
            Authorized Value
          </span>
          <span className="text-sm font-mono font-medium text-white">
            {amountStr} <span className="text-neutral-500 text-xs">USD</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        {/* Step 1: Buyer Principal */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center gap-3.5">
          <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-white shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">
              Buyer Agent
            </div>
            <div className="text-xs font-medium text-white truncate">
              {amountStr} Signed Intent
            </div>
          </div>
        </div>

        {/* Step 2: PayPal Escrow Hold */}
        <div
          className={`p-4 rounded-xl border flex items-center gap-3.5 transition-all ${isBlocked
              ? "bg-red-500/10 border-red-500/30 text-red-300"
              : isHeld
                ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
                : "bg-white/[0.02] border-white/[0.06] text-neutral-400"
            }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${isBlocked
                ? "bg-red-500/20 border-red-500/40 text-red-400"
                : isHeld
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                  : "bg-white/[0.05] border-white/[0.1] text-neutral-400"
              }`}
          >
            {isBlocked ? <XCircle className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wider">
              PayPal Orders v2
            </div>
            <div className="text-xs font-medium truncate">
              {isBlocked ? "HOLD ABORTED" : isHeld ? "FUNDS LOCKED" : "AUTHORIZE"}
            </div>
          </div>
        </div>

        {/* Step 3: Seller Settlement or Refund */}
        <div
          className={`p-4 rounded-xl border flex items-center gap-3.5 transition-all ${isReleased
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
              : isRefunded
                ? "bg-sky-500/10 border-sky-500/30 text-sky-200"
                : "bg-white/[0.02] border-white/[0.06] text-neutral-400"
            }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${isReleased
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                : isRefunded
                  ? "bg-sky-500/20 border-sky-500/40 text-sky-400"
                  : "bg-white/[0.05] border-white/[0.1] text-neutral-400"
              }`}
          >
            {isReleased ? (
              <CheckCircle className="w-4 h-4" />
            ) : isRefunded ? (
              <RefreshCw className="w-4 h-4" />
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-wider">
              {isRefunded ? "Restored" : "Settlement"}
            </div>
            <div className="text-xs font-medium truncate">
              {isReleased ? "CAPTURED & PAID" : isRefunded ? "VOIDED / REFUNDED" : "Awaiting Arbiter"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
