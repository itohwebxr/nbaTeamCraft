import { NextResponse } from "next/server";
import { getFeaturedThemes } from "@/lib/themes";

export const dynamic = "force-dynamic";

// Today's featured themes (1 main + up to 2 subs), deterministic per UTC day.
export async function GET() {
  const featured = await getFeaturedThemes();
  return NextResponse.json({ featured });
}
