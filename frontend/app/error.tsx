"use client";

import React, { useEffect } from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Runtime exception:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 text-center">
      <GlassCard className="p-8 max-w-md space-y-4 border-rose-500/30">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Temporary Runtime Error</h2>
        <p className="text-xs text-neutral-400 leading-relaxed">
          {error.message || "An unexpected error occurred while executing the gateway interface."}
        </p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl brand-gradient-bg text-black font-semibold text-xs"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reload Interface</span>
        </button>
      </GlassCard>
    </div>
  );
}

