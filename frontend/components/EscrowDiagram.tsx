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
    { id: "UNDER_ARBITRATION", label: "Arbitration" },
    { id: "RELEASED", label: "Released" },
  ];

  const getStepStatus = (nodeId: string) => {
    if (!currentState) return "PENDING";
    if (currentState === nodeId) return "ACTIVE";

    const order = [
      "INTENT_RECEIVED",
      "ORDER_CREATED",
      "BUYER_APPROVED",
      "FUNDS_HELD",
      "DELIVERED",
      "UNDER_ARBITRATION",
      "RELEASED",
    ];
    const currIndex = order.indexOf(currentState);
    const nodeIndex = order.indexOf(nodeId);

    if (currIndex !== -1 && nodeIndex < currIndex) return "COMPLETED";
    return "PENDING";
  };

  return (
    <div className="ref-glass-card rounded-2xl p-6 border border-white/[0.08]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/[0.06] gap-2">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
            State Machine Visualizer
          </span>
          <h3 className="text-sm font-medium text-white tracking-tight mt-0.5">
            Deterministic Escrow Progression
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-neutral-400 font-mono uppercase">State:</span>
          <span
            className={`px-3 py-0.5 rounded-full text-xs font-mono font-medium border ${currentState === "RELEASED"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : currentState === "REFUNDED"
                  ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                  : currentState === "BLOCKED"
                    ? "bg-red-500/10 text-red-400 border-red-500/30"
                    : currentState === "FUNDS_HELD"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-white/[0.04] text-neutral-300 border-white/[0.08]"
              }`}
          >
            {currentState || "IDLE"}
          </span>
        </div>
      </div>

      {/* Visual Pipeline Nodes */}
      <div className="mt-6 flex items-center justify-between gap-1 overflow-x-auto pb-2 no-scrollbar">
        {nodes.map((node, idx) => {
          const status = getStepStatus(node.id);
          const isCurrent = status === "ACTIVE";
          const isDone = status === "COMPLETED";

          return (
            <React.Fragment key={node.id}>
              <div className="flex flex-col items-center shrink-0 min-w-[85px] text-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-medium transition-all ${isCurrent
                      ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-110"
                      : isDone
                        ? "bg-white/10 text-white border border-white/20"
                        : "bg-white/[0.02] text-neutral-500 border border-white/[0.06]"
                    }`}
                >
                  {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <span
                  className={`mt-2 text-[10px] font-mono leading-tight tracking-tight ${isCurrent ? "text-white font-medium" : isDone ? "text-neutral-300" : "text-neutral-500"
                    }`}
                >
                  {node.label}
                </span>
              </div>

              {idx < nodes.length - 1 && (
                <div
                  className={`flex-1 h-[1px] min-w-[12px] transition-colors ${isDone ? "bg-white/30" : "bg-white/[0.06]"
                    }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Terminal / Live Identifiers Bar */}
      {(paypalOrderId || paypalAuthId || paypalCaptureId) && (
        <div className="mt-6 pt-4 border-t border-white/[0.06] flex flex-wrap items-center gap-4 text-[11px] font-mono text-neutral-400">
          {paypalOrderId && (
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 uppercase">Order ID:</span>
              <span className="text-neutral-200">{paypalOrderId}</span>
            </div>
          )}
          {paypalAuthId && (
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 uppercase">Auth ID:</span>
              <span className="text-neutral-200">{paypalAuthId}</span>
            </div>
          )}
          {paypalCaptureId && (
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 uppercase">Capture ID:</span>
              <span className="text-neutral-200">{paypalCaptureId}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
