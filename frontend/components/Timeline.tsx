"use client";

import React, { useState } from "react";
import { Terminal, ShieldAlert, CheckCircle, Clock, ChevronDown, ChevronUp, Bot, User, Cpu, CreditCard } from "lucide-react";

export interface TimelineEventItem {
  id: string;
  scenario?: string;
  event_type: string;
  actor: string;
  step: string;
  summary: string;
  status: "INFO" | "SUCCESS" | "WARNING" | "DANGER";
  data: Record<string, any>;
  timestamp: string;
}

interface TimelineProps {
  events: TimelineEventItem[];
  onClear: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({ events, onClear }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getActorBadge = (actor: string) => {
    switch (actor.toLowerCase()) {
      case "buyer_agent":
        return { label: "Buyer Agent", color: "bg-white/[0.04] text-neutral-300 border-white/[0.1]", icon: Bot };
      case "seller_agent":
        return { label: "Seller Agent", color: "bg-white/[0.04] text-neutral-300 border-white/[0.1]", icon: User };
      case "gateway":
        return { label: "Mandate Gateway", color: "bg-blue-500/10 text-blue-300 border-blue-500/20", icon: Cpu };
      case "arbiter":
        return { label: "AI Arbiter", color: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20", icon: CheckCircle };
      case "paypal":
        return { label: "PayPal Sandbox", color: "bg-sky-500/10 text-sky-300 border-sky-500/20", icon: CreditCard };
      case "human":
        return { label: "Human Principal", color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20", icon: User };
      default:
        return { label: actor, color: "bg-white/[0.04] text-neutral-400 border-white/[0.08]", icon: Terminal };
    }
  };

  const getStatusBorder = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "border-emerald-500/30 bg-emerald-500/[0.02]";
      case "DANGER":
        return "border-red-500/30 bg-red-500/[0.03]";
      case "WARNING":
        return "border-amber-500/30 bg-amber-500/[0.02]";
      default:
        return "border-white/[0.06] bg-white/[0.01]";
    }
  };

  return (
    <div className="ref-glass-card rounded-2xl p-6 flex flex-col h-full border border-white/[0.08]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
            Realtime Audit Stream
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-neutral-400 font-mono">
            {events.length}
          </span>
        </div>
        <button
          onClick={onClear}
          className="text-[11px] font-mono text-neutral-500 hover:text-neutral-300 transition-colors px-2 py-0.5 rounded hover:bg-white/[0.04] cursor-pointer"
        >
          Clear
        </button>
      </div>

      {/* Stream List */}
      <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1 max-h-[580px] no-scrollbar">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-neutral-500">
            <Clock className="w-6 h-6 mb-2 opacity-30" />
            <p className="text-xs font-mono">Stream listening on /api/stream</p>
            <p className="text-[11px] text-neutral-600 mt-1 max-w-xs">
              Trigger a scenario above to observe live cryptographic validation.
            </p>
          </div>
        ) : (
          events.map((evt) => {
            const actorInfo = getActorBadge(evt.actor);
            const Icon = actorInfo.icon;
            const isExpanded = expandedId === evt.id;

            return (
              <div
                key={evt.id}
                className={`rounded-xl border p-3.5 transition-all text-xs ${getStatusBorder(evt.status)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border font-mono text-[10px] uppercase tracking-wider ${actorInfo.color}`}
                    >
                      <Icon className="w-3 h-3" />
                      {actorInfo.label}
                    </span>
                    <span className="font-mono text-[11px] text-neutral-200">{evt.step}</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono whitespace-nowrap">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <p className="mt-2 text-neutral-300 text-xs leading-relaxed font-sans">{evt.summary}</p>

                {evt.data && Object.keys(evt.data).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/[0.04]">
                    <button
                      onClick={() => toggleExpand(evt.id)}
                      className="flex items-center gap-1 text-[10px] font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <span>Payload {isExpanded ? "[-]" : "[+]"}</span>
                      {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                    </button>
                    {isExpanded && (
                      <pre className="mt-2 p-2.5 rounded-lg bg-black/80 text-[10px] text-neutral-300 font-mono overflow-x-auto border border-white/[0.08] max-h-48">
                        {JSON.stringify(evt.data, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
