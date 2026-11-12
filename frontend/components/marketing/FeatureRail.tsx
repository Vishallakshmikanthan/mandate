"use client";

import React from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import {
  FileCheck,
  ShieldCheck,
  Zap,
  Lock,
  Scale,
  Link as LinkIcon,
  UserCheck,
  Crosshair,
} from "lucide-react";

export const FeatureRail: React.FC = () => {
  const features = [
    {
      title: "Signed Mandates",
      desc: "HMAC-SHA256 digital seals binding agent ID, spending caps, and allowed categories.",
      icon: FileCheck,
      tag: "Deterministic",
    },
    {
      title: "10-Rule Policy Engine",
      desc: "Code-level execution gates checking per-transaction limits, daily budgets, velocity, and UTC hours.",
      icon: ShieldCheck,
      tag: "Firewall",
    },
    {
      title: "LLM Risk Scorer",
      desc: "Gemini AI evaluates prompt context for injection attacks under a strict tighten-only invariant.",
      icon: Zap,
      tag: "AI Layer",
    },
    {
      title: "PayPal Orders v2 Escrow",
      desc: "Two-phase authorization holds lock funds in PayPal custody without direct immediate transfer.",
      icon: Lock,
      tag: "Custody",
    },
    {
      title: "AI Arbiter Verification",
      desc: "Automated multi-criteria evaluation verifies digital deliverables against contract specs.",
      icon: Scale,
      tag: "Arbitration",
    },
    {
      title: "Hash-Chained Audit Log",
      desc: "Every event linked via SHA-256 parent hash pointers for verifiable tamper evidence.",
      icon: LinkIcon,
      tag: "Cryptographic",
    },
    {
      title: "Human Approval Queue",
      desc: "Escalated payments trigger hotkey-enabled human-in-the-loop sign-off with audit logging.",
      icon: UserCheck,
      tag: "Supervision",
    },
    {
      title: "Red-Team Attack Suite",
      desc: "21 battle-tested adversarial injection attack vectors evaluated with zero leakage to PayPal.",
      icon: Crosshair,
      tag: "Security",
    },
  ];

  return (
    <section className="py-24 px-6 border-t border-white/[0.08] relative">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
            Comprehensive Capabilities
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            Built for Autonomous Financial Safety
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto leading-relaxed">
            Every feature designed to prevent prompt injection financial loss and guarantee contract delivery.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <GlassCard
                key={i}
                className="p-6 space-y-3 hover:border-white/[0.25] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.1] text-cyan-400 flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.04] text-neutral-400">
                      {f.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white tracking-tight">{f.title}</h3>
                  <p className="text-xs text-neutral-400 mt-2 leading-relaxed">{f.desc}</p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
};

