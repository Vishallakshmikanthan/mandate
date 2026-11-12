"use client";

import React from "react";
import clsx from "clsx";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "strong" | "danger" | "success" | "brand";
  hoverEffect?: boolean;
  tilt?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  variant = "default",
  hoverEffect = true,
  className = "",
  children,
  ...props
}) => {
  const variantStyles = {
    default: "bg-white/[0.05] border-white/[0.12]",
    strong: "bg-white/[0.09] border-white/[0.18]",
    danger: "bg-red-500/[0.07] border-red-500/30",
    success: "bg-emerald-500/[0.07] border-emerald-500/30",
    brand: "bg-indigo-500/[0.07] border-indigo-500/30",
  };

  return (
    <div
      className={clsx(
        "relative rounded-2xl backdrop-blur-xl border p-6 transition-all duration-300 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)]",
        variantStyles[variant],
        hoverEffect && "hover:border-white/[0.25] hover:bg-white/[0.08] hover:-translate-y-0.5",
        className
      )}
      {...props}
    >
      {/* Top highlight inset line */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none rounded-t-2xl" />
      {children}
    </div>
  );
};

