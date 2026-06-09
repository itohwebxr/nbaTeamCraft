"use client";

import { useState } from "react";

interface TeamNameInputProps {
  value: string;
  onChange: (v: string) => void;
}

const EXAMPLES = ["Defensive Monsters", "Three Point Madness", "Lob City Forever", "European Legends"];

export default function TeamNameInput({ value, onChange }: TeamNameInputProps) {
  // useState initializer runs only on the client, avoiding SSR/client mismatch
  const [placeholder] = useState(
    () => EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)] ?? EXAMPLES[0]
  );

  return (
    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
        Team Name
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={40}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3
          text-white text-lg font-bold placeholder:text-zinc-600
          focus:outline-none focus:border-orange-500 transition-colors"
      />
    </div>
  );
}
