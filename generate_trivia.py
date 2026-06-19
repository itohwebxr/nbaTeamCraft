#!/usr/bin/env python3
"""Generate 50 NBA trivia questions from player_per_game.csv and write SQL seed file."""

import csv
import json
import random
from collections import defaultdict

CSV_PATH = "/home/user/nbaTeamCraft/data/player_per_game.csv"
SQL_PATH = "/home/user/nbaTeamCraft/data/trivia_questions_seed.sql"
SQL_PATH_V2 = "/home/user/nbaTeamCraft/data/trivia_questions_seed_v2.sql"

random.seed(42)

# ---------------------------------------------------------------------------
# Load & filter CSV
# ---------------------------------------------------------------------------

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
            if season < 2000:
                continue
            if g < 20:
                continue
            rows.append(row)
    return rows

def season_label(season_int):
    """2006 -> '2005-06'"""
    y = int(season_int)
    return f"{y-1}-{str(y)[2:]}"

def esc(s):
    """Escape single quotes for SQL."""
    return str(s).replace("'", "''")

def fmt_float(val, decimals=1):
    try:
        return round(float(val), decimals)
    except (ValueError, TypeError):
        return 0.0

# ---------------------------------------------------------------------------
# Build lookup structures
# ---------------------------------------------------------------------------

def build_structures(rows):
    # team_season_players[(team, season)] = [row, ...]  (exclude multi-team)
    team_season = defaultdict(list)
    # player_seasons[player_id] = sorted list of (season, team, row)
    player_seasons = defaultdict(list)

    for row in rows:
        team = row["team"]
        season = int(row["season"])
        if team not in ("2TM", "3TM"):
            team_season[(team, season)].append(row)
        player_seasons[row["player_id"]].append((season, team, row))

    # Sort each player's seasons
    for pid in player_seasons:
        player_seasons[pid].sort(key=lambda x: x[0])

    return team_season, player_seasons

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

NOTABLE_PLAYERS = {
    "lebronbr01", "bryanko01", "onealsh01", "curryst01", "duranke01",
    "hardeja01", "antetgi01", "doncilu01", "jamesle01",
}

NOTABLE_TEAMS = [
    "LAL", "BOS", "CHI", "MIA", "SAS", "GSW", "OKC", "HOU", "CLE",
    "PHX", "DAL", "NYK", "LAC", "MIL", "BKN", "DEN", "PHI",
]

def get_team_leader(team_season, team, season, stat):
    key = (team, season)
    if key not in team_season:
        return None
    players = team_season[key]
    best = max(players, key=lambda r: fmt_float(r.get(stat, 0)))
    return best

def get_wrong_answers_stats(team_season, correct_player, team, season, stat, n=3):
    """Get plausible wrong answers from same team or nearby seasons."""
    candidates = []
    # Same team, nearby seasons
    for delta in range(-2, 3):
        s = season + delta
        key = (team, s)
        if key in team_season:
            for row in team_season[key]:
                if row["player"] != correct_player:
                    candidates.append(row["player"])
    # Add from other teams same season
    for t in NOTABLE_TEAMS:
        key = (t, season)
        if key in team_season:
            for row in team_season[key]:
                if row["player"] != correct_player:
                    candidates.append(row["player"])
    # Deduplicate preserving order
    seen = set()
    unique = []
    for c in candidates:
        if c not in seen:
            seen.add(c)
            unique.append(c)
    random.shuffle(unique)
    return unique[:n]

# ---------------------------------------------------------------------------
# Question generators
# ---------------------------------------------------------------------------

