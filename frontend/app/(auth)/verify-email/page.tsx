"use client";

import React from "react";
import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { NoiseOverlay } from "@/components/glass/NoiseOverlay";
import { MailCheck, ArrowRight } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#070A12] text-[#F4F6FB] relative">
      <AuroraBackground />
      <NoiseOverlay />

      <div className="w-full max-w-md relative z-10">
        <GlassCard className="p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
            <MailCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white">Check Your Inbox</h1>
          <p className="text-xs text-neutral-400 leading-relaxed">
            We sent a verification link to your email. Click it to activate your autonomous gateway workspace.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl brand-gradient-bg text-black font-semibold text-xs transition-transform hover:scale-105"
          >
            <span>Proceed to Login</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </GlassCard>
      </div>
    </div>
  );
}

