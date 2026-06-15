"use client";

import { useEffect, useRef, useState } from "react";
import { GameResult, BoxScoreLine } from "@/lib/simulateGame";

interface OpponentInfo {
  id: string;
  name: string;
  overall: number;
  tier: string;
  isLegend?: boolean;
}

interface Props {
  userTeamName: string;
  userOverall: number;
  userTier: string;
  opponent: OpponentInfo;
  result: GameResult;
  sessionRecord: { wins: number; losses: number };
  onRematch: () => void;
  onClose: () => void;
  /** When true, hides the "Play Again" button and shows cup-appropriate messaging */
  cupMode?: boolean;
}

type Phase = "vs" | "playing" | "final";

const QUARTER_LABELS = ["Q1", "Q2", "Q3", "Q4"];

function quarterLabel(i: number): string {
  return i < 4 ? QUARTER_LABELS[i] : `OT${i - 3 > 1 ? i - 3 : ""}`;
}

// A dramatic, share-worthy headline that varies with the result so no two
// clips look the same (great for video). Margin + overtime drive the label.
function resultHeadline(won: boolean, margin: number, overtime: boolean): { text: string; tag?: string } {
  if (won) {
    if (overtime) return { text: "🏆 OVERTIME WIN", tag: "INSTANT CLASSIC" };
    if (margin <= 3) return { text: "🏆 BUZZER BEATER", tag: "CLUTCH" };
    if (margin >= 25) return { text: "🏆 BLOWOUT", tag: "STATEMENT" };
    if (margin >= 15) return { text: "🏆 BIG WIN", tag: "DOMINANT" };
    return { text: "🏆 YOU WIN" };
  }
  if (overtime) return { text: "OT HEARTBREAKER", tag: "SO CLOSE" };
  if (margin <= 3) return { text: "HEARTBREAKER", tag: "GUTTING" };
  if (margin >= 25) return { text: "BLOWN OUT" };
  return { text: "DEFEAT" };
}

// Lightweight CSS-only confetti burst — no dependency, ~70 pieces.
const CONFETTI_COLORS = ["#f97316", "#fbbf24", "#ffffff", "#fb923c", "#fde68a"];
function Confetti() {
  const pieces = Array.from({ length: 70 }).map((_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const duration = 2.4 + Math.random() * 1.8;
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const rounded = i % 3 === 0;
    return (
      <span
        key={i}
        className="confetti-piece"
        style={{
          left: `${left}%`,
          backgroundColor: color,
          borderRadius: rounded ? "50%" : "1px",
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
        }}
      />
    );
  });
  // z-[60] sits above the z-50 overlay so confetti is always visible
  return <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">{pieces}</div>;
}

