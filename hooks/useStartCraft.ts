"use client";

import { useRouter } from "next/navigation";
import { useDraftStore } from "@/stores/draftStore";
import { gtm } from "@/lib/gtm";

type PageType = "team" | "sim" | "trivia";

// Shared launcher for the "Craft a Team" flow, used by the cross-sell blocks
// and sticky CTA on landing pages. Mirrors BuildTeamButton: reset the draft
// store, enter sandbox mode, fire GTM, then navigate to /draft.
export function useStartCraft() {
  const router = useRouter();
  const reset = useDraftStore((s) => s.reset);
  const setMode = useDraftStore((s) => s.setMode);

  return (source: { pageType: PageType; placement: "whatsnext" | "sticky" }) => {
    reset();
    setMode("sandbox");
    gtm.sandboxStart({ team_filter: "Random", season_filter: "Random" });
    gtm.landingNextCta({ page_type: source.pageType, target: "craft", placement: source.placement });
    router.push("/draft");
  };
}
