"use client";

import { BRAND_X_FOLLOW_URL, BRAND_X_MENTION } from "@/lib/brand";
import { gtm } from "@/lib/gtm";

// "Follow @nbaTeamCraft" CTA. Following the brand account is the cheapest
// re-contact channel: the daily theme posts then reach the user via X's own
// feed/notifications (no push/email needed).
export default function FollowBrandButton({
  placement,
  className = "",
  label = `Follow ${BRAND_X_MENTION} for the daily theme`,
}: {
  placement: "post_success" | "theme_feed" | "result_published";
  className?: string;
  label?: string;
}) {
  const onClick = () => {
    gtm.followCtaClick({ placement });
    window.open(BRAND_X_FOLLOW_URL, "_blank", "noopener");
  };

  return (
    <button
      onClick={onClick}
      className={`w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-white text-black font-bold text-sm transition-colors flex items-center justify-center gap-2 ${className}`}
    >
      <span className="text-base leading-none">𝕏</span>
      {label}
    </button>
  );
}
