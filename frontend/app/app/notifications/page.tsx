"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import { Bell, AlertTriangle, ShieldCheck, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { fetchAuditLogs, subscribeToStream } from "@/lib/api";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      const logs = await fetchAuditLogs();
      const derived = (logs || []).slice(0, 20).map((log: any, idx: number) => {
        const isBlocked = log.event_type?.includes("BLOCK");
        const isEscalated = log.event_type?.includes("ESCALAT") || log.event_type?.includes("HUMAN");
        const isSuccess = log.event_type?.includes("RELEASE") || log.event_type?.includes("APPROV");
        return {
          id: log.id || String(idx),
          type: isBlocked ? "blocked" : isEscalated ? "escalated" : isSuccess ? "success" : "info",
          title: `${log.actor}: ${log.event_type}`,
          desc: log.payload?.reason || log.payload?.summary || `Audit record sequenced at block #${log.sequence_number || idx + 1}.`,
          time: log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "Recent",
          read: false,
        };
      });
      setNotifications(derived);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const unsub = subscribeToStream(() => {
      loadNotifications();
    });
    return unsub;
  }, []);

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
            disabled={notifications.length === 0}
            className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-mono text-neutral-300 disabled:opacity-50"
          >
            Mark All Read
          </button>
          <button
            onClick={clearAll}
            disabled={notifications.length === 0}
            className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 disabled:opacity-50"
            title="Clear all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <GlassCard className="p-8 text-center text-xs font-mono text-neutral-400">
            Loading activity notifications...
          </GlassCard>
        ) : notifications.length === 0 ? (
          <GlassCard className="p-8 text-center text-xs font-mono text-neutral-400">
            No recent activity alerts. Gateway decisions and escrow transitions will appear here.
          </GlassCard>
        ) : (
          notifications.map((n) => (
            <GlassCard
              key={n.id}
              className={`p-4 flex items-start gap-4 transition-all ${
                n.read ? "opacity-60" : "border-white/[0.15]"
              }`}
            >
              <div
                className={`p-2 rounded-xl mt-0.5 ${
                  n.type === "blocked"
                    ? "bg-rose-500/10 text-rose-400"
                    : n.type === "escalated"
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-emerald-500/10 text-emerald-400"
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

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-white font-mono">{n.title}</h4>
                  <span className="text-[10px] text-neutral-500 font-mono">{n.time}</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">{n.desc}</p>
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
}
