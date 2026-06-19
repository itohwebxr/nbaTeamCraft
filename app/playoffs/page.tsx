import { Suspense } from "react";
import PlayoffClient from "./PlayoffClient";
import { fetchAllTeamsForPicker } from "@/lib/teamCache";

export const dynamic = "force-dynamic";

export default async function PlayoffsPage() {
  const initialTeams = await fetchAllTeamsForPicker();
  return (
    <Suspense fallback={null}>
      <PlayoffClient initialTeams={initialTeams} />
    </Suspense>
  );
}
