// All 30 NBA franchises with their BBRef abbreviation per season range
// BBRef uses different abbreviations for relocated/renamed franchises

export interface FranchiseEntry {
  abbr: string;       // BBRef abbreviation
  seasons: string[];  // seasons this abbr was active (e.g. "2001")
}

// Generate season list from startYear to endYear inclusive
function range(start: number, end: number): string[] {
  const out: string[] = [];
  for (let y = start; y <= end; y++) out.push(String(y));
  return out;
}

// Current season year range: 2001 (= 2000-01) to 2025 (= 2024-25)
const START = 2001;
const END = 2025;
const ALL = range(START, END);

export const FRANCHISES: FranchiseEntry[] = [
  // Atlantic
  { abbr: "BOS", seasons: ALL },
  { abbr: "BRK", seasons: range(2013, END) },   // Brooklyn Nets
  { abbr: "NJN", seasons: range(2001, 2012) },  // New Jersey Nets
  { abbr: "NYK", seasons: ALL },
  { abbr: "PHI", seasons: ALL },
  { abbr: "TOR", seasons: ALL },

  // Central
  { abbr: "CHI", seasons: ALL },
  { abbr: "CLE", seasons: ALL },
  { abbr: "DET", seasons: ALL },
  { abbr: "IND", seasons: ALL },
  { abbr: "MIL", seasons: ALL },

  // Southeast
  { abbr: "ATL", seasons: ALL },
  { abbr: "CHA", seasons: range(2005, END) },   // Charlotte Bobcats/Hornets (new)
  { abbr: "CHH", seasons: range(2001, 2002) },  // Charlotte Hornets (original, moved 2002)
  { abbr: "MIA", seasons: ALL },
  { abbr: "ORL", seasons: ALL },
  { abbr: "WAS", seasons: ALL },

  // Northwest
  { abbr: "DEN", seasons: ALL },
  { abbr: "MIN", seasons: ALL },
  { abbr: "OKC", seasons: range(2009, END) },   // Oklahoma City Thunder
  { abbr: "SEA", seasons: range(2001, 2008) },  // Seattle SuperSonics
  { abbr: "POR", seasons: ALL },
  { abbr: "UTA", seasons: ALL },

  // Pacific
  { abbr: "GSW", seasons: ALL },
  { abbr: "LAC", seasons: ALL },
  { abbr: "LAL", seasons: ALL },
  { abbr: "PHO", seasons: ALL },
  { abbr: "SAC", seasons: ALL },

  // Southwest
  { abbr: "DAL", seasons: ALL },
  { abbr: "HOU", seasons: ALL },
  { abbr: "MEM", seasons: range(2002, END) },   // Memphis Grizzlies
  { abbr: "VAN", seasons: range(2001, 2001) },  // Vancouver Grizzlies
  { abbr: "NOP", seasons: range(2008, END) },   // New Orleans Pelicans/Hornets
  { abbr: "NOH", seasons: range(2003, 2007) },  // New Orleans Hornets
  { abbr: "NOK", seasons: range(2006, 2007) },  // New Orleans/Oklahoma City Hornets
  { abbr: "SAS", seasons: ALL },
];

// Expand to flat list of (abbr, seasonYear) pairs — deduplicated
export function getAllTeamSeasons(): Array<{ abbr: string; year: number }> {
  const seen = new Set<string>();
  const result: Array<{ abbr: string; year: number }> = [];
  for (const f of FRANCHISES) {
    for (const s of f.seasons) {
      const key = `${f.abbr}-${s}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ abbr: f.abbr, year: parseInt(s) });
      }
    }
  }
  return result;
}
