import { Suspense } from "react";
import SeasonClient from "./SeasonClient";

export const dynamic = "force-dynamic";

export default function SeasonPage() {
  return (
    <Suspense fallback={null}>
      <SeasonClient />
    </Suspense>
  );
}
