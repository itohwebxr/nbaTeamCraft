import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const mode = searchParams.get("mode") ?? "practice";
    const difficulty = searchParams.get("difficulty");
    const type = searchParams.get("type");
    const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
    const limit = Math.min(Number(searchParams.get("limit") ?? 3), 20);

    const supabase = createServerClient();

    if (mode === "daily") {
      // Check if we have a pre-set daily selection
      const { data: daily } = await supabase
        .from("trivia_daily")
        .select("question_ids")
        .eq("date", date)
        .maybeSingle();

      if (daily?.question_ids?.length) {
        const { data: questions } = await supabase
          .from("trivia_questions")
          .select("id, type, difficulty, question, options, answer_index, explanation, season, team_id, player_name, template, params")
          .in("id", daily.question_ids);
        return NextResponse.json({ questions: questions ?? [], date });
      }

      // No pre-set — pick 3 random questions filtered by difficulty/type
      let query = supabase
        .from("trivia_questions")
        .select("id, type, difficulty, question, options, answer_index, explanation, season, team_id, player_name, template, params");
      if (difficulty && ["easy", "hard"].includes(difficulty)) {
        query = query.eq("difficulty", difficulty);
      }
      if (type && ["stats", "career"].includes(type)) {
        query = query.eq("type", type);
      }
      const { data: questions } = await query.limit(100);
      const shuffled = (questions ?? []).sort(() => Math.random() - 0.5).slice(0, limit);
      return NextResponse.json({ questions: shuffled, date });
    }

    // Practice mode — random questions with optional filters
    let query = supabase
      .from("trivia_questions")
      .select("id, type, difficulty, question, options, answer_index, explanation, season, team_id, player_name, template, params");
    if (difficulty && ["easy", "hard"].includes(difficulty)) {
      query = query.eq("difficulty", difficulty);
    }
    if (type && ["stats", "career"].includes(type)) {
      query = query.eq("type", type);
    }

    const { data: all } = await query.limit(200);
    const shuffled = (all ?? []).sort(() => Math.random() - 0.5).slice(0, limit);
    return NextResponse.json({ questions: shuffled });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
  }
}
