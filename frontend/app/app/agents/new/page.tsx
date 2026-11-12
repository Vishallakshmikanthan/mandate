"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GlassCard } from "@/components/glass/GlassCard";
import { Bot, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { demoStore, Agent } from "@/lib/demo-store";

export default function NewAgentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"buyer" | "seller">("buyer");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    // Generate clean slug ID
    const slug = val
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .slice(0, 32);
    setId(slug ? `${slug}_agent` : "");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.length < 3 || name.length > 40) {
      setError("Agent name must be between 3 and 40 characters.");
      return;
    }
    if (!id.trim()) {
      setError("Agent ID is required.");
      return;
    }

    setLoading(true);
    const newAgent: Agent = {
      id: id.trim(),
      name: name.trim(),
      description: description.trim() || "Autonomous agent initialized under Mandate governance.",
      type,
      status: "ACTIVE",
      total_spend_minor: 0,
      tx_count: 0,
      created_at: new Date().toISOString(),
    };

    demoStore.addAgent(newAgent);
    setTimeout(() => {
      setLoading(false);
      router.push("/app/agents");
    }, 400);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      <Link
        href="/app/agents"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Agent Registry
      </Link>

      <div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
          Agent Enrollment
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
          Register New Autonomous Agent
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Provision an identity for an LLM agent to make or receive payments under policy caps.
        </p>
      </div>

      <GlassCard className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-neutral-300 mb-1.5">
              Agent Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Graphic Designer Buyer Bot"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-neutral-300 mb-1.5">
              Agent Machine Identifier <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="e.g. buyer_agent_design"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-sm font-mono text-cyan-300 placeholder:text-neutral-500 focus:outline-none focus:border-cyan-400"
              required
            />
            <p className="text-[10px] font-mono text-neutral-500 mt-1">
              Deterministic handle passed by the agent in API payment intent payloads.
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono text-neutral-300 mb-1.5">
              Agent Role / Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("buyer")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  type === "buyer"
                    ? "bg-cyan-500/15 border-cyan-400 text-white shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                    : "bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:text-white"
                }`}
              >
                <div className="font-semibold text-xs text-white">Buyer Agent</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">Spends money under assigned mandate</div>
              </button>
              <button
                type="button"
                onClick={() => setType("seller")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  type === "seller"
                    ? "bg-purple-500/15 border-purple-400 text-white shadow-[0_0_15px_rgba(167,139,250,0.2)]"
                    : "bg-white/[0.03] border-white/[0.08] text-neutral-400 hover:text-white"
                }`}
              >
                <div className="font-semibold text-xs text-white">Seller Agent</div>
                <div className="text-[11px] text-neutral-400 mt-0.5">Submits deliverables and receives release</div>
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono text-neutral-300">Description / Goal</label>
              <span className="text-[10px] font-mono text-neutral-500">{description.length}/280</span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={280}
              rows={3}
              placeholder="What task or service does this agent perform?"
              className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Link
              href="/app/agents"
              className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-neutral-300 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl brand-gradient-bg text-black font-semibold text-xs transition-transform hover:scale-105 shadow-[0_0_20px_rgba(108,123,255,0.4)] disabled:opacity-50"
            >
              {loading ? "Registering..." : "Confirm & Enroll Agent"}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}

