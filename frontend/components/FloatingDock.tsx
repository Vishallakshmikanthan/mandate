"use client";

import React, { useState } from "react";
import { Menu, X, Play, ShieldAlert, CheckCircle, Scale, Shield, Radio, ArrowUp } from "lucide-react";

interface FloatingDockProps {
  onRunScenario: (key: string) => void;
  onSelectTab: (tab: string) => void;
  activeTab: string;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({
  onRunScenario,
  onSelectTab,
  activeTab,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* Quick Launch Drawer Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4 sm:p-6 transition-all">
          <div className="ref-glass-card rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-white/[0.14] shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-normal tracking-tightest text-white">Mandate.</span>
                <span className="text-[10px] font-mono uppercase text-neutral-400">Quick Command Menu</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full border border-white/[0.1] flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">
                  Run Live Scenarios
                </span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => {
                      onRunScenario("happy_path");
                      setIsOpen(false);
                    }}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-left hover:bg-white/[0.08] transition-all cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Happy Path</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1">Autonomous $120 flow</p>
                  </button>

                  <button
                    onClick={() => {
                      onRunScenario("injection_attack");
                      setIsOpen(false);
                    }}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-left hover:bg-white/[0.08] transition-all cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Injection Attack</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1">$900 malicious override</p>
                  </button>

                  <button
                    onClick={() => {
                      onRunScenario("bad_delivery_dispute");
                      setIsOpen(false);
                    }}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-left hover:bg-white/[0.08] transition-all cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5" />
                      <span>Delivery Dispute</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1">Arbiter rejection & refund</p>
                  </button>

                  <button
                    onClick={() => {
                      onSelectTab("redteam");
                      setIsOpen(false);
                    }}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-left hover:bg-white/[0.08] transition-all cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5" />
                      <span>Red-Team Suite</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1">21 adversarial attacks</p>
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">
                  Jump to Protocol Module
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    onClick={() => {
                      onSelectTab("builder");
                      setIsOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.1] text-xs text-neutral-300 hover:text-white"
                  >
                    Mandate Builder
                  </button>
                  <button
                    onClick={() => {
                      onSelectTab("operations");
                      setIsOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.1] text-xs text-neutral-300 hover:text-white"
                  >
                    Escrow Engine
                  </button>
                  <button
                    onClick={() => {
                      onSelectTab("audit");
                      setIsOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.1] text-xs text-neutral-300 hover:text-white"
                  >
                    Audit Hash Chain
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Pill Dock at bottom center */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 pointer-events-auto">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="ref-floating-dock px-5 py-2 flex items-center gap-3 text-white text-xs font-medium cursor-pointer transition-all hover:scale-105"
        >
          <span className="tracking-tightest font-normal text-sm">Mandate<span className="text-neutral-400">.</span></span>
          <div className="w-[1px] h-3 bg-white/20" />
          <span className="font-mono text-sm leading-none">=</span>
        </button>
      </div>

      {/* Floating Filter Pills at bottom right */}
      <div className="fixed bottom-6 right-6 z-40 hidden lg:flex items-center gap-2 pointer-events-auto">
        <span className="ref-tag-pill">AI Agents</span>
        <span className="ref-tag-pill">PayPal Escrow</span>
        <button
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="w-8 h-8 rounded-full border border-white/[0.14] bg-black/60 backdrop-blur-md flex items-center justify-center text-neutral-300 hover:text-white hover:border-white/40 transition-all cursor-pointer"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
      </div>
    </>
  );
};

