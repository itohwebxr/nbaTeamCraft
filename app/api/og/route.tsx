import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

type PlayoffShareData = {
  kind: "playoff";
  size: number;
  champion: { name: string; tier: string; overall: number };
  path: { round: string; opp: string; score: string }[];
  finals: { home: string; away: string; hw: number; aw: number };
};

type SeasonShareData = {
  kind: "season";
  team: { name: string; tier: string; overall: number };
  wins: number;
  losses: number;
  label: string;
  blurb: string;
};

const TIER_COLORS: Record<string, string> = {
  S: "#f59e0b",
  A: "#22c55e",
  B: "#3b82f6",
  C: "#a855f7",
  D: "#6b7280",
};

const GRADE_COLORS: Record<string, string> = {
  DYNASTY: "#f59e0b",
  ELITE: "#f97316",
  CONTENDER: "#22c55e",
  PLAYOFF: "#3b82f6",
  FRINGE: "#0ea5e9",
  LOTTERY: "#a855f7",
  REBUILD: "#6b7280",
};

const SLOT_ORDER = ["PG", "SG", "SF", "PF", "C", "6TH"];

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const teamName = p.get("name") || "My NBA Team";
  const overall = p.get("overall") || "—";
  const tier = p.get("tier") || "—";
  const tierColor = TIER_COLORS[tier] ?? "#6b7280";
  const isSandbox = p.get("mode") === "sandbox";
  const isCup = p.get("mode") === "cup";
  const cupWins = p.get("cup_wins") ?? "0";
  const cupLosses = p.get("cup_losses") ?? "0";
  const cupWeek = p.get("cup_week") ?? "";

  const logoUrl = `${req.nextUrl.origin}/logo.png?v=2`;
  const logoData = await fetch(logoUrl)
    .then((r) => r.arrayBuffer())
    .then((buf) => `data:image/png;base64,${Buffer.from(buf).toString("base64")}`)
    .catch(() => null);

  const players = SLOT_ORDER.map((slot) => {
    const key = slot.toLowerCase();
    return {
      slot,
      name: p.get(key) || "",
      season: p.get(`${key}_s`) || "",
    };
  }).filter((e) => e.name);

  // Season result OG — the projected 82-game record + grade. Stored in `shares`
  // and referenced by id to keep the URL short.
  if (p.get("mode") === "season") {
    const shareId = p.get("id") || "";
    let share: SeasonShareData | null = null;
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data } = await supabase.from("shares").select("data").eq("id", shareId).single();
      const d = data?.data as SeasonShareData | undefined;
      if (d?.kind === "season") share = d;
    } catch {
      share = null;
    }

    if (share) {
      const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
      const gradeColor = GRADE_COLORS[share.label] ?? "#f97316";
      const cTier = TIER_COLORS[share.team.tier] ?? "#6b7280";
      return new ImageResponse(
        (
          <div style={{ width: "1200px", height: "630px", background: "#09090b", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "56px 64px", fontFamily: "sans-serif" }}>
            <span style={{ fontSize: "22px", fontWeight: 900, color: "#f59e0b", letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: "8px", display: "flex" }}>
              82-Game Season
            </span>
            <span style={{ fontSize: "52px", fontWeight: 900, color: "#ffffff", marginBottom: "16px", display: "flex" }}>
              {truncate(share.team.name, 26)}
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "24px", marginBottom: "20px" }}>
              <span style={{ fontSize: "160px", fontWeight: 900, color: "#f97316", lineHeight: 1, display: "flex" }}>{share.wins}</span>
              <span style={{ fontSize: "70px", fontWeight: 900, color: "#3f3f46", display: "flex" }}>—</span>
              <span style={{ fontSize: "160px", fontWeight: 900, color: "#52525b", lineHeight: 1, display: "flex" }}>{share.losses}</span>
            </div>
            <span style={{ fontSize: "48px", fontWeight: 900, color: gradeColor, letterSpacing: "0.1em", display: "flex" }}>{share.label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "16px" }}>
              <span style={{ background: cTier, color: "#000", fontWeight: 900, fontSize: "18px", padding: "4px 14px", borderRadius: "8px", display: "flex" }}>{share.team.tier} Tier</span>
              <span style={{ fontSize: "20px", color: "#52525b", display: "flex" }}>OVR {share.team.overall}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", position: "absolute", bottom: "40px", left: 0, padding: "0 64px" }}>
              <span style={{ fontSize: "16px", color: "#52525b", letterSpacing: "0.1em", textTransform: "uppercase", display: "flex" }}>NBA TeamCraft</span>
              <span style={{ fontSize: "16px", color: "#3f3f46", display: "flex" }}>#NBATeamCraft</span>
            </div>
          </div>
        ),
        { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600" } }
      );
    }
    // Fall through to the default card if the share can't be loaded.
  }

  // Playoff result OG — champion + road-to-the-title. The bracket is too large
  // for query params, so the result is stored in `shares` and referenced by id.
  if (p.get("mode") === "playoff") {
    const shareId = p.get("id") || "";
    const tier = (name: string) => TIER_COLORS[name] ?? "#6b7280";
    let share: PlayoffShareData | null = null;
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data } = await supabase.from("shares").select("data").eq("id", shareId).single();
      const d = data?.data as PlayoffShareData | undefined;
      if (d?.kind === "playoff") share = d;
    } catch {
      share = null;
    }

    if (share) {
      const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
      const cTier = tier(share.champion.tier);
      return new ImageResponse(
        (
          <div style={{ width: "1200px", height: "630px", background: "#09090b", display: "flex", flexDirection: "column", padding: "44px 64px", fontFamily: "sans-serif" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "6px" }}>
              <span style={{ fontSize: "20px", fontWeight: 900, color: "#f59e0b", letterSpacing: "0.25em", textTransform: "uppercase", display: "flex" }}>
                {share.size}-Team Playoff · Champion
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "4px" }}>
              <span style={{ fontSize: "64px", display: "flex" }}>🏆</span>
              <span style={{ fontSize: "60px", fontWeight: 900, color: "#ffffff", display: "flex" }}>{truncate(share.champion.name, 22)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "18px" }}>
              <span style={{ fontSize: "22px", fontWeight: 900, color: cTier, display: "flex" }}>{share.champion.tier} TIER</span>
              <span style={{ fontSize: "22px", color: "#52525b", display: "flex" }}>·</span>
              <span style={{ fontSize: "22px", fontWeight: 900, color: "#f97316", display: "flex" }}>{share.champion.overall} OVR</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: "8px" }}>
              {share.path.map((rp, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "9px 20px", background: i % 2 === 0 ? "#18181b" : "transparent", borderRadius: "8px" }}>
                  <span style={{ fontSize: "16px", fontWeight: 700, color: "#71717a", width: "220px", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex" }}>{rp.round}</span>
                  <span style={{ fontSize: "22px", fontWeight: 700, color: "#e4e4e7", flex: 1, display: "flex" }}>def. {truncate(rp.opp, 22)}</span>
                  <span style={{ fontSize: "24px", fontWeight: 900, color: "#f97316", display: "flex" }}>{rp.score}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
              <span style={{ fontSize: "16px", color: "#52525b", letterSpacing: "0.1em", textTransform: "uppercase", display: "flex" }}>NBA TeamCraft</span>
              <span style={{ fontSize: "16px", color: "#3f3f46", display: "flex" }}>#NBATeamCraft</span>
            </div>
          </div>
        ),
        { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600" } }
      );
    }
    // Fall through to default card if the share can't be loaded.
  }

  // Matchup result OG — VS scoreboard for the Match Simulator
  if (p.get("mode") === "matchup") {
    const homeName = p.get("home") || "Home";
    const awayName = p.get("away") || "Away";
    const homeScore = p.get("hs") || "0";
    const awayScore = p.get("as") || "0";
    const isSeries = p.get("kind") === "series";
    const homeWon = parseInt(homeScore, 10) >= parseInt(awayScore, 10);

    // Series with per-game scores -> full G1..G7 scoreboard (mirrors the app).
    const games = (p.get("games") || "")
      .split(",")
      .map((g) => g.split("-"))
      .filter((pair) => pair.length === 2 && pair[0] !== "");

    // Per-game top scorers, encoded as "hName~hPts~aName~aPts" per game.
    const tops = (p.get("tops") || "").split(",").map((t) => {
      const [hName = "", hPts = "", aName = "", aPts = ""] = t.split("~");
      return { hName, hPts, aName, aPts };
    });

    if (isSeries && games.length > 0) {
      const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
      // Scorer names: first name → initial, then cap so points stay visible.
      const shortScorer = (name: string, max = 13) => {
        const parts = name.trim().split(/\s+/);
        const s = parts.length >= 2 ? `${parts[0][0]}. ${parts.slice(1).join(" ")}` : name;
        return truncate(s, max);
      };
      return new ImageResponse(
        (
          <div style={{ width: "1200px", height: "630px", background: "#09090b", display: "flex", flexDirection: "column", padding: "36px 64px", fontFamily: "sans-serif" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "8px" }}>
              <span style={{ fontSize: "16px", fontWeight: 900, color: "#f59e0b", letterSpacing: "0.25em", textTransform: "uppercase" }}>Series Final · Best of 7</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", marginBottom: "6px" }}>
              <span style={{ fontSize: "34px", fontWeight: 900, color: "#ffffff" }}>🏆 {truncate(homeWon ? homeName : awayName, 24)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "18px", marginBottom: "12px" }}>
              <span style={{ fontSize: "44px", fontWeight: 900, color: homeWon ? "#f97316" : "#52525b" }}>{homeScore}</span>
              <span style={{ fontSize: "26px", color: "#3f3f46" }}>—</span>
              <span style={{ fontSize: "44px", fontWeight: 900, color: !homeWon ? "#f97316" : "#52525b" }}>{awayScore}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: "6px" }}>
              {games.map(([h, a], i) => {
                const hWon = parseInt(h, 10) >= parseInt(a, 10);
                const top = tops[i] ?? { hName: "", hPts: "", aName: "", aPts: "" };
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 16px", background: i % 2 === 0 ? "#18181b" : "transparent", borderRadius: "8px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 700, color: "#71717a", width: "34px", display: "flex" }}>G{i + 1}</span>
                    {/* Home: team name with top scorer inline to its right */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, overflow: "hidden" }}>
                      <span style={{ fontSize: "19px", fontWeight: hWon ? 700 : 400, color: hWon ? "#ffffff" : "#71717a", display: "flex" }}>{truncate(homeName, 14)}</span>
                      {top.hName && (
                        <span style={{ fontSize: "16px", fontWeight: 700, color: "#fbbf24", display: "flex", alignItems: "center" }}>
                          {shortScorer(top.hName)} {top.hPts}<span style={{ fontSize: "11px", color: "#a16207", marginLeft: "3px", display: "flex" }}>PTS</span>
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "25px", fontWeight: 900, color: hWon ? "#f97316" : "#71717a", display: "flex" }}>{h}</span>
                    <span style={{ fontSize: "15px", color: "#3f3f46", display: "flex" }}>-</span>
                    <span style={{ fontSize: "25px", fontWeight: 900, color: !hWon ? "#f97316" : "#71717a", display: "flex" }}>{a}</span>
                    {/* Away: top scorer inline to the left of the team name */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, overflow: "hidden", justifyContent: "flex-end" }}>
                      {top.aName && (
                        <span style={{ fontSize: "16px", fontWeight: 700, color: "#fbbf24", display: "flex", alignItems: "center" }}>
                          {top.aPts}<span style={{ fontSize: "11px", color: "#a16207", margin: "0 3px", display: "flex" }}>PTS</span>{shortScorer(top.aName)}
                        </span>
                      )}
                      <span style={{ fontSize: "19px", fontWeight: !hWon ? 700 : 400, color: !hWon ? "#ffffff" : "#71717a", display: "flex" }}>{truncate(awayName, 14)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
              <span style={{ fontSize: "15px", color: "#52525b", letterSpacing: "0.1em", textTransform: "uppercase" }}>NBA TeamCraft</span>
              <span style={{ fontSize: "15px", color: "#3f3f46" }}>#NBATeamCraft</span>
            </div>
          </div>
        ),
        { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600" } }
      );
    }

    const Side = ({ name, score, won, align }: { name: string; score: string; won: boolean; align: "flex-start" | "flex-end" }) => (
      <div style={{ display: "flex", flexDirection: "column", alignItems: align, width: "440px" }}>
        <span style={{ fontSize: "30px", fontWeight: 700, color: won ? "#ffffff" : "#a1a1aa", textAlign: align === "flex-start" ? "left" : "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "440px" }}>
          {name}
        </span>
        <span style={{ fontSize: "150px", fontWeight: 900, color: won ? "#f97316" : "#52525b", lineHeight: 1, marginTop: "8px" }}>
          {score}
        </span>
        {won && (
          <span style={{ fontSize: "18px", fontWeight: 900, color: "#f59e0b", letterSpacing: "0.2em", textTransform: "uppercase", marginTop: "8px" }}>
            {isSeries ? "Series Winner" : "Winner"}
          </span>
        )}
      </div>
    );

    return new ImageResponse(
      (
        <div style={{ width: "1200px", height: "630px", background: "#09090b", display: "flex", flexDirection: "column", padding: "56px 64px", fontFamily: "sans-serif" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <span style={{ fontSize: "18px", color: "#71717a", letterSpacing: "0.15em", textTransform: "uppercase" }}>NBA TeamCraft</span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#000", background: "#f97316", padding: "3px 10px", borderRadius: "6px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {isSeries ? "Series · Best of 7" : "Match Simulator"}
            </span>
          </div>
          <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between" }}>
            <Side name={homeName} score={homeScore} won={homeWon} align="flex-start" />
            <span style={{ fontSize: "56px", fontWeight: 900, color: "#3f3f46", display: "flex" }}>VS</span>
            <Side name={awayName} score={awayScore} won={!homeWon} align="flex-end" />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
            <span style={{ fontSize: "16px", color: "#3f3f46" }}>#NBATeamCraft</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600" } }
    );
  }

  // Cup result OG — special layout highlighting the W-L record
  if (isCup) {
    const wins = parseInt(cupWins, 10);
    const losses = parseInt(cupLosses, 10);
    const perfColor = wins >= 6 ? "#f59e0b" : wins >= 4 ? "#22c55e" : wins >= 2 ? "#3b82f6" : "#6b7280";
    return new ImageResponse(
      (
        <div style={{ width: "1200px", height: "630px", background: "#09090b", display: "flex", flexDirection: "column", padding: "56px 64px", fontFamily: "sans-serif" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "40px" }}>
            <span style={{ fontSize: "18px", color: "#71717a", letterSpacing: "0.15em", textTransform: "uppercase" }}>NBA TeamCraft</span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#000", background: "#f59e0b", padding: "3px 10px", borderRadius: "6px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              CUP {cupWeek}
            </span>
          </div>
          <div style={{ display: "flex", flex: 1, alignItems: "center", gap: "64px" }}>
            {/* Left: team + record */}
            <div style={{ display: "flex", flexDirection: "column", width: "440px" }}>
              <div style={{ fontSize: "24px", color: "#a1a1aa", marginBottom: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{teamName}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
                <span style={{ fontSize: "120px", fontWeight: 900, color: perfColor, lineHeight: 1 }}>{cupWins}</span>
                <span style={{ fontSize: "48px", color: "#3f3f46" }}>—</span>
                <span style={{ fontSize: "80px", fontWeight: 700, color: "#3f3f46", lineHeight: 1 }}>{cupLosses}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "16px" }}>
                <span style={{ background: tierColor, color: "#000", fontWeight: 900, fontSize: "18px", padding: "4px 14px", borderRadius: "8px" }}>{tier} Tier</span>
                <span style={{ fontSize: "20px", color: "#52525b" }}>OVR {overall}</span>
              </div>
            </div>
            {/* Divider */}
            <div style={{ width: "1px", background: "#27272a", alignSelf: "stretch", display: "flex" }} />
            {/* Right: roster */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, gap: "14px" }}>
              {players.map((player) => (
                <div key={player.slot} style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                  <span style={{ fontSize: "16px", fontWeight: 700, color: player.slot === "6TH" ? "#71717a" : "#f97316", width: "44px", flexShrink: 0 }}>{player.slot}</span>
                  <span style={{ fontSize: "26px", fontWeight: 600, color: "#ffffff" }}>{player.name}</span>
                  {player.season && <span style={{ fontSize: "16px", color: "#52525b", marginLeft: "4px" }}>{player.season}</span>}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
            <span style={{ fontSize: "16px", color: "#3f3f46" }}>#NBATeamCraft</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600" } }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#09090b",
          display: "flex",
          flexDirection: "column",
          padding: "56px 64px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
          <span style={{ fontSize: "18px", color: "#71717a", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            NBA TeamCraft
          </span>
          {isSandbox && (
            <span
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#000",
                background: "#f97316",
                padding: "3px 10px",
                borderRadius: "6px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              ROSTER BUILDER
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, gap: "64px" }}>
          {/* Left: logo + info block */}
          <div style={{ display: "flex", alignItems: "center", gap: "32px", width: "400px" }}>
            {/* Logo */}
            {logoData ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoData} alt="NBA TeamCraft" style={{ width: "160px", height: "170px", objectFit: "contain", flexShrink: 0 }} />
            ) : null}

            {/* Team name + overall + tier */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
              <div
                style={{
                  fontSize: "22px",
                  color: "#a1a1aa",
                  marginBottom: "4px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {teamName}
              </div>
              <span style={{ fontSize: "96px", fontWeight: 900, color: "#ffffff", lineHeight: 1 }}>
                {overall}
              </span>
              <div style={{ marginTop: "12px", display: "flex" }}>
                <span
                  style={{
                    background: tierColor,
                    color: "#000",
                    fontWeight: 900,
                    fontSize: "20px",
                    padding: "4px 16px",
                    borderRadius: "8px",
                  }}
                >
                  {tier} Tier
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: "1px", background: "#27272a", display: "flex" }} />

          {/* Right: roster */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, gap: "14px" }}>
            {players.map((player) => (
              <div key={player.slot} style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: player.slot === "6TH" ? "#71717a" : "#f97316",
                    width: "44px",
                    flexShrink: 0,
                  }}
                >
                  {player.slot}
                </span>
                <span style={{ fontSize: "26px", fontWeight: 600, color: "#ffffff" }}>{player.name}</span>
                {player.season ? (
                  <span style={{ fontSize: "16px", color: "#52525b", marginLeft: "4px" }}>{player.season}</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
          <span style={{ fontSize: "16px", color: "#3f3f46" }}>#NBATeamCraft</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
