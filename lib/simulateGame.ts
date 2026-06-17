// Game simulation engine for TeamCraft Cup / Exhibition matches.
// Deterministic for a given seed string — the same matchup ID always
// replays the same game, so results can be re-derived server-side.

export interface SimPlayer {
  name: string;
  slot: string; // "PG" | "SG" | "SF" | "PF" | "C" | "BENCH1"
  position: string; // assigned position
  overall: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
}

export interface SimTeamEvaluation {
  overall: number;
  offense: number;
  defense: number;
  rebound: number;
  playmaking: number;
}

export interface SimTeam {
  name: string;
  evaluation: SimTeamEvaluation;
  players: SimPlayer[];
}

export interface BoxScoreLine {
  name: string;
  slot: string;
  min: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  fgm: number;
  fga: number;
}

export interface GameResult {
  // Quarter scores; entries beyond index 3 are overtime periods
  quarters: { home: number; away: number }[];
  homeTotal: number;
  awayTotal: number;
  winner: "home" | "away";
  overtime: boolean;
  homeBox: BoxScoreLine[];
  awayBox: BoxScoreLine[];
}

// ---------- Seeded RNG ----------

function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number): number {
  // Box-Muller transform
  const u1 = Math.max(rng(), 1e-9);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ---------- Team strength → expected points ----------

const BASE_POINTS = 105;

// Expected points for `team` against `opp`. The headline `overall` is the
// dominant strength signal (it's what users read on the card), with the four
// sub-ratings adding texture. Coefficients are intentionally modest relative to
// the per-game noise below so that even a clear favorite is far from a lock in
// any single game: a 10-overall edge ≈ +6 expected margin against a ~16pt
// single-game margin stddev. This keeps best-of-7 series competitive — sweeps
// become the exception and series regularly stretch to six or seven games.
function expectedPoints(team: SimTeamEvaluation, opp: SimTeamEvaluation): number {
  return (
    BASE_POINTS +
    (team.overall - opp.overall) * 0.36 +
    (team.offense - opp.defense) * 0.22 +
    (team.rebound - opp.rebound) * 0.09 +
    (team.playmaking - opp.playmaking) * 0.06
  );
}

// ---------- Stat fallback for players without per-game stats ----------

// Position archetype multipliers for [reb, ast, stl, blk]
const ARCHETYPE: Record<string, [number, number, number, number]> = {
  PG: [0.6, 2.0, 1.3, 0.3],
  SG: [0.7, 1.2, 1.2, 0.4],
  SF: [1.0, 0.9, 1.0, 0.7],
  PF: [1.4, 0.6, 0.8, 1.2],
  C: [1.7, 0.5, 0.6, 1.8],
};

function ensureStats(p: SimPlayer): SimPlayer {
  const hasStats = p.ppg > 0 || p.rpg > 0 || p.apg > 0;
  if (hasStats) return p;
  // Synthesize from overall + position archetype
  const base = Math.max(4, (p.overall - 50) * 0.55);
  const arch = ARCHETYPE[p.position] ?? ARCHETYPE.SF;
  return {
    ...p,
    ppg: base,
    rpg: base * 0.32 * arch[0],
    apg: base * 0.28 * arch[1],
    spg: base * 0.06 * arch[2],
    bpg: base * 0.05 * arch[3],
  };
}

// ---------- Distribution helpers ----------

// Distribute `total` across players proportionally to weights,
// with per-player random variance, summing exactly to total.
function distribute(
  total: number,
  weights: number[],
  rng: () => number,
  variance = 0.27
): number[] {
  const noisy = weights.map((w) => Math.max(0.01, w) * (1 + (rng() * 2 - 1) * variance));
  const sum = noisy.reduce((a, b) => a + b, 0);
  const raw = noisy.map((w) => (total * w) / sum);
  // Largest remainder rounding so the values sum exactly to total
  const floored = raw.map(Math.floor);
  let remainder = total - floored.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) {
    floored[order[k].i] += 1;
  }
  return floored;
}

function buildBoxScore(
  players: SimPlayer[],
  teamTotal: number,
  rng: () => number
): BoxScoreLine[] {
  const ps = players.map(ensureStats);
  const pts = distribute(teamTotal, ps.map((p) => p.ppg), rng);

  // Team totals for other stats scale loosely with league averages
  const teamReb = Math.round(40 + (rng() * 2 - 1) * 5);
  const teamAst = Math.round(teamTotal * 0.22 + (rng() * 2 - 1) * 3);
  const teamStl = Math.round(7 + (rng() * 2 - 1) * 2.5);
  const teamBlk = Math.round(4.5 + (rng() * 2 - 1) * 2);

  const reb = distribute(teamReb, ps.map((p) => p.rpg), rng);
  const ast = distribute(teamAst, ps.map((p) => p.apg), rng);
  const stl = distribute(teamStl, ps.map((p) => p.spg), rng, 0.5);
  const blk = distribute(teamBlk, ps.map((p) => p.bpg), rng, 0.5);

  return ps.map((p, i) => {
    const isStarter = p.slot !== "BENCH1";
    const min = Math.round((isStarter ? 34 : 24) + (rng() * 2 - 1) * 4);
    // Generate plausible FG numbers from points (roughly 80% of points from FG)
    const fgPct = 0.40 + rng() * 0.16;
    const fgPoints = pts[i] * (0.78 + rng() * 0.1);
    const fgm = Math.max(0, Math.round(fgPoints / 2.25));
    const fga = Math.max(fgm, Math.round(fgm / Math.max(fgPct, 0.25)));
    return {
      name: p.name,
      slot: p.slot,
      min,
      pts: pts[i],
      reb: reb[i],
      ast: ast[i],
      stl: stl[i],
      blk: blk[i],
      fgm,
      fga,
    };
  });
}

// ---------- Main simulation ----------

export function simulateGame(home: SimTeam, away: SimTeam, seed: string): GameResult {
  const rng = mulberry32(hashSeed(seed));

  const homeExp = expectedPoints(home.evaluation, away.evaluation);
  const awayExp = expectedPoints(away.evaluation, home.evaluation);

  const quarters: { home: number; away: number }[] = [];
  let homeTotal = 0;
  let awayTotal = 0;

  // Per-quarter noise of 5.7 → full-game margin stddev ≈ 16pts. Higher than
  // real NBA single-game variance on purpose: it keeps the favorite winning
  // more often than not while leaving plenty of room for upsets, so best-of-7
  // series stay dramatic and frequently reach game six or seven.
  for (let q = 0; q < 4; q++) {
    const h = Math.max(12, Math.round(homeExp / 4 + gaussian(rng) * 5.7));
    const a = Math.max(12, Math.round(awayExp / 4 + gaussian(rng) * 5.7));
    quarters.push({ home: h, away: a });
    homeTotal += h;
    awayTotal += a;
  }

  // Overtime until the tie breaks (5-minute periods ≈ 1/9.6 of regulation pace)
  let overtime = false;
  while (homeTotal === awayTotal) {
    overtime = true;
    const h = Math.max(4, Math.round(homeExp / 9.6 + gaussian(rng) * 2.5));
    const a = Math.max(4, Math.round(awayExp / 9.6 + gaussian(rng) * 2.5));
    quarters.push({ home: h, away: a });
    homeTotal += h;
    awayTotal += a;
  }

  return {
    quarters,
    homeTotal,
    awayTotal,
    winner: homeTotal > awayTotal ? "home" : "away",
    overtime,
    homeBox: buildBoxScore(home.players, homeTotal, rng),
    awayBox: buildBoxScore(away.players, awayTotal, rng),
  };
}
