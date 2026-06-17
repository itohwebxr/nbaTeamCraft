import { Suspense } from "react";
import MatchupClient from "./MatchupClient";

export const dynamic = "force-dynamic";

export default function MatchupPage() {
  return (
    <Suspense fallback={null}>
      <MatchupClient />
    </Suspense>
  );
}
