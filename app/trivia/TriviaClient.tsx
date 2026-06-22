"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { gtm } from "@/lib/gtm";

type Question = {
  id: string;
  type: "stats" | "career";
  difficulty: "easy" | "hard";
  question: string;
  options: string[];
  answer_index: number;
  explanation: string | null;
  template?: string;
  params?: Record<string, unknown>;
};

type Mode = "menu" | "playing" | "result";
type GameMode = "daily" | "practice";
type Difficulty = "normal" | "hard";
type QuestionType = "stats" | "career" | "mix";

type Answer = {
  question: Question;
  selected: number;
  correct: boolean;
  submittedName?: string;   // Hard mode: what the user typed
  allCorrect?: string[];    // Hard played_for_all: all valid answers
};

// The daily challenge is keyed by the UTC date, so it resets at the next UTC
// midnight. Time remaining until then = when the next challenge unlocks.
function msUntilNextDailyReset(): number {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0);
  return next - now.getTime();
}

// Live countdown shown once today's challenge is done.
function NextChallengeCountdown() {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMs(msUntilNextDailyReset());
    const id = setInterval(() => setMs(msUntilNextDailyReset()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (ms === null) return null;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const time = h > 0 ? `${h}h ${m}m` : `${m}m`;

  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-xs text-zinc-400">Next challenge in</span>
      <span className="font-display text-lg font-black text-green-400 leading-none tabular-nums">{time}</span>
    </span>
  );
}

export default function TriviaClient() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("menu");
  const initialGameMode = searchParams.get("mode") === "practice" ? "practice" : "daily";
  const [gameMode, setGameMode] = useState<GameMode>(initialGameMode);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [questionType, setQuestionType] = useState<QuestionType>("mix");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selected, setSelected] = useState<number | null>(null); // highlighted choice
  const [confirmed, setConfirmed] = useState(false); // answer submitted
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [todayDone, setTodayDone] = useState(false);
  const [resultShareId, setResultShareId] = useState<string | null>(null);
  const [feedPosted, setFeedPosted] = useState(false);
  const [feedPosting, setFeedPosting] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [validating, setValidating] = useState(false);
  // Hard mode: player search
  const [playerList, setPlayerList] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchGtmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  // Preload player list when Hard difficulty is selected
  useEffect(() => {
    if (difficulty !== "hard" || playerList.length > 0) return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetch("/players.json")
      .then((r) => r.json())
      .then((data: string[]) => setPlayerList(data))
      .catch(() => {});
  }, [difficulty, playerList.length]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Check if user already completed today's daily challenge
  useEffect(() => {
    // Logged-in: check server
    if (user?.id) {
      fetch(`/api/trivia/results?userId=${user.id}`)
        .then((r) => r.json())
        .then((data) => { if (data.stats?.dailyDoneToday) setTodayDone(true); })
        .catch(() => {});
      return;
    }
    // Guest: check localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("trivia_daily_done");
      if (stored === today) setTodayDone(true);
    }
  }, [user?.id, today]);

  const fetchQuestions = useCallback(async (gm: GameMode, diff: Difficulty, qt: QuestionType) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ mode: gm, limit: "5", date: today });
      params.set("difficulty", diff === "normal" ? "easy" : diff);
      if (qt !== "mix") params.set("type", qt);
      const res = await fetch(`/api/trivia/questions?${params}`);
      const data = await res.json();
      return (data.questions ?? []) as Question[];
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, [today]);

  const startGame = async (gm: GameMode) => {
    setFetchError(false);
    setGameMode(gm);
    const qs = await fetchQuestions(gm, difficulty, questionType);
    if (!qs.length) { setFetchError(true); return; }
    gtm.triviaStart({ gmode: gm, difficulty, category: questionType, question_count: qs.length });
    setQuestions(qs);
    setCurrentIdx(0);
    setAnswers([]);
    setSelected(null);
    setConfirmed(false);
    setSaved(false);
    setMode("playing");
  };

  const handleSelect = (idx: number) => {
    if (confirmed) return;
    setSelected(idx);
  };

  const handleConfirm = () => {
    if (selected === null || confirmed) return;
    setConfirmed(true);
    const q = questions[currentIdx];
    const correct = selected === q.answer_index;
    setAnswers((prev) => [...prev, { question: q, selected, correct }]);
    gtm.triviaAnswer({ gmode: gameMode, difficulty, question_type: q.type, question_index: currentIdx + 1, is_correct: correct });
  };

  const handleSearchSubmit = async () => {
    if (!searchQuery.trim() || confirmed || validating) return;
    const playerName = searchQuery.trim();
    confirmSearch(playerName);
  };

  const handleSearchSelect = (playerName: string) => {
    if (confirmed) return;
    setSearchQuery(playerName);
    setShowDropdown(false);
  };

  const confirmSearch = async (playerName: string) => {
    if (confirmed || validating) return;
    setConfirmed(true);
    const q = questions[currentIdx];

    // played_for_all: validate against CSV to get all correct answers
    if (q.template === "played_for_all" && q.params) {
      setValidating(true);
      try {
        const res = await fetch("/api/trivia/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ template: "played_for_all", params: q.params, player_name: playerName }),
        });
        const data = await res.json() as { is_correct: boolean; all_correct: string[] };
        setSelected(data.is_correct ? 0 : 999);
        setAnswers((prev) => [...prev, {
          question: q,
          selected: data.is_correct ? 0 : 999,
          correct: data.is_correct,
          submittedName: playerName,
          allCorrect: data.all_correct,
        }]);
        gtm.triviaHardAnswerSelected({ is_correct: data.is_correct, player_name: playerName });
        gtm.triviaAnswer({ gmode: gameMode, difficulty, question_type: q.type, question_index: currentIdx + 1, is_correct: data.is_correct });
      } catch {
        const idx = q.options.indexOf(playerName);
        const correct = playerName === q.options[q.answer_index];
        setSelected(idx === -1 ? 999 : idx);
        setAnswers((prev) => [...prev, { question: q, selected: idx === -1 ? 999 : idx, correct, submittedName: playerName }]);
        gtm.triviaAnswer({ gmode: gameMode, difficulty, question_type: q.type, question_index: currentIdx + 1, is_correct: correct });
      } finally {
        setValidating(false);
      }
      return;
    }

    // Other hard questions: simple options check
    const idx = q.options.indexOf(playerName);
    const answerIdx = idx === -1 ? -1 : idx;
    setSelected(answerIdx === -1 ? 999 : answerIdx);
    const correct = playerName === q.options[q.answer_index];
    setAnswers((prev) => [...prev, { question: q, selected: answerIdx === -1 ? 999 : answerIdx, correct, submittedName: playerName }]);
    gtm.triviaHardAnswerSelected({ is_correct: correct, player_name: playerName });
    gtm.triviaAnswer({ gmode: gameMode, difficulty, question_type: q.type, question_index: currentIdx + 1, is_correct: correct });
  };

  const filteredPlayers = searchQuery.trim().length < 2
    ? []
    : playerList
        .filter((n) => n.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 10);

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setConfirmed(false);
      setSearchQuery("");
      setShowDropdown(false);
    } else {
      const finalScore = answers.filter((a) => a.correct).length;
      gtm.triviaComplete({ gmode: gameMode, difficulty, category: questionType, score: finalScore, total: answers.length });
      setMode("result");
      saveResults(answers);
    }
  };

  const saveResults = async (finalAnswers: Answer[]) => {
    // Mark daily as done
    if (gameMode === "daily") {
      setTodayDone(true);
      if (!user?.id && typeof window !== "undefined") {
        localStorage.setItem("trivia_daily_done", today);
      }
    }
    if (!user?.id) return;
    setSaving(true);
    try {
      await fetch("/api/trivia/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          mode: gameMode,
          date: gameMode === "daily" ? today : undefined,
          results: finalAnswers.map((a) => ({ question_id: a.question.id, is_correct: a.correct })),
        }),
      });
      setSaved(true);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const postToTriviaFeed = (shareId: string, score: number, total: number) => {
    setFeedPosting(true);
    const questions_preview = answers.slice(0, 5).map((a) => ({
      q: a.question.question,
      c: a.correct,
    }));
    fetch("/api/trivia/feed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user?.id ?? null,
        share_id: shareId,
        score,
        total,
        gmode: gameMode,
        difficulty,
        display_name: user?.displayName ?? null,
        avatar_url: user?.avatarUrl ?? null,
        questions_preview,
      }),
    })
      .then(async (res) => {
        if (res.ok) {
          setFeedPosted(true);
        } else {
          const body = await res.text().catch(() => "");
          console.error("trivia feed post failed", res.status, body);
        }
      })
      .catch((e) => { console.error("trivia feed post error", e); })
      .finally(() => { setFeedPosting(false); });
  };

  const shareToX = async () => {
    const score = answers.filter((a) => a.correct).length;
    const total = answers.length;
    const emoji = score === total ? "🔥" : score >= total / 2 ? "💪" : "📚";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (typeof window !== "undefined" ? window.location.origin : "");

    // Build share data and save to shares table
    const shareData = {
      kind: "trivia",
      score,
      total,
      difficulty,
      gmode: gameMode,
      answers: answers.map((a) => ({
        question: a.question.question,
        correct: a.correct,
        submitted: a.submittedName ?? a.question.options[a.selected] ?? undefined,
        correct_answer: a.correct
          ? undefined
          : (a.allCorrect?.[0] ?? a.question.options[a.question.answer_index]),
      })),
    };

    let resultUrl = `${siteUrl}/trivia`;
    let shareId: string | null = resultShareId;
    if (!shareId) {
      try {
        const res = await fetch("/api/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(shareData),
        });
        const data = await res.json() as { url?: string };
        if (data.url) {
          const parts = data.url.split("/share/");
          shareId = parts[1] ?? null;
          resultUrl = data.url.replace("/share/", "/trivia/result/");
          if (shareId) setResultShareId(shareId);
        }
      } catch { /* fallback to trivia page */ }
    } else {
      resultUrl = `${siteUrl}/trivia/result/${shareId}`;
    }

    // Post to trivia feed
    if (shareId && !feedPosted) {
      postToTriviaFeed(shareId, score, total);
    }

    const text = `${emoji} Trivia Challenge: ${score}/${total} correct!\nTest your NBA knowledge at #NBATeamCraft\n${resultUrl}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  const q = questions[currentIdx];

  if (mode === "menu") {
    const isDaily = gameMode === "daily";
    return (
      <div className="space-y-5">
        {/* Mode selector tabs */}
        <div className="flex gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-1.5">
          <button
            onClick={() => setGameMode("daily")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${
              isDaily ? "bg-orange-500 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            📅 Daily Challenge
          </button>
          <button
            onClick={() => setGameMode("practice")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${
              !isDaily ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            🏋️ Practice
          </button>
        </div>

        {/* Filters */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Difficulty</p>
            <div className="flex gap-2">
              {(["normal", "hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                    difficulty === d ? "bg-orange-500 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {d === "normal" ? "🟢" : "🔴"} {d === "normal" ? "Normal" : "Hard"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Category</p>
              {isDaily && (
                <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">Mix only for Daily</span>
              )}
            </div>
            <div className="flex gap-2">
              {(["mix", "stats", "career"] as QuestionType[]).map((t) => {
                const locked = isDaily && t !== "mix";
                return (
                  <button
                    key={t}
                    onClick={() => !locked && setQuestionType(t)}
                    disabled={locked}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                      locked
                        ? "bg-zinc-800/40 text-zinc-700 cursor-not-allowed"
                        : questionType === t
                          ? "bg-sky-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                );
              })}
            </div>
            {isDaily && (
              <p className="text-xs text-zinc-600 mt-1.5 px-0.5">Category selection is available in Practice mode</p>
            )}
          </div>
        </div>

        {/* Start button */}
        <div className="space-y-3">
          {isDaily ? (
            <>
              <button
                onClick={() => startGame("daily")}
                disabled={loading || todayDone}
                className={`w-full py-4 rounded-2xl text-white font-black text-lg tracking-tight transition-colors ${
                  todayDone
                    ? "bg-zinc-700 cursor-not-allowed opacity-60"
                    : "bg-orange-500 hover:bg-orange-400 active:bg-orange-600 disabled:opacity-50"
                }`}
              >
                {loading ? "Loading..." : todayDone ? "✅ Today's Challenge Complete" : "Start Daily Challenge →"}
              </button>
              <div className="flex items-center gap-3 px-1">
                {todayDone
                  ? <NextChallengeCountdown />
                  : <span className="text-xs text-zinc-600">5 questions · score saved to profile</span>
                }
                {!user && !todayDone && <span className="text-xs text-zinc-600 ml-auto">Login to save</span>}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => startGame("practice")}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-zinc-700 hover:bg-zinc-600 text-white font-black text-lg tracking-tight transition-colors disabled:opacity-50"
              >
                {loading ? "Loading..." : "Start Practice →"}
              </button>
              <p className="text-xs text-zinc-600 px-1">5 questions · no score tracking</p>
            </>
          )}

          {fetchError && (
            <p className="text-xs text-red-400 text-center px-1">
              No questions found. Please make sure the trivia database has been set up.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (mode === "playing" && q) {
    const isAnswered = confirmed;
    return (
      <div className="space-y-4">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
            <div
              className="bg-orange-500 h-1.5 rounded-full transition-all"
              style={{ width: `${((currentIdx) / questions.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-zinc-500 shrink-0">{currentIdx + 1} / {questions.length}</span>
        </div>

        {/* Question metadata */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            q.difficulty === "easy" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          }`}>
            {q.difficulty === "easy" ? "Normal" : "Hard"}
          </span>
          <span className="text-xs text-zinc-600 capitalize">{q.type}</span>
        </div>

        {/* Question */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-white font-bold text-base leading-snug">{q.question}</p>
        </div>

        {/* Options — Easy: 4-choice buttons / Hard: player search */}
        {q.difficulty === "easy" ? (
          <div className="space-y-2">
            {q.options.map((option, i) => {
              let cls = "w-full text-left px-4 py-3.5 rounded-xl border font-medium text-sm transition-colors ";
              if (!isAnswered) {
                cls += i === selected
                  ? "border-sky-500 bg-sky-500/10 text-sky-300"
                  : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800";
              } else if (i === q.answer_index) {
                cls += "border-green-500 bg-green-500/10 text-green-400";
              } else if (i === selected) {
                cls += "border-red-500 bg-red-500/10 text-red-400";
              } else {
                cls += "border-zinc-800 bg-zinc-900/50 text-zinc-600";
              }
              return (
                <button key={i} onClick={() => handleSelect(i)} disabled={isAnswered} className={cls}>
                  <span className="font-bold mr-2 text-zinc-500">{["A", "B", "C", "D"][i]}.</span>
                  {option}
                </button>
              );
            })}
            {/* Confirm button — visible after selection, before submission */}
            {selected !== null && !isAnswered && (
              <button
                onClick={handleConfirm}
                className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-black text-base transition-colors mt-2"
              >
                Confirm Answer →
              </button>
            )}
          </div>
        ) : (
          /* Hard mode: player name search */
          <div className="space-y-3">
            <div ref={searchRef} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  setShowDropdown(true);
                  if (searchGtmTimer.current) clearTimeout(searchGtmTimer.current);
                  searchGtmTimer.current = setTimeout(() => {
                    if (val.trim().length >= 2) {
                      const count = playerList.filter((n) => n.toLowerCase().includes(val.toLowerCase())).length;
                      gtm.triviaHardSearch({ query: val, results_count: Math.min(count, 10) });
                    }
                  }, 500);
                }}
                onFocus={() => setShowDropdown(true)}
                disabled={isAnswered || validating}
                placeholder="Type a player name..."
                autoComplete="off"
                className="w-full px-4 py-3.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white placeholder-zinc-600 text-sm font-medium focus:outline-none focus:border-sky-500 disabled:opacity-60 transition-colors"
              />
              {searchQuery && !isAnswered && (
                <button
                  onClick={() => { setSearchQuery(""); setShowDropdown(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-lg"
                >×</button>
              )}
              {showDropdown && filteredPlayers.length > 0 && !isAnswered && (
                <ul className="absolute z-20 w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-xl">
                  {filteredPlayers.map((name) => (
                    <li key={name}>
                      <button
                        onMouseDown={(e) => { e.preventDefault(); void handleSearchSelect(name); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
                      >
                        {name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* After answer: show correct answer reveal */}
            {isAnswered && (() => {
              const lastAnswer = answers[answers.length - 1];
              const isCorrect = lastAnswer?.correct;
              const allCorrect = lastAnswer?.allCorrect;
              const submitted = lastAnswer?.submittedName ?? searchQuery;
              return (
                <div className={`rounded-xl p-4 border space-y-2 ${isCorrect ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                  <p className={`text-sm font-bold ${isCorrect ? "text-green-400" : "text-red-400"}`}>
                    {isCorrect ? `✅ Correct! "${submitted}" is a valid answer.` : `❌ "${submitted}" is not correct.`}
                  </p>
                  {allCorrect && allCorrect.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-400 font-bold mb-1">
                        All correct answers ({allCorrect.length}):
                      </p>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {allCorrect.join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {validating && (
              <div className="rounded-xl p-4 bg-zinc-800/60 border border-zinc-700 text-xs text-zinc-400">
                Checking answer...
              </div>
            )}

            {/* Submit button — visible after a player is selected from dropdown */}
            {searchQuery.trim() && !isAnswered && (
              <button
                onClick={handleSearchSubmit}
                disabled={validating}
                className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-black text-base transition-colors"
              >
                {validating ? "Checking..." : "Submit Answer →"}
              </button>
            )}
            {!searchQuery.trim() && !isAnswered && (
              <p className="text-xs text-zinc-600 text-center">Type at least 2 characters to search</p>
            )}
          </div>
        )}

        {/* Feedback & Next */}
        {isAnswered && (
          <div className="space-y-3">
            {q.difficulty === "easy" && (
              <div className={`rounded-xl p-4 ${selected === q.answer_index ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
                <p className={`text-sm font-bold mb-1 ${selected === q.answer_index ? "text-green-400" : "text-red-400"}`}>
                  {selected === q.answer_index ? "✅ Correct!" : "❌ Incorrect"}
                </p>
                {q.explanation && (
                  <p className="text-xs text-zinc-400 leading-relaxed">{q.explanation}</p>
                )}
              </div>
            )}
            {q.difficulty === "hard" && q.template !== "played_for_all" && q.explanation && (
              <div className="rounded-xl p-4 bg-zinc-800/60 border border-zinc-700">
                <p className="text-xs text-zinc-400 leading-relaxed">{q.explanation}</p>
              </div>
            )}
            <button
              onClick={handleNext}
              className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-black text-base transition-colors"
            >
              {currentIdx + 1 < questions.length ? "Next Question →" : "See Results →"}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (mode === "result") {
    const score = answers.filter((a) => a.correct).length;
    const total = answers.length;
    const pct = Math.round((score / total) * 100);

    return (
      <div className="space-y-4">
        {/* Score */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
          <p className="text-5xl font-black text-white font-display mb-1">{score}<span className="text-2xl text-zinc-500">/{total}</span></p>
          <p className="text-zinc-500 text-sm mb-4">{pct}% correct</p>
          <p className="text-lg">
            {score === total ? "🔥 Perfect!" : score >= total * 0.67 ? "💪 Nice work!" : "📚 Keep studying!"}
          </p>
          {gameMode === "daily" && !user && (
            <div className="mt-4 p-4 bg-zinc-800 rounded-xl text-left">
              <p className="text-sm font-bold text-white mb-1">Save your score</p>
              <p className="text-xs text-zinc-400 mb-3">Log in to track your streak, cumulative correct answers, and see your stats on your profile.</p>
              <a
                href="/auth/login"
                className="block w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm text-center transition-colors"
              >
                Log in with X →
              </a>
            </div>
          )}
          {saved && (
            <p className="text-xs text-zinc-600 mt-3">✅ Score saved to your profile</p>
          )}
          {saving && (
            <p className="text-xs text-zinc-600 mt-3">Saving...</p>
          )}
        </div>

        {/* Answer review */}
        <div className="space-y-2">
          {answers.map((a, i) => (
            <div key={i} className={`bg-zinc-900 border rounded-xl p-4 ${a.correct ? "border-green-500/20" : "border-red-500/20"}`}>
              <p className="text-xs text-zinc-500 mb-1">Q{i + 1} · {a.question.difficulty === "easy" ? "Normal" : "Hard"}</p>
              <p className="text-sm text-white font-medium mb-2">{a.question.question}</p>
              <p className={`text-xs font-bold ${a.correct ? "text-green-400" : "text-red-400"}`}>
                {a.correct ? "✅" : "❌"}{" "}
                {a.submittedName
                  ? (a.correct ? a.submittedName : `${a.submittedName} → ${a.allCorrect?.[0] ?? a.question.options[a.question.answer_index]}`)
                  : a.question.options[a.question.answer_index]}
              </p>
              {a.allCorrect && a.allCorrect.length > 1 && (
                <p className="text-xs text-zinc-600 mt-0.5">
                  {a.allCorrect.length} valid answers: {a.allCorrect.slice(0, 5).join(", ")}{a.allCorrect.length > 5 ? "…" : ""}
                </p>
              )}
              {!a.correct && !a.allCorrect && a.question.explanation && (
                <p className="text-xs text-zinc-500 mt-1">{a.question.explanation}</p>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={async () => {
              const score = answers.filter((a) => a.correct).length;
              const total = answers.length;
              gtm.triviaShare({ gmode: gameMode, difficulty, score, total, source: "result" });
              if (!resultShareId) {
                await shareToX();
              } else {
                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (typeof window !== "undefined" ? window.location.origin : "");
                const emoji = score === total ? "🔥" : score >= total / 2 ? "💪" : "📚";
                const resultUrl = `${siteUrl}/trivia/result/${resultShareId}`;
                const text = `${emoji} Trivia Challenge: ${score}/${total} correct!\nTest your NBA knowledge at #NBATeamCraft\n${resultUrl}`;
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
              }
            }}
            className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white font-bold text-sm transition-colors"
          >
            Share on 𝕏
          </button>
          <button
            onClick={async () => {
              const score = answers.filter((a) => a.correct).length;
              const total = answers.length;
              gtm.triviaFeedPost({ gmode: gameMode, difficulty, score, total });
              let sid = resultShareId;
              if (!sid) {
                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (typeof window !== "undefined" ? window.location.origin : "");
                const shareData = {
                  kind: "trivia", score, total, difficulty, gmode: gameMode,
                  answers: answers.map((a) => ({
                    question: a.question.question, correct: a.correct,
                    submitted: a.submittedName ?? a.question.options[a.selected] ?? undefined,
                    correct_answer: a.correct ? undefined : (a.allCorrect?.[0] ?? a.question.options[a.question.answer_index]),
                  })),
                };
                try {
                  const res = await fetch("/api/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(shareData) });
                  const data = await res.json() as { url?: string };
                  if (data.url) {
                    sid = data.url.split("/share/")[1] ?? null;
                    if (sid) setResultShareId(sid);
                  }
                } catch { /* ignore */ }
              }
              if (sid) postToTriviaFeed(sid, score, total);
            }}
            disabled={feedPosted || feedPosting}
            className="w-full py-3 rounded-xl bg-orange-500/20 border border-orange-500/50 hover:bg-orange-500/30 text-orange-400 font-bold text-sm transition-colors disabled:opacity-60"
          >
            {feedPosted ? "✓ Posted to Feed!" : feedPosting ? "Posting…" : "📢 Post to Trivia Feed"}
          </button>
          <button
            onClick={() => { setResultShareId(null); setFeedPosted(false); setMode("menu"); }}
            className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition-colors"
          >
            Play Again →
          </button>
        </div>
      </div>
    );
  }

  return null;
}
