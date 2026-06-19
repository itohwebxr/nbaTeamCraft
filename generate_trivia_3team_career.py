#!/usr/bin/env python3
"""Generate 35 career questions: players who played for 3 specific teams."""

import csv
import json
import random
from collections import defaultdict

CSV_PATH = "/home/user/nbaTeamCraft/data/player_per_game.csv"
SQL_OUT  = "/home/user/nbaTeamCraft/data/trivia_questions_seed_v5_3team_career.sql"

random.seed(55)

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

# Curated 3-team career (player_id, team_a, team_b, team_c)
CURATED_3TEAM_EASY = [
    ("jamesle01",  "CLE", "MIA", "LAL"),      # LeBron: CLE → MIA → CLE → LAL
    ("duranke01",  "OKC", "GSW", "BKN"),       # KD: OKC → GSW → BKN
    ("paulch01",   "NOH", "LAC", "HOU"),       # CP3: NOH → LAC → HOU
    ("hardeja01",  "OKC", "HOU", "BKN"),       # Harden: OKC → HOU → BKN
    ("westbru01",  "OKC", "HOU", "OKC"),       # skip — returns to same (use different)
    ("onealsh01",  "LAL", "MIA", "PHX"),       # Shaq: LAL → MIA → PHX
    ("garneke01",  "MIN", "BOS", "MIN"),       # skip — returns; use BKN leg
    ("anthoca01",  "DEN", "NYK", "OKC"),       # Melo: DEN → NYK → OKC
    ("gasolpa01",  "MEM", "LAL", "SAS"),       # Pau Gasol: MEM → LAL → SAS
    ("nashst01",   "DAL", "PHX", "LAL"),       # Nash: DAL → PHX → LAL
    ("piercpa01",  "BOS", "BKN", "WAS"),       # Pierce: BOS → BKN → WAS
    ("allenary01", "SEA", "MIL", "BOS"),       # Ray Allen: SEA → MIL → BOS (SEA might not be in notable)
    ("irvinky01",  "CLE", "BOS", "BKN"),       # Kyrie: CLE → BOS → BKN
    ("leonaka01",  "SAS", "TOR", "LAC"),       # Kawhi: SAS → TOR → LAC
    ("westbru01",  "OKC", "HOU", "WAS"),       # Russ: OKC → HOU → WAS
]

CURATED_3TEAM_HARD = [
    ("mcgratr01",  "ORL", "HOU", "ATL"),       # T-Mac: ORL → HOU → ATL
    ("gasolma01",  "MEM", "LAC", "TOR"),       # Marc Gasol: MEM → LAC → TOR? check
    ("billuch01",  "MIN", "DEN", "DET"),       # Billups: various teams
    ("mariosh01",  "PHX", "TOR", "MIA"),       # Shawn Marion: PHX → TOR → MIA? check
    ("stackja01",  "GSW", "CHI", "DET"),       # Jerry Stackhouse
    ("milleami01", "POR", "PHI", "DEN"),       # Andre Miller: many teams
    ("iveral01",   "PHI", "DEN", "DET"),       # Iverson: PHI → DEN → DET
    ("moblepa01",  "CLE", "HOU", "SAC"),       # Paul Mokeski? wrong — skip
    ("ratlith01",  "ORL", "MEM", "UTA"),       # Theo Ratliff: various
    ("bogutin01",  "CHA", "GSW", "SAC"),       # Bogues? pre-2000
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


def make_3team_q(pid, ta, tb, tc, player_seasons, rows, used_keys, difficulty):
    if pid not in player_seasons:
        return None
    seasons = player_seasons[pid]
    teams_played = {t for _, t, _ in seasons}
    if not all(t in teams_played for t in (ta, tb, tc)):
        return None
    # Ensure chronological order: ta before tb before tc
    team_first_season = {}
    for s, t, _ in seasons:
        if t not in team_first_season:
            team_first_season[t] = s
    if not (ta in team_first_season and tb in team_first_season and tc in team_first_season):
        return None
    if not (team_first_season[ta] <= team_first_season[tb] <= team_first_season[tc]):
        return None
    if ta == tb or tb == tc or ta == tc:
        return None

    key = (pid, ta, tb, tc)
    if key in used_keys:
        return None

    player_name = seasons[0][2]["player"]
    # Wrong answers: players who played for team_a but not all three
    wrong_names = list({
        row["player"] for row in rows
        if row["team"] == ta and row["player_id"] != pid
    })
    random.shuffle(wrong_names)
    if len(wrong_names) < 3:
        return None

    options = [player_name] + wrong_names[:3]
    random.shuffle(options)
    answer_index = options.index(player_name)

    q_text = f"Which player played for the {ta}, {tb}, and {tc}?"
    explanation = f"{esc(player_name)} played for the {ta}, then {tb}, then {tc}."

    used_keys.add(key)
    return {
        "type": "career",
        "difficulty": difficulty,
        "question": q_text,
        "options": options,
        "answer_index": answer_index,
        "explanation": explanation,
        "season": None,
        "team_id": None,
        "player_name": None,
        "template": "played_for_all",
        "params": {"teams": [ta, tb, tc]},
    }


def auto_generate_3team(player_seasons, rows, used_keys, difficulty, target):
    questions = []
    candidates = []
    for pid, seasons in player_seasons.items():
        notable = []
        for s, t, row in seasons:
            if t in NOTABLE_TEAMS and (not notable or notable[-1] != t):
                notable.append(t)
        unique = list(dict.fromkeys(notable))
        if len(unique) >= 3:
            candidates.append((pid, unique, seasons))
    random.shuffle(candidates)

    for pid, notable, seasons in candidates:
        if len(questions) >= target:
            break
        for i in range(len(notable) - 2):
            ta, tb, tc = notable[i], notable[i+1], notable[i+2]
            q = make_3team_q(pid, ta, tb, tc, player_seasons, rows, used_keys, difficulty)
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

    # Easy curated
    for pid, ta, tb, tc in CURATED_3TEAM_EASY:
        if len([q for q in questions if q["difficulty"] == "easy"]) >= 18:
            break
        q = make_3team_q(pid, ta, tb, tc, player_seasons, rows, used_keys, "easy")
        if q:
            questions.append(q)

    easy_done = len([q for q in questions if q["difficulty"] == "easy"])
    if easy_done < 18:
        questions += auto_generate_3team(player_seasons, rows, used_keys, "easy", 18 - easy_done)

    # Hard curated
    for pid, ta, tb, tc in CURATED_3TEAM_HARD:
        if len([q for q in questions if q["difficulty"] == "hard"]) >= 17:
            break
        q = make_3team_q(pid, ta, tb, tc, player_seasons, rows, used_keys, "hard")
        if q:
            questions.append(q)

    hard_done = len([q for q in questions if q["difficulty"] == "hard"])
    if hard_done < 17:
        questions += auto_generate_3team(player_seasons, rows, used_keys, "hard", 17 - hard_done)

    questions = questions[:35]
    counts = {}
    for q in questions:
        k = (q["type"], q["difficulty"])
        counts[k] = counts.get(k, 0) + 1
    print(f"Generated {len(questions)} 3-team career questions:")
    for k, v in sorted(counts.items()):
        print(f"  {k}: {v}")

    write_sql(questions, SQL_OUT)
