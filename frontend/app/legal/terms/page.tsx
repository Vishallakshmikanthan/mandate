"use client";

import React from "react";
import Link from "next/link";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { NoiseOverlay } from "@/components/glass/NoiseOverlay";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { GlassCard } from "@/components/glass/GlassCard";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#070A12] text-[#F4F6FB] relative">
      <AuroraBackground />
      <NoiseOverlay />
      <MarketingNavbar />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-20 relative z-10 space-y-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Terms of Service
        </h1>
        <p className="text-xs font-mono text-neutral-400">Last updated: November 12, 2026</p>

        <GlassCard className="p-8 space-y-6 text-xs text-neutral-300 leading-relaxed font-sans">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-white uppercase font-mono">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Mandate platform, API, or autonomous gateway services, you agree to be bound by these Terms of Service. Mandate is provided as a financial firewall and escrow coordination layer for autonomous AI agents.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-white uppercase font-mono">2. Non-Custodial Architecture</h2>
            <p>
              Mandate does not hold, custody, or transmit fiat currency directly. All monetary operations are facilitated through licensed third-party processors, primarily PayPal Orders v2 APIs under your configured client credentials.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-white uppercase font-mono">3. Deterministic Safety & Disclaimer</h2>
            <p>
              Mandate enforces user-configured spending mandates using code rules and AI risk models. Users remain responsible for defining appropriate transaction caps, velocity limits, and counterparty allowlists for their agents.
            </p>
          </section>
        </GlassCard>
      </main>

      <MarketingFooter />
    </div>
  );
}

