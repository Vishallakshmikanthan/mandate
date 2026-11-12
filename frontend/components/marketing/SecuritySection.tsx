"use client";

import React from "react";
import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { ShieldCheck, Lock, AlertTriangle, ArrowRight } from "lucide-react";

export const SecuritySection: React.FC = () => {
  return (
    <section className="py-24 px-6 border-t border-white/[0.08] relative">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Copy (6 cols) */}
        <div className="lg:col-span-6 space-y-5 text-left">
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
            Cryptographic Invariants
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
            Fail closed. <span className="brand-gradient-text">Always.</span>
          </h2>
          <p className="text-sm text-neutral-300 leading-relaxed font-sans">
            In financial software, there are no soft failures. If an HMAC signature doesn&apos;t verify, if an agent exceeds its budget by even 1 cent, or if the LLM risk scorer identifies an injection payload, the transaction halts immediately.
          </p>
          <ul className="space-y-2.5 text-xs font-mono text-neutral-300">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Zero PayPal API calls are triggered unless all 10 rules pass.</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Risk Scorer is Tighten-Only: can block or escalate, never bypass.</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Full Merkle hash chaining guarantees tamper evidence.</span>
            </li>
          </ul>

          <div className="pt-2">
            <Link
              href="/security"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline"
            >
              <span>Read Full Security & Threat Model</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Concentric Rings Diagram (6 cols) */}
        <div className="lg:col-span-6 flex items-center justify-center">
          <div className="relative w-80 h-80 flex items-center justify-center">
            {/* Outer Ring 3: Custody */}
            <div className="absolute inset-0 rounded-full border border-indigo-500/30 bg-indigo-950/10 animate-pulse-slow flex items-center justify-center" />
            <span className="absolute top-3 text-[9px] font-mono uppercase text-indigo-400 tracking-wider">
              Layer 3: PayPal Escrow
            </span>

            {/* Middle Ring 2: LLM Risk */}
            <div className="absolute inset-10 rounded-full border border-cyan-500/40 bg-cyan-950/15 flex items-center justify-center" />
            <span className="absolute top-14 text-[9px] font-mono uppercase text-cyan-400 tracking-wider">
              Layer 2: AI Risk Scorer
            </span>

            {/* Inner Ring 1: Deterministic Engine */}
            <div className="absolute inset-20 rounded-full border border-emerald-500/50 bg-emerald-950/20 flex items-center justify-center" />
            <span className="absolute top-24 text-[9px] font-mono uppercase text-emerald-400 tracking-wider">
              Layer 1: 10 Policy Rules
            </span>

            {/* Core Bullseye */}
            <div className="w-20 h-20 rounded-2xl brand-gradient-bg flex items-center justify-center text-black font-bold text-xs shadow-[0_0_30px_rgba(108,123,255,0.6)] relative z-10">
              <Lock className="w-6 h-6 text-black" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

