"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

type Question = {
  id: string;
  type: "stats" | "career";
  difficulty: "easy" | "hard";
  question: string;
  options: string[];
  answer_index: number;
  explanation: string | null;
};

type Mode = "menu" | "playing" | "result";
type GameMode = "daily" | "practice";
type Difficulty = "easy" | "hard" | "all";
type QuestionType = "stats" | "career" | "mix";

type Answer = {
  question: Question;
  selected: number;
  correct: boolean;
};

export default function TriviaClient() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("menu");
  const [gameMode, setGameMode] = useState<GameMode>("daily");
  const [difficulty, setDifficulty] = useState<Difficulty>("all");
  const [questionType, setQuestionType] = useState<QuestionType>("mix");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [todayDone, setTodayDone] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  // Check if user already did today's daily
  useEffect(() => {
    if (!user?.id || gameMode !== "daily") return;
    fetch(`/api/trivia/results?userId=${user.id}`)
      .then((r) => r.json())
      .then(() => {
        // We don't block, just track; daily results check happens in result screen
      })
      .catch(() => {});
  }, [user?.id, gameMode]);

  const fetchQuestions = useCallback(async (gm: GameMode, diff: Difficulty, qt: QuestionType) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ mode: gm, limit: "3", date: today });
      if (gm === "practice") {
        if (diff !== "all") params.set("difficulty", diff);
        if (qt !== "mix") params.set("type", qt);
      }
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
    setGameMode(gm);
    const qs = await fetchQuestions(gm, difficulty, questionType);
    if (!qs.length) return;
    setQuestions(qs);
    setCurrentIdx(0);
    setAnswers([]);
    setSelected(null);
    setSaved(false);
    setMode("playing");
  };

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const q = questions[currentIdx];
    const correct = idx === q.answer_index;
    setAnswers((prev) => [...prev, { question: q, selected: idx, correct }]);
  };

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
    } else {
      setMode("result");
      saveResults();
    }
  };

  const saveResults = async () => {
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
          results: answers.map((a) => ({ question_id: a.question.id, is_correct: a.correct })),
        }),
      });
      setSaved(true);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const shareToX = () => {
    const score = answers.filter((a) => a.correct).length;
    const emoji = score === answers.length ? "🔥" : score >= answers.length / 2 ? "💪" : "📚";
    const text = `${emoji} NBA Trivia Challenge: ${score}/${answers.length} correct!\nTest your NBA knowledge at #NBATeamCraft`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  const q = questions[currentIdx];

  if (mode === "menu") {
    return (
      <div className="space-y-6">
        {/* Daily Challenge */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">📅</span>
            <h2 className="font-display text-base font-black text-white">Daily Challenge</h2>
            <span className="ml-auto text-xs bg-orange-500/20 text-orange-400 font-bold px-2 py-0.5 rounded-full">3 Questions</span>
          </div>
          <p className="text-xs text-zinc-500 mb-4">Today&apos;s questions — results saved to your profile.</p>

          <div className="mb-4 space-y-2">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Difficulty</p>
            <div className="flex gap-2">
              {(["all", "easy", "hard"] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                    difficulty === d ? "bg-orange-500 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {d === "all" ? "Mix" : d.charAt(0).toUpperCase() + d.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {(["mix", "stats", "career"] as QuestionType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setQuestionType(t)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${
                    questionType === t ? "bg-sky-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => startGame("daily")}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-black text-base transition-colors"
          >
            {loading ? "Loading..." : "Start Daily Challenge →"}
          </button>
          {!user && (
            <p className="text-xs text-zinc-600 text-center mt-2">Log in to save your score to your profile</p>
          )}
        </div>

        {/* Practice Mode */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🏋️</span>
            <h2 className="font-display text-base font-black text-white">Practice Mode</h2>
            <span className="ml-auto text-xs bg-zinc-700 text-zinc-400 font-bold px-2 py-0.5 rounded-full">Unlimited</span>
          </div>
          <p className="text-xs text-zinc-500 mb-4">Unlimited questions — no score tracking, just learning.</p>
          <button
            onClick={() => startGame("practice")}
            disabled={loading}
            className="w-full py-3 rounded-xl border border-zinc-700 hover:border-zinc-500 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-sm transition-colors"
          >
            {loading ? "Loading..." : "Start Practice →"}
          </button>
        </div>
      </div>
    );
  }

  if (mode === "playing" && q) {
    const isAnswered = selected !== null;
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
            {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
          </span>
          <span className="text-xs text-zinc-600 capitalize">{q.type}</span>
        </div>

        {/* Question */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-white font-bold text-base leading-snug">{q.question}</p>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {q.options.map((option, i) => {
            let cls = "w-full text-left px-4 py-3.5 rounded-xl border font-medium text-sm transition-colors ";
            if (!isAnswered) {
              cls += "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800";
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
        </div>

        {/* Feedback & Next */}
        {isAnswered && (
          <div className="space-y-3">
            <div className={`rounded-xl p-4 ${selected === q.answer_index ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
              <p className={`text-sm font-bold mb-1 ${selected === q.answer_index ? "text-green-400" : "text-red-400"}`}>
                {selected === q.answer_index ? "✅ Correct!" : "❌ Incorrect"}
              </p>
              {q.explanation && (
                <p className="text-xs text-zinc-400 leading-relaxed">{q.explanation}</p>
              )}
            </div>
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
              <p className="text-xs text-zinc-500 mb-1">Q{i + 1} · {a.question.difficulty}</p>
              <p className="text-sm text-white font-medium mb-2">{a.question.question}</p>
              <p className={`text-xs font-bold ${a.correct ? "text-green-400" : "text-red-400"}`}>
                {a.correct ? "✅" : "❌"} {a.question.options[a.question.answer_index]}
              </p>
              {!a.correct && a.question.explanation && (
                <p className="text-xs text-zinc-500 mt-1">{a.question.explanation}</p>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={shareToX}
            className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <span>𝕏</span> Share
          </button>
          <button
            onClick={() => setMode("menu")}
            className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-colors"
          >
            Play Again →
          </button>
        </div>
      </div>
    );
  }

  return null;
}
