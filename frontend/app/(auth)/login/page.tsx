"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass/GlassCard";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { NoiseOverlay } from "@/components/glass/NoiseOverlay";
import { Lock, Mail, Sparkles, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { loginUser, loginAsDemoSupervisor } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginUser(email, password);
      router.push("/app");
    } catch (err: any) {
      setError(err?.message || "Failed to log in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = async () => {
    setError(null);
    setDemoLoading(true);

    try {
      await loginAsDemoSupervisor();
      router.push("/app");
    } catch (err: any) {
      setError(err?.message || "Failed to start demo session.");
    } finally {
      setDemoLoading(false);
    }
  };

  const fillCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError(null);
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
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Demo Access Shortcut for Instant Exploration */}
          <button
            onClick={handleDemoAccess}
            disabled={demoLoading || loading}
            type="button"
            className="w-full py-2.5 px-4 rounded-xl brand-gradient-bg text-black font-bold text-xs flex items-center justify-center gap-2 transition-transform hover:scale-105 shadow-[0_0_20px_rgba(108,123,255,0.4)] disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{demoLoading ? "Initializing Demo Sandbox..." : "One-Click Demo Access"}</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="h-[1px] flex-1 bg-white/[0.08]" />
            <span className="text-[10px] font-mono uppercase text-neutral-500">or sign in with password</span>
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
                  placeholder="supervisor@mandate.demo"
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:outline-none focus:border-cyan-400 placeholder:text-neutral-600 font-mono"
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
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:outline-none focus:border-cyan-400 placeholder:text-neutral-600 font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || demoLoading}
              className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.14] text-white text-xs font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>{loading ? "Authenticating via Neon DB..." : "Sign In to Workspace"}</span>
            </button>
          </form>

          {/* Preset Credentials Helper Pill */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
            <span className="text-[10px] font-mono uppercase text-neutral-400 block tracking-wider">
              Quick Autofill Credentials
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => fillCredentials("supervisor@mandate.demo", "Mandate2026!")}
                className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[11px] font-mono text-cyan-300 transition"
              >
                Demo Supervisor
              </button>
              <button
                type="button"
                onClick={() => fillCredentials("admin@mandate.dev", "SecureAdminPassword123!")}
                className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[11px] font-mono text-emerald-300 transition"
              >
                Admin User
              </button>
            </div>
          </div>

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
