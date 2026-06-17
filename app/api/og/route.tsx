import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const TIER_COLORS: Record<string, string> = {
  S: "#f59e0b",
  A: "#22c55e",
  B: "#3b82f6",
  C: "#a855f7",
  D: "#6b7280",
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
