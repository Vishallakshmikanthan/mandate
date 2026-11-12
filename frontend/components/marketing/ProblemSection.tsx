"use client";

import React from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import { AlertOctagon, RotateCcw, HelpCircle, ShieldAlert } from "lucide-react";

export const ProblemSection: React.FC = () => {
  const problems = [
    {
      icon: AlertOctagon,
      title: "Agents can be tricked.",
      subtitle: "Adversarial Prompt Injections",
      description:
        "LLMs cannot distinguish data from instructions. An attacker in an email or product review can trick a buyer agent into transferring money or escalating transaction values.",
      color: "rose",
    },
    {
      icon: RotateCcw,
      title: "Payments are irreversible.",
      subtitle: "Money Gone Instantly",
      description:
        "Traditional payment gateways execute transfers immediately upon receipt of an API request. Once an autonomous agent fires an unauthorized payment, the funds are drained permanently.",
      color: "amber",
    },
    {
      icon: HelpCircle,
      title: "Nobody verifies the work.",
      subtitle: "Pay First, Hope Later",
      description:
        "When autonomous agents contract other agents for digital deliverables (code, design, research), upfront payment risks substandard output with zero objective dispute resolution.",
      color: "purple",
    },
  ];

  return (
    <section className="relative py-24 px-6 problem-vignette overflow-hidden">
      <div className="max-w-6xl mx-auto space-y-12 text-center">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400">
            The Silent Risk in Agentic Commerce
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mt-2">
            Giving an LLM an API key to your wallet is a disaster waiting to happen.
          </h2>
          <p className="text-sm text-neutral-400 max-w-2xl mx-auto mt-4 leading-relaxed">
            Autonomous agents are multiplying. Without mathematical guardrails, a single prompt injection can drain your corporate treasury or student allowance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {problems.map((p, i) => {
            const Icon = p.icon;
            return (
              <GlassCard
                key={i}
                className="p-8 space-y-4 border-rose-500/20 hover:border-rose-500/40 bg-rose-950/[0.05]"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-rose-300">
                    {p.subtitle}
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1">{p.title}</h3>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">{p.description}</p>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
};

