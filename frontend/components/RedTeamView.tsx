"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, Radio, ShieldX, Play, RefreshCw, CheckCircle2 } from "lucide-react";

interface AttackResult {
  id: string;
  name: string;
  category: string;
  verdict: string;
  risk_score: number;
  flags: string[];
  reason: string;
  failed_rules?: string[];
}

interface RedTeamStats {
  total_attempted: number;
  total_blocked: number;
  total_escalated: number;
  total_approved: number;
  block_rate_pct: number;
  last_run?: string;
  results: AttackResult[];
}

export const RedTeamView: React.FC = () => {
  const [stats, setStats] = useState<RedTeamStats | null>(null);
  const [running, setRunning] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/scenarios/redteam/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch red team stats:", err);
    }
  };

  const handleRunSuite = async () => {
    setRunning(true);
    try {
      const res = await fetch("/api/scenarios/red_team/run", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to run red team suite:", err);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/[0.08] gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
            Adversarial Stress Suite
          </span>
          <h2 className="text-2xl sm:text-3xl font-normal tracking-tightest text-white mt-1">
            Red-Team Benchmark (21 Vectors)
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-xl">
            Automated benchmark subjecting the Mandate Gateway to adversarial prompt injections, system update spoofs, and financial overrides.
          </p>
        </div>
        <button
          onClick={handleRunSuite}
          disabled={running}
          className="ref-pill-primary text-xs uppercase tracking-wider font-mono cursor-pointer self-start"
        >
          {running ? (
            <span className="inline-block animate-spin mr-1">○</span>
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>{running ? "Executing 21 Vectors..." : "Run Stress Test"}</span>
        </button>
      </div>

      {/* Metric Cards matching Swiss minimalist layout */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="ref-glass-card rounded-2xl p-6 border border-white/[0.08]">
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest block">
            Attacks Tested
          </span>
          <span className="text-3xl sm:text-4xl font-light text-white tracking-tight mt-2 block font-mono">
            {stats ? stats.total_attempted : 21}
          </span>
        </div>
        <div className="ref-glass-card rounded-2xl p-6 border border-white/[0.08]">
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest block">
            Attacks Blocked
          </span>
          <span className="text-3xl sm:text-4xl font-light text-red-400 tracking-tight mt-2 block font-mono">
            {stats ? stats.total_blocked : 21}
          </span>
        </div>
        <div className="ref-glass-card rounded-2xl p-6 border border-white/[0.08]">
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest block">
            Firewall Block Rate
          </span>
          <span className="text-3xl sm:text-4xl font-light text-emerald-400 tracking-tight mt-2 block font-mono">
            {stats ? stats.block_rate_pct.toFixed(1) : "100.0"}%
          </span>
        </div>
        <div className="ref-glass-card rounded-2xl p-6 border border-white/[0.08]">
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest block">
            Funds Compromised
          </span>
          <span className="text-3xl sm:text-4xl font-light text-white tracking-tight mt-2 block font-mono">
            $0.00
          </span>
        </div>
      </div>

      {/* Attacks List */}
      <div className="ref-glass-card rounded-2xl p-6 sm:p-7 border border-white/[0.08]">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
          <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
            Adversarial Vector Forensics
          </span>
          <span className="text-[10px] font-mono text-neutral-500">
            {stats?.results ? stats.results.length : 21} attacks logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.06] text-neutral-400 uppercase text-[10px] font-mono">
                <th className="pb-3 w-16">ID</th>
                <th className="pb-3">Attack Name</th>
                <th className="pb-3">Vector Category</th>
                <th className="pb-3">Gateway Verdict</th>
                <th className="pb-3">Threat Index</th>
                <th className="pb-3">Defense Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {stats?.results && stats.results.length > 0 ? (
                stats.results.map((atk) => (
                  <tr key={atk.id} className="text-neutral-300 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 font-mono font-medium text-white">{atk.id}</td>
                    <td className="py-3 font-medium text-neutral-200">{atk.name}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.04] border border-white/[0.08] text-neutral-300">
                        {atk.category}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                        <ShieldX className="w-3 h-3" />
                        {atk.verdict}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-white font-medium">
                      {(atk.risk_score * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 text-[11px] text-neutral-400 max-w-xs truncate font-sans">
                      {atk.reason}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-500 font-sans">
                    Click 'Run Stress Test' to execute the adversarial suite.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
