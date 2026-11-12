"use client";

import React, { useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { LayoutDashboard, Lock, ShieldCheck, ArrowRight } from "lucide-react";

export const DashboardShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"overview" | "escrows" | "audit">("overview");

  return (
    <section className="py-24 px-6 border-t border-white/[0.08] relative">
      <div className="max-w-6xl mx-auto space-y-10 text-center">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
            SaaS Operator Experience
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mt-1">
            Complete Visibility into Every Cent
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto mt-2 leading-relaxed">
            Live telemetry, real-time risk gauges, state machine diagrams, and cryptographic audit proofs.
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex justify-center gap-2">
          {[
            { id: "overview", label: "Overview & KPIs", icon: LayoutDashboard },
            { id: "escrows", label: "Escrow State Machine", icon: Lock },
            { id: "audit", label: "Cryptographic Audit", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                  isActive
                    ? "bg-white/[0.14] text-white border border-white/[0.25]"
                    : "bg-white/[0.04] text-neutral-400 hover:text-white border border-white/[0.08]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Mock Preview */}
        <div className="rounded-3xl p-3 bg-gradient-to-b from-white/[0.12] to-transparent border border-white/[0.14] shadow-2xl backdrop-blur-2xl text-left">
          {activeTab === "overview" && (
            <div className="p-6 space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <span className="text-[10px] font-mono uppercase text-neutral-400">Protected Volume</span>
                  <p className="text-2xl font-bold font-mono text-white tabular-nums mt-1">$1,420.00</p>
                  <span className="text-[10px] font-mono text-emerald-400">100% Policy Adherence</span>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <span className="text-[10px] font-mono uppercase text-neutral-400">Injections Blocked</span>
                  <p className="text-2xl font-bold font-mono text-rose-400 tabular-nums mt-1">21 Threats</p>
                  <span className="text-[10px] font-mono text-neutral-400">0 Leaked to PayPal</span>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
                  <span className="text-[10px] font-mono uppercase text-neutral-400">Active Escrow Holds</span>
                  <p className="text-2xl font-bold font-mono text-cyan-300 tabular-nums mt-1">$120.00</p>
                  <span className="text-[10px] font-mono text-neutral-400">PayPal Orders v2</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "escrows" && (
            <div className="p-6 space-y-4 animate-in fade-in font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <span className="text-cyan-400 font-bold">State Machine: Two-Phase PayPal Custody</span>
                <span className="text-neutral-500">29-day Hold Guarantee</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-neutral-300">
                <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  1. Intent Authorized
                </div>
                <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                  2. Funds in Hold
                </div>
                <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
                  3. Arbiter Verification
                </div>
                <div className="p-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white">
                  4. Released or Voided
                </div>
              </div>
            </div>
          )}

          {activeTab === "audit" && (
            <div className="p-6 space-y-3 animate-in fade-in font-mono text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <span className="text-emerald-400 font-bold">Merkle-Linked Tamper-Evident SHA-256 Ledger</span>
                <span className="text-emerald-400">Chain Verified (100%)</span>
              </div>
              <div className="space-y-2 text-[11px] text-neutral-400">
                <div className="p-2.5 rounded-lg bg-black/50 flex justify-between">
                  <span>#1 GENESIS_BLOCK</span>
                  <span className="text-cyan-300">8f7129b0a1c356f91240188bca87d10034a71bc980ef5512bcda001239aa1182</span>
                </div>
                <div className="p-2.5 rounded-lg bg-black/50 flex justify-between">
                  <span>#2 MANDATE_CREATED</span>
                  <span className="text-cyan-300">3a9921bc4f019a87de330129bc78fe01aa882310b7cd80145ef2009187ab6610</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

