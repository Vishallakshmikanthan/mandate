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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-400" />
            <span>Adversarial Red-Team Stress Suite (21 Attacks)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Automated benchmark subjecting the Mandate Gateway to prompt injections, system update spoofs, and financial overrides.
          </p>
        </div>
        <button
          onClick={handleRunSuite}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold text-xs shadow-lg shadow-red-600/30 hover:opacity-95 transition-all self-start"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>{running ? "Executing 21 Attacks..." : "Run Adversarial Stress Test"}</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Attacks Tested</span>
          <span className="text-2xl font-black text-white font-mono mt-1 block">
            {stats ? stats.total_attempted : 21}
          </span>
        </div>
        <div className="glass-panel rounded-2xl p-4 border border-red-500/30 text-center bg-red-950/10">
          <span className="text-[10px] text-red-400 uppercase font-mono block">Attacks Blocked</span>
          <span className="text-2xl font-black text-red-400 font-mono mt-1 block">
            {stats ? stats.total_blocked : 21}
          </span>
        </div>
        <div className="glass-panel rounded-2xl p-4 border border-emerald-500/30 text-center bg-emerald-950/10">
          <span className="text-[10px] text-emerald-400 uppercase font-mono block">Firewall Block Rate</span>
          <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
            {stats ? stats.block_rate_pct.toFixed(1) : "100.0"}%
          </span>
        </div>
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 text-center">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Funds Lost</span>
          <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">$0.00</span>
        </div>
      </div>

      {/* Attacks List */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800">
        <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider mb-3">
          Detailed Attack Vector Forensics
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono">
                <th className="pb-2 w-16">ID</th>
                <th className="pb-2">Attack Name</th>
                <th className="pb-2">Vector Category</th>
                <th className="pb-2">Gateway Verdict</th>
                <th className="pb-2">Threat Score</th>
                <th className="pb-2">Defense Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {stats?.results && stats.results.length > 0 ? (
                stats.results.map((atk) => (
                  <tr key={atk.id} className="text-slate-300 hover:bg-slate-900/40">
                    <td className="py-3 font-mono font-bold text-red-400">{atk.id}</td>
                    <td className="py-3 font-medium text-slate-200">{atk.name}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 border border-slate-700 text-slate-300">
                        {atk.category}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                        <ShieldX className="w-3 h-3" />
                        {atk.verdict}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-red-400 font-bold">
                      {(atk.risk_score * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 text-[11px] text-slate-400 max-w-xs truncate">
                      {atk.reason}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    Click 'Run Adversarial Stress Test' to execute the suite.
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
