import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { user_id, results, mode, date } = await req.json() as {
      user_id?: string;
      mode: "daily" | "practice";
      date?: string;
      results: { question_id: string; is_correct: boolean }[];
    };

    if (!results?.length) {
      return NextResponse.json({ error: "No results provided" }, { status: 400 });
    }

    if (!user_id) {
      // Guest — just return OK, nothing to save
      return NextResponse.json({ saved: false });
    }

    const supabase = createServerClient();
    const rows = results.map((r) => ({
      user_id,
      mode,
      date: mode === "daily" ? (date ?? new Date().toISOString().slice(0, 10)) : null,
      question_id: r.question_id,
      is_correct: r.is_correct,
    }));

    const { error } = await supabase.from("trivia_results").insert(rows);
    if (error) throw error;

    return NextResponse.json({ saved: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to save results" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get("userId");
    if (!userId) return NextResponse.json({ stats: null });

    const supabase = createServerClient();
    const { data } = await supabase
      .from("trivia_results")
      .select("is_correct, mode, date")
      .eq("user_id", userId);

    const all = data ?? [];
    const daily = all.filter((r) => r.mode === "daily");
    const total = daily.length;
    const correct = daily.filter((r) => r.is_correct).length;
    const today = new Date().toISOString().slice(0, 10);
    const dailyDoneToday = daily.some((r) => r.date === today);
    const dailyDates = [...new Set(daily.filter((r) => r.date).map((r) => r.date))].sort();
    const streak = calcStreak(dailyDates);

    return NextResponse.json({ stats: { total, correct, streak, dailyDoneToday } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ stats: null });
  }
}

function calcStreak(sortedDates: (string | null)[]): number {
  if (!sortedDates.length) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  // Start from today if played today, otherwise from yesterday
  const playedToday = sortedDates.includes(today);
  let cursor = playedToday ? today : yesterday;

  let streak = 0;
  for (let i = sortedDates.length - 1; i >= 0; i--) {
    if (sortedDates[i] === cursor) {
      streak++;
      const d = new Date(cursor);
      d.setDate(d.getDate() - 1);
      cursor = d.toISOString().slice(0, 10);
    } else if ((sortedDates[i] ?? "") < cursor) {
      break;
    }
  }
  return streak;
}
