import Link from "next/link";
import { fetchHomeTeams } from "@/lib/homeTeams";
import FeedCard from "@/components/home/FeedCard";

export default async function LatestTeams() {
  const teams = await fetchHomeTeams({ kind: "dream", orderBy: "created_at", limit: 5 });
  if (teams.length === 0) return null;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-3">
        <p className="font-display text-xs font-bold text-zinc-400 uppercase tracking-[0.2em]">
          🏀 Latest Dream Teams
        </p>
        <Link href="/feed?tab=dream" className="text-xs text-orange-400 hover:text-orange-300 font-bold transition-colors">
          View All →
        </Link>
      </div>

      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        {teams.map((team) => (
          <FeedCard key={team.id} team={team} />
        ))}
      </div>
    </div>
  );
}