def make_stats_question(team_season, team, season, stat, difficulty, used_keys):
    key = (team, season, stat)
    if key in used_keys:
        return None
    leader = get_team_leader(team_season, team, season, stat)
    if leader is None:
        return None
    val = fmt_float(leader.get(stat, 0))
    if val == 0:
        return None

    stat_labels = {
        "pts_per_game": "scoring",
        "trb_per_game": "rebounding",
        "ast_per_game": "assists",
        "stl_per_game": "steals",
        "blk_per_game": "blocks",
    }
    stat_display = {
        "pts_per_game": "PPG",
        "trb_per_game": "RPG",
        "ast_per_game": "APG",
        "stl_per_game": "SPG",
        "blk_per_game": "BPG",
    }
    slabel = season_label(season)

    wrong = get_wrong_answers_stats(team_season, leader["player"], team, season, stat)
    if len(wrong) < 3:
        return None

    correct_name = leader["player"]
    options = [correct_name] + wrong[:3]
    random.shuffle(options)
    answer_index = options.index(correct_name)

    q_text = f"Who led the {slabel} {team} in {stat_labels[stat]}?"
    explanation = (
        f"{esc(correct_name)} averaged {val} {stat_display[stat]} "
        f"for the {slabel} {team}."
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
        "params": {"season": slabel, "team_id": team, "stat": stat},
    }

def make_career_question(player_seasons, difficulty, used_keys, all_rows):
    """Generate a career path question."""
    # Find players who played for two distinct notable teams in different seasons
    candidates = []
    for pid, seasons in player_seasons.items():
        teams_seen = []
        for s, t, row in seasons:
            if t not in ("2TM", "3TM") and t in NOTABLE_TEAMS:
                if not teams_seen or teams_seen[-1] != t:
                    teams_seen.append(t)
        # Need at least 2 different notable teams
        unique_notable = list(dict.fromkeys(teams_seen))
        if len(unique_notable) >= 2:
            candidates.append((pid, unique_notable, seasons))

    random.shuffle(candidates)

    for pid, notable_teams, seasons in candidates:
        # Pick two consecutive notable teams
        for i in range(len(notable_teams) - 1):
            team_a = notable_teams[i]
            team_b = notable_teams[i + 1]
            if team_a == team_b:
                continue
            key = (pid, team_a, team_b)
            if key in used_keys:
                continue

            player_name = seasons[0][2]["player"]

            # For hard: pick less-known players; easy: known players
            is_notable_pid = pid in NOTABLE_PLAYERS
            if difficulty == "easy" and not is_notable_pid:
                continue
            if difficulty == "hard" and is_notable_pid:
                continue

            # Wrong answers: other players who also played for team_a
            wrong_pool = []
            for s, t, row in [sr for pid2, _, srs in candidates for sr in srs]:
                pass  # rebuild below

            # Simpler: find other players from all_rows who played for team_a
            wrong_names = set()
            for row in all_rows:
                if row["team"] == team_a and row["player_id"] != pid:
                    wrong_names.add(row["player"])
            wrong_list = list(wrong_names)
            random.shuffle(wrong_list)
            if len(wrong_list) < 3:
                continue

            options = [player_name] + wrong_list[:3]
            random.shuffle(options)
            answer_index = options.index(player_name)

            q_text = f"Which player played for the {team_a} and then later joined the {team_b}?"
            explanation = (
                f"{esc(player_name)} played for the {team_a} before moving to the {team_b}."
            )

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
                "params": {"teams": [team_a, team_b]},
            }
    return None

# ---------------------------------------------------------------------------
# Curated question sets for reliability
# ---------------------------------------------------------------------------

