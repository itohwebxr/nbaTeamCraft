import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { overallColor } from "@/lib/overallColor";
import { PublicTeam } from "@/types";

async function getLatestTeams(): Promise<PublicTeam[]> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("public_teams")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    return (data ?? []) as PublicTeam[];
  } catch {
    return [];
  }
}

const TIER_DOT: Record<string, string> = {
  S: "bg-yellow-400",
  A: "bg-orange-400",
  B: "bg-sky-400",
  C: "bg-zinc-500",
  D: "bg-zinc-600",
};

export default async function LatestTeams() {
  const teams = await getLatestTeams();
  if (teams.length === 0) return null;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-3">
        <p className="font-display text-xs font-bold text-zinc-400 uppercase tracking-[0.2em]">
          Latest Teams
        </p>
        <Link href="/ranking?tab=latest" className="text-xs text-orange-400 hover:text-orange-300 font-bold transition-colors">
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
            {/* Tier dot */}
            <span className={`w-2 h-2 rounded-full shrink-0 ${TIER_DOT[team.tier] ?? "bg-zinc-600"}`} />

            {/* Name + players */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{team.name}</p>
              <p className="text-xs text-zinc-600 truncate mt-0.5">
                {team.roster_json.slice(0, 3).map((p) => p.name.split(" ").pop()).join(" · ")}
              </p>
            </div>

            {/* Overall */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`font-display text-base font-black ${overallColor(team.overall)}`}>
                {team.overall}
              </span>
              <span className="font-display text-xs text-zinc-600">{team.tier}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
