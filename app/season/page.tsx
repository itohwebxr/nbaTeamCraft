import { Suspense } from "react";
import SeasonClient from "./SeasonClient";
import { fetchAllTeamsForPicker } from "@/lib/teamCache";

export const dynamic = "force-dynamic";

export default async function SeasonPage() {
  const initialTeams = await fetchAllTeamsForPicker();
  return (
    <Suspense fallback={null}>
      <SeasonClient initialTeams={initialTeams} />
    </Suspense>
  );
}
