#!/usr/bin/env python3
"""
Generate two NEW trivia question types (85 each = 170 total):

  1. statline_filter : "Which player recorded 20+ PPG, 10+ RPG, and 5+ APG
                        in 2010-11?"  — exactly one of the 4 options meets the
                        full filter; distractors are same-season near-misses.
  2. league_leader   : "Who led the NBA in 3-pointers made per game in 2018-19?"

Additive seed (NO DELETE) — appended to the existing trivia_questions table.
Output: data/trivia_questions_seed_v6_new_types.sql

Source: data/player_per_game.csv (per-game season stats). NBA seasons
2001-02 .. 2025-26 (end-year 2002..2026). Traded players are collapsed to
their combined multi-team season line (the "2TM"/"3TM" row).
"""

import csv
import json
import random
import re
from collections import defaultdict

CSV_PATH = "/home/user/nbaTeamCraft/data/player_per_game.csv"
SQL_PATH = "/home/user/nbaTeamCraft/data/trivia_questions_seed_v6_new_types.sql"

random.seed(2026)

SEASON_MIN = 2002   # end-year of 2001-02
SEASON_MAX = 2026   # end-year of 2025-26
TARGET_PER_TYPE = 85

MULTI_TEAM_RE = re.compile(r"^\d+TM$")


