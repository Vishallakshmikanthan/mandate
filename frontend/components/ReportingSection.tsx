"use client";

import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Play, ShieldAlert, CheckCircle, ShieldX, Terminal, Scale } from "lucide-react";

interface ReportingSectionProps {
  onRunScenario: (key: string) => void;
  isRunning: boolean;
  activeScenario: string | null;
  decision: string | null;
  riskScore: number;
}

export const ReportingSection: React.FC<ReportingSectionProps> = ({
  onRunScenario,
  isRunning,
  activeScenario,
  decision,
  riskScore,
}) => {
  const [slideIndex, setSlideIndex] = useState<number>(0);

  const slides = [
    {
      num: "01",
      scenarioKey: "happy_path",
      label: "Autonomous execution",
      headline: "The facts exist. They just do not arrive together when the decision is made.",
      calloutTitle: "Stop running blind.",
      calloutBody: "When facts live apart, strategy turns into opinion. Mandate unites agent negotiation, policy validation, and PayPal escrow into one operational view.",
      btnText: "Test the process",
      secondaryText: "Inspect Escrow Machine",
      badge: "Scenario A: Happy Path",
      statusColor: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
      amount: "$120.00",
      stat: "Authorized & Released",
    },
    {
      num: "02",
      scenarioKey: "injection_attack",
      label: "Blind decisions & injection",
      headline: "A prompt injection must never touch the treasury. Zero tolerance is absolute.",
      calloutTitle: "Deterministic firewall.",
      calloutBody: "An attacker attempts an adversarial prompt injection for $900. Deterministic policy aborts the payment intent before any PayPal API credentials are read.",
      btnText: "Run attack demo",
      secondaryText: "Inspect Adversarial Prompt",
      badge: "Scenario B: Prompt Injection",
      statusColor: "text-red-400 border-red-500/30 bg-red-500/10",
      amount: "$900.00",
      stat: "BLOCKED COLD",
    },
    {
      num: "03",
      scenarioKey: "bad_delivery_dispute",
      label: "Dispute & arbitration",
      headline: "Delivered work is not completed work until verified against the specification.",
      calloutTitle: "Arbiter release.",
      calloutBody: "When a seller submits blurry or corrupt assets, the AI Arbiter fails the acceptance spec. PayPal authorization is voided and funds return to the buyer.",
      btnText: "Run dispute demo",
      secondaryText: "Inspect Arbiter Verdict",
      badge: "Scenario C: Bad Delivery",
      statusColor: "text-amber-400 border-amber-500/30 bg-amber-500/10",
      amount: "$120.00",
      stat: "VOIDED / RESTORED",
    },
    {
      num: "04",
      scenarioKey: "redteam",
      label: "Benchmark & stress test",
      headline: "21 adversarial vectors tested live. 100% deterministic block rate.",
      calloutTitle: "Cryptographic certainty.",
      calloutBody: "From system prompt resets and encoded payloads to urgency overrides, the Mandate Gateway ensures autonomous agents never drift beyond human bounds.",
      btnText: "Run Red-Team Suite",
      secondaryText: "View Full Benchmark",
      badge: "Scenario D: Red-Team",
      statusColor: "text-blue-400 border-blue-500/30 bg-blue-500/10",
      amount: "21/21",
      stat: "100% Block Rate",
    },
  ];

  const currentSlide = slides[slideIndex];

  const handlePrev = () => {
    setSlideIndex((prev) => (prev > 0 ? prev - 1 : slides.length - 1));
  };

  const handleNext = () => {
    setSlideIndex((prev) => (prev < slides.length - 1 ? prev + 1 : 0));
  };

  return (
    <section className="relative w-full border-b border-white/[0.08] bg-[#070a0e] py-16 px-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-white/[0.08] gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400">
              Interactive Scenarios & Visual Proof
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tightest text-white mt-2">
              Dashboards & reporting
            </h2>
          </div>

          {/* Slider controls: Circular arrows matching image copy 3.png */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-neutral-400 mr-2">
              {currentSlide.num} / 04
            </span>
            <button
              onClick={handlePrev}
              aria-label="Previous slide"
              className="ref-circle-btn"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              aria-label="Next slide"
              className="ref-circle-btn"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Carousel Content Split Grid (exact match to image copy 3.png) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Numbered Subhead, Big Quote, and Visual Card (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full border ${currentSlide.statusColor}`}>
                {currentSlide.badge}
              </span>
              <span className="text-xs font-mono text-neutral-400">
                {currentSlide.num} {currentSlide.label}
              </span>
            </div>

            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-white leading-tight">
              {currentSlide.headline}
            </h3>

            {/* Slider Progress Bar */}
            <div className="w-full h-[1px] bg-white/[0.08] relative my-4">
              <div
                className="absolute top-0 left-0 h-[2px] bg-white transition-all duration-300"
                style={{ width: `${((slideIndex + 1) / slides.length) * 100}%` }}
              />
            </div>

            {/* Visual Preview Tile */}
            <div className="ref-glass-card rounded-2xl p-6 relative overflow-hidden border border-white/[0.08]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                  Operational Snapshot
                </span>
                <span className="text-xs font-mono text-white font-medium">
                  {currentSlide.amount}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="text-[10px] text-neutral-500 font-mono">GATEWAY</div>
                  <div className="text-white font-mono font-medium mt-1">
                    {decision || (currentSlide.scenarioKey === "injection_attack" ? "BLOCKED" : "APPROVED")}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="text-[10px] text-neutral-500 font-mono">STATUS</div>
                  <div className="text-white font-mono font-medium mt-1">
                    {currentSlide.stat}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="text-[10px] text-neutral-500 font-mono">ESCROW</div>
                  <div className="text-white font-mono font-medium mt-1">
                    PayPal Orders v2
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="text-[10px] text-neutral-500 font-mono">AUDIT HASH</div>
                  <div className="text-white font-mono font-medium mt-1">
                    SHA-256 Valid
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Callout, Philosophy & Actions (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="ref-glass-card rounded-2xl p-7 border border-white/[0.08] space-y-4">
              <span className="text-xs font-mono uppercase tracking-widest text-neutral-400">
                {currentSlide.calloutTitle}
              </span>

              <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-light">
                {currentSlide.calloutBody}
              </p>

              <div className="pt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => onRunScenario(currentSlide.scenarioKey)}
                  disabled={isRunning}
                  className="ref-pill-primary group cursor-pointer"
                >
                  {isRunning && activeScenario === currentSlide.scenarioKey ? (
                    <span className="inline-block animate-spin mr-1">○</span>
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>{currentSlide.btnText}</span>
                </button>

                <button
                  onClick={() => {
                    const el = document.getElementById("operations-deck");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="ref-pill-ghost text-neutral-300 hover:text-white cursor-pointer"
                >
                  <span>{currentSlide.secondaryText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

