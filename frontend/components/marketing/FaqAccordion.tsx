"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import { ChevronDown } from "lucide-react";

export const FaqAccordion: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "What is a Mandate?",
      a: "A Mandate is a cryptographically signed spending boundary that dictates exactly how much money an autonomous agent may spend, with which counterparties, in which merchant categories, and during which hours. It is sealed with an HMAC-SHA256 signature that prevents runtime tampering.",
    },
    {
      q: "What if the AI Risk Scorer makes a mistake?",
      a: "Mandate is designed around a mathematical 'Tighten-Only' invariant. The AI Risk Scorer can elevate scrutiny, escalate to human approval, or block a suspicious transaction—it can NEVER override or bypass a deterministic limit. If code rules say no, the answer is always no.",
    },
    {
      q: "Does Mandate hold my money?",
      a: "No. Mandate is non-custodial. Funds are held directly in PayPal custody using PayPal Orders v2 two-phase authorizations. Money moves between the buyer's PayPal account and the seller's PayPal account; Mandate only orchestrates the cryptographic authorization and release commands.",
    },
    {
      q: "Which PayPal APIs are used?",
      a: "Mandate utilizes PayPal Orders v2 with 'intent': 'AUTHORIZE'. This creates a guaranteed hold on buyer funds for up to 29 days without transferring money immediately. Once the AI Arbiter verifies the deliverable, Mandate calls PayPal's capture endpoint; if disputed, Mandate voids the authorization.",
    },
    {
      q: "Is this production ready?",
      a: "The architecture is built on standard cryptographic primitives (HMAC-SHA256, Merkle hash chains) and production PayPal Orders v2 APIs. The SQLite database used in this demo can be toggled to Postgres with a single environment variable.",
    },
  ];

  return (
    <section className="py-24 px-6 border-t border-white/[0.08] relative">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
            Frequently Asked Questions
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Everything You Need to Know
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <GlassCard
                key={idx}
                className="p-5 cursor-pointer transition-all"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-sm font-semibold text-white tracking-tight">{faq.q}</h3>
                  <ChevronDown
                    className={`w-4 h-4 text-cyan-400 transition-transform duration-300 flex-shrink-0 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
                {isOpen && (
                  <p className="mt-3 text-xs text-neutral-300 leading-relaxed font-sans border-t border-white/[0.06] pt-3 animate-in fade-in duration-200">
                    {faq.a}
                  </p>
                )}
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
};

