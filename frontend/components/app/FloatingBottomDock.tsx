"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MandateShieldIcon } from "@/components/ui/MandateLogo";
import { X, Shield, Cpu, FileText, Activity } from "lucide-react";

export const FloatingBottomDock: React.FC = () => {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const quickLinks = [
    { label: "AI agents", href: "/app/agents", active: pathname?.startsWith("/app/agents") },
    { label: "PayPal escrow", href: "/app/escrows", active: pathname?.startsWith("/app/escrows") },
    { label: "Audit chain", href: "/app/audit", active: pathname?.startsWith("/app/audit") },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2.5 pointer-events-auto select-none">
      {/* Expanded Quick Menu Dropup */}
      {menuOpen && (
        <div className="mb-2 p-3 bg-[#131d20]/95 backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-2xl flex flex-col gap-1 min-w-[200px] animate-in fade-in slide-in-from-bottom-2">
          <Link
            href="/app/scenarios"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-neutral-300 hover:text-white hover:bg-white/[0.08] transition"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Live Scenarios</span>
          </Link>
          <Link
            href="/app/mandates/new"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-neutral-300 hover:text-white hover:bg-white/[0.08] transition"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mandate Builder</span>
          </Link>
          <Link
            href="/app/red-team"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-neutral-300 hover:text-white hover:bg-white/[0.08] transition"
          >
            <Cpu className="w-3.5 h-3.5 text-rose-400" />
            <span>Red-Team Suite</span>
          </Link>
          <Link
            href="/docs"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-neutral-300 hover:text-white hover:bg-white/[0.08] transition"
          >
            <FileText className="w-3.5 h-3.5 text-neutral-400" />
            <span>Documentation</span>
          </Link>
        </div>
      )}

      {/* Main Pill: Brand Logo + Hamburger */}
      <div className="flex items-center justify-between gap-6 px-5 py-2 rounded-full bg-[#152326]/85 hover:bg-[#18282b] backdrop-blur-2xl border border-white/[0.1] shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition-all">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-white hover:text-neutral-200">
          <MandateShieldIcon size={16} />
          <span>
            Mandate<span className="text-[#E9DDC6]">.</span>
          </span>
        </Link>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-neutral-300 hover:text-white transition flex items-center justify-center p-0.5 ml-2"
          aria-label="Toggle quick navigation"
        >
          {menuOpen ? <X className="w-4 h-4" /> : <span className="font-mono text-sm font-medium leading-none">=</span>}
        </button>
      </div>

      {/* Secondary Pill Row: 3 Quick Jumps */}
      <div className="flex items-center gap-2">
        {quickLinks.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`px-4 py-1.5 rounded-full text-xs font-normal transition-all ${
              item.active
                ? "bg-white/[0.18] text-white border border-white/[0.2] shadow-sm"
                : "bg-[#152326]/80 hover:bg-[#192b2f]/90 text-neutral-300 hover:text-white border border-white/[0.08] backdrop-blur-md"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
};
