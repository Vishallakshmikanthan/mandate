"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Play, ArrowRight, ShieldCheck, ShieldAlert, Scale, Zap, CheckCircle2, Lock, FileCode, Check } from "lucide-react";

interface HeroSectionProps {
  onRunScenario: (key: string) => void;
  isRunning: boolean;
  activeScenario: string | null;
  decision: string | null;
  amountMinor: number;
  escrowState: string | null;
  onSelectTab: (tab: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onRunScenario,
  isRunning,
  activeScenario,
  decision,
  amountMinor,
  escrowState,
  onSelectTab,
}) => {
  const [activePillar, setActivePillar] = useState<number>(0);
  const [activeSubTab, setActiveSubTab] = useState<string>("informed");

  const pillars = [
    {
      id: "policy",
      eyebrow: "No tech theatre",
      title: "A screen is not control.",
      desc: "Deterministic rule gates evaluate velocity, merchant categories, and budgets before any API calls are dispatched.",
      scenarioKey: "injection_attack",
      scenarioName: "Attack Demo",
      tag: "Deterministic Firewall",
    },
    {
      id: "reality",
      eyebrow: "Built for reality",
      title: "Design for the bad day.",
      desc: "Funds are locked in neutral PayPal Orders v2 escrow authorization. The seller is not paid until the work passes arbiter inspection.",
      scenarioKey: "bad_delivery_dispute",
      scenarioName: "Dispute Demo",
      tag: "AI Escrow Hold",
    },
    {
      id: "business",
      eyebrow: "Business-first",
      title: "Work gone is value.",
      desc: "Autonomous negotiation for $120. PayPal holds funds, SVGs are delivered and arbitrated, and capture completes without manual toil.",
      scenarioKey: "happy_path",
      scenarioName: "Happy Path",
      tag: "Autonomous Settlement",
    },
    {
      id: "benchmark",
      eyebrow: "Zero-loss guarantee",
      title: "Your benchmark.",
      desc: "21 live adversarial prompt injection vectors evaluated against cryptographic policy bounds with 100% safety.",
      scenarioKey: "redteam",
      scenarioName: "Red-Team Suite",
      tag: "Red-Team Benchmark",
    },
  ];

  const currentPillar = pillars[activePillar];

  const subTabs = [
    { id: "informed", label: "Informed", pillarIndex: 0 },
    { id: "decisions", label: "Clear decisions", pillarIndex: 1 },
    { id: "view", label: "One operating view", pillarIndex: 2 },
    { id: "benchmark", label: "Your benchmark", pillarIndex: 3 },
  ];

  const handleSubTabClick = (tabId: string, idx: number) => {
    setActiveSubTab(tabId);
    setActivePillar(idx);
  };

  return (
    <section className="relative w-full border-b border-white/[0.08] overflow-hidden bg-[#070a0f]">
      {/* Background Layer: Authentic Architectural Fluted Glass */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25 mix-blend-screen filter blur-[1px] scale-105"
          style={{ backgroundImage: `url('/assets/ref-hero.png')` }}
        />
        {/* Procedural vertical glass ribs */}
        <div className="absolute inset-0 fluted-glass-ribs opacity-70" />
        {/* Soft chromatic / ambient vignette */}
        <div className="absolute inset-0 ambient-lighting opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#070a0f]/60 to-[#070a0f]" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 pt-12 pb-16">
        {/* Upper Hero Grid: Editorial Statement & Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
          {/* Left Column: Big Brand Statement & Call to Action (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.1] text-xs font-mono text-neutral-300">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>PayPal & AI Trust Layer</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.75rem] font-normal tracking-tightest text-white leading-[1.08] max-w-2xl">
              A packed calendar does not mean the operation works. It may mean the systems do not.
            </h1>

            <p className="text-base sm:text-lg text-neutral-400 font-light max-w-xl leading-relaxed">
              Agents can spend money. <span className="text-white font-normal">Mandate</span> makes sure they cannot spend it wrongly. Deterministic policy gates, adversarial prompt shielding, and AI-arbitrated PayPal escrow.
            </p>

            {/* Action Buttons: Solid White Pill & Ghost Link (exact match to reference) */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => onRunScenario(currentPillar.scenarioKey === "redteam" ? "happy_path" : currentPillar.scenarioKey)}
                disabled={isRunning}
                className="ref-pill-primary group cursor-pointer"
              >
                {isRunning ? (
                  <span className="inline-block animate-spin mr-1">○</span>
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>Test your process</span>
              </button>

              <button
                onClick={() => onSelectTab("operations")}
                className="ref-pill-ghost group text-neutral-300 hover:text-white cursor-pointer"
              >
                <span>Lower your costs</span>
                <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Right Column: Signature White Floating Feature Card (5 cols) (exact match to image copy.png) */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="ref-white-card p-6 sm:p-7 max-w-md w-full relative">
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {/* Visual Tiles Left (Architectural Office & Flow) */}
                <div className="shrink-0 flex flex-col gap-2 w-full sm:w-28">
                  <div className="h-16 w-full rounded-xl bg-neutral-900 overflow-hidden relative border border-neutral-200">
                    <div
                      className="absolute inset-0 bg-cover bg-center filter grayscale opacity-90"
                      style={{ backgroundImage: `url('/assets/ref-card.png')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-1.5">
                      <span className="text-[9px] font-mono font-bold text-white uppercase tracking-wider">
                        {currentPillar.tag}
                      </span>
                    </div>
                  </div>
                  <div className="h-12 w-full rounded-xl bg-neutral-100 flex items-center justify-center border border-neutral-200 text-neutral-600 text-[10px] font-mono">
                    <span>${(amountMinor / 100).toFixed(2)} USD</span>
                  </div>
                </div>

                {/* Content Right */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl sm:text-2xl font-medium tracking-tight text-neutral-900">
                      {activeSubTab === "informed" && "Informed"}
                      {activeSubTab === "decisions" && "Clear decisions"}
                      {activeSubTab === "view" && "One operating view"}
                      {activeSubTab === "benchmark" && "Your benchmark"}
                    </h3>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-semibold border border-neutral-200">
                      Active
                    </span>
                  </div>

                  <p className="text-xs sm:text-[13px] text-neutral-600 leading-relaxed">
                    {activeSubTab === "informed" &&
                      "The team sees what is changing before it becomes another urgent update. Deterministic firewall evaluates all bounds."}
                    {activeSubTab === "decisions" &&
                      "PayPal hold locks authorization. Delivered assets must pass multi-modal arbitration before capture is signed."}
                    {activeSubTab === "view" &&
                      "Unified ledger combining buyer agent intent, policy engine checks, and PayPal Orders v2 settlement in one view."}
                    {activeSubTab === "benchmark" &&
                      "21 distinct adversarial attacks benchmarked against deterministic policy with a proven 100% block rate."}
                  </p>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => onRunScenario(currentPillar.scenarioKey === "redteam" ? "happy_path" : currentPillar.scenarioKey)}
                      disabled={isRunning}
                      className="text-xs font-semibold text-neutral-900 hover:text-black flex items-center gap-1 cursor-pointer"
                    >
                      <span>Run {currentPillar.scenarioName}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lower Architectural Grid Deck (Exact match to reference image.png & image copy.png) */}
        <div className="border-t border-white/[0.08] pt-8">
          {/* Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-white/[0.08]">
            {pillars.map((pillar, idx) => {
              const isSelected = activePillar === idx;
              return (
                <div
                  key={pillar.id}
                  onClick={() => {
                    setActivePillar(idx);
                    setActiveSubTab(subTabs[idx].id);
                  }}
                  className={`group cursor-pointer transition-all duration-300 lg:px-6 first:lg:pl-0 last:lg:pr-0 ${
                    isSelected ? "opacity-100" : "opacity-60 hover:opacity-90"
                  }`}
                >
                  <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 mb-2 flex items-center gap-1.5">
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    <span>{pillar.eyebrow}</span>
                  </div>

                  <h4 className="text-lg sm:text-xl font-light tracking-tight text-white group-hover:text-neutral-100 transition-colors">
                    {pillar.title}
                  </h4>

                  <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                    {pillar.desc}
                  </p>

                  <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-neutral-300 group-hover:text-white transition-colors">
                    <span>{pillar.scenarioName}</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sub-bar Navigation (exact match to image copy.png: · Informed | Clear decisions | One operating view | Your benchmark) */}
          <div className="mt-12 pt-4 border-t border-white/[0.06] flex items-center justify-between flex-wrap gap-4 text-xs text-neutral-400 font-normal">
            <div className="flex items-center gap-6 sm:gap-10 overflow-x-auto no-scrollbar py-1">
              {subTabs.map((tab, idx) => {
                const isActive = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleSubTabClick(tab.id, idx)}
                    className={`transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      isActive ? "text-white font-medium" : "text-neutral-400 hover:text-neutral-200"
                    }`}
                  >
                    {isActive ? <span>•</span> : <span className="opacity-0">•</span>}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-neutral-500">MANDATE PROTOCOL v1.0</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

