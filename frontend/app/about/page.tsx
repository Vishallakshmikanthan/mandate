"use client";

import React from "react";
import Link from "next/link";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { NoiseOverlay } from "@/components/glass/NoiseOverlay";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { GlassCard } from "@/components/glass/GlassCard";
import { ArrowRight, Sparkles, Award } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#070A12] text-[#F4F6FB] relative">
      <AuroraBackground />
      <NoiseOverlay />
      <MarketingNavbar />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-20 relative z-10 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
            About Team VibeSync
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
            Agents Need Financial Guardrails.
          </h1>
          <p className="text-sm sm:text-base text-neutral-400 max-w-xl mx-auto leading-relaxed">
            We built Mandate for the <em>Build What&apos;s Next with PayPal and AI Hackathon</em> to solve the single largest obstacle preventing autonomous agents from managing real money.
          </p>
        </div>

        <GlassCard className="p-8 space-y-4">
          <h2 className="text-xl font-bold text-white">Our Mission</h2>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans">
            AI agents are negotiating, purchasing software licenses, bidding on freelance contracts, and executing corporate procurement. But traditional payment gateways treat agents like humans: give them an API key and trust that they won&apos;t spend it wrongly.
          </p>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans">
            A single prompt injection can trick an LLM into wiring thousands of dollars. Mandate replaces blind trust with deterministic mathematics: code rules that cannot be jailbroken, AI risk scoring with a tighten-only invariant, and two-phase PayPal escrow custody.
          </p>
        </GlassCard>

        {/* Team bios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GlassCard className="p-6 space-y-3">
            <h3 className="text-base font-bold text-white">Vishal Lakshmikanthan</h3>
            <span className="text-xs font-mono text-cyan-400 block">Co-Founder & Systems Architect</span>
            <p className="text-xs text-neutral-300 leading-relaxed font-sans">
              Responsible for the core deterministic Policy Engine, cryptographic HMAC-SHA256 mandate signing, Merkle audit hash chain verification, and PayPal Orders v2 integration.
            </p>
          </GlassCard>

          <GlassCard className="p-6 space-y-3">
            <h3 className="text-base font-bold text-white">Sneha</h3>
            <span className="text-xs font-mono text-cyan-400 block">Co-Founder & AI Security Lead</span>
            <p className="text-xs text-neutral-300 leading-relaxed font-sans">
              Responsible for prompt injection defense heuristics, Gemini LLM risk scoring with tighten-only verification invariants, and the automated AI Arbiter deliverable verification logic.
            </p>
          </GlassCard>
        </div>

        <div className="pt-4 text-center">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl brand-gradient-bg text-black font-bold text-xs transition-transform hover:scale-105 shadow-[0_0_25px_rgba(108,123,255,0.4)]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Explore the Working Mandate Platform</span>
          </Link>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}

