"use client";

import React from "react";
import Link from "next/link";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { NoiseOverlay } from "@/components/glass/NoiseOverlay";
import { FloatingBottomDock } from "@/components/app/FloatingBottomDock";
import { MandateShieldIcon, MandateLogo } from "@/components/ui/MandateLogo";

export default function BrandPage() {
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

          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-100 transition shadow-sm"
            >
              Go to App
            </Link>
          </div>
        </div>
      </header>

      {/* Main Brand Presentation Container matching Screen 7 */}
      <main className="flex-1 max-w-4xl mx-auto px-6 pt-32 pb-32 relative z-10 space-y-6">
        <div className="text-xs text-neutral-400 font-normal">Brand mark</div>

        {/* Hero Brand Glass Card */}
        <div className="rounded-3xl bg-[#142225]/80 backdrop-blur-2xl border border-white/[0.1] p-12 sm:p-16 text-center flex flex-col items-center justify-center space-y-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          {/* Large Shield Tile */}
          <div className="w-24 h-24 rounded-3xl bg-[#1e2f33]/90 border border-white/[0.12] flex items-center justify-center text-white shadow-xl">
            <MandateShieldIcon size={52} />
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl sm:text-6xl font-light tracking-tight text-white font-sans">
              Mandate<span className="text-[#E9DDC6]">.</span>
            </h1>
            <p className="text-sm sm:text-base text-neutral-300 font-normal">
              The trust layer for AI agents
            </p>
          </div>
        </div>

        {/* Row 2: 4 Variation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: App icon */}
          <div className="rounded-2xl bg-[#142225]/80 backdrop-blur-2xl border border-white/[0.08] p-6 flex flex-col items-center justify-between text-center min-h-[180px]">
            <span className="text-[11px] text-neutral-400">App icon</span>
            <div className="w-16 h-16 rounded-2xl bg-[#1d2d31] border border-white/[0.1] flex items-center justify-center text-white shadow-lg">
              <MandateShieldIcon size={34} />
            </div>
            <div className="h-2" />
          </div>

          {/* Card 2: On light */}
          <div className="rounded-2xl bg-white text-neutral-900 p-6 flex flex-col items-center justify-between text-center min-h-[180px] shadow-xl">
            <span className="text-[11px] text-neutral-500 font-medium">On light</span>
            <div className="text-neutral-900">
              <MandateShieldIcon size={34} />
            </div>
            <span className="text-base font-semibold tracking-tight text-neutral-900">
              Mandate<span className="text-[#c49b6d]">.</span>
            </span>
          </div>

          {/* Card 3: On dark, one color */}
          <div className="rounded-2xl bg-[#14201F] border border-white/[0.08] p-6 flex flex-col items-center justify-between text-center min-h-[180px] shadow-xl">
            <span className="text-[11px] text-neutral-400">On dark, one color</span>
            <div className="text-white">
              <MandateShieldIcon size={34} />
            </div>
            <span className="text-base font-semibold tracking-tight text-white">
              Mandate<span className="text-white">.</span>
            </span>
          </div>

          {/* Card 4: Small sizes */}
          <div className="rounded-2xl bg-[#142225]/80 backdrop-blur-2xl border border-white/[0.08] p-6 flex flex-col items-center justify-between text-center min-h-[180px]">
            <span className="text-[11px] text-neutral-400">Small sizes</span>
            <div className="flex items-center justify-center gap-3 text-white">
              <MandateShieldIcon size={16} />
              <MandateShieldIcon size={24} />
              <MandateShieldIcon size={32} />
              <MandateShieldIcon size={48} />
            </div>
            <span className="text-[10px] font-mono text-neutral-400">16 · 24 · 32 · 48 px</span>
          </div>
        </div>

        {/* Row 3: 2 Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* What it means */}
          <div className="rounded-2xl bg-[#142225]/80 backdrop-blur-2xl border border-white/[0.08] p-6 space-y-3">
            <span className="text-neutral-400 font-normal block">What it means</span>
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                <span className="text-neutral-200">Shield</span>
                <span className="text-neutral-400">Protection around every payment</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                <span className="text-neutral-200">M gate</span>
                <span className="text-neutral-400">The checkpoint a payment passes</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-neutral-200">Sand dot</span>
                <span className="text-neutral-400">The signed seal, and the period in Mandate.</span>
              </div>
            </div>
          </div>

          {/* Palette */}
          <div className="rounded-2xl bg-[#142225]/80 backdrop-blur-2xl border border-white/[0.08] p-6 space-y-3">
            <span className="text-neutral-400 font-normal block">Palette</span>
            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="w-10 h-10 rounded-full bg-[#14201F] border border-white/[0.1] shadow-inner" />
                <span className="text-neutral-300 font-medium">Ink</span>
                <span className="text-[10px] font-mono text-neutral-400">#14201F</span>
              </div>

              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="w-10 h-10 rounded-full bg-[#E9DDC6] shadow-inner" />
                <span className="text-neutral-300 font-medium">Sand</span>
                <span className="text-[10px] font-mono text-neutral-400">#E9DDC6</span>
              </div>

              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="w-10 h-10 rounded-full bg-[#8FA4A6] shadow-inner" />
                <span className="text-neutral-300 font-medium">Mist</span>
                <span className="text-[10px] font-mono text-neutral-400">#8FA4A6</span>
              </div>

              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="w-10 h-10 rounded-full bg-[#FFFFFF] shadow-inner" />
                <span className="text-neutral-300 font-medium">Glass white</span>
                <span className="text-[10px] font-mono text-neutral-400">#FFFFFF</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Bottom Dock */}
      <FloatingBottomDock />
    </div>
  );
}

