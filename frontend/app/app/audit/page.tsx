"use client";

import React, { useState, useEffect } from "react";
import { Check, ShieldCheck, ShieldAlert, RotateCw } from "lucide-react";
import { fetchAuditLogs, verifyAudit, subscribeToStream } from "@/lib/api";
import { AuditRecord } from "@/lib/demo-store";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditRecord[] | any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    total_events: number;
    head_hash: string;
    message: string;
  } | null>(null);

  const loadLogs = async () => {
    try {
      const data = await fetchAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    const unsub = subscribeToStream(() => {
      loadLogs();
    });
    return unsub;
  }, []);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await verifyAudit();
      setVerificationResult(res);
    } catch (err: any) {
      setVerificationResult({
        valid: false,
        total_events: logs.length,
        head_hash: "none",
        message: err.message,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs text-neutral-400 font-normal">Cryptographic integrity</span>
          <h1 className="text-3xl sm:text-4xl font-light text-white tracking-tight">
            Audit log
          </h1>
          <p className="text-xs text-neutral-400 font-normal">
            Append-only, SHA-256 hash-chained tamper-evident record of all gateway events.
          </p>
        </div>

        {/* Action Button on Right */}
        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 rounded-full text-xs text-neutral-300 bg-white/[0.04] border border-white/[0.08]">
            {logs.length} blocks
          </span>

          <button
            onClick={handleVerify}
            disabled={isVerifying || logs.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-100 transition shadow-sm disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying chain...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Verify chain</span>
              </>
            )}
          </button>
        </div>
      </div>

      {verificationResult && (
        <div
          className={`p-4 rounded-2xl border text-xs font-mono flex items-center justify-between gap-4 ${
            verificationResult.valid
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-3">
            {verificationResult.valid ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <div>
              <p className="font-semibold text-white">
                {verificationResult.valid ? "Cryptographic Chain Verified" : "Chain Integrity Error"}
              </p>
              <p className="text-[11px] text-neutral-300">
                {verificationResult.message} · Head: {verificationResult.head_hash?.slice(0, 20)}...
              </p>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded bg-black/40">
            {verificationResult.total_events} events checked
          </span>
        </div>
      )}

      {/* Chain Blocks Visualization */}
      <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 space-y-4">
        <span className="text-xs text-neutral-400 font-normal">Recent chain blocks</span>

        {loading ? (
          <div className="py-8 text-center text-xs text-neutral-400 font-mono">
            Loading audit chain...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400 font-mono">
            No audit records found. Every decision, mandate enrollment, and escrow state transition creates an immutable chained block.
          </div>
        ) : (
          <div className="flex items-center gap-3 overflow-x-auto py-2">
            {logs.slice(0, 8).map((b: any, idx: number) => {
              const seq = b.sequence_number ?? (logs.length - idx);
              return (
                <div key={b.id || idx} className="flex items-center gap-3 shrink-0">
                  <div className="rounded-xl bg-[#0f191b]/90 border border-white/[0.08] p-3 w-28 text-center space-y-1">
                    <span className="text-[10px] text-neutral-400 block font-mono">BLOCK #{seq}</span>
                    <span className="text-xs text-white font-mono font-medium truncate block">
                      {b.node_hash ? b.node_hash.slice(0, 8) : "GENESIS"}
                    </span>
                    <span className="text-[10px] text-emerald-400 block">Chained ✓</span>
                  </div>
                  {idx < Math.min(logs.length - 1, 7) && (
                    <span className="text-neutral-500 font-mono text-xs">←</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 space-y-4">
        <span className="text-xs text-neutral-400 font-normal">Chained event ledger</span>

        {logs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-neutral-400 pb-3">
                  <th className="font-normal py-2.5">Seq / Actor</th>
                  <th className="font-normal py-2.5">Event Type</th>
                  <th className="font-normal py-2.5">Previous Hash</th>
                  <th className="font-normal py-2.5">Node Hash</th>
                  <th className="font-normal py-2.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((item: any, idx: number) => (
                  <tr key={item.id || idx} className="border-b border-white/[0.04] last:border-0">
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-neutral-400 font-medium">
                          #{item.sequence_number ?? (logs.length - idx)}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-neutral-300">
                          {item.actor}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 font-mono text-white">{item.event_type}</td>
                    <td className="py-3.5 font-mono text-neutral-400">
                      {item.prev_hash ? `${item.prev_hash.slice(0, 16)}...` : "GENESIS"}
                    </td>
                    <td className="py-3.5 font-mono text-cyan-300/90">
                      {item.node_hash ? `${item.node_hash.slice(0, 16)}...` : "—"}
                    </td>
                    <td className="py-3.5 text-right font-mono text-neutral-400 text-[11px]">
                      {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
