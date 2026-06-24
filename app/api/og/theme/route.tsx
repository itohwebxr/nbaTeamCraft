import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Dedicated large (1200x630) OG card for theme feed pages — gives boosted /
// shared theme links a thumb-stopping summary_large_image card instead of the
// small summary card.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const title = (p.get("title") || "NBA Theme").slice(0, 80);
  const hashtag = (p.get("hashtag") || "").slice(0, 40);
  const emoji = (p.get("emoji") || "🏀").slice(0, 8);
  const description = (p.get("desc") || "").slice(0, 120);

  const logoUrl = `${req.nextUrl.origin}/logo.png?v=2`;
  const logoData = await fetch(logoUrl)
    .then((r) => r.arrayBuffer())
    .then((buf) => `data:image/png;base64,${Buffer.from(buf).toString("base64")}`)
    .catch(() => null);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #2e1065 0%, #09090b 55%, #09090b 100%)",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "0.3em", color: "#c4b5fd", display: "flex" }}>
            🔥 TODAY&apos;S THEME
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
            <span style={{ fontSize: "120px", lineHeight: 1, display: "flex" }}>{emoji}</span>
            <span style={{ fontSize: "78px", fontWeight: 900, color: "#ffffff", display: "flex", lineHeight: 1.05 }}>
              {title}
            </span>
          </div>
          {hashtag ? (
            <span style={{ fontSize: "40px", fontWeight: 800, color: "#a78bfa", display: "flex" }}>#{hashtag}</span>
          ) : null}
          {description ? (
            <span style={{ fontSize: "30px", color: "#a1a1aa", display: "flex" }}>{description}</span>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "30px", fontWeight: 800, color: "#ffffff", display: "flex" }}>
            Build your take →
          </span>
          {logoData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoData} alt="NBA TeamCraft" height={48} style={{ objectFit: "contain" }} />
          ) : (
            <span style={{ fontSize: "24px", color: "#3f3f46", display: "flex" }}>@nbaTeamCraft</span>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
