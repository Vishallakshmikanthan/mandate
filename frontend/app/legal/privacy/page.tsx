"use client";

import React from "react";
import Link from "next/link";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { NoiseOverlay } from "@/components/glass/NoiseOverlay";
import { MarketingNavbar } from "@/components/marketing/MarketingNavbar";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { GlassCard } from "@/components/glass/GlassCard";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#070A12] text-[#F4F6FB] relative">
      <AuroraBackground />
      <NoiseOverlay />
      <MarketingNavbar />

      <main className="flex-1 max-w-4xl mx-auto px-6 py-20 relative z-10 space-y-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          Privacy Policy
        </h1>
        <p className="text-xs font-mono text-neutral-400">Last updated: November 12, 2026</p>

        <GlassCard className="p-8 space-y-6 text-xs text-neutral-300 leading-relaxed font-sans">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-white uppercase font-mono">1. Information We Collect</h2>
            <p>
              We collect agent identifiers, mandate policy definitions, payment intent payloads, and cryptographic audit proofs. We do not store sensitive payment card details or raw bank account credentials.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-white uppercase font-mono">2. Processing for AI Risk Scoring</h2>
            <p>
              When a payment intent is evaluated, prompt context metadata is processed by our secure Gemini LLM risk scorer to detect adversarial injection phrases. Data is not used to train generalized foundation models without consent.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-white uppercase font-mono">3. Merkle Audit Logs</h2>
            <p>
              To maintain cryptographic tamper evidence, hashes of mandate events are recorded in an append-only hash chain. These cryptographic hashes contain no unencrypted personal identifying information.
            </p>
          </section>
        </GlassCard>
      </main>

      <MarketingFooter />
    </div>
  );
}

