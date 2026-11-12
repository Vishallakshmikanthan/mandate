"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function EscrowDetailPage() {
  const [activeStep, setActiveStep] = useState(6);
  const [isArbitrating, setIsArbitrating] = useState(false);
  const [overrideActive, setOverrideActive] = useState(false);

  const steps = [
    { num: 1, label: "Intent received" },
    { num: 2, label: "Order created" },
    { num: 3, label: "Buyer approved" },
    { num: 4, label: "Funds held" },
    { num: 5, label: "Delivered" },
    { num: 6, label: "Arbitration" },
    { num: 7, label: "Released" },
  ];

  const criteria = [
    { text: "Includes 3 logo variants", met: true },
    { text: "Includes source files", met: true },
    { text: "Delivered within deadline", met: false },
  ];

  const timelineEvents = [
    { event: "ESCROW_FUNDS_HELD", source: "PayPal" },
    { event: "ESCROW_DELIVERED", source: "Seller agent" },
    { event: "ESCROW_UNDER_ARBITRATION", source: "Arbiter" },
  ];

  const handleRunArbiter = () => {
    setIsArbitrating(true);
    setTimeout(() => {
      setIsArbitrating(false);
      setActiveStep(7);
      alert("AI Arbiter evaluation complete: Verdict PASS (Score 0.88). Funds captured and released via PayPal Orders v2!");
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Title & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs text-neutral-400 font-normal">Escrow · PayPal Orders v2</span>
          <h1 className="text-3xl sm:text-4xl font-light text-white tracking-tight">
            $120.00 logo pack
          </h1>
        </div>

        {/* Action Buttons on Right */}
        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-full text-xs text-neutral-300 bg-white/[0.04] border border-white/[0.08]">
            {activeStep === 7 ? "Settled" : "Under arbitration"}
          </span>

          <button
            onClick={() => {
              setOverrideActive(!overrideActive);
              alert("Human override mode toggled. Principal approval active.");
            }}
            className="px-4 py-2 rounded-full text-xs font-normal text-neutral-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition"
          >
            Human override
          </button>

          <button
            onClick={handleRunArbiter}
            className={`px-5 py-2 rounded-full text-xs font-semibold transition shadow-sm ${
              activeStep === 7
                ? "bg-emerald-500 text-white"
                : "bg-white text-neutral-900 hover:bg-neutral-100"
            }`}
          >
            {isArbitrating ? "Arbitrating..." : activeStep === 7 ? "Released ✓" : "Run arbiter"}
          </button>
        </div>
      </div>

      {/* 7-Step Horizontal Stepper */}
      <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-5 space-y-4">
        <div className="relative pt-2 pb-1">
          {/* Progress bar line */}
          <div className="absolute top-[18px] left-6 right-6 h-[2px] bg-white/[0.1] -z-0">
            <div
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${((activeStep - 1) / (steps.length - 1)) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between relative z-10">
            {steps.map((st) => {
              const isPassed = st.num < activeStep;
              const isCurrent = st.num === activeStep;
              return (
                <div key={st.num} className="flex flex-col items-center gap-2">
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
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Middle Row: 2 Cards (Money Flow on Left, Arbiter Verdict on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Money Flow Card */}
        <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 flex flex-col justify-between min-h-[220px] space-y-6">
          <div className="space-y-4">
            <span className="text-xs text-neutral-400 font-normal">Money flow</span>

            {/* 3 Connected Stage Boxes */}
            <div className="flex items-center justify-between gap-3 pt-2">
              {/* Buyer Box */}
              <div className="flex-1 rounded-xl bg-[#0f191b]/90 border border-white/[0.06] p-4 text-center space-y-1">
                <span className="text-xs text-neutral-300 block">Buyer agent</span>
                <span className="font-mono text-sm text-white font-medium">$120.00</span>
              </div>

              {/* Dashed connector line */}
              <div className="text-neutral-400 font-mono text-xs tracking-widest">-------</div>

              {/* PayPal Hold Box (Highlighted) */}
              <div className="flex-1 rounded-xl bg-[#0f191b]/95 border border-white/40 p-4 text-center space-y-1 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                <span className="text-xs text-neutral-200 block font-medium">PayPal hold</span>
                <span className="text-xs text-neutral-300 block">Authorized</span>
              </div>

              {/* Dashed connector line */}
              <div className="text-neutral-400 font-mono text-xs tracking-widest">-------</div>

              {/* Seller Box */}
              <div className="flex-1 rounded-xl bg-[#0f191b]/90 border border-white/[0.06] p-4 text-center space-y-1">
                <span className="text-xs text-neutral-300 block">Seller</span>
                <span className="text-xs text-neutral-400 block">Awaiting</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-neutral-400 font-normal">
            Funds are held, not sent. Capture releases to the seller; void returns them to the buyer.
          </p>
        </div>

        {/* Right: Arbiter verdict Card */}
        <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 flex flex-col justify-between min-h-[220px] space-y-6">
          <div className="space-y-3">
            <span className="text-xs text-neutral-400 font-normal">Arbiter verdict · sample</span>

            <div className="space-y-2 pt-1">
              {criteria.map((cr, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 text-xs">
                  <span className="text-neutral-200">{cr.text}</span>
                  <span
                    className={`px-3 py-0.5 rounded-full text-[11px] font-medium ${
                      cr.met
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-300 border border-rose-500/25"
                    }`}
                  >
                    {cr.met ? "Met" : "Not met"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Confidence Slider / Bar */}
          <div className="space-y-2">
            <span className="text-xs text-neutral-400 font-normal block">
              Confidence · below threshold escalates to a human
            </span>
            <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full w-[82%]" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Timeline Card */}
      <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 space-y-4">
        <span className="text-xs text-neutral-400 font-normal">Timeline</span>

        <div className="space-y-3 pt-1">
          {timelineEvents.map((ev, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0 text-xs"
            >
              <span className="font-mono text-neutral-200">{ev.event}</span>
              <span className="px-3 py-1 rounded-full text-[11px] text-neutral-300 bg-white/[0.04] border border-white/[0.08]">
                {ev.source}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
