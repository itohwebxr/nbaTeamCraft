export function overallColor(v: number): string {
  if (v >= 88) return "text-yellow-400";
  if (v >= 76) return "text-emerald-400";
  if (v >= 65) return "text-sky-400";
  return "text-zinc-400";
}
