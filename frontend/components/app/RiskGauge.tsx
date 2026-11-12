"use client";

import React from "react";
import clsx from "clsx";

interface RiskGaugeProps {
  score: number; // 0.0 to 1.0
  flags?: string[];
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({
  score = 0,
  flags = [],
  size = "md",
  className = "",
}) => {
  const clamped = Math.max(0, Math.min(1, score));
  const percentage = Math.round(clamped * 100);

  // Angle from -90 to +90 degrees
  const needleAngle = -90 + clamped * 180;

  let riskTier = "LOW";
  let color = "#34D399"; // emerald
  if (clamped >= 0.7) {
    riskTier = "CRITICAL";
    color = "#F87171"; // rose
  } else if (clamped >= 0.4) {
    riskTier = "ELEVATED";
    color = "#FBBF24"; // amber
  }

  const radius = 70;
  const cx = 90;
  const cy = 90;

  return (
    <div className={clsx("flex flex-col items-center", className)}>
      <div className="relative w-[180px] h-[100px] flex items-end justify-center overflow-hidden">
        <svg viewBox="0 0 180 100" className="w-full h-full overflow-visible">
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="50%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#F87171" />
            </linearGradient>
          </defs>

          {/* Background arc track */}
          <path
            d="M 20 90 A 70 70 0 0 1 160 90"
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Value arc */}
          <path
            d="M 20 90 A 70 70 0 0 1 160 90"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray="220"
            strokeDashoffset={220 - 220 * clamped}
            className="transition-all duration-700 ease-out"
          />

          {/* Needle pivot */}
          <circle cx={cx} cy={cy} r="5" fill="#FFFFFF" />

          {/* Animated Needle */}
          <g
            style={{
              transform: `rotate(${needleAngle}deg)`,
              transformOrigin: `${cx}px ${cy}px`,
              transition: "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <line
              x1={cx}
              y1={cy}
              x2={cx}
              y2={cy - radius + 14}
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        </svg>

        {/* Value badge in center */}
        <div className="absolute bottom-0 text-center">
          <span className="text-xl font-bold font-mono tracking-tight text-white tabular-nums">
            {percentage}
            <span className="text-xs text-neutral-400 font-normal">/100</span>
          </span>
        </div>
      </div>

      {/* Tier label */}
      <div className="mt-2 text-center">
        <span
          className="text-[11px] font-mono uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full border"
          style={{
            color: color,
            borderColor: `${color}40`,
            backgroundColor: `${color}15`,
          }}
        >
          {riskTier} RISK
        </span>
      </div>

      {/* Flags chips */}
      {flags && flags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 justify-center max-w-[280px]">
          {flags.map((flag, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/15 border border-rose-500/30 text-rose-300"
            >
              {flag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

