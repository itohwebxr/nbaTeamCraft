"use client";

import { Team } from "@/types";

interface TeamCardProps {
  team: Team;
  playerCount: number;
}

export default function TeamCard({ team, playerCount }: TeamCardProps) {
  const abbr = team.abbreviation;
  return (
    <div className="relative bg-zinc-900 border border-zinc-700/60 rounded-2xl px-5 py-4 overflow-hidden">
      {/* Giant background abbreviation */}
      <span
        className="absolute right-2 top-1/2 -translate-y-1/2 font-display font-black text-[88px] leading-none
          text-zinc-800 select-none pointer-events-none tracking-tighter"
        aria-hidden
      >
        {abbr}
      </span>

      <div className="relative flex items-center justify-between">
        <div>
          <p className="font-display text-xs font-semibold text-orange-400 uppercase tracking-[0.2em] mb-0.5">
            {team.season} Season
          </p>
          <h2 className="font-display text-2xl font-black text-white leading-tight tracking-wide">
            {team.name.replace(/^\d{4}-\d{2}\s/, "")}
          </h2>
          <p className="text-xs text-zinc-500 mt-1 font-display tracking-widest">{playerCount} PLAYERS AVAILABLE</p>
        </div>
        <div className="shrink-0 ml-4">
          <div className="w-14 h-14 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
            <span className="font-display font-black text-lg text-orange-400 tracking-tight">{abbr}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