CURATED_STATS = [
    # (team, season, stat, difficulty)
    # Easy - legendary scorers
    ("LAL", 2006, "pts_per_game", "easy"),
    ("LAL", 2007, "pts_per_game", "easy"),
    ("MIA", 2006, "pts_per_game", "easy"),
    ("CLE", 2008, "pts_per_game", "easy"),
    ("CLE", 2010, "pts_per_game", "easy"),
    ("MIA", 2013, "pts_per_game", "easy"),
    ("GSW", 2016, "pts_per_game", "easy"),
    ("GSW", 2017, "pts_per_game", "easy"),
    ("OKC", 2012, "pts_per_game", "easy"),
    ("HOU", 2018, "pts_per_game", "easy"),
    ("MIL", 2020, "pts_per_game", "easy"),
    ("DAL", 2022, "pts_per_game", "easy"),
    ("LAL", 2020, "trb_per_game", "easy"),
    ("MIA", 2006, "trb_per_game", "easy"),
    ("SAS", 2003, "pts_per_game", "easy"),
    ("SAS", 2003, "trb_per_game", "easy"),
    ("CHI", 2011, "pts_per_game", "easy"),
    ("OKC", 2014, "pts_per_game", "easy"),
    ("BKN", 2021, "pts_per_game", "easy"),
    ("PHI", 2022, "pts_per_game", "easy"),
    ("LAL", 2012, "trb_per_game", "easy"),
    ("BOS", 2008, "pts_per_game", "easy"),
    ("PHX", 2006, "ast_per_game", "easy"),
    ("GSW", 2016, "ast_per_game", "easy"),
    ("OKC", 2012, "ast_per_game", "easy"),
    # Hard - role players / less obvious
    ("SAC", 2002, "pts_per_game", "hard"),
    ("NJN", 2002, "ast_per_game", "hard"),
    ("DET", 2004, "pts_per_game", "hard"),
    ("MEM", 2014, "trb_per_game", "hard"),
    ("IND", 2014, "pts_per_game", "hard"),
    ("UTA", 2007, "pts_per_game", "hard"),
    ("TOR", 2020, "pts_per_game", "hard"),
    ("MIN", 2004, "pts_per_game", "hard"),
    ("WAS", 2006, "pts_per_game", "hard"),
    ("NOH", 2008, "ast_per_game", "hard"),
]

CURATED_CAREER_EASY = [
    # (player_id, team_a, team_b) — verified transfers of famous players
    ("onealsh01", "LAL", "MIA"),
    ("bryanko01", "LAL", "LAL"),  # skip — only LAL
    ("garneke01", "MIN", "BOS"),
    ("jamesle01", "CLE", "MIA"),
    ("duranke01", "OKC", "GSW"),
    ("westbru01", "OKC", "HOU"),
    ("hardeja01", "OKC", "HOU"),
    ("paulch01", "NOH", "LAC"),
    ("irvinky01", "CLE", "BOS"),
    ("leonaka01", "SAS", "TOR"),
]

CURATED_CAREER_HARD = [
    ("piercpa01", "BOS", "BKN"),
    ("nashst01", "PHX", "LAL"),
    ("mcgratr01", "ORL", "HOU"),
    ("milleami01", "IND", "DEN"),
    ("stackja01", "GSW", "DET"),
]

# ---------------------------------------------------------------------------
# Main generation
# ---------------------------------------------------------------------------

