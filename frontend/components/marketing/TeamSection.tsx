"use client";

import React from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import { Award, Sparkles } from "lucide-react";

export const TeamSection: React.FC = () => {
  return (
    <section className="py-24 px-6 border-t border-white/[0.08] relative">
      <div className="max-w-4xl mx-auto space-y-10 text-center">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
            Hackathon Engineering Team
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white mt-1">
            Built by Team VibeSync
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto mt-2 leading-relaxed">
            Engineered for the <em>Build What&apos;s Next with PayPal and AI Hackathon</em> by Vishal & Sneha.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left">
          {/* Member 1: Vishal */}
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-lg font-bold">
                V
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Vishal Lakshmikanthan</h3>
                <span className="text-xs font-mono text-cyan-400">Full-Stack & Systems Architecture</span>
              </div>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed font-sans">
              Designed the deterministic Policy Engine, cryptographic HMAC-SHA256 mandate signing, and PayPal Orders v2 authorization state machine.
            </p>
            <div className="pt-2 flex items-center gap-3 text-xs font-mono text-neutral-400">
              <span className="px-2 py-0.5 rounded bg-white/[0.04]">Backend</span>
              <span className="px-2 py-0.5 rounded bg-white/[0.04]">PayPal v2</span>
              <span className="px-2 py-0.5 rounded bg-white/[0.04]">Security</span>
            </div>
          </GlassCard>

          {/* Member 2: Sneha */}
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-lg font-bold">
                S
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Sneha</h3>
                <span className="text-xs font-mono text-cyan-400">AI Intelligence & Arbiter Logic</span>
              </div>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed font-sans">
              Engineered the Gemini AI LLM Risk Scorer with tighten-only invariants and the automated multi-criteria deliverable Arbiter.
            </p>
            <div className="pt-2 flex items-center gap-3 text-xs font-mono text-neutral-400">
              <span className="px-2 py-0.5 rounded bg-white/[0.04]">Gemini LLM</span>
              <span className="px-2 py-0.5 rounded bg-white/[0.04]">AI Arbiter</span>
              <span className="px-2 py-0.5 rounded bg-white/[0.04]">Frontend UI/UX</span>
            </div>
          </GlassCard>
        </div>
      </div>
    </section>
  );
};
