"use client";

import { useEffect, useState } from "react";
import { useDraftStore } from "@/stores/draftStore";

export default function SandboxFilterBar() {
  const { sandboxConfig, setSandboxConfig, clearCurrentTeam } = useDraftStore();
  const [teams, setTeams] = useState<string[]>([]);
  const [seasons, setSeasons] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/filter-options")
      .then((r) => r.json())
      .then((data) => {
        setTeams(data.teams ?? []);
        setSeasons(data.seasons ?? []);
      })
      .catch(console.error);
  }, []);

  const handleTeamChange = (value: string) => {
    setSandboxConfig({ teamFilter: value });
    clearCurrentTeam();
  };

  const handleSeasonChange = (value: string) => {
    setSandboxConfig({ seasonFilter: value });
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
            {teams.map((t) => (
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
            {seasons.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
