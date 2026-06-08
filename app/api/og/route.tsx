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

  const players = SLOT_ORDER.map((slot) => ({
    slot,
    name: p.get(slot.toLowerCase()) || "",
  })).filter((e) => e.name);

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
        <div style={{ display: "flex", alignItems: "center", marginBottom: "32px" }}>
          <span style={{ fontSize: "18px", color: "#71717a", letterSpacing: "0.15em", textTransform: "uppercase" }}>
            NBA TeamCraft
          </span>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, gap: "64px" }}>
          {/* Left: team name + overall */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "360px" }}>
            <div
              style={{
                fontSize: "28px",
                color: "#a1a1aa",
                marginBottom: "12px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {teamName}
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "16px" }}>
              <span style={{ fontSize: "120px", fontWeight: 900, color: "#ffffff", lineHeight: 1 }}>
                {overall}
              </span>
            </div>
            <div
              style={{
                marginTop: "16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span
                style={{
                  background: tierColor,
                  color: "#000",
                  fontWeight: 900,
                  fontSize: "22px",
                  padding: "4px 18px",
                  borderRadius: "8px",
                }}
              >
                {tier} Tier
              </span>
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
    { width: 1200, height: 630 }
  );
}
