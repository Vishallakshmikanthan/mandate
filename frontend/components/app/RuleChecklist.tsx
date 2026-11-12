"use client";

import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { RuleResult } from "@/lib/demo-store";

interface RuleChecklistProps {
  rules?: RuleResult[];
  highlightFailed?: boolean;
}

const DEFAULT_10_RULES: RuleResult[] = [
  { rule: "R1", name: "Mandate Signature", passed: true, detail: "Valid cryptographic HMAC-SHA256 signature; status ACTIVE" },
  { rule: "R2", name: "Transaction Cap", passed: true, detail: "Amount does not exceed per-transaction limit" },
  { rule: "R3", name: "Total Budget", passed: true, detail: "Cumulative spend within allocated total budget" },
  { rule: "R4", name: "Daily Limit", passed: true, detail: "Rolling 24-hour spend within daily limit" },
  { rule: "R5", name: "Allowed Counterparty", passed: true, detail: "Target merchant is present on verified allowlist" },
  { rule: "R6", name: "Category Match", passed: true, detail: "Declared SKU category authorized by policy" },
  { rule: "R7", name: "Time Window", passed: true, detail: "Timestamp within allowed UTC operational hours" },
  { rule: "R8", name: "Velocity Check", passed: true, detail: "Transaction frequency below hourly rate limit" },
  { rule: "R9", name: "Escalation Threshold", passed: true, detail: "Amount within autonomous limit (no human approval needed)" },
  { rule: "R10", name: "Escrow Enforced", passed: true, detail: "Two-phase escrow hold configured on PayPal Orders v2" },
];

export const RuleChecklist: React.FC<RuleChecklistProps> = ({ rules = DEFAULT_10_RULES }) => {
  const displayRules = rules.length > 0 ? rules : DEFAULT_10_RULES;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/[0.08]">
        <span className="text-xs font-mono uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          Deterministic Policy Engine (10 Rules)
        </span>
        <span className="text-[10px] font-mono text-neutral-500">
          {displayRules.filter((r) => r.passed).length}/{displayRules.length} PASSED
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {displayRules.map((rule, idx) => {
          const isPassed = rule.passed !== false;

          return (
            <div
              key={idx}
              className={`p-2.5 rounded-xl border transition-all text-xs flex items-start gap-2.5 ${
                isPassed
                  ? "bg-white/[0.03] border-white/[0.08] text-neutral-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]"
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {isPassed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono font-semibold text-white truncate">
                    {rule.rule}: {rule.name}
                  </span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                      isPassed
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/20 text-rose-300 font-bold"
                    }`}
                  >
                    {isPassed ? "PASS" : "FAIL"}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1 leading-snug">
                  {rule.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

