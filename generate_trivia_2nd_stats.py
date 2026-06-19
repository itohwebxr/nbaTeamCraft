#!/usr/bin/env python3
"""Generate 35 '2nd leading scorer/rebounder/assists' stats questions."""

import csv
import json
import random
from collections import defaultdict

CSV_PATH = "/home/user/nbaTeamCraft/data/player_per_game.csv"
SQL_OUT  = "/home/user/nbaTeamCraft/data/trivia_questions_seed_v4_2nd_stats.sql"

random.seed(77)

NOTABLE_TEAMS = [
    "LAL", "BOS", "CHI", "MIA", "SAS", "GSW", "OKC", "HOU", "CLE",
    "PHX", "DAL", "NYK", "LAC", "MIL", "BKN", "DEN", "PHI",
    "MIN", "TOR", "MEM", "SAC", "NJN", "NOH", "NOP", "UTA", "IND",
    "ATL", "WAS", "DET", "ORL", "POR",
]

STAT_LABELS = {
    "pts_per_game": "scoring",
    "trb_per_game": "rebounding",
    "ast_per_game": "assists",
}
STAT_DISPLAY = {
    "pts_per_game": "PPG",
    "trb_per_game": "RPG",
    "ast_per_game": "APG",
}

# Curated (team, season, stat, difficulty) for 2nd-place questions
# These are cases where the 2nd player is interesting/memorable
CURATED_2ND = [
    # Normal — famous duos where the #2 is also well-known
    ("OKC", 2012, "pts_per_game", "easy"),   # KD leads, Westbrook #2
    ("OKC", 2013, "pts_per_game", "easy"),   # KD leads, Westbrook #2
    ("MIA", 2013, "pts_per_game", "easy"),   # LeBron leads, Wade #2
    ("MIA", 2014, "pts_per_game", "easy"),   # LeBron leads, Wade #2
    ("GSW", 2016, "pts_per_game", "easy"),   # Curry leads, Klay #2
    ("GSW", 2017, "pts_per_game", "easy"),   # Durant leads, Curry #2
    ("LAL", 2001, "pts_per_game", "easy"),   # Kobe leads, Shaq #2? or vice versa
    ("LAL", 2003, "pts_per_game", "easy"),   # Kobe/Shaq era
    ("BOS", 2008, "pts_per_game", "easy"),   # Pierce leads, Ray Allen #2
    ("BKN", 2013, "pts_per_game", "easy"),   # KG/Pierce/Garnett era
    ("CLE", 2016, "pts_per_game", "easy"),   # LeBron leads, Kyrie #2
    ("CLE", 2017, "pts_per_game", "easy"),   # LeBron leads, Kyrie #2
    ("SAS", 2014, "pts_per_game", "easy"),   # Kawhi/Duncan/Parker era
    ("PHX", 2005, "pts_per_game", "easy"),   # Amare leads, Nash #2?
    ("HOU", 2019, "pts_per_game", "easy"),   # Harden leads, CP3 or Gordon #2
    ("DAL", 2011, "pts_per_game", "easy"),   # Dirk leads, Terry #2
    ("MIL", 2020, "pts_per_game", "easy"),   # Giannis leads, Middleton #2
    ("MIL", 2021, "pts_per_game", "easy"),   # Giannis leads, Middleton #2
    ("DEN", 2021, "pts_per_game", "easy"),   # Jokic leads, Murray #2
    ("PHI", 2023, "pts_per_game", "easy"),   # Embiid leads, Harden/Maxey #2
    ("OKC", 2012, "ast_per_game", "easy"),   # Westbrook leads assists
    ("PHX", 2006, "pts_per_game", "easy"),   # Amare leads, Nash #2
    ("LAL", 2009, "trb_per_game", "easy"),   # Pau Gasol leads, Bynum #2?
    ("MIA", 2006, "ast_per_game", "easy"),   # Wade/Mourning era
    ("BOS", 2008, "trb_per_game", "easy"),   # KG leads rebounding
    # Hard — less obvious teams/players
    ("SAC", 2002, "pts_per_game", "hard"),
    ("NJN", 2002, "pts_per_game", "hard"),
    ("DET", 2004, "pts_per_game", "hard"),
    ("MEM", 2014, "pts_per_game", "hard"),
    ("IND", 2014, "pts_per_game", "hard"),
    ("UTA", 2007, "pts_per_game", "hard"),
    ("MIN", 2004, "pts_per_game", "hard"),
    ("WAS", 2006, "pts_per_game", "hard"),
    ("NOH", 2008, "pts_per_game", "hard"),
    ("TOR", 2020, "pts_per_game", "hard"),
    ("ATL", 2015, "pts_per_game", "hard"),
    ("POR", 2014, "pts_per_game", "hard"),
    ("ORL", 2009, "pts_per_game", "hard"),
    ("MEM", 2015, "trb_per_game", "hard"),
    ("IND", 2014, "trb_per_game", "hard"),
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


def build_team_season(rows):
    ts = defaultdict(list)
    for row in rows:
        if row["team"] not in ("2TM", "3TM"):
            ts[(row["team"], int(row["season"]))].append(row)
    return ts


def fmt_float(val):
    try:
        return round(float(val), 1)
    except (ValueError, TypeError):
        return 0.0


def esc(s):
    return str(s).replace("'", "''")


def season_label(season_int):
    y = int(season_int)
    return f"{y-1}-{str(y)[2:]}"


def make_2nd_question(team_season, team, season, stat, difficulty, used_keys):
    key = ("2nd", team, season, stat)
    if key in used_keys:
        return None
    players = team_season.get((team, season), [])
    if len(players) < 4:
        return None

    sorted_players = sorted(players, key=lambda r: fmt_float(r.get(stat, 0)), reverse=True)
    leader = sorted_players[0]
    second = sorted_players[1]

    leader_val = fmt_float(leader.get(stat, 0))
    second_val = fmt_float(second.get(stat, 0))

    if second_val == 0:
        return None
    # Skip if 2nd is too close to 1st (makes question confusing) or same player
    if leader["player"] == second["player"]:
        return None
    # Skip if gap is less than 1.0 (too ambiguous)
    if leader_val - second_val < 1.0:
        return None

    slabel = season_label(season)
    stat_label = STAT_LABELS.get(stat, stat)
    stat_disp = STAT_DISPLAY.get(stat, stat)

    # Wrong answers: 3rd, 4th place from same team + nearby seasons if needed
    wrong_candidates = [r["player"] for r in sorted_players[2:] if r["player"] != second["player"]]

    if len(wrong_candidates) < 3:
        for delta in [-1, 1, -2, 2, -3, 3]:
            s = season + delta
            for row in team_season.get((team, s), []):
                if row["player"] not in (leader["player"], second["player"]) and row["player"] not in wrong_candidates:
                    wrong_candidates.append(row["player"])
            if len(wrong_candidates) >= 9:
                break

    if len(wrong_candidates) < 3:
        return None

    random.shuffle(wrong_candidates)
    correct_name = second["player"]
    options = [correct_name] + wrong_candidates[:3]
    random.shuffle(options)
    answer_index = options.index(correct_name)

    q_text = f"Who was the 2nd leading {stat_label} player on the {slabel} {team}?"
    explanation = (
        f"{esc(correct_name)} averaged {second_val} {stat_disp}, "
        f"2nd on the {slabel} {team} behind {esc(leader['player'])} ({leader_val} {stat_disp})."
    )

    used_keys.add(key)
    return {
        "type": "stats",
        "difficulty": difficulty,
        "question": q_text,
        "options": options,
        "answer_index": answer_index,
        "explanation": explanation,
        "season": slabel,
        "team_id": team,
        "player_name": correct_name,
        "template": "stats_leader",
        "params": {"season": slabel, "team_id": team, "stat": stat, "rank": 2},
    }


def write_sql(questions, path):
    lines = [
        "INSERT INTO trivia_questions "
        "(type, difficulty, question, options, answer_index, explanation, season, team_id, player_name, template, params) VALUES"
    ]
    value_rows = []
    for q in questions:
        opts = json.dumps(q["options"], ensure_ascii=False).replace("'", "''")
        params = json.dumps(q["params"], ensure_ascii=False).replace("'", "''")
        season = f"'{esc(q['season'])}'" if q.get("season") else "NULL"
        team_id = f"'{esc(q['team_id'])}'" if q.get("team_id") else "NULL"
        player_name = f"'{esc(q['player_name'])}'" if q.get("player_name") else "NULL"
        value_rows.append(
            f"('{esc(q['type'])}', '{esc(q['difficulty'])}', '{esc(q['question'])}', '{opts}', "
            f"{q['answer_index']}, '{esc(q['explanation'])}', {season}, {team_id}, {player_name}, "
            f"'{esc(q['template'])}', '{params}')"
        )
    lines.append(",\n".join(value_rows))
    lines.append(";")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"SQL written to: {path}")


