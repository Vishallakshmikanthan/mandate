"use client";

import React from "react";

interface MandateLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  textClassName?: string;
}

export const MandateShieldIcon: React.FC<{ className?: string; size?: number }> = ({
  className = "w-5 h-5",
  size,
}) => {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      {/* Protective Shield Contour */}
      <path
        d="M16 3.5C9 3.5 6 6.8 6 13.8C6 21.2 11.5 26.8 16 28.5C20.5 26.8 26 21.2 26 13.8C26 6.8 23 3.5 16 3.5Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner M Checkpoint Gate */}
      <path
        d="M10.5 19V12L16 16.5L21.5 12V19"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const MandateLogo: React.FC<MandateLogoProps> = ({
  className = "flex items-center gap-2.5",
  size = "md",
  showText = true,
  textClassName = "",
}) => {
  const iconSizes = {
    sm: 18,
    md: 22,
    lg: 28,
    xl: 38,
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
    xl: "text-3xl",
  };

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <div className="text-white flex-shrink-0">
        <MandateShieldIcon size={iconSizes[size]} />
      </div>
      {showText && (
        <span
          className={`font-semibold tracking-tight text-white font-sans ${textSizes[size]} ${textClassName}`}
        >
          Mandate<span className="text-[#E9DDC6]">.</span>
        </span>
      )}
    </div>
  );
};

