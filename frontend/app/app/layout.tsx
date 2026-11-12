"use client";

import React, { useState } from "react";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopbar } from "@/components/app/AppTopbar";
import { CommandPalette } from "@/components/app/CommandPalette";
import { FloatingBottomDock } from "@/components/app/FloatingBottomDock";
import { DemoRibbon } from "@/components/app/DemoRibbon";
import { AuroraBackground } from "@/components/glass/AuroraBackground";
import { NoiseOverlay } from "@/components/glass/NoiseOverlay";
import { isDemoMode } from "@/lib/api";

import { Lock } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const showDemo = isDemoMode();

  if (!showDemo) {
    return (
      <div className="min-h-screen bg-[#0c1416] text-[#F4F6FB] flex items-center justify-center p-6 relative">
        <AuroraBackground />
        <NoiseOverlay />
        <div className="max-w-md w-full text-center space-y-4 p-8 rounded-3xl bg-[#142225]/85 border border-white/[0.08] relative z-10 shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mx-auto text-amber-400">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-white">Authentication not configured</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Direct access to the dashboard is gated. Real user accounts and session security are being introduced in Phase 3.
          </p>
          <p className="text-xs text-neutral-400 leading-relaxed">
            To view the interactive prototype and test sandbox, set <code className="font-mono text-cyan-300">NEXT_PUBLIC_DEMO_MODE=true</code>.
          </p>
          <div className="pt-2">
            <a
              href="/"
              className="inline-block px-5 py-2.5 rounded-full text-xs font-semibold bg-white text-neutral-900 hover:bg-neutral-100 transition"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c1416] text-[#F4F6FB] relative flex flex-col p-4 md:p-6 overflow-x-hidden">
      <AuroraBackground />
      <NoiseOverlay />

      {showDemo && (
        <div className="mb-4 relative z-20">
          <DemoRibbon />
        </div>
      )}

      {/* Main Floating App Shell Container */}
      <div className="flex-1 flex gap-5 max-w-[1560px] w-full mx-auto relative z-10 pb-28">
        {/* Left Floating Sidebar */}
        <AppSidebar />

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <AppTopbar
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
            streamConnected={true}
          />

          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>

      {/* Signature Floating Bottom Dock */}
      <FloatingBottomDock />

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
}
