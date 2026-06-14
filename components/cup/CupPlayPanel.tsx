"use client";

// Resolves the caller's current-week cup entry for a given team and renders
// CupStatus (record + match history + "Play Today's Match"). Self-gating:
// renders nothing when the viewer has no entry for this team, so it is safe to
// drop onto any page (e.g. a public team page seen by non-owners).

import { useEffect, useState } from "react";
import { getBrowserId } from "@/lib/browserId";
import { currentCupWeek } from "@/lib/cupWeek";
import CupStatus from "./CupStatus";

interface Props {
  teamId: string;
  teamName: string;
  teamOverall: number;
  teamTier: string;
  /** If the entry id is already known, skip the resolution fetch. */
  entryId?: string;
}

export default function CupPlayPanel({ teamId, teamName, teamOverall, teamTier, entryId: knownEntryId }: Props) {
  const [entryId, setEntryId] = useState<string | null>(knownEntryId ?? null);
  const [browserId, setBrowserId] = useState("");
  const [resolving, setResolving] = useState(!knownEntryId);

  useEffect(() => {
    const bid = getBrowserId();
    setBrowserId(bid);
    if (knownEntryId) return;
    fetch(`/api/cup/status?teamId=${encodeURIComponent(teamId)}&browserId=${encodeURIComponent(bid)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.entry?.id && d.entry.cup_week === currentCupWeek()) setEntryId(d.entry.id);
      })
      .catch(() => {})
      .finally(() => setResolving(false));
  }, [teamId, knownEntryId]);

  if (resolving || !entryId || !browserId) return null;

  return (
    <CupStatus
      entryId={entryId}
      browserId={browserId}
      teamName={teamName}
      teamOverall={teamOverall}
      teamTier={teamTier}
    />
  );
}
