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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-blue-400" />
            <span>Cryptographic Append-Only Audit Chain</span>
          </h2>
          <p className="text-xs text-slate-400">
            Every transaction, policy decision, and arbitration verdict is linked into an immutable SHA-256 hash chain.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{verifying ? "Verifying Chain..." : "Verify Chain Integrity"}</span>
          </button>
        </div>
      </div>

      {/* Verification Result Card */}
      {verification && (
        <div
          className={`glass-panel rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
            verification.valid ? "border-emerald-500/40 glow-green" : "border-red-500/40 glow-red"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                verification.valid
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                  : "bg-red-500/10 border border-red-500/30 text-red-400"
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
                <span className="font-bold text-sm text-slate-200">
                  {verification.valid ? "Cryptographic Chain Verified Valid" : "Hash Chain Integrity Compromised"}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-black/40 border border-white/10 text-slate-300">
                  {verification.total_records} events
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{verification.message}</p>
            </div>
          </div>

          {verification.head_hash && (
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-mono block">Chain Head SHA-256:</span>
              <span className="text-xs font-mono font-bold text-blue-400">
                {verification.head_hash.slice(0, 20)}...
              </span>
            </div>
          )}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800">
        <h3 className="font-bold text-sm text-slate-200 uppercase tracking-wider mb-3">
          Chronological Hash-Linked Records
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="pb-2 w-12">ID</th>
                <th className="pb-2">Timestamp (UTC)</th>
                <th className="pb-2">Actor</th>
                <th className="pb-2">Event</th>
                <th className="pb-2">Prev Hash</th>
                <th className="pb-2">Node Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500 font-sans">
                    Audit log is currently empty.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="text-slate-300 hover:bg-slate-900/40">
                    <td className="py-3 font-bold text-blue-400">#{log.id}</td>
                    <td className="py-3 text-slate-400 text-[11px]">
                      {new Date(log.ts).toLocaleString()}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] text-cyan-300">
                        {log.actor}
                      </span>
                    </td>
                    <td className="py-3 font-semibold text-slate-200">{log.event}</td>
                    <td className="py-3 text-[10px] text-slate-500 truncate max-w-[120px]">
                      {log.prev_hash.slice(0, 16)}...
                    </td>
                    <td className="py-3 text-[10px] text-emerald-400 font-bold truncate max-w-[120px]">
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
