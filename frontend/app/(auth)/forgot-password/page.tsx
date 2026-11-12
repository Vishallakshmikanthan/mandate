"use client";

import React, { useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { NoiseOverlay } from "@/components/glass/NoiseOverlay";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#070A12] text-[#F4F6FB] relative">
      <AuroraBackground />
      <NoiseOverlay />

      <div className="w-full max-w-md relative z-10 space-y-6">
        <GlassCard className="p-8 space-y-4">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
          </Link>

          <div>
            <h1 className="text-xl font-bold text-white">Reset Password</h1>
            <p className="text-xs text-neutral-400 mt-1">
              Enter your registered work email to receive password reset instructions.
            </p>
          </div>

          {submitted ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Password reset instructions sent to {email}. Check your inbox.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-neutral-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl brand-gradient-bg text-black font-semibold text-xs transition-transform hover:scale-105"
              >
                Send Reset Link
              </button>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

