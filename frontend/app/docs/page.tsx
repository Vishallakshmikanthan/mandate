"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { NoiseOverlay } from "@/components/glass/NoiseOverlay";
import { FloatingBottomDock } from "@/components/app/FloatingBottomDock";
import { MandateLogo } from "@/components/ui/MandateLogo";

export default function DocsPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const curlSnippet = `curl -X POST http://localhost:8000/api/intents \\
  -H "Content-Type: application/json" \\
  -d '{
    "mandate_id": "mnd_design_01",
    "agent_id": "buyer_agent_alpha",
    "counterparty": "seller_agent_acme",
    "amount_minor": 12000,
    "currency": "USD",
    "merchant_category": "freelance_design",
    "description": "Logo vector assets"
  }'`;

  const pythonSnippet = `import requests

# 1. Ask Mandate to check the payment before touching PayPal
response = requests.post(
    "http://localhost:8000/api/intents",
    json={
        "mandate_id": "mnd_design_01",
        "agent_id": "buyer_agent_alpha",
        "counterparty": "seller_agent_acme",
        "amount_minor": 12000,  # $120.00 in cents
        "currency": "USD",
        "merchant_category": "freelance_design",
        "description": "3 vector logo files"
    }
)

decision = response.json()
print("Payment allowed?", decision["decision"] == "APPROVED")`;

  return (
    <div className="min-h-screen flex flex-col bg-[#0c1416] text-[#F4F6FB] relative overflow-x-hidden">
      <AuroraBackground />
      <NoiseOverlay />

      {/* Floating Top Navbar */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 w-full max-w-5xl px-6 z-40">
        <div className="h-14 px-6 rounded-full bg-[#142225]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex items-center justify-between">
          <Link href="/" className="hover:opacity-90 transition">
            <MandateLogo size="md" />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-300">
            <Link href="/how-it-works" className="hover:text-white transition">
              How it works
            </Link>
            <Link href="/security" className="hover:text-white transition">
              Security
            </Link>
            <Link href="/pricing" className="hover:text-white transition">
              Pricing
            </Link>
            <Link href="/brand" className="hover:text-white transition">
              Brand
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="px-4 py-1.5 rounded-full text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-100 transition shadow-sm"
            >
              Open app
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-6 pt-36 pb-32 relative z-10 space-y-12">
        <div className="space-y-3">
          <span className="text-xs text-neutral-400 font-normal">Developer Quickstart</span>
          <h1 className="text-4xl sm:text-6xl font-light tracking-tight text-white">
            Connect in 2 minutes
          </h1>
          <p className="text-sm sm:text-base text-neutral-300 max-w-xl leading-relaxed">
            Protect any Python, LangChain, or autonomous agent with one simple API call before paying.
          </p>
        </div>

        {/* Step 1 Card: How it works in 3 steps */}
        <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-2xl border border-white/[0.08] p-6 sm:p-8 space-y-4">
          <h3 className="text-lg font-semibold text-white">How the integration works</h3>
          <ol className="space-y-3 text-xs sm:text-sm text-neutral-300 list-decimal list-inside leading-relaxed font-sans">
            <li>
              <strong className="text-white">Give your agent a Mandate ID:</strong> Instead of giving your agent your PayPal password or private card number, give it a Mandate policy ID.
            </li>
            <li>
              <strong className="text-white">Agent requests payment intent:</strong> Whenever your agent wants to buy something, it asks Mandate for permission.
            </li>
            <li>
              <strong className="text-white">Mandate verifies and holds:</strong> If all rules pass, Mandate holds the funds in PayPal and returns an approval.
            </li>
          </ol>
        </div>

        {/* Python Example Card */}
        <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-2xl border border-white/[0.08] p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-300 font-medium">Python (Requests / LangChain)</span>
            <button
              onClick={() => copyCode(pythonSnippet, "py")}
              className="text-xs text-neutral-400 hover:text-white px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08]"
            >
              {copied === "py" ? "Copied ✓" : "Copy code"}
            </button>
          </div>
          <div className="rounded-xl bg-[#091012] border border-white/[0.06] p-4 font-mono text-xs text-neutral-300 overflow-x-auto leading-relaxed">
            <pre>{pythonSnippet}</pre>
          </div>
        </div>

        {/* cURL Example Card */}
        <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-2xl border border-white/[0.08] p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-300 font-medium">cURL Command</span>
            <button
              onClick={() => copyCode(curlSnippet, "curl")}
              className="text-xs text-neutral-400 hover:text-white px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08]"
            >
              {copied === "curl" ? "Copied ✓" : "Copy code"}
            </button>
          </div>
          <div className="rounded-xl bg-[#091012] border border-white/[0.06] p-4 font-mono text-xs text-neutral-300 overflow-x-auto leading-relaxed">
            <pre>{curlSnippet}</pre>
          </div>
        </div>
      </main>

      <FloatingBottomDock />
    </div>
  );
}
