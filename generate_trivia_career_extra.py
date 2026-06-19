#!/usr/bin/env python3
"""Generate 20 extra career questions to balance stats(35) vs career(15) -> 35 each."""

import csv
import json
import random
from collections import defaultdict

CSV_PATH = "/home/user/nbaTeamCraft/data/player_per_game.csv"
SQL_OUT  = "/home/user/nbaTeamCraft/data/trivia_questions_seed_v3_career.sql"

random.seed(99)

NOTABLE_TEAMS = [
    "LAL", "BOS", "CHI", "MIA", "SAS", "GSW", "OKC", "HOU", "CLE",
    "PHX", "DAL", "NYK", "LAC", "MIL", "BKN", "DEN", "PHI",
    "MIN", "TOR", "MEM", "SAC", "NJN", "NOH", "NOP", "UTA", "IND",
    "ATL", "WAS", "DET", "ORL", "POR",
]

NOTABLE_PLAYERS = {
    "lebronbr01", "bryanko01", "onealsh01", "curryst01", "duranke01",
    "hardeja01", "antetgi01", "doncilu01", "jamesle01",
}

# Extra curated transfers (player_id, team_a, team_b)
EXTRA_EASY = [
    ("jamesle01",  "MIA",  "CLE"),   # LeBron return
    ("jamesle01",  "CLE",  "LAL"),   # LeBron to LAL
    ("duranke01",  "GSW",  "BKN"),   # KD to Nets
    ("paulch01",   "LAC",  "HOU"),   # CP3 to Houston
    ("paulch01",   "HOU",  "OKC"),   # CP3 to OKC
    ("anthoca01",  "NYK",  "OKC"),   # Melo to OKC
    ("anthoca01",  "OKC",  "HOU"),   # Melo to Houston
    ("gasolma01",  "MEM",  "LAC"),   # Marc Gasol
    ("gasolpa01",  "LAL",  "SAS"),   # Pau Gasol
    ("piercpa01",  "BOS",  "BKN"),   # Paul Pierce to Nets
    ("allenary01", "MIL",  "BOS"),   # Ray Allen to Boston
    ("westbru01",  "HOU",  "OKC"),   # Russ returns to OKC
    ("billuch01",  "BOS",  "DEN"),   # Chauncey Billups
    ("nashst01",   "DAL",  "PHX"),   # Nash to Suns
    ("garneke01",  "BOS",  "MIN"),   # KG returns
]

EXTRA_HARD = [
    ("mcgratr01",  "HOU",  "ORL"),   # T-Mac reverse
    ("milleami01", "DEN",  "LAL"),   # Andre Miller
    ("stackja01",  "DET",  "MIA"),   # Jerry Stackhouse
    ("iveral01",   "PHI",  "DET"),   # Iverson to Detroit
    ("mariosh01",  "PHX",  "MIA"),   # Shawn Marion
]


def load_data():
    rows = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                season = int(row["season"])
                g = int(row["g"])
            except (ValueError, KeyError):
                continue
            if season < 2000 or g < 20:
                continue
            rows.append(row)
    return rows


def build_structures(rows):
    player_seasons = defaultdict(list)
    for row in rows:
        player_seasons[row["player_id"]].append((int(row["season"]), row["team"], row))
    for pid in player_seasons:
        player_seasons[pid].sort(key=lambda x: x[0])
    return player_seasons


def esc(s):
    return str(s).replace("'", "''")


def make_career_q(pid, team_a, team_b, player_seasons, rows, used_keys, difficulty):
    if pid not in player_seasons:
        return None
    seasons = player_seasons[pid]
    has_a = any(t == team_a for _, t, _ in seasons)
    has_b = any(t == team_b for _, t, _ in seasons)
    if not (has_a and has_b):
        return None
    key = (pid, team_a, team_b)
    if key in used_keys:
        return None

    player_name = seasons[0][2]["player"]
    wrong_names = list({row["player"] for row in rows if row["team"] == team_a and row["player_id"] != pid})
    random.shuffle(wrong_names)
    if len(wrong_names) < 3:
        return None

    options = [player_name] + wrong_names[:3]
    random.shuffle(options)
    answer_index = options.index(player_name)

    used_keys.add(key)
    return {
        "type": "career",
        "difficulty": difficulty,
        "question": f"Which player played for the {team_a} and then later joined the {team_b}?",
        "options": options,
        "answer_index": answer_index,
        "explanation": f"{esc(player_name)} played for the {team_a} before moving to the {team_b}.",
        "season": None,
        "team_id": None,
        "player_name": None,
        "template": "played_for_all",
        "params": {"teams": [team_a, team_b]},
    }


