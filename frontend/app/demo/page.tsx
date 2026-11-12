"use client";

import React from "react";
import Link from "next/link";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { NoiseOverlay } from "@/components/glass/NoiseOverlay";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { GlassCard } from "@/components/glass/GlassCard";
import { Play, Sparkles, ShieldAlert, CheckCircle2, Scale, ArrowRight } from "lucide-react";

export default function DemoPage() {
  const scenarios = [
    {
      id: "happy_path",
      title: "Scenario A: Happy Path Negotiation",
      desc: "Watch an autonomous buyer agent negotiate freelance design assets, hold $120.00 on PayPal Orders v2, verify deliverable files with AI Arbiter, and release funds.",
      icon: CheckCircle2,
      badge: "Settlement",
      color: "emerald",
    },
    {
      id: "injection_attack",
      title: "Scenario B: Prompt Injection Attack",
      desc: "Simulate an attacker injecting an emergency $900 wire command. Watch the Mandate Firewall detect the overage and prompt injection, blocking the payment with 0 PayPal calls.",
      icon: ShieldAlert,
      badge: "Attack Block",
      color: "rose",
    },
    {
      id: "bad_delivery_dispute",
      title: "Scenario C: Substandard Delivery Dispute",
      desc: "A seller submits incomplete deliverables. The AI Arbiter fails acceptance criteria, rejects the release, and automatically voids the PayPal authorization to refund the buyer.",
      icon: Scale,
      badge: "Arbitration",
      color: "purple",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#070A12] text-[#F4F6FB] relative">
      <AuroraBackground />
      <NoiseOverlay />
      <MarketingNavbar />

      <main className="flex-1 max-w-5xl mx-auto px-6 py-20 relative z-10 space-y-12 text-center">
        <div className="space-y-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
            One-Click Judge Testbed
          </span>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white">
            Interactive Public Demo
          </h1>
          <p className="text-sm sm:text-base text-neutral-400 max-w-xl mx-auto leading-relaxed">
            No registration or API keys required. Pick any scenario below to open the live execution stage in a pre-seeded sandbox.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {scenarios.map((sc) => {
            const Icon = sc.icon;
            return (
              <GlassCard
                key={sc.id}
                className="p-6 space-y-4 flex flex-col justify-between hover:border-white/[0.25] transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        sc.color === "emerald"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : sc.color === "rose"
                          ? "bg-rose-500/20 text-rose-400"
                          : "bg-purple-500/20 text-purple-400"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.05] text-neutral-300">
                      {sc.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">{sc.title}</h3>
                  <p className="text-xs text-neutral-300 leading-relaxed font-sans">{sc.desc}</p>
                </div>

                <div className="pt-4 border-t border-white/[0.08]">
                  <Link
                    href={`/app/scenarios?run=${sc.id}`}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl brand-gradient-bg text-black font-bold text-xs transition-transform hover:scale-105 shadow-[0_0_20px_rgba(108,123,255,0.4)]"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    <span>Run Scenario Live</span>
                  </Link>
                </div>
              </GlassCard>
            );
          })}
        </div>

        <div className="pt-6">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline"
          >
            <span>Or explore the full overview dashboard with pre-seeded data</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

