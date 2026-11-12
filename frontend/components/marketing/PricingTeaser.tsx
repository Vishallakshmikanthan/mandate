"use client";

import React from "react";
import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { Check, Sparkles } from "lucide-react";

export const PricingTeaser: React.FC = () => {
  const tiers = [
    {
      name: "Developer Sandbox",
      price: "$0",
      period: "forever",
      desc: "Ideal for hackathon testing, local agent experiments, and red-teaming.",
      features: [
        "Up to 5 autonomous agents",
        "Deterministic 10-rule firewall",
        "PayPal Orders v2 Sandbox integration",
        "100 AI Arbiter verifications/mo",
        "Tamper-evident audit log export",
      ],
      popular: false,
      cta: "Start Free",
      href: "/app",
    },
    {
      name: "Production Agent Pro",
      price: "$49",
      period: "per month",
      desc: "For startups deploying commercial buyer/seller agents in production.",
      features: [
        "Unlimited autonomous agents",
        "Real-time Gemini AI risk scoring",
        "PayPal Production & Sandbox",
        "Automated AI Arbiter release & void",
        "Full Merkle hash-chain verification",
        "Human approval queue with Webhooks",
      ],
      popular: true,
      cta: "Launch Pro Workspace",
      href: "/app",
    },
    {
      name: "Enterprise Fleet",
      price: "$249",
      period: "per month",
      desc: "For enterprises operating large multi-agent procurement fleets.",
      features: [
        "Custom policy rule plugins",
        "Dedicated Gemini risk models",
        "Multi-signature mandate approval",
        "SLA & priority PayPal gateway support",
        "90-day cryptographic audit retention",
        "Custom ERP & accounting webhooks",
      ],
      popular: false,
      cta: "Contact Team",
      href: "/about",
    },
  ];

  return (
    <section id="pricing" className="py-24 px-6 border-t border-white/[0.08] relative">
      <div className="max-w-6xl mx-auto space-y-12 text-center">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
            SaaS Predictability
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mt-1">
            Transparent Pricing for Agent Safety
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto mt-2 leading-relaxed">
            Free forever for developers and hackathon judges exploring our PayPal sandbox testbed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left items-stretch">
          {tiers.map((t, idx) => (
            <GlassCard
              key={idx}
              className={`p-8 space-y-6 flex flex-col justify-between relative ${
                t.popular
                  ? "border-cyan-400/60 bg-cyan-950/20 shadow-[0_0_40px_rgba(34,211,238,0.2)]"
                  : ""
              }`}
            >
              {t.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full brand-gradient-bg text-black font-mono text-[10px] font-bold tracking-wider uppercase shadow-[0_0_15px_rgba(108,123,255,0.6)]">
                  Most Popular
                </span>
              )}

              <div>
                <h3 className="text-lg font-bold text-white">{t.name}</h3>
                <p className="text-xs text-neutral-400 mt-1 min-h-[36px]">{t.desc}</p>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold font-mono text-white tabular-nums">
                    {t.price}
                  </span>
                  <span className="text-xs font-mono text-neutral-400">/{t.period}</span>
                </div>

                <ul className="mt-6 space-y-2.5 text-xs text-neutral-300">
                  {t.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4">
                <Link
                  href={t.href}
                  className={`w-full py-2.5 rounded-xl text-center text-xs font-bold transition-all block ${
                    t.popular
                      ? "brand-gradient-bg text-black shadow-[0_0_20px_rgba(108,123,255,0.4)] hover:scale-105"
                      : "bg-white/[0.08] hover:bg-white/[0.14] text-white"
                  }`}
                >
                  {t.cta}
                </Link>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
};