def make_auto_career(player_seasons, rows, used_keys, difficulty, target):
    """Auto-generate career questions when curated list runs short."""
    questions = []
    candidates = []
    for pid, seasons in player_seasons.items():
        teams_seen = []
        for s, t, row in seasons:
            if t not in ("2TM", "3TM") and t in NOTABLE_TEAMS:
                if not teams_seen or teams_seen[-1] != t:
                    teams_seen.append(t)
        unique = list(dict.fromkeys(teams_seen))
        if len(unique) >= 2:
            candidates.append((pid, unique))
    random.shuffle(candidates)

    for pid, notable in candidates:
        if len(questions) >= target:
            break
        is_notable = pid in NOTABLE_PLAYERS
        if difficulty == "easy" and not is_notable:
            continue
        if difficulty == "hard" and is_notable:
            continue
        for i in range(len(notable) - 1):
            ta, tb = notable[i], notable[i+1]
            if ta == tb:
                continue
            q = make_career_q(pid, ta, tb, player_seasons, rows, used_keys, difficulty)
            if q:
                questions.append(q)
                break
    return questions


def write_sql(questions, path):
    lines = [
        "INSERT INTO trivia_questions "
        "(type, difficulty, question, options, answer_index, explanation, season, team_id, player_name, template, params) VALUES"
    ]
    value_rows = []
    for q in questions:
        opts = json.dumps(q["options"], ensure_ascii=False).replace("'", "''")
        params = json.dumps(q["params"], ensure_ascii=False).replace("'", "''")
        value_rows.append(
            f"('{esc(q['type'])}', '{esc(q['difficulty'])}', '{esc(q['question'])}', '{opts}', "
            f"{q['answer_index']}, '{esc(q['explanation'])}', NULL, NULL, NULL, "
            f"'played_for_all', '{params}')"
        )
    lines.append(",\n".join(value_rows))
    lines.append(";")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"SQL written to: {path}")


if __name__ == "__main__":
    rows = load_data()
    player_seasons = build_structures(rows)
    used_keys = set()
    questions = []

    # Easy career extra (target 12 to be safe)
    for pid, ta, tb in EXTRA_EASY:
        if len([q for q in questions if q["difficulty"] == "easy"]) >= 12:
            break
        q = make_career_q(pid, ta, tb, player_seasons, rows, used_keys, "easy")
        if q:
            questions.append(q)

    easy_count = len([q for q in questions if q["difficulty"] == "easy"])
    if easy_count < 12:
        questions += make_auto_career(player_seasons, rows, used_keys, "easy", 12 - easy_count)

    # Hard career extra (target 8)
    for pid, ta, tb in EXTRA_HARD:
        if len([q for q in questions if q["difficulty"] == "hard"]) >= 8:
            break
        q = make_career_q(pid, ta, tb, player_seasons, rows, used_keys, "hard")
        if q:
            questions.append(q)

    hard_count = len([q for q in questions if q["difficulty"] == "hard"])
    if hard_count < 8:
        questions += make_auto_career(player_seasons, rows, used_keys, "hard", 8 - hard_count)

    # Trim to exactly 20
    questions = questions[:20]

    counts = {}
    for q in questions:
        k = (q["type"], q["difficulty"])
        counts[k] = counts.get(k, 0) + 1
    print(f"Generated {len(questions)} career questions:")
    for k, v in sorted(counts.items()):
        print(f"  {k}: {v}")

    write_sql(questions, SQL_OUT)
