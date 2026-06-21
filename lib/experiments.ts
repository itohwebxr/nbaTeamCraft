// Lightweight client-side A/B bucketing. A variant is assigned once per browser
// and persisted, so a visitor sees a consistent experience across pages and
// repeat visits. Read it via the useVariant hook (client components only).

export type Variant = "A" | "B";

// Experiment ①: where the trivia entry nudge appears on landing pages.
//   A = fixed bottom sticky bar (current)
//   B = inline card injected into the result content
export const ENTRY_NUDGE_EXPERIMENT = "entry_nudge_placement";

export function getVariant(experiment: string): Variant {
  const key = `tc_ab_${experiment}`;
  try {
    const stored = localStorage.getItem(key);
    if (stored === "A" || stored === "B") return stored;
    const v: Variant = Math.random() < 0.5 ? "A" : "B";
    localStorage.setItem(key, v);
    return v;
  } catch {
    return "A";
  }
}
