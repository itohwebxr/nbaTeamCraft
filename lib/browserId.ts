const KEY = "nba_tc_browser_id";

export function getBrowserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

const LIKED_KEY = "nba_tc_liked";

export function getLikedTeams(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LIKED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function setLikedTeam(teamId: string, liked: boolean): void {
  if (typeof window === "undefined") return;
  const set = getLikedTeams();
  if (liked) set.add(teamId); else set.delete(teamId);
  localStorage.setItem(LIKED_KEY, JSON.stringify([...set]));
}
