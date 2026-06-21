"use client";

import { useEffect, useState } from "react";
import { getVariant, type Variant } from "@/lib/experiments";

// Returns the assigned A/B variant for an experiment, or null until the client
// has mounted (localStorage isn't available during SSR). Components should
// render nothing until the variant resolves to avoid hydration mismatches.
export function useVariant(experiment: string): Variant | null {
  const [variant, setVariant] = useState<Variant | null>(null);
  useEffect(() => {
    // Resolve the persisted/random bucket once on mount (localStorage is
    // client-only, so this can't run during render/SSR).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVariant(getVariant(experiment));
  }, [experiment]);
  return variant;
}
