import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { overallColor } from "@/lib/overallColor";
import { PublicTeam } from "@/types";

async function getTopTeams(): Promise<PublicTeam[]> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("public_teams")
      .select("*")
      .order("overall", { ascending: false })
      .limit(5);
    return (data ?? []) as PublicTeam[];
  } catch {
    return [];
  }
}

const RANK_MEDAL = ["🥇", "🥈", "🥉", "#4", "#5"];

export default async function RankingPreview() {
  const teams = await getTopTeams();

  if (teams.length === 0) return null;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-3">
        <p className="font-display text-xs font-bold text-zinc-400 uppercase tracking-[0.2em]">
          🏆 Overall Ranking
        </p>
        <Link href="/ranking" className="text-xs text-orange-400 hover:text-orange-300 font-bold transition-colors">
          View All →
        </Link>
      </div>

      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        {teams.map((team, i) => (
          <Link
            key={team.id}
            href={`/team/${team.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/60 transition-colors border-b border-zinc-800/60 last:border-0"
          >
            <span className={`font-display font-black w-6 shrink-0 text-center ${i < 3 ? "text-base" : "text-xs text-zinc-500"}`}>
              {RANK_MEDAL[i]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{team.name}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`font-display text-lg font-black ${overallColor(team.overall)}`}>
                {team.overall}
              </span>
              <span className="font-display text-xs font-bold text-zinc-500">{team.tier}</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-3">
        <Link
          href="/ranking"
          className="block w-full py-3 rounded-xl border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white text-sm font-bold text-center transition-colors"
        >
          See Full Ranking →
        </Link>
      </div>
    </div>
  );
}
