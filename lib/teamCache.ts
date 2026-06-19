import { createServerClient } from "@/lib/supabase";
import type { TeamPick } from "@/components/sim/TeamPicker";

const SELECT = "id, name, overall, tier, is_sandbox, created_at";
const LEGEND = "__legend__";
const HISTORICAL = "__historical__";

export async function fetchAllTeamsForPicker(): Promise<TeamPick[]> {
  const supabase = createServerClient();

  const [{ data: userRows }, { data: histRows }] = await Promise.all([
    supabase
      .from("public_teams")
      .select(SELECT)
      .not("created_by_browser_id", "in", `(${LEGEND},${HISTORICAL})`)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("public_teams")
      .select(SELECT)
      .eq("created_by_browser_id", HISTORICAL)
      .order("overall", { ascending: false })
      .limit(500),
  ]);

  const user = ((userRows ?? []) as TeamPick[]).map((r) => ({ ...r, is_historical: false }));
  const hist = ((histRows ?? []) as TeamPick[]).map((r) => ({ ...r, is_historical: true }));

  return [...user, ...hist];
}
