"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { NoiseOverlay } from "@/components/glass/NoiseOverlay";
import { FloatingBottomDock } from "@/components/app/FloatingBottomDock";
import { MandateLogo } from "@/components/ui/MandateLogo";

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      name: "Starter",
      badge: "Free forever",
      price: "$0",
      period: "forever",
      desc: "Perfect for testing AI agents in PayPal Sandbox.",
      features: [
        "Up to 3 active AI agents",
        "Unlimited sandbox payments",
        "Automatic prompt injection defense",
        "Basic escrow protection",
        "Community support",
      ],
      cta: "Start free",
      href: "/app",
      highlight: false,
    },
    {
      name: "Growth",
      badge: "Most popular",
      price: annual ? "$39" : "$49",
      period: "per month",
      desc: "For businesses hiring freelancers and paying APIs with agents.",
      features: [
        "Unlimited autonomous agents",
        "PayPal live payments & Orders v2",
        "AI Arbiter quality verification",
        "Emergency kill switch & pause",
        "Human review queue & SMS alerts",
        "Priority 24/7 support",
      ],
      cta: "Try 14 days free",
      href: "/app",
      highlight: true,
    },
    {
      name: "Enterprise",
      badge: "Custom scale",
      price: annual ? "$199" : "$249",
      period: "per month",
      desc: "For large companies running fleets of autonomous agents.",
      features: [
        "Custom spending policies & roles",
        "Multi-signature human approvals",
        "Dedicated PayPal escrow channels",
        "Private Slack & engineering support",
        "Custom SLA & audit export",
      ],
      cta: "Contact sales",
      href: "/about",
      highlight: false,
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
            <Link href="/how-it-works" className="hover:text-white transition">
              How it works
            </Link>
            <Link href="/security" className="hover:text-white transition">
              Security
            </Link>
            <Link href="/pricing" className="text-white font-medium">
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
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto px-6 pt-36 pb-32 relative z-10 space-y-12 text-center">
        <div className="space-y-3">
          <span className="text-xs text-neutral-400 font-normal">Transparent Plans</span>
          <h1 className="text-4xl sm:text-6xl font-light tracking-tight text-white">
            Simple, honest pricing
          </h1>
          <p className="text-sm sm:text-base text-neutral-300 max-w-lg mx-auto leading-relaxed">
            Protect your money without hidden fees or lock-ins. Start completely free in sandbox.
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="pt-4 flex items-center justify-center gap-3 text-xs">
            <span className={!annual ? "text-white font-medium" : "text-neutral-400"}>Monthly</span>
            <button
              onClick={() => setAnnual(!annual)}
              className="w-12 h-6 rounded-full bg-white/[0.1] p-1 transition flex items-center"
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  annual ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
            <span className={annual ? "text-white font-medium" : "text-neutral-400"}>
              Annual <span className="text-emerald-400">(Save 20%)</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left pt-6">
          {plans.map((pl) => (
            <div
              key={pl.name}
              className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6 transition-all ${
                pl.highlight
                  ? "bg-white text-neutral-900 shadow-2xl scale-105"
                  : "bg-[#142225]/85 backdrop-blur-2xl border border-white/[0.08] text-white"
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-medium px-3 py-1 rounded-full ${
                      pl.highlight
                        ? "bg-neutral-900 text-white"
                        : "bg-white/[0.05] border border-white/[0.08] text-neutral-300"
                    }`}
                  >
                    {pl.badge}
                  </span>
                </div>

                <div>
                  <h3 className={`text-xl font-bold ${pl.highlight ? "text-neutral-950" : "text-white"}`}>
                    {pl.name}
                  </h3>
                  <p className={`text-xs mt-1 ${pl.highlight ? "text-neutral-600" : "text-neutral-400"}`}>
                    {pl.desc}
                  </p>
                </div>

                <div className="pt-2">
                  <span className={`text-4xl font-bold ${pl.highlight ? "text-neutral-950" : "text-white"}`}>
                    {pl.price}
                  </span>
                  <span className={`text-xs ml-1 ${pl.highlight ? "text-neutral-600" : "text-neutral-400"}`}>
                    /{pl.period}
                  </span>
                </div>

                {/* Features List */}
                <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2.5">
                  {pl.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className={pl.highlight ? "text-emerald-600" : "text-emerald-400"}>✓</span>
                      <span className={pl.highlight ? "text-neutral-700" : "text-neutral-300"}>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Link
                  href={pl.href}
                  className={`w-full py-2.5 px-4 rounded-full text-xs font-semibold block text-center transition ${
                    pl.highlight
                      ? "bg-neutral-900 text-white hover:bg-neutral-800 shadow-md"
                      : "bg-white text-neutral-900 hover:bg-neutral-100 shadow-sm"
                  }`}
                >
                  {pl.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>

      <FloatingBottomDock />
    </div>
  );
}
