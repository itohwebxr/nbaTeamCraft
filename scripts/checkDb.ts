import { createClient } from "@supabase/supabase-js";

async function main() {
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data, error } = await s.from("teams").select("id, abbreviation, season").order("season").limit(1000);
  if (error) { console.error(error); process.exit(1); }
  const seasons = [...new Set(data.map((r: any) => r.season as string))].sort();
  console.log("Seasons:", seasons.join(", "));
  const targets = ["1995-96","1996-97","2000-01","2007-08","2012-13","2015-16","2016-17"];
  for (const t of targets) {
    const abbrs = data.filter((r: any) => r.season === t).map((r: any) => r.abbreviation);
    console.log(t, ":", abbrs.join(", ") || "NOT FOUND");
  }
}
main();
