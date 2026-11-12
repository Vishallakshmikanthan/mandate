"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MandateLogo } from "@/components/ui/MandateLogo";
import clsx from "clsx";

interface AppSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = () => {
  const pathname = usePathname();
  const [isPaused, setIsPaused] = useState(false);

  const navItems = [
    { label: "Overview", href: "/app", active: pathname === "/app" || pathname === "/app/scenarios" },
    { label: "Agents", href: "/app/agents", active: pathname?.startsWith("/app/agents") },
    { label: "Mandates", href: "/app/mandates", active: pathname?.startsWith("/app/mandates") },
    { label: "Payments", href: "/app/payments", active: pathname?.startsWith("/app/payments") },
    { label: "Escrows", href: "/app/escrows", active: pathname?.startsWith("/app/escrows") },
    { label: "Approvals", href: "/app/approvals", active: pathname?.startsWith("/app/approvals") },
    { label: "Red-team", href: "/app/red-team", active: pathname?.startsWith("/app/red-team") },
    { label: "Audit log", href: "/app/audit", active: pathname?.startsWith("/app/audit") },
  ];

  return (
    <aside className="w-[210px] flex-shrink-0 flex flex-col justify-between p-5 rounded-3xl bg-[#142225]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
      {/* Top Brand Logo & Status */}
      <div className="space-y-3">
        <div>
          <Link href="/" className="hover:opacity-90 transition block">
            <MandateLogo size="md" />
          </Link>
          <div className="mt-2">
            <span className="inline-block px-3 py-0.5 rounded-full text-[11px] font-normal text-neutral-400 bg-white/[0.04] border border-white/[0.08]">
              Sandbox
            </span>
          </div>
        </div>

        {/* Clean Nav Links */}
        <nav className="flex flex-col space-y-1 pt-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={clsx(
                "px-3.5 py-1.5 rounded-full text-sm font-normal transition-all text-left block",
                item.active
                  ? "bg-white/[0.14] text-white font-medium shadow-sm"
                  : "text-neutral-400 hover:text-white hover:bg-white/[0.05]"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Bottom Pause Agents Kill-switch */}
      <div className="pt-4">
        <button
          onClick={() => {
            setIsPaused(!isPaused);
            alert(isPaused ? "All agent permissions resumed." : "Safety pause enabled: All agent spending stopped.");
          }}
          className={clsx(
            "w-full py-2.5 px-4 rounded-full text-xs font-normal transition-all border text-center",
            isPaused
              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
              : "border-rose-500/25 text-rose-300/80 hover:text-rose-200 hover:bg-rose-500/10 hover:border-rose-500/40"
          )}
        >
          {isPaused ? "Agents paused" : "Pause all agents"}
        </button>
      </div>
    </aside>
  );
};
