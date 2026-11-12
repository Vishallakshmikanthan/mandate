"use client";

import React from "react";
import Link from "next/link";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { NoiseOverlay } from "@/components/glass/NoiseOverlay";
import { GlassCard } from "@/components/glass/GlassCard";
import { Bot, ArrowLeft, ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#070A12] text-[#F4F6FB] relative">
      <AuroraBackground />
      <NoiseOverlay />

      <div className="w-full max-w-md relative z-10 text-center space-y-4">
        <GlassCard className="p-8 space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(244,63,94,0.3)]">
            <Bot className="w-8 h-8 animate-bounce" />
          </div>

          <div>
            <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest">
              Error 404 • Lost Agent
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
              Autonomous Path Undefined
            </h1>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed">
            The agent attempted to traverse an unregistered URL route outside the Mandate gateway perimeter.
          </p>

          <div className="pt-2">
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl brand-gradient-bg text-black font-semibold text-xs transition-transform hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Safe Perimeter</span>
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

