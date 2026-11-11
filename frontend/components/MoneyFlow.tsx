"use client";

import React from "react";
import { ArrowRight, Lock, CheckCircle, RefreshCw, XCircle, Bot, User, Building2 } from "lucide-react";

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
    <div className="glass-panel rounded-2xl p-4 border border-slate-800">
      <div className="flex items-center justify-between mb-3 text-xs">
        <span className="font-bold text-slate-300 uppercase tracking-wider">Escrow Settlement Path</span>
        <span className="font-mono text-blue-400 font-bold">{amountStr} USD</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
        {/* Step 1: Buyer Agent */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Buyer Principal</div>
            <div className="text-xs font-bold text-slate-200">Authorized {amountStr}</div>
          </div>
        </div>

        {/* Step 2: PayPal Escrow Hold */}
        <div
          className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
            isBlocked
              ? "bg-red-950/20 border-red-500/40 text-red-300"
              : isHeld
              ? "bg-amber-950/20 border-amber-500/40 text-amber-300 shadow-md shadow-amber-500/10"
              : "bg-slate-900/90 border-slate-800 text-slate-400"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isBlocked
                ? "bg-red-500/10 border border-red-500/20 text-red-400"
                : isHeld
                ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {isBlocked ? <XCircle className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          </div>
          <div>
            <div className="text-[11px] font-medium">PayPal Orders Hold</div>
            <div className="text-xs font-bold font-mono">
              {isBlocked ? "HOLD ABORTED" : isHeld ? "FUNDS LOCKED" : "AUTHORIZE"}
            </div>
          </div>
        </div>

        {/* Step 3: Seller or Refund */}
        <div
          className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
            isReleased
              ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-500/10"
              : isRefunded
              ? "bg-sky-950/20 border-sky-500/40 text-sky-300"
              : "bg-slate-900/90 border-slate-800 text-slate-400"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isReleased
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : isRefunded
                ? "bg-sky-500/10 border border-sky-500/20 text-sky-400"
                : "bg-slate-800 text-slate-400"
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
          <div>
            <div className="text-[11px] font-medium">
              {isRefunded ? "Buyer Restored" : "Seller Settlement"}
            </div>
            <div className="text-xs font-bold">
              {isReleased ? "CAPTURED & PAID" : isRefunded ? "VOIDED / REFUNDED" : "Awaiting Arbiter"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
