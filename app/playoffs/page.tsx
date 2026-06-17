import { Suspense } from "react";
import PlayoffClient from "./PlayoffClient";

export const dynamic = "force-dynamic";

export default function PlayoffsPage() {
  return (
    <Suspense fallback={null}>
      <PlayoffClient />
    </Suspense>
  );
}