if __name__ == "__main__":
    rows = load_data()
    team_season = build_team_season(rows)
    used_keys = set()
    questions = []

    # Curated 2nd-place questions
    for team, season, stat, diff in CURATED_2ND:
        if len(questions) >= 35:
            break
        q = make_2nd_question(team_season, team, season, stat, diff, used_keys)
        if q:
            questions.append(q)

    # Auto-fill remaining if curated didn't reach 35
    if len(questions) < 35:
        stats_cycle = ["pts_per_game", "ast_per_game", "trb_per_game"]
        for team in NOTABLE_TEAMS:
            for season in range(2010, 2026):
                for stat in stats_cycle:
                    if len(questions) >= 35:
                        break
                    q = make_2nd_question(team_season, team, season, stat, "easy", used_keys)
                    if q:
                        questions.append(q)

    if len(questions) < 35:
        all_teams = list(set(k[0] for k in team_season.keys()))
        random.shuffle(all_teams)
        for team in all_teams:
            for season in range(2000, 2026):
                for stat in stats_cycle:
                    if len(questions) >= 35:
                        break
                    q = make_2nd_question(team_season, team, season, stat, "hard", used_keys)
                    if q:
                        questions.append(q)

    questions = questions[:35]
    counts = {}
    for q in questions:
        k = (q["type"], q["difficulty"])
        counts[k] = counts.get(k, 0) + 1
    print(f"Generated {len(questions)} 2nd-stats questions:")
    for k, v in sorted(counts.items()):
        print(f"  {k}: {v}")

    write_sql(questions, SQL_OUT)
