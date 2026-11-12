"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Menu,
  X,
  Play,
  Lock,
} from "lucide-react";
import clsx from "clsx";

export const MarketingNavbar: React.FC = () => {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full px-4 sm:px-6 pt-3 transition-all duration-300">
      <div
        className={clsx(
          "max-w-7xl mx-auto flex items-center justify-between px-6 py-3.5 rounded-2xl transition-all duration-300",
          scrolled
            ? "bg-[#070A12]/85 backdrop-blur-xl border border-white/[0.12] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)]"
            : "bg-transparent border border-transparent"
        )}
      >
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl brand-gradient-bg flex items-center justify-center font-bold text-black text-sm shadow-[0_0_15px_rgba(108,123,255,0.5)] transition-transform group-hover:scale-105">
            M
          </div>
          <div className="flex items-baseline">
            <span className="text-xl font-bold tracking-tight text-white group-hover:opacity-90">
              Mandate<span className="text-cyan-400">.</span>
            </span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-mono">
          {/* Product Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setProductDropdownOpen(true)}
            onMouseLeave={() => setProductDropdownOpen(false)}
          >
            <button className="flex items-center gap-1 text-neutral-300 hover:text-white transition-colors py-1">
              <span>Product</span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {productDropdownOpen && (
              <div className="absolute top-full left-0 w-56 rounded-2xl bg-[#0D1220]/95 border border-white/[0.14] shadow-2xl p-2 space-y-1 backdrop-blur-2xl animate-in fade-in duration-150">
                <Link
                  href="/how-it-works"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>How It Works</span>
                </Link>
                <Link
                  href="/security"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Security & Threat Model</span>
                </Link>
                <Link
                  href="/demo"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors"
                >
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Live Interactive Demo</span>
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/how-it-works"
            className={clsx(
              "transition-colors",
              pathname === "/how-it-works" ? "text-cyan-400 font-semibold" : "text-neutral-300 hover:text-white"
            )}
          >
            Architecture
          </Link>

          <Link
            href="/security"
            className={clsx(
              "transition-colors",
              pathname === "/security" ? "text-cyan-400 font-semibold" : "text-neutral-300 hover:text-white"
            )}
          >
            Security
          </Link>

          <Link
            href="/pricing"
            className={clsx(
              "transition-colors",
              pathname === "/pricing" ? "text-cyan-400 font-semibold" : "text-neutral-300 hover:text-white"
            )}
          >
            Pricing
          </Link>

          <Link
            href="/docs"
            className={clsx(
              "transition-colors",
              pathname === "/docs" ? "text-cyan-400 font-semibold" : "text-neutral-300 hover:text-white"
            )}
          >
            Docs
          </Link>

          <Link
            href="/about"
            className={clsx(
              "transition-colors",
              pathname === "/about" ? "text-cyan-400 font-semibold" : "text-neutral-300 hover:text-white"
            )}
          >
            About
          </Link>
        </nav>

        {/* Right CTA */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-mono text-neutral-300 hover:text-white px-3 py-1.5 transition-colors"
          >
            Log In
          </Link>

          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl brand-gradient-bg text-black font-semibold text-xs transition-transform hover:scale-105 shadow-[0_0_20px_rgba(108,123,255,0.4)]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launch App</span>
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-1.5 text-neutral-400 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 p-5 rounded-2xl bg-[#0D1220] border border-white/[0.14] shadow-2xl space-y-3 font-mono text-xs">
          <Link href="/how-it-works" className="block py-1.5 text-neutral-200">
            How It Works
          </Link>
          <Link href="/security" className="block py-1.5 text-neutral-200">
            Security & Threats
          </Link>
          <Link href="/pricing" className="block py-1.5 text-neutral-200">
            Pricing
          </Link>
          <Link href="/docs" className="block py-1.5 text-neutral-200">
            Docs & API
          </Link>
          <Link href="/about" className="block py-1.5 text-neutral-200">
            About Team VibeSync
          </Link>
          <div className="pt-2 border-t border-white/[0.08] flex gap-3">
            <Link href="/login" className="flex-1 py-2 text-center rounded-xl bg-white/[0.06] text-white">
              Log In
            </Link>
            <Link href="/app" className="flex-1 py-2 text-center rounded-xl brand-gradient-bg text-black font-bold">
              Launch App
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

