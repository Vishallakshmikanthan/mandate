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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const showDemo = isDemoMode();

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
