"use client";

import React from "react";
import { Lock, FileText, Scale, CheckCircle2, RotateCcw, AlertTriangle } from "lucide-react";
import clsx from "clsx";

interface EscrowStepperProps {
  state: "HELD" | "DELIVERED" | "ARBITRATION" | "RELEASED" | "REFUNDED" | string | null;
  className?: string;
}

export const EscrowStepper: React.FC<EscrowStepperProps> = ({ state = "HELD", className = "" }) => {
  const normState = (state || "HELD").toUpperCase();

  const steps = [
    { id: "HELD", label: "PayPal Hold", sublabel: "Funds Authorized", icon: Lock },
    { id: "DELIVERED", label: "Deliverable", sublabel: "Seller Submits Work", icon: FileText },
    { id: "ARBITRATION", label: "AI Arbiter", sublabel: "Criteria Evaluation", icon: Scale },
    {
      id: normState === "REFUNDED" ? "REFUNDED" : "RELEASED",
      label: normState === "REFUNDED" ? "Refunded" : "Settled",
      sublabel: normState === "REFUNDED" ? "Buyer Reimbursed" : "Funds Released",
      icon: normState === "REFUNDED" ? RotateCcw : CheckCircle2,
    },
  ];

  const stateOrder = ["HELD", "DELIVERED", "ARBITRATION", normState === "REFUNDED" ? "REFUNDED" : "RELEASED"];
  const currentIndex = stateOrder.indexOf(normState) !== -1 ? stateOrder.indexOf(normState) : 0;

  return (
    <div className={clsx("w-full py-4", className)}>
      <div className="relative flex items-center justify-between">
        {/* Connecting track line */}
        <div className="absolute top-5 left-8 right-8 h-0.5 bg-white/[0.1] -z-0" />
        <div
          className="absolute top-5 left-8 h-0.5 brand-gradient-bg -z-0 transition-all duration-700"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isRefund = step.id === "REFUNDED" && isCurrent;
          const Icon = step.icon;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center text-center">
              {/* Circle node */}
              <div
                className={clsx(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                  isCurrent && !isRefund && "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_20px_#22d3ee]",
                  isCurrent && isRefund && "bg-rose-500/20 border-rose-400 text-rose-300 shadow-[0_0_20px_#f43f5e]",
                  isDone && "bg-emerald-500/20 border-emerald-400 text-emerald-400",
                  !isDone && !isCurrent && "bg-[#070A12] border-white/[0.14] text-neutral-500"
                )}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Labels */}
              <div className="mt-2.5">
                <p
                  className={clsx(
                    "text-xs font-medium tracking-tight",
                    isCurrent ? (isRefund ? "text-rose-400 font-semibold" : "text-cyan-400 font-semibold") : isDone ? "text-white" : "text-neutral-500"
                  )}
                >
                  {step.label}
                </p>
                <p className="text-[10px] font-mono text-neutral-400 mt-0.5">
                  {step.sublabel}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

