import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Compact season result stored in the generic `shares` table so the result URL
// stays short and carries an OGP image.
export type SeasonShareData = {
  kind: "season";
  team: { name: string; tier: string; overall: number };
  wins: number;
  losses: number;
  label: string;
  blurb: string;
  // Optional (added later) — the 82-game W/L sequence and per-game win odds so
  // the shared/detail view can render the full pip grid. Legacy shares omit these.
  games?: boolean[];
  winRate?: number;
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
    const data = (await req.json()) as SeasonShareData;
    if (data?.kind !== "season" || !data.team?.name) {
      return NextResponse.json({ error: "Invalid season share data" }, { status: 400 });
    }

    const supabase = createServerClient();
    let id: string;
    let attempts = 0;
    while (true) {
      id = generateId();
      const { error } = await supabase.from("shares").insert({ id, data });
      if (!error) break;
      if (error.code !== "23505") {
        console.error("[season share] insert error:", error);
        throw new Error(`Failed to create share: ${error.message}`);
      }
      if (attempts++ > 5) throw new Error("Too many ID collisions");
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
    return NextResponse.json({ id: id!, url: `${siteUrl}/season/result/${id!}` });
  } catch (e) {
    console.error("[season share]", e);
    return NextResponse.json({ error: "Failed to create share" }, { status: 500 });
  }
}
