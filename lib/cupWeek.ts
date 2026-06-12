// Cup week utilities.
// Cup weeks run Monday–Sunday (ISO week). Each entry gets one match per day
// for up to 7 days, then the week finalises.

export function isoWeekLabel(date: Date): string {
  // ISO 8601 week: week containing Thursday, year of that Thursday
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // nearest Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function currentCupWeek(): string {
  return isoWeekLabel(new Date());
}

// Returns the Monday (UTC) that starts the given cup week label.
export function weekStart(label: string): Date {
  const [year, w] = label.split("-W").map(Number);
  // Jan 4 is always in W01; find Mon of W01 then offset
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const w01Mon = new Date(jan4.getTime() - (dayOfWeek - 1) * 86400000);
  return new Date(w01Mon.getTime() + (w - 1) * 7 * 86400000);
}

// Day number within the cup week (1 = Monday … 7 = Sunday)
export function dayOfCupWeek(date: Date): number {
  const dayNum = date.getUTCDay() || 7;
  return dayNum;
}

// How many days remain in the week (including today)
export function daysRemainingInWeek(date: Date): number {
  return 8 - dayOfCupWeek(date);
}

// ISO date string for a Date (YYYY-MM-DD in UTC)
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
