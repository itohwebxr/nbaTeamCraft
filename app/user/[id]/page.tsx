import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createServerClient } from "@/lib/supabase";
import { overallColor } from "@/lib/overallColor";

export const dynamic = "force-dynamic";

const TIER_COLORS: Record<string, string> = {
  S: "text-yellow-400", A: "text-orange-400", B: "text-sky-400",
  C: "text-zinc-400", D: "text-zinc-500",
};

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, username")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  const { data: teams } = await supabase
    .from("public_teams")
    .select("id, name, overall, tier, like_count, is_sandbox, created_at")
    .eq("user_id", id)
    .order("created_at", { ascending: false })
    .limit(30);

  const sandboxTeams = (teams ?? []).filter((t) => t.is_sandbox);
  const dreamTeams = (teams ?? []).filter((t) => !t.is_sandbox);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.png?v=2" alt="NBA TeamCraft" height={32} width={60} className="object-contain" />
          </Link>
          <Link href="/me" className="text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors">
            My Page →
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Profile card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center gap-4">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.display_name ?? ""}
              className="w-16 h-16 rounded-full border-2 border-zinc-700 object-cover shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center shrink-0 text-2xl">
              🏀
            </div>
          )}
          <div className="min-w-0">
            <p className="font-black text-xl text-white truncate">{profile.display_name ?? "NBA Fan"}</p>
            {profile.username && (
              <p className="text-sm text-zinc-500 truncate">@{profile.username}</p>
            )}
            <p className="text-xs text-zinc-600 mt-1">
              {sandboxTeams.length} Crafted · {dreamTeams.length} Dream Teams
            </p>
          </div>
        </div>

        {/* Crafted Teams */}
        {sandboxTeams.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-0.5">
              🏗️ Crafted Teams
            </p>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              {sandboxTeams.map((team) => (
                <Link
                  key={team.id}
                  href={`/team/${team.id}`}
                  className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/40 transition-colors"
                >
                  <span className={`font-display text-base font-black tabular-nums ${overallColor(team.overall)}`}>
                    {team.overall}
                  </span>
                  <span className={`font-display text-xs font-bold w-5 ${TIER_COLORS[team.tier] ?? "text-zinc-500"}`}>
                    {team.tier}
                  </span>
                  <span className="flex-1 text-sm font-bold text-white truncate">{team.name}</span>
                  <span className="text-xs text-zinc-500">❤️ {team.like_count}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Dream Teams */}
        {dreamTeams.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-0.5">
              🏀 Dream Teams
            </p>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              {dreamTeams.map((team) => (
                <Link
                  key={team.id}
                  href={`/team/${team.id}`}
                  className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/40 transition-colors"
                >
                  <span className={`font-display text-base font-black tabular-nums ${overallColor(team.overall)}`}>
                    {team.overall}
                  </span>
                  <span className={`font-display text-xs font-bold w-5 ${TIER_COLORS[team.tier] ?? "text-zinc-500"}`}>
                    {team.tier}
                  </span>
                  <span className="flex-1 text-sm font-bold text-white truncate">{team.name}</span>
                  <span className="text-xs text-zinc-500">❤️ {team.like_count}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {(teams ?? []).length === 0 && (
          <div className="text-center py-10 text-zinc-600 text-sm">
            No public teams yet.
          </div>
        )}
      </div>
    </div>
  );
}
