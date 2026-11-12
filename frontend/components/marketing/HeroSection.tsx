"use client";

import React, { useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  Sparkles,
  Play,
  ShieldCheck,
  ShieldAlert,
  Lock,
  ArrowRight,
  ExternalLink,
  Bot,
} from "lucide-react";

export const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-[92vh] flex flex-col items-center justify-center pt-8 pb-20 px-6 text-center overflow-hidden">
      {/* Eyebrow badge (Spec 5.1: ● Built on PayPal + AI) */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.12] text-xs font-mono text-neutral-300 mb-6 backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span>Built on PayPal Orders v2 & Gemini AI</span>
      </div>

      {/* Hero Headline (Spec 5.1: gradient on "wrongly") */}
      <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-[1.08]">
        Agents can spend money. Mandate makes sure they can&apos;t spend it{" "}
        <span className="brand-gradient-text">wrongly</span>.
      </h1>

      {/* Subhead */}
      <p className="mt-6 text-base sm:text-lg text-neutral-400 max-w-2xl mx-auto leading-relaxed">
        A deterministic financial firewall and AI-arbitrated escrow layer for autonomous agents.
        Enforces cryptographic spending policies before any PayPal call is made.
      </p>

      {/* CTAs */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl brand-gradient-bg text-black font-bold text-sm transition-transform hover:scale-105 shadow-[0_0_35px_rgba(108,123,255,0.5)]"
        >
          <Sparkles className="w-4 h-4" />
          <span>Launch Demo Workspace</span>
        </Link>

        <Link
          href="/demo"
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.14] text-white font-mono text-sm transition-all"
        >
          <Play className="w-4 h-4 text-cyan-400" />
          <span>Watch 90s Live Scenario</span>
        </Link>
      </div>

      {/* Floating Chips (Spec 5.1: "Payment blocked · $900" and "Funds held · $120") */}
      <div className="w-full max-w-5xl relative mt-14">
        {/* Left Floating Chip */}
        <div className="hidden lg:flex absolute -left-8 top-12 z-20 items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#0D1220]/90 border border-rose-500/30 text-rose-300 shadow-2xl backdrop-blur-xl animate-drift-slow">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <div className="text-left font-mono text-xs">
            <span className="font-bold text-white block">Payment Blocked</span>
            <span className="text-[10px] text-rose-300">$900.00 • Prompt Injection</span>
          </div>
        </div>

        {/* Right Floating Chip */}
        <div className="hidden lg:flex absolute -right-8 top-28 z-20 items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#0D1220]/90 border border-cyan-500/30 text-cyan-300 shadow-2xl backdrop-blur-xl animate-drift-reverse">
          <Lock className="w-4 h-4 text-cyan-400" />
          <div className="text-left font-mono text-xs">
            <span className="font-bold text-white block">PayPal Hold Active</span>
            <span className="text-[10px] text-cyan-300">$120.00 in Escrow</span>
          </div>
        </div>

        {/* 3D Dashboard Preview (Spec 5.1) */}
        <div className="rounded-3xl p-2.5 bg-gradient-to-b from-white/[0.15] to-transparent border border-white/[0.15] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
          <div className="rounded-2xl bg-[#080B12] border border-white/[0.1] overflow-hidden text-left p-6 space-y-6">
            {/* Window bar */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-neutral-400 ml-2">
                  mandate.gateway / telemetry / active
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-mono text-emerald-400">
                  Zero Trust Engine Online
                </span>
              </div>
            </div>

            {/* Dashboard Mock Grid Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                <span className="text-[10px] font-mono text-neutral-400 uppercase">
                  Active Mandate Cap
                </span>
                <p className="text-xl font-bold font-mono text-white tabular-nums">$200.00 / txn</p>
                <span className="text-[10px] font-mono text-cyan-400">HMAC-SHA256 Signed</span>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                <span className="text-[10px] font-mono text-neutral-400 uppercase">
                  Adversarial Block Rate
                </span>
                <p className="text-xl font-bold font-mono text-emerald-400 tabular-nums">100.0%</p>
                <span className="text-[10px] font-mono text-neutral-400">21 / 21 injections halted</span>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-1">
                <span className="text-[10px] font-mono text-neutral-400 uppercase">
                  PayPal Custody
                </span>
                <p className="text-xl font-bold font-mono text-cyan-300 tabular-nums">$120.00 Held</p>
                <span className="text-[10px] font-mono text-neutral-400">AI Arbiter Verified</span>
              </div>
            </div>

            {/* Live Event Stream preview strip */}
            <div className="p-3 rounded-xl bg-black/60 border border-white/[0.06] text-xs font-mono flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <span className="text-rose-400 font-bold">[BLOCKED]</span>
                <span className="text-neutral-300 truncate">
                  $900.00 transfer halted: Rule R2 failed (exceeds $200 limit). Prompt injection flag.
                </span>
              </div>
              <span className="text-neutral-500 text-[10px] flex-shrink-0">Just now</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

