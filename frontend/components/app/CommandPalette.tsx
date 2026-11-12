"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Bot,
  FileCheck,
  CreditCard,
  Lock,
  UserCheck,
  ShieldCheck,
  Crosshair,
  PlayCircle,
  Settings,
  Sparkles,
  RotateCcw,
  X,
} from "lucide-react";
import { demoStore } from "@/lib/demo-store";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { label: "Overview Dashboard", icon: LayoutDashboard, category: "Navigation", href: "/app" },
    { label: "Agent Registry", icon: Bot, category: "Navigation", href: "/app/agents" },
    { label: "Mandates & Policies", icon: FileCheck, category: "Navigation", href: "/app/mandates" },
    { label: "Payment Intents Table", icon: CreditCard, category: "Navigation", href: "/app/payments" },
    { label: "Escrow Manager", icon: Lock, category: "Navigation", href: "/app/escrows" },
    { label: "Human Approvals Queue", icon: UserCheck, category: "Navigation", href: "/app/approvals" },
    { label: "Audit Hash Chain", icon: ShieldCheck, category: "Navigation", href: "/app/audit" },
    { label: "Red-Team Attack Suite", icon: Crosshair, category: "Navigation", href: "/app/red-team" },
    { label: "Scenarios Live Stage", icon: PlayCircle, category: "Navigation", href: "/app/scenarios" },
    { label: "Settings & API Keys", icon: Settings, category: "Navigation", href: "/app/settings" },
    {
      label: "Run Scenario: Prompt Injection Attack",
      icon: Sparkles,
      category: "Action",
      run: () => {
        router.push("/app/scenarios?run=injection_attack");
        onClose();
      },
    },
    {
      label: "Run Scenario: Happy Path Verified Settlement",
      icon: Sparkles,
      category: "Action",
      run: () => {
        router.push("/app/scenarios?run=happy_path");
        onClose();
      },
    },
    {
      label: "Create New Mandate",
      icon: FileCheck,
      category: "Action",
      href: "/app/mandates/new",
    },
    {
      label: "Reset Demo Data",
      icon: RotateCcw,
      category: "Action",
      run: () => {
        demoStore.resetAll();
        onClose();
        window.location.reload();
      },
    },
  ];

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item: typeof actions[0]) => {
    if (item.run) {
      item.run();
    } else if (item.href) {
      router.push(item.href);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl bg-[#0D1220] border border-white/[0.16] shadow-2xl overflow-hidden flex flex-col">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.1]">
          <Search className="w-5 h-5 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to page..."
            className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder:text-neutral-500 font-sans"
            autoFocus
          />
          <button onClick={onClose} className="text-neutral-500 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-neutral-500 font-mono">
              No matching commands found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-white/[0.08] text-left transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-neutral-400 group-hover:text-cyan-400 group-hover:border-cyan-400/30 transition-colors">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium text-neutral-200 group-hover:text-white">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.04] text-neutral-500 group-hover:text-neutral-400">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="px-4 py-2 border-t border-white/[0.06] bg-black/40 flex items-center justify-between text-[11px] font-mono text-neutral-500">
          <span>Navigate with arrow keys</span>
          <div className="flex gap-2">
            <span>[ESC] close</span>
            <span>[↵] select</span>
          </div>
        </div>
      </div>
    </div>
  );
};