def fnum(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def esc(s):
    return str(s).replace("'", "''")


def season_label(season_int):
    y = int(season_int)
    return f"{y - 1}-{str(y)[2:]}"


# ---------------------------------------------------------------------------
# Load CSV → one season line per (player, season), collapsing traded players
# to their combined multi-team row.
# ---------------------------------------------------------------------------

def load_season_lines():
    by_ps = defaultdict(list)  # (player_id, season) -> [rows]
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("lg") != "NBA":
                continue
            try:
                season = int(row["season"])
            except (TypeError, ValueError):
                continue
            if season < SEASON_MIN or season > SEASON_MAX:
                continue
            by_ps[(row["player_id"], season)].append(row)

    # season -> list of season-line dicts
    lines_by_season = defaultdict(list)
    for (pid, season), rows in by_ps.items():
        combined = next((r for r in rows if MULTI_TEAM_RE.match(r["team"])), None)
        src = combined or max(rows, key=lambda r: fnum(r["g"]))
        lines_by_season[season].append({
            "pid": pid,
            "name": src["player"],
            "g": int(fnum(src["g"])),
            "pts": fnum(src["pts_per_game"]),
            "trb": fnum(src["trb_per_game"]),
            "ast": fnum(src["ast_per_game"]),
            "stl": fnum(src["stl_per_game"]),
            "blk": fnum(src["blk_per_game"]),
            "x3p": fnum(src["x3p_per_game"]),
        })
    return lines_by_season


# ---------------------------------------------------------------------------
# Type 1 — statline filter
# ---------------------------------------------------------------------------

STAT_DISP = {"pts": "PPG", "trb": "RPG", "ast": "APG", "stl": "SPG", "blk": "BPG", "x3p": "3PM/g"}

# (label, [(stat, threshold), ...]). Order in label follows PPG/RPG/APG/... .
COMBOS = [
    ("20+ PPG, 10+ RPG, and 5+ APG", [("pts", 20), ("trb", 10), ("ast", 5)]),
    ("25+ PPG, 10+ RPG, and 5+ APG", [("pts", 25), ("trb", 10), ("ast", 5)]),
    ("20+ PPG and 10+ RPG",          [("pts", 20), ("trb", 10)]),
    ("22+ PPG and 11+ RPG",          [("pts", 22), ("trb", 11)]),
    ("25+ PPG and 5+ APG",           [("pts", 25), ("ast", 5)]),
    ("20+ PPG and 7+ APG",           [("pts", 20), ("ast", 7)]),
    ("18+ PPG and 8+ APG",           [("pts", 18), ("ast", 8)]),
    ("20+ PPG, 5+ RPG, and 5+ APG",  [("pts", 20), ("trb", 5), ("ast", 5)]),
    ("27+ PPG",                      [("pts", 27)]),
    ("13+ RPG",                      [("trb", 13)]),
    ("9+ APG",                       [("ast", 9)]),
    ("2.0+ SPG",                     [("stl", 2.0)]),
    ("2.5+ BPG",                     [("blk", 2.5)]),
    ("2.0+ BPG and 10+ RPG",         [("blk", 2.0), ("trb", 10)]),
    ("20+ PPG and 2.0+ BPG",         [("pts", 20), ("blk", 2.0)]),
    ("3.5+ 3PM per game",            [("x3p", 3.5)]),
    ("25+ PPG and 3+ 3PM per game",  [("pts", 25), ("x3p", 3.0)]),
]

MIN_G_STATLINE = 41  # at least ~half a season to count


def statline_value_str(line, combo_stats):
    parts = []
    for stat, _ in combo_stats:
        parts.append(f"{line[stat]:.1f} {STAT_DISP[stat]}")
    return " / ".join(parts)


def build_statline_candidates(lines_by_season):
    candidates = []
    for season, lines in lines_by_season.items():
        pool = [l for l in lines if l["g"] >= MIN_G_STATLINE]
        if len(pool) < 8:
            continue
        for label, stats in COMBOS:
            qualifiers = [l for l in pool if all(l[s] >= t for s, t in stats)]
            if not (1 <= len(qualifiers) <= 5):
                continue
            qset = {l["pid"] for l in qualifiers}

            # Plausible distractors: same-season players who meet at least one
            # threshold but NOT the full filter. Prefer higher scorers.
            near = [l for l in pool
                    if l["pid"] not in qset and any(l[s] >= t for s, t in stats)]
            near.sort(key=lambda l: l["pts"], reverse=True)
            if len(near) < 3:
                # fall back to top scorers of the season
                extra = [l for l in pool if l["pid"] not in qset]
                extra.sort(key=lambda l: l["pts"], reverse=True)
                for l in extra:
                    if l not in near:
                        near.append(l)
            if len(near) < 3:
                continue

            correct = max(qualifiers, key=lambda l: l["pts"])  # most notable qualifier
            distractors = near[:8]
            has_pts = any(s == "pts" for s, _ in stats)
            difficulty = "easy" if (has_pts and correct["pts"] >= 22) else "hard"

            candidates.append({
                "season": season, "label": label, "stats": stats,
                "correct": correct, "distractors": distractors,
                "n_qual": len(qualifiers), "difficulty": difficulty,
            })
    return candidates


def make_statline_question(c):
    correct = c["correct"]
    random.shuffle(c["distractors"])
    wrong = []
    seen = {correct["name"]}
    for l in c["distractors"]:
        if l["name"] not in seen:
            wrong.append(l["name"])
            seen.add(l["name"])
        if len(wrong) == 3:
            break
    if len(wrong) < 3:
        return None

    slabel = season_label(c["season"])
    options = [correct["name"]] + wrong
    random.shuffle(options)
    answer_index = options.index(correct["name"])

    if c["n_qual"] == 1:
        tail = f"the only player to record a {c['label']} line in {slabel}."
    else:
        tail = f"one of {c['n_qual']} players to record a {c['label']} line in {slabel}."
    explanation = (
        f"{esc(correct['name'])} averaged {statline_value_str(correct, c['stats'])} "
        f"in {slabel} — {tail}"
    )

    return {
        "type": "stats",
        "difficulty": c["difficulty"],
        "question": f"Which player recorded a {c['label']} line in {slabel}?",
        "options": options,
        "answer_index": answer_index,
        "explanation": explanation,
        "season": slabel,
        "team_id": None,
        "player_name": correct["name"],
        "template": "statline_filter",
        "params": {
            "season": slabel,
            "filters": [{"stat": f"{s}_per_game", "min": t} for s, t in c["stats"]],
            "n_qualifiers": c["n_qual"],
        },
    }


# ---------------------------------------------------------------------------
# Type 2 — league leader
# ---------------------------------------------------------------------------

LEADER_STATS = [
    ("pts", "scoring",               "PPG",   "easy"),
    ("trb", "rebounding",            "RPG",   "easy"),
    ("ast", "assists",               "APG",   "easy"),
    ("stl", "steals",                "SPG",   "hard"),
    ("blk", "blocks",                "BPG",   "hard"),
    ("x3p", "3-pointers made per game", "3PM/g", "hard"),
]


def build_leader_candidates(lines_by_season):
    candidates = []
    for season, lines in lines_by_season.items():
        if not lines:
            continue
        schedule = max(l["g"] for l in lines)
        qual_g = max(40, round(0.70 * schedule))
        qualified = [l for l in lines if l["g"] >= qual_g]
        if len(qualified) < 6:
            continue
        for stat, full, disp, difficulty in LEADER_STATS:
            ranked = sorted(qualified, key=lambda l: l[stat], reverse=True)
            leader = ranked[0]
            if leader[stat] <= 0:
                continue
            distractors = [l for l in ranked[1:10] if l["name"] != leader["name"]]
            if len(distractors) < 3:
                continue
            candidates.append({
                "season": season, "stat": stat, "full": full, "disp": disp,
                "difficulty": difficulty, "leader": leader, "distractors": distractors,
            })
    return candidates


def make_leader_question(c):
    leader = c["leader"]
    random.shuffle(c["distractors"])
    wrong, seen = [], {leader["name"]}
    for l in c["distractors"]:
        if l["name"] not in seen:
            wrong.append(l["name"])
            seen.add(l["name"])
        if len(wrong) == 3:
            break
    if len(wrong) < 3:
        return None

    slabel = season_label(c["season"])
    options = [leader["name"]] + wrong
    random.shuffle(options)
    answer_index = options.index(leader["name"])
    val = f"{leader[c['stat']]:.1f}"

    return {
        "type": "stats",
        "difficulty": c["difficulty"],
        "question": f"Who led the NBA in {c['full']} in {slabel}?",
        "options": options,
        "answer_index": answer_index,
        "explanation": f"{esc(leader['name'])} led the NBA in {c['full']} in {slabel} ({val} {c['disp']}).",
        "season": slabel,
        "team_id": None,
        "player_name": leader["name"],
        "template": "league_leader",
        "params": {"season": slabel, "stat": f"{c['stat']}_per_game"},
    }


# ---------------------------------------------------------------------------
# Balanced selection with spread caps
# ---------------------------------------------------------------------------

def pick_balanced(candidates, group_key, target, per_group_cap, per_season_cap):
    random.shuffle(candidates)
    easy = [c for c in candidates if c["difficulty"] == "easy"]
    hard = [c for c in candidates if c["difficulty"] == "hard"]
    chosen, group_n, season_n = [], defaultdict(int), defaultdict(int)
    seen_q = set()

    def try_take(pool, want):
        for c in pool:
            if len(chosen) >= len(seen_q) and want <= 0:
                break
            q = c["_q"]
            if q["question"] in seen_q:
                continue
            if group_n[group_key(c)] >= per_group_cap:
                continue
            if season_n[c["season"]] >= per_season_cap:
                continue
            chosen.append(q)
            seen_q.add(q["question"])
            group_n[group_key(c)] += 1
            season_n[c["season"]] += 1
            want -= 1
            if want <= 0:
                break

    half = target // 2
    try_take(easy, half)
    try_take(hard, target - len([c for c in chosen]))
    # top up from whichever remains until target
    if len(chosen) < target:
        try_take(easy + hard, target - len(chosen))
    # relax caps if still short
    if len(chosen) < target:
        for c in easy + hard:
            q = c["_q"]
            if q["question"] in seen_q:
                continue
            chosen.append(q)
            seen_q.add(q["question"])
            if len(chosen) >= target:
                break
    return chosen[:target]


def write_sql(all_questions, path):
    header = ("INSERT INTO trivia_questions "
              "(type, difficulty, question, options, answer_index, explanation, "
              "season, team_id, player_name, template, params) VALUES")
    rows = []
    for q in all_questions:
        opts = json.dumps(q["options"], ensure_ascii=False).replace("'", "''")
        params = json.dumps(q.get("params", {}), ensure_ascii=False).replace("'", "''")
        season = f"'{esc(q['season'])}'" if q.get("season") else "NULL"
        team_id = f"'{esc(q['team_id'])}'" if q.get("team_id") else "NULL"
        player_name = f"'{esc(q['player_name'])}'" if q.get("player_name") else "NULL"
        rows.append(
            f"('{esc(q['type'])}', '{esc(q['difficulty'])}', '{esc(q['question'])}', '{opts}', "
            f"{q['answer_index']}, '{esc(q['explanation'])}', {season}, {team_id}, {player_name}, "
            f"'{esc(q['template'])}', '{params}')"
        )
    with open(path, "w", encoding="utf-8") as f:
        f.write(header + "\n" + ",\n".join(rows) + ";\n")


def main():
    lines_by_season = load_season_lines()
    print(f"Seasons loaded: {len(lines_by_season)} "
          f"({season_label(SEASON_MIN)} .. {season_label(SEASON_MAX)})")

    # Type 1
    sl_cands = build_statline_candidates(lines_by_season)
    for c in sl_cands:
        c["_q"] = make_statline_question(c)
    sl_cands = [c for c in sl_cands if c["_q"]]
    statline = pick_balanced(sl_cands, lambda c: c["label"], TARGET_PER_TYPE,
                             per_group_cap=8, per_season_cap=5)

    # Type 2
    ll_cands = build_leader_candidates(lines_by_season)
    for c in ll_cands:
        c["_q"] = make_leader_question(c)
    ll_cands = [c for c in ll_cands if c["_q"]]
    leader = pick_balanced(ll_cands, lambda c: c["stat"], TARGET_PER_TYPE,
                           per_group_cap=18, per_season_cap=4)

    def dist(qs):
        d = defaultdict(int)
        for q in qs:
            d[q["difficulty"]] += 1
        return dict(d)

    print(f"statline_filter: {len(statline)} questions  difficulty={dist(statline)}")
    print(f"league_leader:   {len(leader)} questions  difficulty={dist(leader)}")

    all_q = statline + leader
    write_sql(all_q, SQL_PATH)
    print(f"Wrote {len(all_q)} questions -> {SQL_PATH}")


if __name__ == "__main__":
    main()
