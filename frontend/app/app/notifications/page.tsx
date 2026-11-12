"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import { Bell, AlertTriangle, ShieldCheck, CheckCircle2, Clock, Trash2 } from "lucide-react";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([
    {
      id: "1",
      type: "blocked",
      title: "Adversarial Injection Halted",
      desc: "$900.00 unauthorized transfer attempt blocked by Policy Rule R2.",
      time: "10 mins ago",
      read: false,
    },
    {
      id: "2",
      type: "escalated",
      title: "Human Escalation Threshold Exceeded",
      desc: "Intent pi_9823 for $180.00 requires human review (above $150.00 threshold).",
      time: "25 mins ago",
      read: false,
    },
    {
      id: "3",
      type: "success",
      title: "AI Arbiter Released Escrow Hold",
      desc: "Contract esc_7702 released $200.00 to seller_agent_acme after all criteria passed.",
      time: "2 hours ago",
      read: true,
    },
  ]);

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl">
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
            Activity Alerts
          </span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-1">
            Notifications Center
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={markAllRead}
            className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-mono text-neutral-300"
          >
            Mark All Read
          </button>
          <button
            onClick={clearAll}
            className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-neutral-400 hover:text-white"
            title="Clear all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <GlassCard className="p-8 text-center text-xs font-mono text-neutral-400">
            No notifications in your inbox.
          </GlassCard>
        ) : (
          notifications.map((n) => (
            <GlassCard
              key={n.id}
              className={`p-4 flex items-start gap-3.5 transition-all ${
                !n.read ? "border-cyan-500/30 bg-cyan-950/10" : ""
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  n.type === "blocked"
                    ? "bg-rose-500/20 text-rose-400"
                    : n.type === "escalated"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-emerald-500/20 text-emerald-400"
                }`}
              >
                {n.type === "blocked" ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : n.type === "escalated" ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white truncate">{n.title}</h4>
                  <span className="text-[10px] font-mono text-neutral-500">{n.time}</span>
                </div>
                <p className="text-xs text-neutral-300 mt-1 leading-relaxed">{n.desc}</p>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
}

