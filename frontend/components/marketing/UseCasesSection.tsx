"use client";

import React from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import { Palette, Building2, GraduationCap, CheckCircle2 } from "lucide-react";

export const UseCasesSection: React.FC = () => {
  const useCases = [
    {
      icon: Palette,
      title: "Freelance Marketplace Agents",
      tagline: "Autonomous design & development escrow",
      desc: "Buyer agents negotiate branding, UI design, or code packages with seller bots. Funds are locked in PayPal escrow until AI Arbiter verifies SVG files, Figma tokens, or tests passing.",
      mandate: "Cap: $200.00/txn • Total: $500.00 • Escrow Required",
    },
    {
      icon: Building2,
      title: "Corporate Procurement Agents",
      tagline: "API credits, SaaS licenses, cloud resources",
      desc: "Enterprise bots purchase infrastructure or API credits autonomously. Strict daily limits and velocity caps prevent runaway recursive API billing loops.",
      mandate: "Cap: $500.00/txn • Daily: $1,000.00 • Escalate > $350.00",
    },
    {
      icon: GraduationCap,
      title: "Parent-Controlled Student Agents",
      tagline: "Educational stipends & study materials",
      desc: "Autonomous tutoring agents can purchase textbooks, online courses, or research papers up to a fixed monthly allowance, with notifications sent to parents.",
      mandate: "Cap: $50.00/txn • Total: $150.00/mo • Category: Education",
    },
  ];

  return (
    <section className="py-24 px-6 border-t border-white/[0.08] relative">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
            Real-World Workloads
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            Designed for Every Autonomous Use Case
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto leading-relaxed">
            From single-purpose creative bots to enterprise procurement fleets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {useCases.map((u, i) => {
            const Icon = u.icon;
            return (
              <GlassCard key={i} className="p-6 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.05] border border-white/[0.1] text-cyan-400 flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase text-cyan-300">
                      {u.tagline}
                    </span>
                    <h3 className="text-lg font-bold text-white mt-1">{u.title}</h3>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed font-sans">{u.desc}</p>
                </div>

                <div className="pt-3 border-t border-white/[0.08] text-[11px] font-mono text-cyan-400 bg-white/[0.02] p-2.5 rounded-xl border border-white/[0.04]">
                  {u.mandate}
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
};

