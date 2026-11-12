"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/glass/GlassCard";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { NoiseOverlay } from "@/components/glass/NoiseOverlay";
import { Lock, Mail, User, ShieldCheck, Check, AlertCircle } from "lucide-react";
import { registerUser } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateStrength = (p: string) => {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };

  const strength = calculateStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) return;
    setError(null);
    setLoading(true);

    try {
      await registerUser(email, password, name);
      router.push("/onboarding");
    } catch (err: any) {
      setError(err?.message || "Failed to register account.");
    } finally {
      setLoading(false);
    }
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
            Create Mandate Account
          </h1>
          <p className="text-xs text-neutral-400">
            Deploy deterministic financial safety for autonomous agent commerce.
          </p>
        </div>

        <GlassCard className="p-8 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-neutral-300 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Vishal / Sneha"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-neutral-300 mb-1.5">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-neutral-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  required
                />
              </div>

              {/* Password strength meter */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1 h-1 w-full bg-white/[0.08] rounded-full overflow-hidden">
                    {[1, 2, 3, 4].map((lvl) => (
                      <div
                        key={lvl}
                        className={`h-full flex-1 transition-all ${
                          lvl <= strength
                            ? strength <= 2
                              ? "bg-rose-400"
                              : strength === 3
                              ? "bg-amber-400"
                              : "bg-emerald-400"
                            : "bg-transparent"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400 block">
                    Strength: {strength <= 2 ? "Weak" : strength === 3 ? "Medium" : "Strong (Recommended)"}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-cyan-400 rounded cursor-pointer"
                required
              />
              <label className="text-[11px] text-neutral-400 leading-tight">
                I agree to the{" "}
                <Link href="/legal/terms" className="text-cyan-400 hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/legal/privacy" className="text-cyan-400 hover:underline">
                  Privacy Policy
                </Link>
                .
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !agree}
              className="w-full py-2.5 rounded-xl brand-gradient-bg text-black text-xs font-bold transition-transform hover:scale-105 shadow-[0_0_20px_rgba(108,123,255,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? "Registering Account..." : "Create Account & Start Wizard"}</span>
            </button>
          </form>

          <div className="text-center pt-2">
            <span className="text-xs text-neutral-400">Already have an account? </span>
            <Link href="/login" className="text-xs font-mono text-cyan-400 hover:underline">
              Sign in
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
