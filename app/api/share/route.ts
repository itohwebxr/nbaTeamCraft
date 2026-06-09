import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function generateId(length = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  for (const byte of arr) {
    id += chars[byte % chars.length];
  }
  return id;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createServerClient();

    let id: string;
    let attempts = 0;
    while (true) {
      id = generateId();
      const { error } = await supabase
        .from("shares")
        .insert({ id, data: body });
      if (!error) break;
      if (attempts++ > 5) throw new Error("Failed to create share");
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
    return NextResponse.json({ url: `${siteUrl}/share/${id!}` });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create share" }, { status: 500 });
  }
}
