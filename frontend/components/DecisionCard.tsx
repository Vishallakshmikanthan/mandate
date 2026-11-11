"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, Check, X, ShieldX, Terminal } from "lucide-react";

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
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 text-center flex flex-col items-center justify-center h-full text-slate-500">
        <ShieldCheck className="w-10 h-10 mb-2 opacity-40 text-blue-400" />
        <h4 className="font-semibold text-sm text-slate-300">Mandate Gateway Idle</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Run a scenario to trigger real-time policy evaluation and risk scoring.
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
        bg: "bg-red-500/20 text-red-400 border-red-500/40 glow-red",
        icon: ShieldX,
        label: "BLOCKED BY FIREWALL",
        desc: "Deterministic rule violation or adversarial prompt injection detected.",
      };
    }
    if (isApproved) {
      return {
        bg: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 glow-green",
        icon: ShieldCheck,
        label: "APPROVED BY GATEWAY",
        desc: "All deterministic rules passed and risk score is within safety bounds.",
      };
    }
    return {
      bg: "bg-amber-500/20 text-amber-400 border-amber-500/40",
      icon: AlertTriangle,
      label: "ESCALATED TO HUMAN REVIEW",
      desc: "Exceeds automated approval threshold; held for supervisor sign-off.",
    };
  };

  const badge = getVerdictBadge();
  const BadgeIcon = badge.icon;

  return (
    <div className={`glass-panel rounded-2xl p-5 border transition-all ${isBlocked ? "border-red-500/50" : "border-slate-800"}`}>
      {/* Top Banner */}
      <div className={`rounded-xl p-4 border flex items-start gap-3.5 ${badge.bg}`}>
        <div className="p-2 rounded-lg bg-black/40 border border-white/10 shrink-0">
          <BadgeIcon className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-sm tracking-wide">{badge.label}</span>
            {isBlocked && (
              <span className="text-[10px] bg-red-600/40 text-red-200 px-2 py-0.5 rounded-full font-mono font-bold">
                ZERO PAYPAL CALLS
              </span>
            )}
          </div>
          <p className="text-xs opacity-90 mt-0.5">{badge.desc}</p>
        </div>
      </div>

      {/* Forensic Banner if Injected Prompt */}
      {isBlocked && rawInjectedPrompt && (
        <div className="mt-4 p-3.5 rounded-xl bg-red-950/30 border border-red-500/30">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400 mb-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Adversarial Prompt Forensics</span>
          </div>
          <pre className="p-2.5 rounded-lg bg-black/70 text-[11px] font-mono text-red-300 overflow-x-auto border border-red-900/40 whitespace-pre-wrap">
            {rawInjectedPrompt}
          </pre>
        </div>
      )}

      {/* Risk Gauge & Tags */}
      <div className="mt-4 p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-400 font-medium">AI Risk Scorer Threat Index</span>
          <span className={`font-mono font-bold ${riskScore >= 0.8 ? "text-red-400" : riskScore >= 0.5 ? "text-amber-400" : "text-emerald-400"}`}>
            {(riskScore * 100).toFixed(0)}% (Score: {riskScore.toFixed(2)})
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ${
              riskScore >= 0.8
                ? "bg-gradient-to-r from-amber-500 to-red-500"
                : riskScore >= 0.5
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(100, Math.max(4, riskScore * 100))}%` }}
          />
        </div>

        {/* Threat Flags */}
        {flags && flags.length > 0 && (
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-500 font-medium">Detections:</span>
            {flags.map((flag, idx) => (
              <span
                key={idx}
                className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-medium ${
                  flag === "clean"
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
      <div className="mt-4">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Policy Engine Checklist (R1 - R10)</span>
          <span className="text-[10px] text-blue-400 font-normal">Deterministic Authority</span>
        </h4>

        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
          {rules.map((rule, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-lg border text-xs flex items-start gap-2.5 ${
                rule.passed
                  ? "bg-slate-900/40 border-slate-800/80 text-slate-300"
                  : "bg-red-950/20 border-red-500/30 text-red-200"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  rule.passed ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                }`}
              >
                {rule.passed ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-mono text-[11px] font-semibold text-slate-200 mr-2">
                  {rule.rule}
                </span>
                <span className="text-[11px] opacity-80">{rule.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
