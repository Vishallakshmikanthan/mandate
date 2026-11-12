"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

export default function MandateBuilderPage() {
  const [currentStep, setCurrentStep] = useState(3);
  const [allowedCounterparties, setAllowedCounterparties] = useState(["seller_agent_acme"]);
  const [blockedCounterparties, setBlockedCounterparties] = useState(["unverified_seller_66"]);
  const [categories, setCategories] = useState(["freelance_design", "software_services"]);
  const [escalateAbove, setEscalateAbove] = useState("150.00");
  const [maxTxnsPerHour, setMaxTxnsPerHour] = useState("5");
  const [perTxnCap, setPerTxnCap] = useState("200.00");
  const [totalBudget, setTotalBudget] = useState("500.00");
  const [isSigned, setIsSigned] = useState(false);
  const [isKilled, setIsKilled] = useState(false);

  const steps = [
    { num: 1, label: "Basics" },
    { num: 2, label: "Limits" },
    { num: 3, label: "Who and what" },
    { num: 4, label: "Safety" },
    { num: 5, label: "Review and sign" },
  ];

  const jsonPolicy = {
    max_per_transaction: 20000,
    escalate_above: 15000,
    allowed_counterparties: allowedCounterparties,
    blocked_counterparties: blockedCounterparties,
    require_escrow: true,
  };

  const removeCounterparty = (item: string) => {
    setAllowedCounterparties(allowedCounterparties.filter((c) => c !== item));
  };

  const removeBlocked = (item: string) => {
    setBlockedCounterparties(blockedCounterparties.filter((c) => c !== item));
  };

  const removeCategory = (item: string) => {
    setCategories(categories.filter((c) => c !== item));
  };

  return (
    <div className="space-y-6">
      {/* Title & Step Header */}
      <div className="space-y-1">
        <span className="text-xs text-neutral-400 font-normal">Step {currentStep} of 5</span>
        <h1 className="text-3xl sm:text-4xl font-light text-white tracking-tight">
          Who and what can this agent pay?
        </h1>
      </div>

      {/* 5-Step Stepper */}
      <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-5">
        <div className="relative pt-2 pb-1">
          {/* Progress bar line */}
          <div className="absolute top-[18px] left-6 right-6 h-[2px] bg-white/[0.1] -z-0">
            <div
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between relative z-10">
            {steps.map((st) => {
              const isPassed = st.num < currentStep;
              const isCurrent = st.num === currentStep;
              return (
                <button
                  key={st.num}
                  onClick={() => setCurrentStep(st.num)}
                  className="flex flex-col items-center gap-2 focus:outline-none"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono transition-all ${
                      isPassed
                        ? "bg-white text-neutral-900 font-bold"
                        : isCurrent
                        ? "bg-white text-neutral-900 font-bold ring-4 ring-white/20"
                        : "bg-[#142225] border border-white/[0.2] text-neutral-400"
                    }`}
                  >
                    {isPassed ? "✓" : st.num}
                  </div>
                  <span
                    className={`text-xs ${
                      isPassed || isCurrent ? "text-neutral-200 font-medium" : "text-neutral-400"
                    }`}
                  >
                    {st.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two Columns: Form on Left, In Plain English & JSON on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Configuration Form Card */}
        <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 space-y-5">
          {/* Allowed Counterparties */}
          <div className="space-y-2">
            <label className="text-xs text-neutral-300 font-normal block">Allowed counterparties</label>
            <div className="w-full min-h-[42px] px-3 py-1.5 rounded-xl bg-[#0f191b]/90 border border-white/[0.08] flex items-center flex-wrap gap-2">
              {allowedCounterparties.map((cp) => (
                <span
                  key={cp}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-neutral-200 bg-white/[0.06] border border-white/[0.08]"
                >
                  <span>{cp}</span>
                  <button
                    onClick={() => removeCounterparty(cp)}
                    className="text-neutral-400 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                onClick={() => {
                  const val = prompt("Enter allowed counterparty:");
                  if (val) setAllowedCounterparties([...allowedCounterparties, val]);
                }}
                className="text-xs text-neutral-400 hover:text-white px-2 py-1"
              >
                + add...
              </button>
            </div>
          </div>

          {/* Blocked Counterparties */}
          <div className="space-y-2">
            <label className="text-xs text-neutral-300 font-normal block">Blocked counterparties</label>
            <div className="w-full min-h-[42px] px-3 py-1.5 rounded-xl bg-[#0f191b]/90 border border-white/[0.08] flex items-center flex-wrap gap-2">
              {blockedCounterparties.map((cp) => (
                <span
                  key={cp}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25"
                >
                  <span>{cp}</span>
                  <button
                    onClick={() => removeBlocked(cp)}
                    className="text-rose-400 hover:text-rose-200"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Merchant Categories */}
          <div className="space-y-2">
            <label className="text-xs text-neutral-300 font-normal block">Merchant categories</label>
            <div className="w-full min-h-[42px] px-3 py-1.5 rounded-xl bg-[#0f191b]/90 border border-white/[0.08] flex items-center flex-wrap gap-2">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-neutral-200 bg-white/[0.06] border border-white/[0.08]"
                >
                  <span>{cat}</span>
                  <button
                    onClick={() => removeCategory(cat)}
                    className="text-neutral-400 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Escalate above & Max txns per hour */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-neutral-300 font-normal block">Escalate above</label>
              <div className="relative">
                <input
                  type="text"
                  value={`$${escalateAbove}`}
                  onChange={(e) => setEscalateAbove(e.target.value.replace("$", ""))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f191b]/90 border border-white/[0.08] text-sm text-white focus:outline-none focus:border-white/20 font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-neutral-300 font-normal block">Max txns per hour</label>
              <div className="relative">
                <input
                  type="text"
                  value={maxTxnsPerHour}
                  onChange={(e) => setMaxTxnsPerHour(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f191b]/90 border border-white/[0.08] text-sm text-white focus:outline-none focus:border-white/20 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Visual Sliders / Progress bars */}
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-neutral-300">
                <span>Per-transaction cap · ${perTxnCap}</span>
              </div>
              <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full w-[40%]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-neutral-300">
                <span>Total budget · ${totalBudget}</span>
              </div>
              <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full w-[100%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Plain English, JSON Code & Actions */}
        <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs text-neutral-400 font-normal">In plain English</span>
              <p className="text-xs text-neutral-200 leading-relaxed font-sans">
                This agent may spend up to ${perTxnCap} per payment and ${totalBudget} in total, only with seller_agent_acme, in freelance_design and software_services. Anything above ${escalateAbove} needs your approval.
              </p>
            </div>

            {/* JSON Code Box */}
            <div className="rounded-xl bg-[#0a1113]/95 border border-white/[0.06] p-4 font-mono text-xs text-neutral-300 leading-relaxed overflow-x-auto">
              <pre>{JSON.stringify(jsonPolicy, null, 2)}</pre>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="px-3.5 py-1.5 rounded-full text-xs text-neutral-300 bg-white/[0.04] border border-white/[0.08] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>HMAC-SHA256 ready</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => alert("Simulation passed! R1-R10 validated without error.")}
                className="px-4 py-2 rounded-full text-xs font-normal text-neutral-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition"
              >
                Simulate payment
              </button>

              <button
                onClick={() => setIsSigned(true)}
                className={`px-5 py-2 rounded-full text-xs font-semibold transition shadow-sm ${
                  isSigned
                    ? "bg-emerald-500 text-white"
                    : "bg-white text-neutral-900 hover:bg-neutral-100"
                }`}
              >
                {isSigned ? "Mandate Activated ✓" : "Sign and activate"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Table: Active mandates and spend */}
      <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 space-y-4">
        <span className="text-xs text-neutral-400 font-normal">Active mandates and spend</span>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-neutral-400 pb-3">
                <th className="font-normal py-2.5">Mandate</th>
                <th className="font-normal py-2.5">Agent</th>
                <th className="font-normal py-2.5">Per-txn cap</th>
                <th className="font-normal py-2.5">Spend / budget</th>
                <th className="font-normal py-2.5">Status</th>
                <th className="font-normal py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/[0.04]">
                <td className="py-3.5 font-mono text-neutral-200">9ec90311-722c...ea6</td>
                <td className="py-3.5 text-neutral-300">buyer_agent_alpha</td>
                <td className="py-3.5 font-mono text-neutral-200">$200.00</td>
                <td className="py-3.5">
                  <div className="space-y-1 max-w-[140px]">
                    <span className="font-mono text-neutral-200 text-[11px]">$480.00 / $500.00</span>
                    <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full w-[96%]" />
                    </div>
                  </div>
                </td>
                <td className="py-3.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                      isKilled
                        ? "bg-rose-500/10 text-rose-300 border border-rose-500/25"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}
                  >
                    {isKilled ? "Revoked" : "Active"}
                  </span>
                </td>
                <td className="py-3.5 text-right">
                  <button
                    onClick={() => setIsKilled(!isKilled)}
                    className="px-3.5 py-1.5 rounded-full text-xs text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition"
                  >
                    {isKilled ? "Restore" : "Kill switch"}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
