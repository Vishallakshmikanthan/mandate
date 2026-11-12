"use client";

import React from "react";
import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { CreditCard, Check, ArrowLeft, Sparkles } from "lucide-react";

export default function BillingPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl">
      <Link
        href="/app/settings"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Settings
      </Link>

      <div className="pb-4 border-b border-white/[0.08]">
        <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
          SaaS Realism
        </span>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-1">
          Plan & Billing Management
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Mock subscription tier and usage limits for autonomous agent firewalling.
        </p>
      </div>

      <GlassCard className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-neutral-400">Current Plan</span>
            <h3 className="text-xl font-bold text-white mt-0.5">Developer Sandbox Tier</h3>
          </div>
          <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-xs font-mono font-semibold">
            Active · Free Hackathon Tier
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-white/[0.08] text-xs font-mono">
          <div>
            <span className="text-neutral-500 block">Protected Volume Cap</span>
            <span className="text-white font-bold text-sm">$10,000 / month</span>
          </div>
          <div>
            <span className="text-neutral-500 block">Autonomous Agents</span>
            <span className="text-white font-bold text-sm">Up to 10 Agents</span>
          </div>
          <div>
            <span className="text-neutral-500 block">AI Arbiter Verifications</span>
            <span className="text-white font-bold text-sm">Unlimited</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

