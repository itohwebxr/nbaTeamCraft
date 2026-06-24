"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { gtm } from "@/lib/gtm";

const FIRST_KEY = "tc_first_visit";   // ISO date (YYYY-MM-DD) of first ever visit
const LAST_KEY = "tc_last_visit";     // ISO date of most recent visit
const COUNT_KEY = "tc_visit_count";   // number of distinct days visited

function dayString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.round((to - from) / 86_400_000));
}

// Pushes first-party visit/retention context once per page load, and stitches
// the GA4 user_id once the auth session resolves. Renders nothing.
export default function RetentionTracker() {
  const { user, loading } = useAuth();
  const openFired = useRef(false);
  const identifiedFor = useRef<string | null>(null);

  // app_open with visit context — counts a visit once per calendar day.
  useEffect(() => {
    if (openFired.current) return;
    openFired.current = true;
    try {
      const today = dayString();
      const first = localStorage.getItem(FIRST_KEY) ?? today;
      const last = localStorage.getItem(LAST_KEY);
      const prevCount = Number(localStorage.getItem(COUNT_KEY) ?? 0);

      const isNewDay = last !== today;
      const visitNumber = isNewDay ? prevCount + 1 : Math.max(prevCount, 1);

      if (!localStorage.getItem(FIRST_KEY)) localStorage.setItem(FIRST_KEY, first);
      if (isNewDay) {
        localStorage.setItem(LAST_KEY, today);
        localStorage.setItem(COUNT_KEY, String(visitNumber));
      }

      gtm.appOpen({
        visit_number: visitNumber,
        returning: visitNumber > 1,
        days_since_first_visit: daysBetween(first, today),
      });
    } catch {
      /* localStorage unavailable — skip silently */
    }
  }, []);

  // GA4 user_id stitching once the session is known.
  useEffect(() => {
    if (loading || !user?.id) return;
    if (identifiedFor.current === user.id) return;
    identifiedFor.current = user.id;
    gtm.identify({ user_id: user.id });
  }, [user, loading]);

  return null;
}
