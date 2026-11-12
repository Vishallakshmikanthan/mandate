"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import { FileCheck, ShieldCheck, Lock, Scale, CheckCircle2, ArrowRight } from "lucide-react";

export const HowItWorksPinned: React.FC = () => {
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    {
      num: 1,
      title: "1. Set a Cryptographic Mandate",
      headline: "Define what your agent may spend, where, and when.",
      desc: "Create hard boundaries: per-transaction cap, total budget, allowed counterparties, SKU categories, and operational UTC hours. Mandate hashes the canonical JSON and stamps it with an HMAC-SHA256 signature.",
      icon: FileCheck,
      visual: (
        <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.1] font-mono text-xs text-neutral-300 space-y-2">
          <div className="text-cyan-400 font-bold">// Canonical Policy Definition</div>
          <div className="text-neutral-400">{`{\n  "agent_id": "buyer_agent_alpha",\n  "max_per_txn": $200.00,\n  "max_total": $500.00,\n  "allowed": ["seller_agent_acme"],\n  "require_escrow": true\n}`}</div>
          <div className="pt-2 border-t border-white/[0.08] text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Signature: hmac_sha256_8f3a92b... (Verified)</span>
          </div>
        </div>
      ),
    },
    {
      num: 2,
      title: "2. Every Payment Intent is Evaluated",
      headline: "Ten deterministic rules and an AI risk scorer.",
      desc: "Before any money moves, the intent passes through 10 deterministic gates (cap, velocity, counterparty, time window). The LLM risk scorer evaluates prompt context for injection attempts under a strict tighten-only invariant.",
      icon: ShieldCheck,
      visual: (
        <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.1] font-mono text-xs space-y-2">
          <div className="text-cyan-400 font-bold">// 10-Rule Gate Evaluation</div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-emerald-400">
              <span>R1: Mandate Signature</span> <span>PASS</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>R2: Transaction Cap ($120 &lt;= $200)</span> <span>PASS</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>R5: Counterparty Allowlist</span> <span>PASS</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>R10: Escrow Enforced</span> <span>PASS</span>
            </div>
          </div>
          <div className="pt-2 border-t border-white/[0.08] text-neutral-400 text-[10px]">
            Risk Score: 0.05/1.00 (Zero Trust Satisfied)
          </div>
        </div>
      ),
    },
    {
      num: 3,
      title: "3. Funds are Held, Never Sent Blindly",
      headline: "PayPal holds the money in escrow.",
      desc: "Mandate initiates a PayPal Orders v2 authorization. Money is locked securely in PayPal custody for up to 29 days. The seller agent receives guaranteed cryptographic escrow assurance, but cannot withdraw funds prematurely.",
      icon: Lock,
      visual: (
        <div className="p-6 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(34,211,238,0.3)]">
            <Lock className="w-6 h-6" />
          </div>
          <span className="font-mono text-base font-bold text-white block">
            PayPal Orders v2 Authorization Hold
          </span>
          <span className="font-mono text-xs text-cyan-300 block">
            ORDER_ID: 8AB29103KL • $120.00 Held
          </span>
          <p className="text-[11px] text-neutral-400">
            Funds cannot be captured without proof of verified delivery.
          </p>
        </div>
      ),
    },
    {
      num: 4,
      title: "4. AI Arbiter Verifies, Then Releases",
      headline: "The Arbiter checks delivery against the spec.",
      desc: "When the seller agent submits deliverables, our automated Arbiter scores each acceptance criterion with evidence. If all criteria pass, PayPal captures payment to the seller. If rejected, the authorization is voided and returned.",
      icon: Scale,
      visual: (
        <div className="p-4 rounded-2xl bg-black/60 border border-white/[0.1] font-mono text-xs space-y-2">
          <div className="text-purple-400 font-bold">// AI Arbiter Multi-Criteria Verdict</div>
          <div className="space-y-1 text-[11px] text-neutral-300">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Vector SVG exports included (Verified)
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> WCAG AA contrast met (Verified)
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Figma tokens formatted (Verified)
            </div>
          </div>
          <div className="pt-2 border-t border-white/[0.08] text-cyan-300 text-xs font-bold flex justify-between">
            <span>VERDICT: RELEASE</span>
            <span>Confidence: 96%</span>
          </div>
        </div>
      ),
    },
  ];

  const current = steps.find((s) => s.num === activeStep) || steps[0];

  return (
    <section id="how-it-works" className="py-24 px-6 border-t border-white/[0.08] relative">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
            End-to-End Autonomous Lifecycle
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            How Mandate Protects Every Cent
          </h2>
          <p className="text-sm text-neutral-400 max-w-xl mx-auto leading-relaxed">
            The three-layer architecture guaranteeing financial safety across every autonomous transaction.
          </p>
        </div>

        {/* Step Selector Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {steps.map((s) => (
            <button
              key={s.num}
              onClick={() => setActiveStep(s.num)}
              className={`px-4 py-2 rounded-xl text-xs font-mono transition-all ${
                s.num === activeStep
                  ? "bg-white/[0.14] text-white border border-white/[0.25] shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                  : "bg-white/[0.04] text-neutral-400 hover:text-white border border-white/[0.08]"
              }`}
            >
              Step {s.num}: {s.title.split(". ")[1]}
            </button>
          ))}
        </div>

        {/* Dynamic Display Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Copy (6 cols) */}
          <div className="lg:col-span-6 space-y-4 text-left">
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
              {current.title}
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
              {current.headline}
            </h3>
            <p className="text-sm text-neutral-300 leading-relaxed font-sans">{current.desc}</p>
          </div>

          {/* Visual Container (6 cols) */}
          <div className="lg:col-span-6">
            <GlassCard className="p-6 md:p-8 border-cyan-500/30 shadow-[0_20px_50px_-15px_rgba(34,211,238,0.15)]">
              {current.visual}
            </GlassCard>
          </div>
        </div>
      </div>
    </section>
  );
};

