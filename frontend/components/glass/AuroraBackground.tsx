"use client";

import React from "react";

export const AuroraBackground: React.FC = () => {
  // Vertical column stripes replicating the signature columnar slit blinds
  const columnTones = [
    "bg-[#111c1e]/60",
    "bg-[#152326]/40",
    "bg-[#18292c]/70",
    "bg-[#132023]/50",
    "bg-[#1c2e32]/60",
    "bg-[#172528]/45",
    "bg-[#1f3337]/75",
    "bg-[#142124]/55",
    "bg-[#21373c]/70",
    "bg-[#19282b]/60",
    "bg-[#1d3034]/75",
    "bg-[#162427]/45",
    "bg-[#1e3135]/65",
    "bg-[#152225]/50",
    "bg-[#1a2b2e]/60",
    "bg-[#121d20]/70",
  ];

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#0c1416]" aria-hidden="true">
      {/* 1. Luminous Floating Colored Spheres (Behind the columnar glass) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top-Right Warm Orange/Amber Sun Orb */}
        <div
          className="absolute -top-10 right-[10%] w-72 h-72 rounded-full opacity-85 blur-[65px]"
          style={{
            background: "radial-gradient(circle, #f97316 0%, #ea580c 45%, #ca8a04 80%, transparent 100%)",
          }}
        />

        {/* Top-Center/Left Turquoise Emerald Orb */}
        <div
          className="absolute -top-6 left-[24%] w-56 h-56 rounded-full opacity-75 blur-[55px]"
          style={{
            background: "radial-gradient(circle, #2dd4bf 0%, #10b981 50%, #0f766e 85%, transparent 100%)",
          }}
        />

        {/* Left Sidebar / Middle-Left Vivid Cyan Orb */}
        <div
          className="absolute top-[35%] -left-8 w-64 h-64 rounded-full opacity-70 blur-[75px]"
          style={{
            background: "radial-gradient(circle, #06b6d4 0%, #0284c7 50%, #0369a1 85%, transparent 100%)",
          }}
        />

        {/* Right-Center Radiant Pink / Raspberry Sphere */}
        <div
          className="absolute top-[48%] -right-10 w-64 h-64 rounded-full opacity-75 blur-[75px]"
          style={{
            background: "radial-gradient(circle, #fb7185 0%, #f43f5e 45%, #be123c 85%, transparent 100%)",
          }}
        />

        {/* Bottom-Center Deep Royal Violet Sphere */}
        <div
          className="absolute -bottom-16 left-1/2 -translate-x-[40%] w-80 h-80 rounded-full opacity-85 blur-[75px]"
          style={{
            background: "radial-gradient(circle, #8b5cf6 0%, #6366f1 50%, #4338ca 85%, transparent 100%)",
          }}
        />
      </div>

      {/* 2. Vertical Columnar Stripes */}
      <div className="absolute inset-0 flex w-full h-full opacity-65 backdrop-blur-[2px]">
        {columnTones.map((tone, idx) => (
          <div
            key={idx}
            className={`flex-1 h-full ${tone} border-r border-white/[0.02]`}
          />
        ))}
      </div>

      {/* 3. Subtle Ambient Slate Fill & Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 35%, rgba(40, 65, 70, 0.12) 0%, transparent 75%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(8, 14, 15, 0.65) 100%)",
        }}
      />
    </div>
  );
};
