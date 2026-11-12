"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass/GlassCard";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { NoiseOverlay } from "@/components/glass/NoiseOverlay";
import { Lock, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return;
    setDone(true);
    setTimeout(() => {
      router.push("/login");
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#070A12] text-[#F4F6FB] relative">
      <AuroraBackground />
      <NoiseOverlay />

      <div className="w-full max-w-md relative z-10 space-y-6">
        <GlassCard className="p-8 space-y-4">
          <h1 className="text-xl font-bold text-white">Choose New Password</h1>
          <p className="text-xs text-neutral-400">
            Set a new secure password for your Mandate account.
          </p>

          {done ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Password updated successfully. Redirecting to login...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-neutral-300 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-300 mb-1.5">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl brand-gradient-bg text-black font-semibold text-xs transition-transform hover:scale-105"
              >
                Update Password
              </button>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

