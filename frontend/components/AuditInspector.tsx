"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, ShieldAlert, RefreshCw, Key, Link as LinkIcon, ShieldCheck } from "lucide-react";

interface AuditLogEntry {
  id: number;
  ts: string;
  actor: string;
  event: string;
  payload: Record<string, any>;
  prev_hash: string;
  hash: string;
}

interface VerificationResult {
  valid: boolean;
  total_records: number;
  head_hash?: string;
  verified_at: string;
  broken_link_id?: number;
  message: string;
}

export const AuditInspector: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/audit?limit=50");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await fetch("/api/audit/verify");
      if (res.ok) {
        const data = await res.json();
        setVerification(data);
      }
    } catch (err) {
      console.error("Verification failed:", err);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    handleVerify();
  }, []);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto py-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/[0.08] gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
            Immutable Verification
          </span>
          <h2 className="text-2xl sm:text-3xl font-normal tracking-tightest text-white mt-1">
            Audit Hash Chain
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-xl">
            Every transaction, policy decision, and arbitration verdict is cryptographically bound into an append-only SHA-256 hash chain.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start">
          <button
            onClick={fetchLogs}
            className="ref-circle-btn"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="ref-pill-primary text-xs uppercase tracking-wider font-mono cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{verifying ? "Verifying Chain..." : "Verify Integrity"}</span>
          </button>
        </div>
      </div>

      {/* Verification Result Card */}
      {verification && (
        <div
          className={`ref-glass-card rounded-2xl p-6 border transition-all ${verification.valid ? "border-emerald-500/30" : "border-red-500/30"
            }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${verification.valid
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-red-500/10 border-red-500/30 text-red-400"
                  }`}
              >
                {verification.valid ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <ShieldAlert className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-white">
                    {verification.valid ? "CHAIN INTEGRITY VERIFIED" : "INTEGRITY COMPROMISED"}
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono bg-white/[0.04] border border-white/[0.08] text-neutral-300">
                    {verification.total_records} Records
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1 font-sans">{verification.message}</p>
              </div>
            </div>

            {verification.head_hash && (
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-neutral-500 font-mono block uppercase">
                  Head SHA-256
                </span>
                <span className="text-xs font-mono text-white">
                  {verification.head_hash.slice(0, 24)}...
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="ref-glass-card rounded-2xl p-6 sm:p-7 border border-white/[0.08]">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
          <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
            Chronological Hash Ledger
          </span>
          <span className="text-[10px] font-mono text-neutral-500">
            {logs.length} blocks
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/[0.06] text-neutral-400 uppercase text-[10px]">
                <th className="pb-3 w-12">ID</th>
                <th className="pb-3">Timestamp (UTC)</th>
                <th className="pb-3">Actor</th>
                <th className="pb-3">Event</th>
                <th className="pb-3">Prev Hash</th>
                <th className="pb-3">Node Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-500 font-sans">
                    Audit log is currently empty.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="text-neutral-300 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 font-medium text-white">#{log.id}</td>
                    <td className="py-3 text-neutral-400 text-[11px]">
                      {new Date(log.ts).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[10px] uppercase text-neutral-200">
                        {log.actor}
                      </span>
                    </td>
                    <td className="py-3 font-medium text-white">{log.event}</td>
                    <td className="py-3 text-[10px] text-neutral-500 truncate max-w-[120px]">
                      {log.prev_hash.slice(0, 16)}...
                    </td>
                    <td className="py-3 text-[10px] text-neutral-300 truncate max-w-[120px]">
                      {log.hash.slice(0, 16)}...
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
