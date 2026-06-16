// Lightweight, intentionally-minimal profanity guard for the experimental
// comments feature. This is NOT full moderation — it only blocks the most
// egregious slurs so an unmoderated thread doesn't immediately become a
// liability. Admins can soft-hide anything else after the fact.
const BLOCKED = [
  "nigger", "nigga", "faggot", "fag", "retard", "kike", "spic", "chink",
  "cunt", "rape", "rapist",
];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[013457@$]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z]/g, "");
}

// Returns true if the text contains a blocked term.
export function containsProfanity(text: string): boolean {
  const normalized = normalize(text);
  return BLOCKED.some((word) => normalized.includes(word));
}
