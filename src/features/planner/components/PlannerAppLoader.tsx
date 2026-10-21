"use client";

import dynamic from "next/dynamic";

/**
 * Loads the editor in the browser only (`ssr: false`), so localStorage and IndexedDB reads
 * never cause hydration mismatches. The prerendered HTML is the empty stage color.
 */
export const PlannerAppLoader = dynamic(() => import("./PlannerApp").then((m) => m.PlannerApp), {
  ssr: false,
  loading: () => <div className="h-dvh bg-stage" />,
});
