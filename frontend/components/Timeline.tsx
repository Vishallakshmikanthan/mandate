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
        return { label: "Buyer Agent", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", icon: Bot };
      case "seller_agent":
        return { label: "Seller Agent", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: User };
      case "gateway":
        return { label: "Mandate Gateway", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Cpu };
      case "arbiter":
        return { label: "AI Arbiter", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20", icon: CheckCircle };
      case "paypal":
        return { label: "PayPal Sandbox", color: "bg-sky-500/10 text-sky-400 border-sky-500/20", icon: CreditCard };
      case "human":
        return { label: "Human Principal", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: User };
      default:
        return { label: actor, color: "bg-slate-500/10 text-slate-400 border-slate-500/20", icon: Terminal };
    }
  };

  const getStatusBorder = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "border-emerald-500/40 bg-emerald-950/10";
      case "DANGER":
        return "border-red-500/50 bg-red-950/20";
      case "WARNING":
        return "border-amber-500/40 bg-amber-950/10";
      default:
        return "border-slate-800 bg-slate-900/50";
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col h-full border border-slate-800">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-blue-400" />
          <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider">
            Realtime Interaction Timeline
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {events.length} events
          </span>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded hover:bg-slate-800"
        >
          Clear Stream
        </button>
      </div>

      <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1 max-h-[520px]">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
            <Clock className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs">No active events in stream.</p>
            <p className="text-[11px] text-slate-600">Run a scenario above to observe live agent communication.</p>
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
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-medium text-[11px] ${actorInfo.color}`}
                    >
                      <Icon className="w-3 h-3" />
                      {actorInfo.label}
                    </span>
                    <span className="font-semibold text-slate-200">{evt.step}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <p className="mt-1.5 text-slate-300 text-xs leading-relaxed font-sans">{evt.summary}</p>

                {evt.data && Object.keys(evt.data).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800/60">
                    <button
                      onClick={() => toggleExpand(evt.id)}
                      className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-mono transition-colors"
                    >
                      <span>Payload Inspector</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {isExpanded && (
                      <pre className="mt-2 p-2.5 rounded-lg bg-black/60 text-[10px] text-emerald-400 font-mono overflow-x-auto border border-slate-800">
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
