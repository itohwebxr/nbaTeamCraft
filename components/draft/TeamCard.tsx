"use client";

import { Team } from "@/types";

interface TeamCardProps {
  team: Team;
  playerCount: number;
}

export default function TeamCard({ team, playerCount }: TeamCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">
            {team.season} Season
          </p>
          <h2 className="text-xl font-bold text-white leading-tight">{team.name.replace(/^\d{4}-\d{2}\s/, "")}</h2>
          <p className="text-sm text-zinc-400 mt-0.5">{team.abbreviation}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-orange-400">{team.abbreviation}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{playerCount} players</p>
        </div>
      </div>
    </div>
  );
}