def generate_questions(rows, team_season, player_seasons):
    questions = []
    used_keys = set()

    # --- 25 easy stats ---
    easy_stats_generated = 0
    for team, season, stat, diff in CURATED_STATS:
        if diff != "easy":
            continue
        if easy_stats_generated >= 25:
            break
        q = make_stats_question(team_season, team, season, stat, "easy", used_keys)
        if q:
            questions.append(q)
            easy_stats_generated += 1

    # Fill remaining easy stats if needed
    if easy_stats_generated < 25:
        stats_cycle = ["pts_per_game", "trb_per_game", "ast_per_game"]
        for team in NOTABLE_TEAMS:
            for season in range(2020, 2027):
                for stat in stats_cycle:
                    if easy_stats_generated >= 25:
                        break
                    q = make_stats_question(team_season, team, season, stat, "easy", used_keys)
                    if q:
                        questions.append(q)
                        easy_stats_generated += 1

    # --- 10 hard stats ---
    hard_stats_generated = 0
    for team, season, stat, diff in CURATED_STATS:
        if diff != "hard":
            continue
        if hard_stats_generated >= 10:
            break
        q = make_stats_question(team_season, team, season, stat, "hard", used_keys)
        if q:
            questions.append(q)
            hard_stats_generated += 1

    # Fill remaining hard stats
    if hard_stats_generated < 10:
        all_teams = list(set(k[0] for k in team_season.keys()))
        random.shuffle(all_teams)
        for team in all_teams:
            for season in range(2000, 2010):
                for stat in ["pts_per_game", "trb_per_game", "ast_per_game"]:
                    if hard_stats_generated >= 10:
                        break
                    q = make_stats_question(team_season, team, season, stat, "hard", used_keys)
                    if q:
                        questions.append(q)
                        hard_stats_generated += 1

    # --- 10 easy career ---
    easy_career_generated = 0
    for pid, team_a, team_b in CURATED_CAREER_EASY:
        if easy_career_generated >= 10:
            break
        if pid not in player_seasons:
            continue
        seasons = player_seasons[pid]
        has_a = any(t == team_a for _, t, _ in seasons)
        has_b = any(t == team_b for _, t, _ in seasons)
        if not (has_a and has_b):
            continue
        key = (pid, team_a, team_b)
        if key in used_keys:
            continue

        player_name = seasons[0][2]["player"]
        wrong_names = list(set(
            row["player"] for row in rows
            if row["team"] == team_a and row["player_id"] != pid
        ))
        random.shuffle(wrong_names)
        if len(wrong_names) < 3:
            continue

        options = [player_name] + wrong_names[:3]
        random.shuffle(options)
        answer_index = options.index(player_name)

        q_text = f"Which player played for the {team_a} and then later joined the {team_b}?"
        explanation = f"{esc(player_name)} played for the {team_a} before moving to the {team_b}."

        used_keys.add(key)
        questions.append({
            "type": "career",
            "difficulty": "easy",
            "question": q_text,
            "options": options,
            "answer_index": answer_index,
            "explanation": explanation,
            "season": None,
            "team_id": None,
            "player_name": None,
            "template": "played_for_all",
            "params": {"teams": [team_a, team_b]},
        })
        easy_career_generated += 1

    # Fill remaining easy career via auto-detection
    if easy_career_generated < 10:
        q = make_career_question(player_seasons, "easy", used_keys, rows)
        while q and easy_career_generated < 10:
            questions.append(q)
            easy_career_generated += 1
            q = make_career_question(player_seasons, "easy", used_keys, rows)

    # --- 5 hard career ---
    hard_career_generated = 0
    for pid, team_a, team_b in CURATED_CAREER_HARD:
        if hard_career_generated >= 5:
            break
        if pid not in player_seasons:
            continue
        seasons = player_seasons[pid]
        has_a = any(t == team_a for _, t, _ in seasons)
        has_b = any(t == team_b for _, t, _ in seasons)
        if not (has_a and has_b):
            continue
        key = (pid, team_a, team_b)
        if key in used_keys:
            continue

        player_name = seasons[0][2]["player"]
        wrong_names = list(set(
            row["player"] for row in rows
            if row["team"] == team_a and row["player_id"] != pid
        ))
        random.shuffle(wrong_names)
        if len(wrong_names) < 3:
            continue

        options = [player_name] + wrong_names[:3]
        random.shuffle(options)
        answer_index = options.index(player_name)

        q_text = f"Which player played for the {team_a} and then later joined the {team_b}?"
        explanation = f"{esc(player_name)} played for the {team_a} before moving to the {team_b}."

        used_keys.add(key)
        questions.append({
            "type": "career",
            "difficulty": "hard",
            "question": q_text,
            "options": options,
            "answer_index": answer_index,
            "explanation": explanation,
            "season": None,
            "team_id": None,
            "player_name": None,
            "template": "played_for_all",
            "params": {"teams": [team_a, team_b]},
        })
        hard_career_generated += 1

    # Fill remaining hard career via auto-detection
    if hard_career_generated < 5:
        q = make_career_question(player_seasons, "hard", used_keys, rows)
        while q and hard_career_generated < 5:
            questions.append(q)
            hard_career_generated += 1
            q = make_career_question(player_seasons, "hard", used_keys, rows)

    print(f"Generated: {len(questions)} questions")
    counts = {}
    for q in questions:
        k = (q["type"], q["difficulty"])
        counts[k] = counts.get(k, 0) + 1
    for k, v in sorted(counts.items()):
        print(f"  {k}: {v}")

    return questions

