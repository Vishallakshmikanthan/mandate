"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface AppTopbarProps {
  onOpenCommandPalette?: () => void;
  streamConnected?: boolean;
}

export const AppTopbar: React.FC<AppTopbarProps> = ({
  onOpenCommandPalette,
  streamConnected = true,
}) => {
  const pathname = usePathname();

  // Compute breadcrumb based on route
  const getBreadcrumb = () => {
    if (pathname === "/app" || pathname === "/app/scenarios") return "Overview / Live scenarios";
    if (pathname === "/app/agents") return "Control / Agents";
    if (pathname?.startsWith("/app/agents/new")) return "Agents / New agent";
    if (pathname?.startsWith("/app/mandates/new")) return "Mandates / New mandate";
    if (pathname?.startsWith("/app/mandates")) return "Control / Mandates";
    if (pathname?.startsWith("/app/escrows/")) return "Escrows / Detail";
    if (pathname?.startsWith("/app/escrows")) return "Money / Escrows";
    if (pathname?.startsWith("/app/payments")) return "Money / Payments";
    if (pathname?.startsWith("/app/approvals")) return "Money / Approvals";
    if (pathname?.startsWith("/app/red-team")) return "Trust / Red-team";
    if (pathname?.startsWith("/app/audit")) return "Trust / Audit log";
    return "Overview / Live scenarios";
  };

  return (
    <header className="h-14 px-6 rounded-full bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex items-center justify-between mb-6">
      {/* Left: Breadcrumbs */}
      <div className="text-sm font-normal text-neutral-300">
        <span>{getBreadcrumb()}</span>
      </div>

      {/* Center: Search / Command Palette Pill */}
      <button
        onClick={onOpenCommandPalette}
        className="hidden md:flex items-center gap-2 px-6 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-neutral-400 hover:text-neutral-200 transition-all min-w-[280px]"
      >
        <span>Search or jump to...</span>
        <kbd className="ml-auto text-[10px] text-neutral-400 font-sans">Ctrl K</kbd>
      </button>

      {/* Right: Badges + User Avatar */}
      <div className="flex items-center gap-3">
        {/* Stream Live Badge */}
        <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-neutral-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-neutral-300">Stream live</span>
        </div>

        {/* PayPal Orders v2 Pill */}
        <div className="hidden sm:block px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-neutral-300">
          PayPal Orders v2
        </div>

        {/* User Initials Avatar */}
        <div className="w-8 h-8 rounded-full bg-neutral-200 text-neutral-900 font-semibold text-xs flex items-center justify-center shadow-inner">
          VL
        </div>
      </div>
    </header>
  );
};
