"use client";

import { useEffect, useState } from "react";
import { useDraftStore } from "@/stores/draftStore";

type Pair = { abbreviation: string; season: string };

export default function SandboxFilterBar() {
  const { sandboxConfig, setSandboxConfig, clearCurrentTeam } = useDraftStore();
  const [pairs, setPairs] = useState<Pair[]>([]);

  useEffect(() => {
    fetch("/api/filter-options")
      .then((r) => r.json())
      .then((data) => setPairs(data.pairs ?? []))
      .catch(console.error);
  }, []);

  // Available teams: if a season is selected, only teams that exist in that season
  const availableTeams = (() => {
    const filtered =
      sandboxConfig.seasonFilter === "Random"
        ? pairs
        : pairs.filter((p) => p.season === sandboxConfig.seasonFilter);
    return [...new Set(filtered.map((p) => p.abbreviation))].sort();
  })();

  // Available seasons: if a team is selected, only seasons that team exists in
  const availableSeasons = (() => {
    const filtered =
      sandboxConfig.teamFilter === "Random"
        ? pairs
        : pairs.filter((p) => p.abbreviation === sandboxConfig.teamFilter);
    return [...new Set(filtered.map((p) => p.season))].sort().reverse();
  })();

  const handleTeamChange = (value: string) => {
    const updates: { teamFilter: string; seasonFilter?: string } = { teamFilter: value };
    // If current season is no longer valid for the new team, reset it
    if (value !== "Random" && sandboxConfig.seasonFilter !== "Random") {
      const valid = pairs.some(
        (p) => p.abbreviation === value && p.season === sandboxConfig.seasonFilter
      );
      if (!valid) updates.seasonFilter = "Random";
    }
    setSandboxConfig(updates);
    clearCurrentTeam();
  };

  const handleSeasonChange = (value: string) => {
    const updates: { seasonFilter: string; teamFilter?: string } = { seasonFilter: value };
    // If current team is no longer valid for the new season, reset it
    if (value !== "Random" && sandboxConfig.teamFilter !== "Random") {
      const valid = pairs.some(
        (p) => p.season === value && p.abbreviation === sandboxConfig.teamFilter
      );
      if (!valid) updates.teamFilter = "Random";
    }
    setSandboxConfig(updates);
    clearCurrentTeam();
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-900 border-b border-zinc-800">
      <span className="text-xs font-bold text-orange-400 uppercase tracking-widest shrink-0">
        Sandbox
      </span>
      <div className="flex gap-2 flex-1">
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5 pl-1">Team</span>
          <select
            value={sandboxConfig.teamFilter}
            onChange={(e) => handleTeamChange(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1
              text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
          >
            <option value="Random">Random</option>
            {availableTeams.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5 pl-1">Season</span>
          <select
            value={sandboxConfig.seasonFilter}
            onChange={(e) => handleSeasonChange(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1
              text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
          >
            <option value="Random">Random</option>
            {availableSeasons.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