# ---------------------------------------------------------------------------
# SQL writer
# ---------------------------------------------------------------------------

def write_sql_v2(questions, path):
    lines = []
    lines.append(
        "INSERT INTO trivia_questions "
        "(type, difficulty, question, options, answer_index, explanation, season, team_id, player_name, template, params) VALUES"
    )

    value_rows = []
    for q in questions:
        type_ = esc(q["type"])
        diff = esc(q["difficulty"])
        question = esc(q["question"])
        options_json = json.dumps(q["options"], ensure_ascii=False).replace("'", "''")
        answer_index = q["answer_index"]
        explanation = esc(q["explanation"])
        season = f"'{esc(q['season'])}'" if q.get("season") else "NULL"
        team_id = f"'{esc(q['team_id'])}'" if q.get("team_id") else "NULL"
        player_name = f"'{esc(q['player_name'])}'" if q.get("player_name") else "NULL"
        template = esc(q.get("template", "freetext"))
        params_json = json.dumps(q.get("params", {}), ensure_ascii=False).replace("'", "''")

        row = (
            f"('{type_}', '{diff}', '{question}', '{options_json}', "
            f"{answer_index}, '{explanation}', {season}, {team_id}, {player_name}, "
            f"'{template}', '{params_json}')"
        )
        value_rows.append(row)

    lines.append(",\n".join(value_rows))
    lines.append(";")

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"\nSQL written to: {path}")


def write_sql(questions, path):
    lines = []
    lines.append("INSERT INTO trivia_questions (type, difficulty, question, options, answer_index, explanation, season, team_id, player_name) VALUES")

    value_rows = []
    for q in questions:
        type_ = esc(q["type"])
        diff = esc(q["difficulty"])
        question = esc(q["question"])
        options_json = json.dumps(q["options"], ensure_ascii=False).replace("'", "''")
        answer_index = q["answer_index"]
        explanation = esc(q["explanation"])
        season = f"'{esc(q['season'])}'" if q["season"] else "NULL"
        team_id = f"'{esc(q['team_id'])}'" if q["team_id"] else "NULL"
        player_name = f"'{esc(q['player_name'])}'" if q["player_name"] else "NULL"

        row = (
            f"('{type_}', '{diff}', '{question}', '{options_json}', "
            f"{answer_index}, '{explanation}', {season}, {team_id}, {player_name})"
        )
        value_rows.append(row)

    lines.append(",\n".join(value_rows))
    lines.append(";")

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    print(f"\nSQL written to: {path}")

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("Loading CSV...")
    rows = load_data()
    print(f"Loaded {len(rows)} rows (season>=2000, g>=20)")

    team_season, player_seasons = build_structures(rows)
    print(f"Unique (team, season) combos: {len(team_season)}")
    print(f"Unique player IDs: {len(player_seasons)}")

    questions = generate_questions(rows, team_season, player_seasons)

    if len(questions) < 50:
        print(f"WARNING: Only {len(questions)} questions generated, need 50!")
        # Force fill with any valid stats questions
        stats_types = ["pts_per_game", "trb_per_game", "ast_per_game"]
        used_keys = set()
        all_teams = list(set(k[0] for k in team_season.keys()))
        for team in all_teams:
            for season in range(2000, 2027):
                for stat in stats_types:
                    if len(questions) >= 50:
                        break
                    q = make_stats_question(team_season, team, season, stat, "hard", used_keys)
                    if q:
                        questions.append(q)

    questions = questions[:50]
    write_sql(questions, SQL_PATH)
    write_sql_v2(questions, SQL_PATH_V2)

    # Verify
    print("\n--- First 3 lines of SQL ---")
    with open(SQL_PATH) as f:
        for i, line in enumerate(f):
            if i < 3:
                print(line[:200])

    print("\n--- Verifying v2 SQL row count ---")
    with open(SQL_PATH_V2) as f:
        content = f.read()
    row_count = content.count("stats_leader") + content.count("played_for_all") + content.count("freetext")
    print(f"  template mentions: {row_count} (should be 50)")
