"use client";

import React, { Suspense } from "react";
import ScenariosPage from "./scenarios/page";

export default function OverviewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-neutral-400 font-mono text-xs">Loading Overview...</div>}>
      <ScenariosPage />
    </Suspense>
  );
}
