"use client";

// Resolves the caller's current-week cup entry for a given team and renders
// CupStatus (record + match history + "Play Today's Match"). Self-gating:
// renders nothing when the viewer has no entry for this team, so it is safe to
// drop onto any page (e.g. a public team page seen by non-owners).

import { useEffect, useState } from "react";
import { getBrowserId } from "@/lib/browserId";
import { currentCupWeek } from "@/lib/cupWeek";
import { useAuth } from "@/hooks/useAuth";
import CupStatus from "./CupStatus";

interface Props {
  teamId: string;
  teamName: string;
  teamOverall: number;
  teamTier: string;
  /** If the entry id is already known, skip the resolution fetch. */
  entryId?: string;
  showTeamName?: boolean;
  /**
   * CSS selector of sibling element to hide when this panel is visible.
   * Used on the team detail page to suppress the static cup summary card when
   * the owner's interactive panel renders.
   */
  hideSelector?: string;
}

export default function CupPlayPanel({ teamId, teamName, teamOverall, teamTier, entryId: knownEntryId, showTeamName, hideSelector }: Props) {
  const { user } = useAuth();
  const [entryId, setEntryId] = useState<string | null>(knownEntryId ?? null);
  const [browserId, setBrowserId] = useState("");
  const [resolving, setResolving] = useState(!knownEntryId);

  useEffect(() => {
    const bid = getBrowserId();
    setBrowserId(bid);
    if (knownEntryId) return;
    const userParam = user ? `&userId=${encodeURIComponent(user.id)}` : "";
    fetch(`/api/cup/status?teamId=${encodeURIComponent(teamId)}&browserId=${encodeURIComponent(bid)}${userParam}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.entry?.id && d.entry.cup_week === currentCupWeek()) setEntryId(d.entry.id);
      })
      .catch(() => {})
      .finally(() => setResolving(false));
  }, [teamId, knownEntryId, user]);

  // Hide the sibling static card when the interactive panel is visible
  useEffect(() => {
    if (!hideSelector || !entryId) return;
    const el = document.querySelector(hideSelector);
    if (el) (el as HTMLElement).style.display = "none";
    return () => {
      if (el) (el as HTMLElement).style.display = "";
    };
  }, [hideSelector, entryId]);

  if (resolving || !entryId || !browserId) return null;

  return (
    <CupStatus
      entryId={entryId}
      browserId={browserId}
      teamName={teamName}
      teamOverall={teamOverall}
      teamTier={teamTier}
      showTeamName={showTeamName}
    />
  );
}
