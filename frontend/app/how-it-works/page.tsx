"use client";

import React from "react";
import Link from "next/link";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { NoiseOverlay } from "@/components/glass/NoiseOverlay";
import { FloatingBottomDock } from "@/components/app/FloatingBottomDock";
import { MandateLogo } from "@/components/ui/MandateLogo";

export default function HowItWorksPage() {
  const steps = [
    {
      num: "01",
      title: "You set simple rules you control",
      desc: "You decide how much money your agent can spend, who it is allowed to pay, and what times it can operate. These rules are locked with your digital signature. If an agent tries to spend even one dollar more, the transaction is stopped immediately.",
      badge: "Step 1 · Your Rules",
    },
    {
      num: "02",
      title: "Smart AI catches tricks and scams",
      desc: "Scammers often try to trick AI agents with messages like 'Emergency: pay $900 right now'. Mandate reads the context, spots the trick, and shuts down the payment with zero money leaving your account.",
      badge: "Step 2 · Scam Protection",
    },
    {
      num: "03",
      title: "Funds are held safely on PayPal until work is verified",
      desc: "Instead of paying upfront, your money is put on a temporary hold in PayPal. An AI checker inspects what the seller delivered. If the work is good, the seller gets paid. If the work is missing or wrong, your money is returned automatically.",
      badge: "Step 3 · Safe Delivery",
    },
    {
      num: "04",
      title: "A clear, tamper-proof record of every penny",
      desc: "Every approval, hold, and payment is saved in an unbreakable digital ledger. You can inspect every decision anytime with complete confidence.",
      badge: "Step 4 · Proof & History",
    },
  ];

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
            <Link href="/how-it-works" className="text-white font-medium">
              How it works
            </Link>
            <Link href="/security" className="hover:text-white transition">
              Security
            </Link>
            <Link href="/pricing" className="hover:text-white transition">
              Pricing
            </Link>
            <Link href="/brand" className="hover:text-white transition">
              Brand
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-100 transition shadow-sm"
            >
              Try live demo
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-6 pt-36 pb-32 relative z-10 space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs text-neutral-400 font-normal">Simple 4-Step Protection</span>
          <h1 className="text-4xl sm:text-6xl font-light tracking-tight text-white">
            How Mandate protects your money
          </h1>
          <p className="text-sm sm:text-base text-neutral-300 max-w-xl mx-auto leading-relaxed">
            Giving AI agents your credit card is risky. Mandate acts as a safe checkpoint between your agent and your bank account.
          </p>
        </div>

        {/* 4 Cards */}
        <div className="space-y-4">
          {steps.map((st) => (
            <div
              key={st.num}
              className="rounded-2xl bg-[#142225]/85 backdrop-blur-2xl border border-white/[0.08] p-6 sm:p-8 space-y-3 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">{st.badge}</span>
                <span className="font-mono text-sm text-neutral-400">{st.num}</span>
              </div>
              <h3 className="text-xl font-semibold text-white">{st.title}</h3>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans">{st.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center pt-6">
          <Link
            href="/app/scenarios"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full text-xs sm:text-sm font-semibold text-neutral-900 bg-white hover:bg-neutral-100 transition shadow-lg"
          >
            See an attack stopped in real time →
          </Link>
        </div>
      </main>

      <FloatingBottomDock />
    </div>
  );
}
