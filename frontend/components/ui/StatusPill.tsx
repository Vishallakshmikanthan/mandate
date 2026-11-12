"use client";

import React from "react";
import { CheckCircle2, Lock, Clock, ShieldAlert, Scale, AlertCircle, Ban, Play } from "lucide-react";
import clsx from "clsx";

interface StatusPillProps {
  status: string;
  size?: "sm" | "md";
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, size = "md", className = "" }) => {
  const norm = (status || "").toUpperCase();

  let colorClasses = "bg-white/[0.06] text-neutral-300 border-white/[0.12]";
  let icon = <AlertCircle className="w-3.5 h-3.5" />;
  let label = status;

  if (norm === "APPROVED" || norm === "RELEASED" || norm === "ACTIVE" || norm === "SUCCESS") {
    colorClasses = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
    label = norm === "ACTIVE" ? "Active" : norm === "APPROVED" ? "Approved" : norm === "RELEASED" ? "Released" : "Success";
  } else if (norm === "FUNDS_HELD" || norm === "HELD" || norm === "ORDER_CREATED") {
    colorClasses = "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
    icon = <Lock className="w-3.5 h-3.5 text-cyan-400" />;
    label = norm === "ORDER_CREATED" ? "Order Created" : "Funds Held";
  } else if (norm === "ESCALATED" || norm === "PENDING" || norm === "PAUSED") {
    colorClasses = "bg-amber-500/10 text-amber-400 border-amber-500/30";
    icon = <Clock className="w-3.5 h-3.5 text-amber-400" />;
    label = norm === "PAUSED" ? "Paused" : norm === "ESCALATED" ? "Escalated" : "Pending";
  } else if (norm === "BLOCKED" || norm === "REFUNDED" || norm === "REVOKED" || norm === "FAILED") {
    colorClasses = "bg-rose-500/10 text-rose-400 border-rose-500/30";
    icon = <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
    label = norm === "REVOKED" ? "Revoked" : norm === "REFUNDED" ? "Refunded" : norm === "BLOCKED" ? "Blocked" : "Failed";
  } else if (norm === "UNDER_ARBITRATION" || norm === "ARBITRATION" || norm === "DELIVERED") {
    colorClasses = "bg-purple-500/10 text-purple-300 border-purple-500/30";
    icon = <Scale className="w-3.5 h-3.5 text-purple-300" />;
    label = norm === "DELIVERED" ? "Delivered" : "Arbitration";
  }

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 font-mono uppercase tracking-wider rounded-full border",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        colorClasses,
        className
      )}
    >
      {icon}
      <span>{label}</span>
    </span>
  );
};

