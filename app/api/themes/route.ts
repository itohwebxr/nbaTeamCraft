import { NextResponse } from "next/server";
import { getActiveThemes } from "@/lib/themes";

export const dynamic = "force-dynamic";

// All active themes — candidates for the post-time theme picker.
export async function GET() {
  const themes = await getActiveThemes();
  return NextResponse.json({ themes });
}
