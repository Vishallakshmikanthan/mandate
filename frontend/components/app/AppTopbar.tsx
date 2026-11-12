"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, clearAuthSession, fetchUserProfile, UserProfile } from "@/lib/auth";
import { LogOut, User as UserIcon, Database, Shield } from "lucide-react";

interface AppTopbarProps {
  onOpenCommandPalette?: () => void;
  streamConnected?: boolean;
}

export const AppTopbar: React.FC<AppTopbarProps> = ({
  onOpenCommandPalette,
  streamConnected = true,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cached = getCurrentUser();
    if (cached) setUser(cached);
    fetchUserProfile().then((u) => {
      if (u) setUser(u);
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    router.push("/login");
  };

  const getInitials = () => {
    if (user?.full_name) {
      const parts = user.full_name.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.full_name.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return "DS";
  };

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
    if (pathname?.startsWith("/app/settings")) return "System / Settings";
    return "Overview / Live scenarios";
  };

  return (
    <header className="h-14 px-6 rounded-full bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.4)] flex items-center justify-between mb-6 relative z-30">
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

        {/* Database Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-mono text-emerald-300">
          <Database className="w-3 h-3 text-emerald-400" />
          <span>Neon DB</span>
        </div>

        {/* User Initials Avatar with Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 rounded-full brand-gradient-bg text-black font-bold text-xs flex items-center justify-center shadow-[0_0_15px_rgba(108,123,255,0.4)] hover:scale-105 transition"
            title={user?.email || "Supervisor Account"}
          >
            {getInitials()}
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-[#142225] border border-white/[0.12] shadow-2xl p-4 text-xs space-y-3 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
                <div className="w-9 h-9 rounded-xl brand-gradient-bg text-black font-bold text-sm flex items-center justify-center">
                  {getInitials()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-white truncate">
                    {user?.full_name || "Supervisor"}
                  </div>
                  <div className="text-[11px] font-mono text-neutral-400 truncate">
                    {user?.email || "supervisor@mandate.demo"}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-[11px] text-neutral-300">
                <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/[0.03]">
                  <span className="text-neutral-400">Role</span>
                  <span className="font-mono text-cyan-300 font-semibold">{user?.role || "ADMIN"}</span>
                </div>
                <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/[0.03]">
                  <span className="text-neutral-400">Persistence</span>
                  <span className="font-mono text-emerald-300">Neon Postgres</span>
                </div>
              </div>

              <div className="pt-1 border-t border-white/[0.08]">
                <button
                  onClick={handleLogout}
                  className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-medium flex items-center justify-center gap-2 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
