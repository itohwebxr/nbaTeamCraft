"use client";

interface TeamNameInputProps {
  value: string;
  onChange: (v: string) => void;
}

export default function TeamNameInput({ value, onChange }: TeamNameInputProps) {
  return (
    <div>
      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
        Team Name
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your team name"
        maxLength={40}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3
          text-white text-lg font-bold placeholder:text-zinc-600
          focus:outline-none focus:border-orange-500 transition-colors"
      />
    </div>
  );
}
