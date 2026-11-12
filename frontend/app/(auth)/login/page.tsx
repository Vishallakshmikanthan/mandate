"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass/GlassCard";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { NoiseOverlay } from "@/components/glass/NoiseOverlay";
import { Lock, Mail, ShieldAlert, Sparkles } from "lucide-react";
import { isDemoMode } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const demoActive = isDemoMode();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoActive) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/app");
    }, 400);
  };

  const handleDemoAccess = () => {
    router.push("/app");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#070A12] text-[#F4F6FB] relative">
      <AuroraBackground />
      <NoiseOverlay />

      <div className="w-full max-w-md relative z-10 space-y-6 animate-in fade-in duration-300">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-2xl brand-gradient-bg flex items-center justify-center font-bold text-black text-lg shadow-[0_0_20px_rgba(108,123,255,0.5)]">
              M
            </div>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Log in to Mandate
          </h1>
          <p className="text-xs text-neutral-400">
            Access the autonomous agent firewall and PayPal escrow manager.
          </p>
        </div>

        <GlassCard className="p-8 space-y-5">
          {!demoActive ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mx-auto text-amber-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-white">Authentication not configured</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Real human user authentication, password hashing, and scoped agent API keys are provisioned in Phase 3.
                </p>
                <p className="text-xs text-neutral-400 leading-relaxed pt-2">
                  To explore the demonstration sandbox, enable <code className="font-mono text-cyan-300 bg-white/[0.06] px-1.5 py-0.5 rounded">NEXT_PUBLIC_DEMO_MODE=true</code> in your frontend environment.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-mono text-white transition"
                >
                  Return to Homepage
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Quick Demo Access Shortcut for Judges */}
              <button
                onClick={handleDemoAccess}
                type="button"
                className="w-full py-2.5 px-4 rounded-xl brand-gradient-bg text-black font-bold text-xs flex items-center justify-center gap-2 transition-transform hover:scale-105 shadow-[0_0_20px_rgba(108,123,255,0.4)]"
              >
                <Sparkles className="w-4 h-4" />
                <span>One-Click Demo Access</span>
              </button>

              <div className="flex items-center gap-3">
                <div className="h-[1px] flex-1 bg-white/[0.08]" />
                <span className="text-[10px] font-mono uppercase text-neutral-500">or with email</span>
                <div className="h-[1px] flex-1 bg-white/[0.08]" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-neutral-300 mb-1.5">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="email"
                      value={email}
                      placeholder="user@example.com"
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:outline-none focus:border-cyan-400 placeholder:text-neutral-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-mono text-neutral-300">Password</label>
                    <Link
                      href="/forgot-password"
                      className="text-[11px] font-mono text-cyan-400 hover:underline"
                    >
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="password"
                      value={password}
                      placeholder="••••••••••••"
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:outline-none focus:border-cyan-400 placeholder:text-neutral-600"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.14] text-white text-xs font-semibold transition-all disabled:opacity-50"
                >
                  {loading ? "Authenticating..." : "Sign In to Workspace"}
                </button>
              </form>
            </>
          )}

          <div className="text-center pt-2">
            <span className="text-xs text-neutral-400">Don&apos;t have an account? </span>
            <Link href="/signup" className="text-xs font-mono text-cyan-400 hover:underline">
              Create an account
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
