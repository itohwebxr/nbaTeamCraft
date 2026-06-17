import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Compact, OGP-friendly summary of a playoff result. Stored in the generic
// `shares` table (id + jsonb data) so the result URL stays short — the full
// bracket would blow past X's character limit if encoded in the query string.
export type PlayoffShareData = {
  kind: "playoff";
  size: number;
  champion: { name: string; tier: string; overall: number };
  // The champion's road to the title — one entry per round.
  path: { round: string; opp: string; score: string }[];
  finals: { home: string; away: string; hw: number; aw: number };
};

function generateId(length = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  for (const byte of arr) id += chars[byte % chars.length];
  return id;
}

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as PlayoffShareData;
    if (data?.kind !== "playoff" || !data.champion?.name) {
      return NextResponse.json({ error: "Invalid playoff share data" }, { status: 400 });
    }

    const supabase = createServerClient();
    let id: string;
    let attempts = 0;
    while (true) {
      id = generateId();
      const { error } = await supabase.from("shares").insert({ id, data });
      if (!error) break;
      if (error.code !== "23505") {
        console.error("[playoff share] insert error:", error);
        throw new Error(`Failed to create share: ${error.message}`);
      }
      if (attempts++ > 5) throw new Error("Too many ID collisions");
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
    return NextResponse.json({ id: id!, url: `${siteUrl}/playoffs/result/${id!}` });
  } catch (e) {
    console.error("[playoff share]", e);
    return NextResponse.json({ error: "Failed to create share" }, { status: 500 });
  }
}
