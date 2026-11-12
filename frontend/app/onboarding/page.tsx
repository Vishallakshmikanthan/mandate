"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { NoiseOverlay } from "@/components/glass/NoiseOverlay";
import {
  Sparkles,
  Bot,
  Lock,
  FileCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { demoStore, Agent, MandateItem } from "@/lib/demo-store";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Form states
  const [userName, setUserName] = useState("Vishal");
  const [useCase, setUseCase] = useState("freelance");
  const [paypalConnected, setPaypalConnected] = useState(true);
  const [agentName, setAgentName] = useState("Alpha Procurement Agent");
  const [agentType, setAgentType] = useState<"buyer" | "seller">("buyer");
  const [template, setTemplate] = useState("small_business");

  const handleFinish = () => {
    // Register agent and mandate in store
    const agent: Agent = {
      id: "agent_alpha_first",
      name: agentName,
      description: "First enrolled agent from onboarding setup wizard.",
      type: agentType,
      status: "ACTIVE",
      total_spend_minor: 0,
      tx_count: 0,
      created_at: new Date().toISOString(),
    };
    demoStore.addAgent(agent);
    router.push("/app/scenarios");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#070A12] text-[#F4F6FB] relative">
      <AuroraBackground />
      <NoiseOverlay />

      <div className="w-full max-w-xl relative z-10 space-y-6 animate-in fade-in duration-300">
        {/* Header with step dots */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl brand-gradient-bg flex items-center justify-center font-bold text-black text-base shadow-[0_0_20px_rgba(108,123,255,0.5)] mx-auto mb-3">
            M
          </div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
            Setup Wizard • Step {step} of 4
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Initialize Your Mandate Environment
          </h1>

          {/* Dots */}
          <div className="flex justify-center gap-2 pt-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  s === step
                    ? "w-8 brand-gradient-bg"
                    : s < step
                    ? "bg-emerald-400"
                    : "bg-white/[0.12]"
                }`}
              />
            ))}
          </div>
        </div>

        <GlassCard className="p-8">
          {/* Step 1: Welcome & Use Case */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h3 className="text-base font-semibold text-white">Welcome to Mandate</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Let&apos;s personalize your autonomous spending boundaries.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-300 mb-1.5">
                  Your Full Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-300 mb-2">
                  Primary Autonomous Commerce Use Case
                </label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[
                    { id: "freelance", title: "Freelance Marketplace", desc: "Design & dev deliverables" },
                    { id: "procurement", title: "Corporate Procurement", desc: "SaaS licenses & API tokens" },
                    { id: "personal", title: "Parent / Student Budget", desc: "Controlled spending limits" },
                    { id: "exploring", title: "Just Exploring Sandbox", desc: "Demo testing & red-teaming" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setUseCase(item.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        useCase === item.id
                          ? "bg-cyan-500/15 border-cyan-400 text-white shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                          : "bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:text-white"
                      }`}
                    >
                      <div className="font-semibold text-xs text-white">{item.title}</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Connect PayPal Sandbox */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h3 className="text-base font-semibold text-white">Connect PayPal Sandbox</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Mandate locks money in escrow via PayPal Orders v2 authorization holds.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-semibold">
                  <Lock className="w-4 h-4" /> Ready-to-Use Sandbox Account
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  We have pre-configured a sandbox environment with credentials for testing autonomous authorization holds, capture, and arbitration refunds.
                </p>
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold">
                  <CheckCircle2 className="w-4 h-4" /> PayPal Orders v2 Sandbox Connected
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Register First Agent */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h3 className="text-base font-semibold text-white">Register Your First Agent</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Provision an entity that will negotiate purchases within your policy limits.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-300 mb-1.5">Agent Name</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-300 mb-1.5">Agent Role</label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setAgentType("buyer")}
                    className={`p-3 rounded-xl border text-left ${
                      agentType === "buyer"
                        ? "bg-cyan-500/15 border-cyan-400 text-white"
                        : "bg-white/[0.03] border-white/[0.08] text-neutral-400"
                    }`}
                  >
                    <div className="font-semibold text-xs text-white">Buyer Agent</div>
                    <div className="text-[10px] text-neutral-400">Initiates and authorizes payments</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAgentType("seller")}
                    className={`p-3 rounded-xl border text-left ${
                      agentType === "seller"
                        ? "bg-purple-500/15 border-purple-400 text-white"
                        : "bg-white/[0.03] border-white/[0.08] text-neutral-400"
                    }`}
                  >
                    <div className="font-semibold text-xs text-white">Seller Agent</div>
                    <div className="text-[10px] text-neutral-400">Submits work for escrow release</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Create First Mandate */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <h3 className="text-base font-semibold text-white">Select a Mandate Spending Policy</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Pick a battle-tested template or review the canonical limits.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: "small_business",
                    title: "Freelance & Creative Standard",
                    cap: "$200.00 / txn",
                    total: "$500.00 total",
                    escrow: "PayPal Escrow Enforced",
                  },
                  {
                    id: "student",
                    title: "Parent-Controlled Student Budget",
                    cap: "$50.00 / txn",
                    total: "$150.00 total",
                    escrow: "Direct Settlement",
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTemplate(item.id)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all ${
                      template === item.id
                        ? "bg-cyan-500/15 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                        : "bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:text-white"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-xs text-white">{item.title}</span>
                      <span className="text-[10px] font-mono text-cyan-300">{item.cap}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-mono text-neutral-400 mt-1">
                      <span>{item.total}</span>
                      <span className="text-emerald-400">{item.escrow}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-black/50 border border-white/[0.08] text-[11px] font-mono text-neutral-300">
                HMAC-SHA256 signature will automatically seal this policy upon entry.
              </div>
            </div>
          )}

          {/* Stepper Footer Buttons */}
          <div className="mt-8 pt-4 border-t border-white/[0.08] flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-neutral-300 transition-colors"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl brand-gradient-bg text-black font-semibold text-xs transition-transform hover:scale-105"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl brand-gradient-bg text-black font-bold text-xs transition-transform hover:scale-105 shadow-[0_0_25px_rgba(108,123,255,0.6)]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Launch & Run First Scenario</span>
              </button>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