function BoxScoreTable({ lines }: { lines: BoxScoreLine[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-zinc-500 uppercase tracking-wider">
            <th className="text-left py-1.5 pr-2 font-bold">Player</th>
            <th className="text-right py-1.5 px-1.5 font-bold">MIN</th>
            <th className="text-right py-1.5 px-1.5 font-bold">PTS</th>
            <th className="text-right py-1.5 px-1.5 font-bold">REB</th>
            <th className="text-right py-1.5 px-1.5 font-bold">AST</th>
            <th className="text-right py-1.5 px-1.5 font-bold">STL</th>
            <th className="text-right py-1.5 px-1.5 font-bold">BLK</th>
            <th className="text-right py-1.5 pl-1.5 font-bold">FG</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-t border-zinc-800">
              <td className="py-1.5 pr-2">
                <span className="text-[10px] font-bold text-orange-400 mr-1.5">
                  {l.slot === "BENCH1" ? "6TH" : l.slot}
                </span>
                <span className="text-white font-semibold whitespace-nowrap">{l.name}</span>
              </td>
              <td className="text-right py-1.5 px-1.5 text-zinc-400 tabular-nums">{l.min}</td>
              <td className="text-right py-1.5 px-1.5 text-white font-bold tabular-nums">{l.pts}</td>
              <td className="text-right py-1.5 px-1.5 text-zinc-300 tabular-nums">{l.reb}</td>
              <td className="text-right py-1.5 px-1.5 text-zinc-300 tabular-nums">{l.ast}</td>
              <td className="text-right py-1.5 px-1.5 text-zinc-300 tabular-nums">{l.stl}</td>
              <td className="text-right py-1.5 px-1.5 text-zinc-300 tabular-nums">{l.blk}</td>
              <td className="text-right py-1.5 pl-1.5 text-zinc-400 tabular-nums whitespace-nowrap">
                {l.fgm}/{l.fga}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ExhibitionMatch({
  userTeamName,
  userOverall,
  userTier,
  opponent,
  result,
  sessionRecord,
  onRematch,
  onClose,
  cupMode,
}: Props) {
  const [phase, setPhase] = useState<Phase>("vs");
  // Number of quarters currently revealed during the "playing" phase
  const [revealed, setRevealed] = useState(0);
  const [boxTab, setBoxTab] = useState<"user" | "opp">("user");
  const [showBox, setShowBox] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const won = result.winner === "home";
  const totalPeriods = result.quarters.length;

  useEffect(() => {
    const t = timers.current;
    t.push(setTimeout(() => setPhase("playing"), 1800));
    for (let q = 1; q <= totalPeriods; q++) {
      t.push(setTimeout(() => setRevealed(q), 1800 + q * 1300));
    }
    t.push(setTimeout(() => setPhase("final"), 1800 + totalPeriods * 1300 + 900));
    return () => t.forEach(clearTimeout);
  }, [totalPeriods]);

  const skip = () => {
    timers.current.forEach(clearTimeout);
    setRevealed(totalPeriods);
    setPhase("final");
  };

  const userScore = result.quarters.slice(0, revealed).reduce((s, q) => s + q.home, 0);
  const oppScore = result.quarters.slice(0, revealed).reduce((s, q) => s + q.away, 0);

  const margin = Math.abs(result.homeTotal - result.awayTotal);
  const headline = resultHeadline(won, margin, result.overtime);

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/97 backdrop-blur-sm overflow-y-auto">
      {phase === "final" && won && <Confetti />}
      <div className="min-h-full flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg">
          {/* VS header — always visible */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex-1 text-center">
              <p className="text-sm font-black text-white truncate">{userTeamName}</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                OVR {userOverall} · {userTier} Tier
              </p>
            </div>
            <div className="shrink-0">
              <span className="font-display text-2xl font-black text-orange-500 vs-pulse">VS</span>
            </div>
            <div className="flex-1 text-center">
              <p className="text-sm font-black text-white truncate">
                {opponent.isLegend && <span className="mr-1">👑</span>}
                {opponent.name}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                OVR {opponent.overall} · {opponent.tier} Tier
              </p>
            </div>
          </div>

          {phase === "vs" && (
            <div className="text-center py-12">
              <p className="text-xs font-bold text-orange-400 uppercase tracking-[0.3em] animate-pulse">
                Tip-off...
              </p>
            </div>
          )}

          {phase !== "vs" && (
            <>
              {/* Live score */}
              <div className="flex items-center justify-center gap-6 mb-5">
                <span
                  className={`font-display text-5xl font-black tabular-nums ${
                    phase === "final" && won ? "text-orange-400" : "text-white"
                  }`}
                >
                  {phase === "final" ? result.homeTotal : userScore}
                </span>
                <span className="text-zinc-600 text-xl">—</span>
                <span
                  className={`font-display text-5xl font-black tabular-nums ${
                    phase === "final" && !won ? "text-orange-400" : "text-white"
                  }`}
                >
                  {phase === "final" ? result.awayTotal : oppScore}
                </span>
              </div>

              {/* Quarter scores */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-5">
                <div
                  className="grid gap-1 text-center"
                  style={{ gridTemplateColumns: `auto repeat(${totalPeriods}, 1fr)` }}
                >
                  <span />
                  {result.quarters.map((_, i) => (
                    <span key={i} className="text-[10px] font-bold text-zinc-500 uppercase">
                      {quarterLabel(i)}
                    </span>
                  ))}
                  <span className="text-[10px] font-bold text-zinc-500 text-left pr-2 self-center">YOU</span>
                  {result.quarters.map((q, i) => (
                    <span
                      key={i}
                      className={`text-sm font-bold tabular-nums transition-opacity duration-500 ${
                        i < revealed ? "opacity-100 text-white" : "opacity-0"
                      }`}
                    >
                      {q.home}
                    </span>
                  ))}
                  <span className="text-[10px] font-bold text-zinc-500 text-left pr-2 self-center">OPP</span>
                  {result.quarters.map((q, i) => (
                    <span
                      key={i}
                      className={`text-sm font-bold tabular-nums transition-opacity duration-500 ${
                        i < revealed ? "opacity-100 text-zinc-300" : "opacity-0"
                      }`}
                    >
                      {q.away}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {phase === "playing" && (
            <button
              onClick={skip}
              className="block mx-auto text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-4 transition-colors"
            >
              Skip to final
            </button>
          )}

          {phase === "final" && (
            <div className="fade-up">
              {/* Result banner */}
              <div className={`relative text-center mb-5 py-5 rounded-2xl ${won ? "bg-orange-500/10 border border-orange-500/20" : "bg-zinc-900 border border-zinc-800"}`}>
                {headline.tag && (
                  <p
                    className={`relative win-reveal font-display text-xs font-black uppercase tracking-[0.35em] mb-1 ${
                      won ? "text-amber-300" : "text-zinc-500"
                    }`}
                  >
                    {headline.tag}
                  </p>
                )}
                <p
                  className={`relative win-reveal font-display text-5xl font-black tracking-tight ${
                    won ? "text-orange-400 win-glow" : "text-zinc-400 defeat-shake"
                  }`}
                >
                  {headline.text}
                </p>
                <p className="relative text-sm font-black text-white tabular-nums mt-2">
                  {result.homeTotal} – {result.awayTotal}
                </p>
                <p className="relative text-xs text-zinc-500 mt-2">
                  {cupMode ? "Cup record" : "Exhibition record"}:{" "}
                  <span className="text-white font-bold">
                    {sessionRecord.wins}W – {sessionRecord.losses}L
                  </span>
                </p>
                {cupMode && (
                  <p className="relative text-xs text-zinc-500 mt-1">Come back tomorrow for your next match!</p>
                )}
              </div>

              {/* Box score */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-5">
                <button
                  onClick={() => setShowBox(!showBox)}
                  className="w-full flex items-center justify-between text-xs font-bold text-zinc-400 uppercase tracking-widest"
                >
                  <span>📊 Box Score</span>
                  <span className="text-zinc-600">{showBox ? "▲" : "▼"}</span>
                </button>
                {showBox && (
                  <div className="mt-3">
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => setBoxTab("user")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          boxTab === "user"
                            ? "bg-orange-500 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {userTeamName}
                      </button>
                      <button
                        onClick={() => setBoxTab("opp")}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          boxTab === "opp"
                            ? "bg-orange-500 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {opponent.name}
                      </button>
                    </div>
                    <BoxScoreTable lines={boxTab === "user" ? result.homeBox : result.awayBox} />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {cupMode ? (
                  <button
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors"
                  >
                    Done
                  </button>
                ) : (
                  <>
                    <button
                      onClick={onClose}
                      className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={onRematch}
                      className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors"
                    >
                      ⚔️ Play Again
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
