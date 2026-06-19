import { Suspense } from "react";
import MatchupClient from "./MatchupClient";
import { fetchAllTeamsForPicker } from "@/lib/teamCache";

export const dynamic = "force-dynamic";

export default async function MatchupPage() {
  const initialTeams = await fetchAllTeamsForPicker();
  return (
    <Suspense fallback={null}>
      <MatchupClient initialTeams={initialTeams} />
    </Suspense>
  );
}
