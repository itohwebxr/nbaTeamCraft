// Shared parsing for matchup/series results. The full game-by-game result is
// not persisted server-side — the shareable summary lives entirely in the URL
// query string (used by /matchup/result and stored as sim_feed.result_url), so
// both the result page and the sim detail page reconstruct it from there.

export type MatchupTop = { hName: string; hPts: string; aName: string; aPts: string };
export type MatchupGame = { h: string; a: string; top?: MatchupTop };
export type ParsedMatchup = {
  home: string;
  away: string;
  hs: string;
  as: string;
  kind: "single" | "series";
  homeWon: boolean;
  games: MatchupGame[];
};

function parseFromGetter(get: (key: string) => string): ParsedMatchup {
  const home = get("home") || "Home";
  const away = get("away") || "Away";
  const hs = get("hs") || "0";
  const as = get("as") || "0";
  const kind = get("kind") === "series" ? "series" : "single";
  const homeWon = parseInt(hs, 10) >= parseInt(as, 10);

  const topsRaw = get("tops");
  const tops = topsRaw
    ? topsRaw.split(",").map((t) => {
        const [hName = "", hPts = "", aName = "", aPts = ""] = t.split("~");
        return { hName, hPts, aName, aPts };
      })
    : [];

  const gamesRaw = get("games");
  const games = gamesRaw
    ? gamesRaw
        .split(",")
        .map((g) => g.split("-"))
        .filter((pair) => pair.length === 2 && pair[0] !== "")
        .map(([h, a], i) => ({ h, a, top: tops[i] }))
    : [];

  return { home, away, hs, as, kind, homeWon, games };
}

// For Next.js searchParams objects (string | string[] | undefined values).
export function parseMatchupSearchParams(
  sp: Record<string, string | string[] | undefined>
): ParsedMatchup {
  return parseFromGetter((key) => {
    const v = sp[key];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  });
}

// For a stored result_url like ".../matchup/result?home=...&games=...".
export function parseMatchupUrl(url: string): ParsedMatchup | null {
  if (!url) return null;
  try {
    const qIndex = url.indexOf("?");
    const query = qIndex >= 0 ? url.slice(qIndex + 1) : url;
    const params = new URLSearchParams(query);
    if (!params.get("home") && !params.get("away")) return null;
    return parseFromGetter((key) => params.get(key) ?? "");
  } catch {
    return null;
  }
}

// Build the query string for a matchup result URL (used when persisting to feed).
export function buildMatchupQuery(opts: {
  home: string;
  away: string;
  hs: string | number;
  as: string | number;
  kind: "single" | "series";
  games?: string;
  tops?: string;
}): string {
  const qs = new URLSearchParams({
    home: opts.home,
    away: opts.away,
    hs: String(opts.hs),
    as: String(opts.as),
    kind: opts.kind,
  });
  if (opts.games) qs.set("games", opts.games);
  if (opts.tops) qs.set("tops", opts.tops);
  return qs.toString();
}
