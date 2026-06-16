"use client";

import { useState } from "react";

interface SaveBuildModalProps {
  initialName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function SaveBuildModal({
  initialName,
  onConfirm,
  onCancel,
  isSubmitting,
}: SaveBuildModalProps) {
  const [name, setName] = useState(initialName);

  const trimmed = name.trim();
  const isValid = trimmed.length >= 1 && trimmed.length <= 50;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm">
        <h2 className="font-display text-xl font-black text-white mb-1 tracking-wide">
          🔧 Name Your Build
        </h2>
        <p className="text-sm text-zinc-400 mb-5">
          Give your roster a name before saving it to your My Page.
        </p>

        <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
          Team Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 50))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isValid && !isSubmitting) onConfirm(trimmed);
          }}
          placeholder='e.g. "1996 Bulls Dynasty"'
          maxLength={50}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-500 mb-1"
          autoFocus
        />
        <p className="text-xs text-zinc-600 text-right mb-5">{trimmed.length}/50</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-bold text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => isValid && onConfirm(trimmed)}
            disabled={!isValid || isSubmitting}
            className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              "Save Team →"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
