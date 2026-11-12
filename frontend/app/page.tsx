"use client";

import React from "react";
import Link from "next/link";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { NoiseOverlay } from "@/components/glass/NoiseOverlay";
import { FloatingBottomDock } from "@/components/app/FloatingBottomDock";
import { MandateLogo } from "@/components/ui/MandateLogo";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0c1416] text-[#F4F6FB] relative overflow-x-hidden">
      <AuroraBackground />
      <NoiseOverlay />

      {/* Floating Top Navbar */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 w-full max-w-5xl px-6 z-40">
        <div className="h-14 px-6 rounded-full bg-[#142225]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex items-center justify-between">
          <Link href="/" className="hover:opacity-90 transition">
            <MandateLogo size="md" />
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-300">
            <Link href="/how-it-works" className="hover:text-white transition">
              How it works
            </Link>
            <Link href="/security" className="hover:text-white transition">
              Security
            </Link>
            <Link href="/pricing" className="hover:text-white transition">
              Pricing
            </Link>
            <Link href="/docs" className="hover:text-white transition">
              Docs
            </Link>
          </nav>

          {/* Action pills */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-1.5 rounded-full text-xs font-normal text-neutral-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition"
            >
              Log in
            </Link>
            <Link
              href="/app"
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-100 transition shadow-sm"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 pt-36 pb-32 relative z-10 flex flex-col items-center text-center space-y-12">
        {/* Built on PayPal + AI Badge */}
        <div>
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs text-neutral-300 bg-white/[0.04] border border-white/[0.08]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Built on PayPal + AI</span>
          </span>
        </div>

        {/* Hero Title */}
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-light tracking-tight text-white leading-[1.1]">
            Agents can spend money. <br />
            Mandate makes sure they{" "}
            <span className="italic font-serif text-[#e4bc9f]">can&apos;t</span> <br />
            spend it wrongly.
          </h1>
          <p className="text-base sm:text-lg text-neutral-300 max-w-xl mx-auto font-normal leading-relaxed pt-2">
            A financial firewall and AI-arbitrated PayPal escrow for autonomous agents.
          </p>
        </div>

        {/* Hero CTA Buttons with Radiant Aura */}
        <div className="flex items-center gap-4 pt-2">
          <div className="relative group">
            {/* Soft radiant white aura under primary button */}
            <div className="absolute -inset-2 bg-white/20 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition duration-500" />
            <Link
              href="/app/scenarios"
              className="relative px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold text-neutral-900 bg-white hover:bg-neutral-100 transition-all shadow-[0_4px_25px_rgba(255,255,255,0.25)] block"
            >
              Try the live demo
            </Link>
          </div>

          <Link
            href="/demo"
            className="px-6 py-2.5 rounded-full text-xs sm:text-sm font-normal text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] transition-all"
          >
            Watch the 90s demo
          </Link>
        </div>

        {/* Interactive Showcase Card (with floating tags) */}
        <div className="w-full relative pt-8">
          {/* Floating Tag 1: Payment blocked */}
          <div className="absolute -top-1 left-2 sm:left-6 z-20">
            <span className="px-3.5 py-1 rounded-full text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 shadow-lg backdrop-blur-md">
              Payment blocked · $900.00
            </span>
          </div>

          {/* Floating Tag 2: Funds held */}
          <div className="absolute top-1/2 -right-2 sm:-right-4 z-20 -translate-y-1/2">
            <span className="px-3.5 py-1 rounded-full text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 shadow-lg backdrop-blur-md">
              Funds held · $120.00
            </span>
          </div>

          {/* Central Glass Showcase Card */}
          <div className="rounded-3xl bg-[#142225]/85 backdrop-blur-2xl border border-white/[0.1] p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)] grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {/* Left: Live timeline */}
            <div className="space-y-4">
              <span className="text-xs text-neutral-400 font-normal">Live timeline</span>
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-sm text-neutral-200">Intent approved</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                    $120.00
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-sm text-neutral-200">Funds held in PayPal escrow</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20">
                    Held
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                  <span className="text-sm text-neutral-200">Injection attempt</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs text-rose-300 bg-rose-500/15 border border-rose-500/30">
                    Blocked
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-neutral-200">Arbiter verdict</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                    Pass
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Gateway decision card */}
            <div className="rounded-2xl bg-[#0f191b]/90 border border-white/[0.06] p-6 flex flex-col justify-center space-y-3">
              <span className="text-xs text-neutral-400 font-normal">Gateway decision</span>
              <div className="text-3xl sm:text-4xl font-normal tracking-wide text-rose-300/95 font-sans">
                BLOCKED
              </div>
              <div className="space-y-1 pt-1">
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Exceeds per-transaction cap and counterparty is not on the allowlist.
                </p>
                <p className="text-xs text-neutral-400">
                  No PayPal call was made.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Feature Cards Rail */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left pt-6">
          {/* Card 1: Highlight Pure White Card */}
          <div className="rounded-2xl bg-white text-neutral-900 p-6 flex flex-col justify-between shadow-2xl min-h-[170px]">
            <div>
              <span className="text-[11px] font-medium text-neutral-500">01 · Set a mandate</span>
              <h3 className="text-lg font-bold text-neutral-950 mt-1 mb-2">Sign the limits</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed font-normal">
              Budget, merchants and hours, signed with HMAC.
            </p>
          </div>

          {/* Card 2: Rules, then risk AI */}
          <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-2xl border border-white/[0.08] p-6 flex flex-col justify-between min-h-[170px]">
            <div>
              <span className="text-[11px] font-normal text-neutral-400">02 · Check every payment</span>
              <h3 className="text-lg font-semibold text-white mt-1 mb-2">Rules, then risk AI</h3>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed font-normal">
              Deterministic rules decide first.
            </p>
          </div>

          {/* Card 3: PayPal escrow */}
          <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-2xl border border-white/[0.08] p-6 flex flex-col justify-between min-h-[170px]">
            <div>
              <span className="text-[11px] font-normal text-neutral-400">03 · Hold the funds</span>
              <h3 className="text-lg font-semibold text-white mt-1 mb-2">PayPal escrow</h3>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed font-normal">
              Authorized, not sent.
            </p>
          </div>

          {/* Card 4: AI Arbiter */}
          <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-2xl border border-white/[0.08] p-6 flex flex-col justify-between min-h-[170px]">
            <div>
              <span className="text-[11px] font-normal text-neutral-400">04 · Verify, then release</span>
              <h3 className="text-lg font-semibold text-white mt-1 mb-2">AI Arbiter</h3>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed font-normal">
              Capture or void with evidence.
            </p>
          </div>
        </div>
      </main>

      {/* Signature Floating Bottom Dock */}
      <FloatingBottomDock />
    </div>
  );
}
