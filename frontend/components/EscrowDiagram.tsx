"use client";

import React from "react";
import { CheckCircle2, Clock, ShieldX, RefreshCw, ArrowRight } from "lucide-react";

interface EscrowDiagramProps {
  currentState: string | null;
  paypalOrderId?: string | null;
  paypalAuthId?: string | null;
  paypalCaptureId?: string | null;
  holdExpiresAt?: string | null;
}

export const EscrowDiagram: React.FC<EscrowDiagramProps> = ({
  currentState,
  paypalOrderId,
  paypalAuthId,
  paypalCaptureId,
  holdExpiresAt,
}) => {
  const nodes = [
    { id: "INTENT_RECEIVED", label: "Intent Received" },
    { id: "ORDER_CREATED", label: "Order Created" },
    { id: "BUYER_APPROVED", label: "Buyer Approved" },
    { id: "FUNDS_HELD", label: "Funds Held (Escrow)" },
    { id: "DELIVERED", label: "Delivered" },
    { id: "UNDER_ARBITRATION", label: "Under Arbitration" },
    { id: "RELEASED", label: "Released" },
  ];

  const isTerminalBlocked = currentState === "BLOCKED";
  const isTerminalRefunded = currentState === "REFUNDED";

  const getStepStatus = (nodeId: string) => {
    if (!currentState) return "PENDING";
    if (currentState === nodeId) return "ACTIVE";

    const order = ["INTENT_RECEIVED", "ORDER_CREATED", "BUYER_APPROVED", "FUNDS_HELD", "DELIVERED", "UNDER_ARBITRATION", "RELEASED"];
    const currIndex = order.indexOf(currentState);
    const nodeIndex = order.indexOf(nodeId);

    if (currIndex !== -1 && nodeIndex < currIndex) return "COMPLETED";
    return "PENDING";
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div>
          <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider">
            Escrow State Machine Visualizer
          </h3>
          <p className="text-xs text-slate-400">Strict deterministic state progression with rollback protections.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">State:</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
              currentState === "RELEASED"
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                : currentState === "REFUNDED"
                ? "bg-sky-500/20 text-sky-400 border-sky-500/40"
                : currentState === "BLOCKED"
                ? "bg-red-500/20 text-red-400 border-red-500/40"
                : currentState === "FUNDS_HELD"
                ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                : "bg-slate-800 text-slate-300 border-slate-700"
            }`}
          >
            {currentState || "IDLE"}
          </span>
        </div>
      </div>

      {/* Visual Pipeline Nodes */}
      <div className="mt-5 flex items-center justify-between gap-1 overflow-x-auto pb-2">
        {nodes.map((node, idx) => {
          const status = getStepStatus(node.id);
          const isCurrent = status === "ACTIVE";
          const isDone = status === "COMPLETED";

          return (
            <React.Fragment key={node.id}>
              <div className="flex flex-col items-center shrink-0 min-w-[90px] text-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCurrent
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50 scale-110 border-2 border-sky-300"
                      : isDone
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-slate-800 text-slate-500 border border-slate-700"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <span
                  className={`mt-1.5 text-[10px] font-medium leading-tight ${
                    isCurrent ? "text-blue-300 font-bold" : isDone ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  {node.label}
                </span>
              </div>

              {idx < nodes.length - 1 && (
                <div
                  className={`h-0.5 flex-1 min-w-[12px] -mt-5 transition-colors ${
                    isDone ? "bg-emerald-500/50" : "bg-slate-800"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Alternative Terminal Branches (BLOCKED / REFUNDED) */}
      {(isTerminalBlocked || isTerminalRefunded) && (
        <div className="mt-4 p-3 rounded-xl border flex items-center justify-between bg-black/40 border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            {isTerminalBlocked ? (
              <ShieldX className="w-4 h-4 text-red-400" />
            ) : (
              <RefreshCw className="w-4 h-4 text-sky-400" />
            )}
            <span className="font-semibold text-slate-200">
              {isTerminalBlocked ? "Terminal Rejection: BLOCKED" : "Dispute Resolution: REFUNDED"}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {isTerminalBlocked ? "No PayPal order created." : "PayPal authorization voided."}
          </span>
        </div>
      )}

      {/* Live PayPal Transaction Metadata */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] font-mono">
        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-slate-500 block text-[10px]">PayPal Order ID:</span>
          <span className="text-slate-300 truncate block">{paypalOrderId || "—"}</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-slate-500 block text-[10px]">PayPal Auth ID:</span>
          <span className="text-amber-300 truncate block">{paypalAuthId || "—"}</span>
        </div>
        <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
          <span className="text-slate-500 block text-[10px]">PayPal Capture ID:</span>
          <span className="text-emerald-300 truncate block">{paypalCaptureId || "—"}</span>
        </div>
      </div>
    </div>
  );
};
