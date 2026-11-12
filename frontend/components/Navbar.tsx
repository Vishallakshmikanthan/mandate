"use client";

import React from "react";
import { Shield, Radio, CheckCircle, ExternalLink, Zap, Activity } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  streamConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, streamConnected }) => {
  const tabs = [
    { id: "demo", num: "1", label: "Live Scenarios" },
    { id: "builder", num: "2", label: "Mandate Builder" },
    { id: "operations", num: "3", label: "Escrow Engine" },
    { id: "redteam", num: "4", label: "Red-Team Suite" },
    { id: "audit", num: "5", label: "Audit Hash Chain" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#080b10]/85 backdrop-blur-xl border-b border-white/[0.08]">
      {/* Brand & Global Meta Header */}
      <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-1.5 cursor-pointer" onClick={() => setActiveTab("demo")}>
            <span className="text-2xl md:text-3xl font-normal tracking-tightest text-white hover:opacity-90 transition-opacity">
              Mandate<span className="text-neutral-400">.</span>
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[10px] uppercase font-mono tracking-widest px-2.5 py-0.5 rounded-full bg-white/[0.05] text-neutral-300 border border-white/[0.1]">
              The Trust Layer for AI Agents
            </span>
          </div>
        </div>

        {/* Global Status Indicators & Links */}
        <div className="flex items-center gap-3">
          {/* SSE Stream Pulse */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs">
            <span
              className={`w-1.5 h-1.5 rounded-full ${streamConnected ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-amber-400 animate-pulse"
                }`}
            />
            <span className="text-[11px] font-mono tracking-wider text-neutral-300">
              {streamConnected ? "STREAM LIVE" : "CONNECTING"}
            </span>
          </div>

          {/* PayPal Orders v2 Sandbox Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
            <span className="font-bold font-sans text-blue-400">P</span>
            <span className="font-mono text-[11px]">PayPal Orders v2</span>
          </div>

          {/* GitHub Repo */}
          <a
            href="https://github.com/Vishallakshmikanthan/mandate"
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-full border border-white/[0.1] bg-white/[0.03] flex items-center justify-center text-neutral-400 hover:text-white hover:border-white/[0.25] transition-all"
            title="GitHub Repository"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Numbered Navigation Bar (exact match to reference image.png & image copy.png) */}
      <div className="border-t border-white/[0.06] bg-black/30">
        <div className="max-w-[1400px] mx-auto px-6">
          <nav className="flex items-center overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex-1 min-w-[140px] py-3.5 px-4 text-left transition-all ${isActive ? "text-white" : "text-neutral-400 hover:text-neutral-200"
                    }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <span className={`transition-colors ${isActive ? "text-white font-semibold" : "text-neutral-500"}`}>
                      {tab.num}.
                    </span>
                    <span className={`tracking-wide text-xs ${isActive ? "font-medium text-white" : "font-normal"}`}>
                      {tab.label}
                    </span>
                  </div>

                  {/* Active bottom line indicator matching reference */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)]" />
                  )}
                  {!isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-transparent group-hover:bg-white/20 transition-all" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
