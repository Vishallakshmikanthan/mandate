"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, Check, X, ShieldX, Terminal, Lock } from "lucide-react";

export interface RuleResultItem {
  rule: string;
  passed: boolean;
  detail: string;
}

interface DecisionCardProps {
  decision: string | null;
  riskScore: number;
  flags: string[];
  rules: RuleResultItem[];
  rawInjectedPrompt?: string | null;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  decision,
  riskScore,
  flags,
  rules,
  rawInjectedPrompt,
}) => {
  if (!decision && rules.length === 0) {
    return (
      <div className="ref-glass-card rounded-2xl p-8 border border-white/[0.08] text-center flex flex-col items-center justify-center h-full min-h-[220px]">
        <div className="w-10 h-10 rounded-full border border-white/[0.1] bg-white/[0.03] flex items-center justify-center text-neutral-400 mb-3">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-medium text-white tracking-tight">Mandate Gateway Idle</h4>
        <p className="text-xs text-neutral-500 mt-1 max-w-xs leading-relaxed">
          Select or trigger a scenario to evaluate deterministic rule constraints and neural threat scoring.
        </p>
      </div>
    );
  }

  const isBlocked = decision === "BLOCKED";
  const isApproved = decision === "APPROVED";
  const isEscalated = decision === "ESCALATED";

  const getVerdictBadge = () => {
    if (isBlocked) {
      return {
        bg: "bg-red-500/10 text-red-300 border-red-500/30",
        icon: ShieldX,
        label: "BLOCKED BY FIREWALL",
        desc: "Deterministic rule violation or adversarial prompt injection detected.",
      };
    }
    if (isApproved) {
      return {
        bg: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
        icon: ShieldCheck,
        label: "APPROVED BY GATEWAY",
        desc: "All deterministic policy constraints met and risk score is within safety bounds.",
      };
    }
    return {
      bg: "bg-amber-500/10 text-amber-300 border-amber-500/30",
      icon: AlertTriangle,
      label: "ESCALATED TO HUMAN REVIEW",
      desc: "Exceeds automated disbursement bounds; queued for supervisor approval.",
    };
  };

  const badge = getVerdictBadge();
  const BadgeIcon = badge.icon;

  return (
    <div className={`ref-glass-card rounded-2xl p-6 border transition-all ${isBlocked ? "border-red-500/40" : "border-white/[0.08]"}`}>
      {/* Top Banner */}
      <div className={`rounded-xl p-4 border flex items-start gap-4 ${badge.bg}`}>
        <div className="p-2 rounded-lg bg-black/40 border border-white/10 shrink-0">
          <BadgeIcon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-mono font-medium text-xs tracking-wider uppercase">{badge.label}</span>
            {isBlocked && (
              <span className="text-[10px] font-mono font-bold bg-red-600/30 text-red-200 px-2.5 py-0.5 rounded-full border border-red-500/40">
                ZERO PAYPAL CALLS
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-300 mt-1 leading-relaxed opacity-90">{badge.desc}</p>
        </div>
      </div>

      {/* Forensic Banner if Injected Prompt */}
      {isBlocked && rawInjectedPrompt && (
        <div className="mt-4 p-4 rounded-xl bg-red-950/20 border border-red-500/30">
          <div className="flex items-center gap-1.5 text-xs font-mono text-red-400 mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider">Adversarial Forensics</span>
          </div>
          <pre className="p-3 rounded-lg bg-black/80 text-[11px] font-mono text-red-300 overflow-x-auto border border-red-900/40 whitespace-pre-wrap">
            {rawInjectedPrompt}
          </pre>
        </div>
      )}

      {/* Threat Index Progress Bar */}
      <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
            Threat Score Index
          </span>
          <span
            className={`font-mono text-xs font-medium ${riskScore >= 0.8 ? "text-red-400" : riskScore >= 0.5 ? "text-amber-400" : "text-emerald-400"
              }`}
          >
            {(riskScore * 100).toFixed(0)}% (Index: {riskScore.toFixed(2)})
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ${riskScore >= 0.8 ? "bg-red-500" : riskScore >= 0.5 ? "bg-amber-500" : "bg-emerald-500"
              }`}
            style={{ width: `${Math.min(100, Math.max(4, riskScore * 100))}%` }}
          />
        </div>

        {/* Threat Flags */}
        {flags && flags.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-neutral-500 font-mono">Detections:</span>
            {flags.map((flag, idx) => (
              <span
                key={idx}
                className={`text-[10px] px-2 py-0.5 rounded font-mono ${flag === "clean"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
              >
                {flag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Deterministic Policy Checklist R1-R10 */}
      <div className="mt-5">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
            Policy Gates (R1 - R10)
          </span>
          <span className="text-[10px] font-mono text-neutral-500">
            Deterministic Authority
          </span>
        </div>

        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
          {rules.map((rule, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${rule.passed
                  ? "bg-white/[0.02] border-white/[0.06] text-neutral-300"
                  : "bg-red-500/10 border-red-500/30 text-red-200"
                }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${rule.passed ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                  }`}
              >
                {rule.passed ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-mono text-[11px] font-medium text-white mr-2">
                  {rule.rule}
                </span>
                <span className="text-[11px] text-neutral-400">{rule.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
