"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { demoStore, Agent } from "@/lib/demo-store";
import { formatMoney } from "@/lib/money";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    setAgents(demoStore.getAgents());
    const unsub = demoStore.subscribe(() => setAgents(demoStore.getAgents()));
    return unsub;
  }, []);

  return (
    <div className="space-y-6">
      {/* Title & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs text-neutral-400 font-normal">Autonomous entities</span>
          <h1 className="text-3xl sm:text-4xl font-light text-white tracking-tight">
            Agent registry
          </h1>
          <p className="text-xs text-neutral-400 font-normal">
            Autonomous buyer and seller agents enrolled under cryptographic spending policies.
          </p>
        </div>

        <div>
          <Link
            href="/app/agents/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-100 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register agent</span>
          </Link>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <Link
            key={agent.id}
            href={`/app/agents/${agent.id}`}
            className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.16] p-6 flex flex-col justify-between space-y-4 transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-[11px] font-mono text-neutral-300 bg-white/[0.04] border border-white/[0.08]">
                  {agent.type}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <h3 className="text-base font-semibold text-white">{agent.name}</h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans">{agent.description}</p>
            </div>

            <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-neutral-400">Total Spend</span>
              <span className="font-mono text-white font-medium">{formatMoney(agent.total_spent_minor)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
