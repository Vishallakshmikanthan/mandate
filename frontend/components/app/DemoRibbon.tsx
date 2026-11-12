"use client";

import React, { useState } from "react";
import { Sparkles, RotateCcw, Check, ExternalLink } from "lucide-react";
import { demoStore } from "@/lib/demo-store";
import Link from "next/link";

export const DemoRibbon: React.FC = () => {
  const [resetting, setResetting] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const handleReset = () => {
    setResetting(true);
    demoStore.resetAll();
    setTimeout(() => {
      setResetting(false);
      setShowDone(true);
      setTimeout(() => setShowDone(false), 2000);
      window.location.reload();
    }, 400);
  };

  return (
    <div className="bg-gradient-to-r from-indigo-950/80 via-purple-950/80 to-slate-950/80 border-b border-indigo-500/20 text-xs px-4 py-1.5 flex items-center justify-between z-40 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
        </span>
        <span className="font-mono text-[11px] font-semibold text-indigo-200 uppercase tracking-wider">
          Demo Workspace · PayPal Orders v2 Sandbox
        </span>
        <span className="hidden md:inline text-neutral-400 text-[11px]">
          — Pre-seeded with agents, mandates, escrow holds & 21 red-team attacks
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/app/scenarios"
          className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-cyan-300 hover:text-cyan-200 transition-colors px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20"
        >
          <Sparkles className="w-3 h-3" />
          Run Scenario
        </Link>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-300 hover:text-white px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] transition-all"
          title="Reset to default demo data"
        >
          {showDone ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Reset Done</span>
            </>
          ) : (
            <>
              <RotateCcw className={`w-3 h-3 ${resetting ? "animate-spin" : ""}`} />
              <span>{resetting ? "Resetting..." : "Reset Demo Data"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

