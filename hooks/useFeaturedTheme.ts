"use client";

import { useEffect, useState } from "react";
import type { Theme } from "@/lib/themes";

// Fetches today's featured themes (main + subs) for client surfaces (home card,
// landing nudge). Returns null until loaded.
export function useFeaturedTheme(): { main: Theme; subs: Theme[] } | null {
  const [featured, setFeatured] = useState<{ main: Theme; subs: Theme[] } | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/themes/featured")
      .then((r) => r.json())
      .then((d) => { if (alive) setFeatured(d.featured ?? null); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return featured;
}
