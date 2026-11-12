"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink, ShieldCheck, Heart } from "lucide-react";

const GithubIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

export const MarketingFooter: React.FC = () => {
  return (
    <footer className="border-t border-white/[0.08] bg-[#05070c] text-neutral-400 text-xs relative z-10 pt-16 pb-12 px-6">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl brand-gradient-bg flex items-center justify-center font-bold text-black text-sm shadow-[0_0_15px_rgba(108,123,255,0.5)]">
                M
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Mandate<span className="text-cyan-400">.</span>
              </span>
            </Link>
            <p className="text-xs text-neutral-400 max-w-sm leading-relaxed">
              The financial firewall and AI-arbitrated escrow protocol for autonomous agents.
              Built on PayPal Orders v2 and Gemini AI.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://github.com/Vishallakshmikanthan/mandate"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full border border-white/[0.1] bg-white/[0.04] flex items-center justify-center text-neutral-400 hover:text-white hover:border-white/[0.3] transition-colors"
                title="GitHub Repo"
              >
                <GithubIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-3 font-mono text-xs">
            <span className="text-white font-semibold uppercase tracking-wider text-[11px] block">
              Product
            </span>
            <ul className="space-y-2">
              <li>
                <Link href="/how-it-works" className="hover:text-white transition-colors">
                  Three-Layer Defense
                </Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-white transition-colors">
                  Threat Model & Injection
                </Link>
              </li>
              <li>
                <Link href="/demo" className="hover:text-white transition-colors">
                  Interactive Demo
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  Pricing Tiers
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-3 font-mono text-xs">
            <span className="text-white font-semibold uppercase tracking-wider text-[11px] block">
              Developers
            </span>
            <ul className="space-y-2">
              <li>
                <Link href="/docs" className="hover:text-white transition-colors">
                  API Documentation
                </Link>
              </li>
              <li>
                <Link href="/app/mandates/new" className="hover:text-white transition-colors">
                  Policy Schema Builder
                </Link>
              </li>
              <li>
                <Link href="/app/red-team" className="hover:text-white transition-colors">
                  Red-Team Attack Vectors
                </Link>
              </li>
              <li>
                <a
                  href="https://developer.paypal.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1"
                >
                  PayPal Orders v2 <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Company & Legal */}
          <div className="space-y-3 font-mono text-xs">
            <span className="text-white font-semibold uppercase tracking-wider text-[11px] block">
              Team & Legal
            </span>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  Team VibeSync
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Hackathon Banner */}
        <div className="pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono">
          <p className="text-neutral-500">
            Built for the <strong className="text-neutral-300">Build What&apos;s Next with PayPal and AI Hackathon</strong> • Team VibeSync (Vishal & Sneha)
          </p>
          <p className="text-neutral-500 flex items-center gap-1">
            Engineered with PayPal Orders v2 Sandbox & Gemini
          </p>
        </div>
      </div>
    </footer>
  );
};
