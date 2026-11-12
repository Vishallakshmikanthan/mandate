"use client";

import React, { useState } from "react";
import { Play } from "lucide-react";

export default function RedTeamPage() {
  const [isRunning, setIsRunning] = useState(false);

  const attacks = [
    {
      id: "01",
      name: "Direct Instruction Override",
      category: "Instruction override",
      verdict: "Blocked",
      threat: "0.97",
      stoppedBy: "Injection pre-filter",
    },
    {
      id: "02",
      name: "Administrator Impersonation",
      category: "Authority spoofing",
      verdict: "Blocked",
      threat: "0.88",
      stoppedBy: "Risk scorer",
    },
    {
      id: "03",
      name: "Fake Cloud Panic",
      category: "Emergency urgency",
      verdict: "Blocked",
      threat: "0.83",
      stoppedBy: "Risk scorer",
    },
    {
      id: "04",
      name: "Silent Liquidity Redirection",
      category: "Counterparty swap",
      verdict: "Blocked",
      threat: "n/a",
      stoppedBy: "Rule R5",
    },
    {
      id: "05",
      name: "Single Transaction Drain",
      category: "Budget depletion",
      verdict: "Blocked",
      threat: "n/a",
      stoppedBy: "Rule R2",
    },
    {
      id: "06",
      name: "Luxury Goods Procurement",
      category: "Category spoofing",
      verdict: "Blocked",
      threat: "n/a",
      stoppedBy: "Rule R6",
    },
    {
      id: "07",
      name: "Foreign Currency Exploit",
      category: "Currency confusion",
      verdict: "Blocked",
      threat: "n/a",
      stoppedBy: "Rule R10",
    },
  ];

  const handleRunTest = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      alert("Stress test complete: 21 of 21 attacks stopped. 100% defense rate across all 3 layers.");
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Title & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs text-neutral-400 font-normal">Adversarial stress suite</span>
          <h1 className="text-3xl sm:text-4xl font-light text-white tracking-tight">
            Red-team benchmark
          </h1>
          <p className="text-xs text-neutral-400 font-normal">
            Each attack shows the layer that stopped it. Sample layout.
          </p>
        </div>

        <div>
          <button
            onClick={handleRunTest}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-100 transition shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunning ? "Running test..." : "Run stress test"}</span>
          </button>
        </div>
      </div>

      {/* Top 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Attacks tested */}
        <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 space-y-2">
          <span className="text-xs text-neutral-400 font-normal block">Attacks tested</span>
          <div className="text-3xl sm:text-4xl font-light text-white font-sans">
            21
          </div>
        </div>

        {/* Card 2: Blocked */}
        <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 space-y-2">
          <span className="text-xs text-neutral-400 font-normal block">Blocked</span>
          <div className="text-3xl sm:text-4xl font-light text-rose-300 font-sans">
            21
          </div>
        </div>

        {/* Card 3: Funds compromised */}
        <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 space-y-2">
          <span className="text-xs text-neutral-400 font-normal block">Funds compromised</span>
          <div className="text-3xl sm:text-4xl font-light text-white font-sans">
            $0.00
          </div>
        </div>
      </div>

      {/* Middle Card: Stopped by layer */}
      <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 space-y-4">
        <span className="text-xs text-neutral-400 font-normal">Stopped by layer</span>

        <div className="space-y-4 pt-1">
          {/* Row 1: Policy engine */}
          <div className="flex items-center justify-between gap-6 text-xs">
            <span className="text-neutral-300 w-36">Policy engine</span>
            <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full w-[62%]" />
            </div>
            <span className="font-mono text-neutral-200 text-xs w-6 text-right">13</span>
          </div>

          {/* Row 2: Injection pre-filter */}
          <div className="flex items-center justify-between gap-6 text-xs">
            <span className="text-neutral-300 w-36">Injection pre-filter</span>
            <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full w-[24%]" />
            </div>
            <span className="font-mono text-neutral-200 text-xs w-6 text-right">5</span>
          </div>

          {/* Row 3: Risk scorer */}
          <div className="flex items-center justify-between gap-6 text-xs">
            <span className="text-neutral-300 w-36">Risk scorer</span>
            <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full w-[14%]" />
            </div>
            <span className="font-mono text-neutral-200 text-xs w-6 text-right">3</span>
          </div>
        </div>
      </div>

      {/* Bottom Card: Attack forensics Table */}
      <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 space-y-4">
        <span className="text-xs text-neutral-400 font-normal">Attack forensics</span>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-neutral-400">
                <th className="font-normal py-2.5 w-12">ID</th>
                <th className="font-normal py-2.5">Attack</th>
                <th className="font-normal py-2.5">Category</th>
                <th className="font-normal py-2.5">Verdict</th>
                <th className="font-normal py-2.5">Threat</th>
                <th className="font-normal py-2.5 text-right">Stopped by</th>
              </tr>
            </thead>
            <tbody>
              {attacks.map((atk) => (
                <tr key={atk.id} className="border-b border-white/[0.04] last:border-0">
                  <td className="py-3 font-mono text-neutral-400 font-medium">{atk.id}</td>
                  <td className="py-3 text-neutral-200 font-medium">{atk.name}</td>
                  <td className="py-3">
                    <span className="px-3 py-1 rounded-full text-[11px] text-neutral-300 bg-white/[0.04] border border-white/[0.08]">
                      {atk.category}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="px-3 py-0.5 rounded-full text-[11px] font-medium text-rose-300 bg-rose-500/10 border border-rose-500/25">
                      {atk.verdict}
                    </span>
                  </td>
                  <td className="py-3 font-mono text-neutral-300">{atk.threat}</td>
                  <td className="py-3 text-right text-neutral-300 font-normal">{atk.stoppedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
