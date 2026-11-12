"use client";

import React from "react";
import { Counter } from "@/components/motion/Counter";

export const StatsStrip: React.FC = () => {
  const stats = [
    { label: "Deterministic Rules Evaluated", value: 10, suffix: " Rules", note: "Zero-bypass code logic" },
    { label: "Layers of Active Defense", value: 3, suffix: " Layers", note: "Firewall + Risk + Escrow" },
    { label: "PayPal Calls After Verification", value: 100, suffix: "%", note: "0 unauthorized leakage" },
    { label: "Audit Events Hash-Chained", value: 100, suffix: "%", note: "SHA-256 tamper-evident" },
  ];

  return (
    <section className="py-16 px-6 border-y border-white/[0.08] bg-[#05070c]">
      <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
        {stats.map((s, idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-white">
              <Counter value={s.value} suffix={s.suffix} />
            </div>
            <p className="text-xs font-semibold text-neutral-300">{s.label}</p>
            <p className="text-[10px] font-mono text-neutral-500 uppercase">{s.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

