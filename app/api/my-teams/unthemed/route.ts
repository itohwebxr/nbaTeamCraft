// GET /api/my-teams/unthemed?userId=yyy&browserId=xxx
// Returns the caller's posted teams that have not yet been entered into any
// theme — the candidates for attaching an existing post to a theme.

import { NextRequest, NextResponse } from "next/server";
import { getUnthemedTeams } from "@/lib/themes";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const userId = searchParams.get("userId");
  const browserId = searchParams.get("browserId");
  if (!userId && !browserId) {
    return NextResponse.json({ error: "userId or browserId required" }, { status: 400 });
  }
  const teams = await getUnthemedTeams(userId, browserId);
  return NextResponse.json({ teams });
}
