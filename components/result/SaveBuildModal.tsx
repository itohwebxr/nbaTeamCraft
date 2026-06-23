"use client";

import { useState } from "react";
import ThemePicker from "@/components/themes/ThemePicker";
import type { Theme } from "@/lib/themes";

interface SaveBuildModalProps {
  initialName: string;
  initialDescription?: string;
  onConfirm: (name: string, description: string, theme: Theme | null) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function SaveBuildModal({
  initialName,
  initialDescription = "",
  onConfirm,
  onCancel,
  isSubmitting,
}: SaveBuildModalProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [theme, setTheme] = useState<Theme | null>(null);

  const trimmed = name.trim();
  const isValid = trimmed.length >= 1 && trimmed.length <= 50;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm">
        <h2 className="font-display text-xl font-black text-white mb-1 tracking-wide">
          🔥 Post Your Build
        </h2>
        <p className="text-sm text-zinc-400 mb-5">
          Post it to the feed — get likes and comments from the community.
        </p>

        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
          Team Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 50))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isValid && !isSubmitting) onConfirm(trimmed, description.trim(), theme);
          }}
          placeholder='e.g. "1996 Bulls Dynasty"'
          maxLength={50}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-500 mb-1"
          autoFocus
        />
        <p className="text-xs text-zinc-600 text-right mb-4">{trimmed.length}/50</p>

        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
          What&apos;s your take? <span className="text-zinc-600 normal-case">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 280))}
          placeholder='e.g. "Can Giannis carry a team without a real PG?"'
          maxLength={280}
          rows={3}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-500 mb-1 resize-none"
        />
        <p className="text-xs text-zinc-600 text-right mb-4">{description.trim().length}/280</p>

        <div className="mb-5">
          <ThemePicker value={theme} onChange={setTheme} />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-bold text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => isValid && onConfirm(trimmed, description.trim(), theme)}
            disabled={!isValid || isSubmitting}
            className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Posting...
              </>
            ) : (
              "Post to Feed →"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
