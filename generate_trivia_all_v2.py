#!/usr/bin/env python3
"""
Generate 140 NBA trivia questions (v2):
  - stats_1st:    35 questions (who led team in stat)
  - stats_2nd:    35 questions (who was 2nd in stat)
  - career_2team: 35 questions (played for A then B)
  - career_3team: 35 questions (played for A, B, and C)

Difficulty-easy filtering:
  - Stats: skip if 1st-vs-2nd gap >= 5.0 (too obvious); also skip hardcoded
    obviously-dominant combos.
  - Career: exclude EXCLUDE_FROM_EASY players; replace with mid-tier stars.

Output: /home/user/nbaTeamCraft/data/trivia_questions_seed_all_v2.sql
"""

import csv
import json
import random
from collections import defaultdict

CSV_PATH  = "/home/user/nbaTeamCraft/data/player_per_game.csv"
SQL_PATH  = "/home/user/nbaTeamCraft/data/trivia_questions_seed_all_v2.sql"

random.seed(123)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

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
    "stl_per_game": "steals",
    "blk_per_game": "blocks",
}
STAT_DISPLAY = {
    "pts_per_game": "PPG",
    "trb_per_game": "RPG",
    "ast_per_game": "APG",
    "stl_per_game": "SPG",
    "blk_per_game": "BPG",
}

# Players to exclude from easy career/3-team questions (too obvious)
EXCLUDE_FROM_EASY = {
    "jamesle01",   # LeBron James
    "bryanko01",   # Kobe Bryant
    "onealsh01",   # Shaquille O'Neal
    "curryst01",   # Stephen Curry
    "duranke01",   # Kevin Durant
    "garneke01",   # Kevin Garnett
    "hardeja01",   # James Harden
    "antetgi01",   # Giannis
}

# ---------------------------------------------------------------------------
# Curated lists
# ---------------------------------------------------------------------------

# (team, season, stat, difficulty)
# For easy: avoid combos where the answer is painfully obvious
# We keep only cases where:
#  a) the player is well-known but not a slam-dunk (e.g., team with multiple stars)
#  b) the season is interesting (Finals year, breakout season)
# The runtime gap filter (5.0) will additionally remove truly dominant cases.
CURATED_STATS_1ST = [
    # Easy — interesting / not immediately obvious
    ("MIA", 2006, "pts_per_game", "easy"),    # Wade 34 PPG
    ("CLE", 2008, "pts_per_game", "easy"),    # LeBron
    ("CHI", 2011, "pts_per_game", "easy"),    # Derrick Rose MVP
    ("DAL", 2011, "pts_per_game", "easy"),    # Dirk championship
    ("MIL", 2020, "pts_per_game", "easy"),    # Giannis
    ("MEM", 2022, "pts_per_game", "easy"),    # Ja Morant breakout
    ("NOP", 2023, "pts_per_game", "easy"),    # Zion
    ("TOR", 2019, "pts_per_game", "easy"),    # Kawhi Finals run
    ("PHX", 2022, "pts_per_game", "easy"),    # Devin Booker
    ("OKC", 2019, "pts_per_game", "easy"),    # Paul George
    ("PHI", 2022, "pts_per_game", "easy"),    # Embiid
    ("DEN", 2022, "pts_per_game", "easy"),    # Jokic MVP
    ("GSW", 2021, "pts_per_game", "easy"),    # Curry 32 PPG
    ("PHX", 2006, "ast_per_game", "easy"),    # Nash
    ("OKC", 2012, "ast_per_game", "easy"),    # Westbrook
    ("MEM", 2022, "ast_per_game", "easy"),    # Morant
    ("SAS", 2003, "trb_per_game", "easy"),    # Duncan
    ("DEN", 2022, "trb_per_game", "easy"),    # Jokic
    ("MIL", 2020, "trb_per_game", "easy"),    # Giannis
    ("BOS", 2023, "pts_per_game", "easy"),    # Jaylen Brown / Tatum era
    ("LAC", 2020, "pts_per_game", "easy"),    # Kawhi bubble
    ("DAL", 2022, "pts_per_game", "easy"),    # Luka
    ("MIN", 2024, "pts_per_game", "easy"),    # Anthony Edwards
    ("SAC", 2023, "pts_per_game", "easy"),    # De'Aaron Fox
    ("MIA", 2023, "pts_per_game", "easy"),    # Jimmy Butler Finals run
    # Hard — less obvious teams
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
    ("ATL", 2015, "pts_per_game", "hard"),
    ("POR", 2016, "pts_per_game", "hard"),
    ("ORL", 2009, "pts_per_game", "hard"),
    ("MEM", 2015, "trb_per_game", "hard"),
    ("IND", 2014, "trb_per_game", "hard"),
]

# (team, season, stat, difficulty) for 2nd-place questions
CURATED_STATS_2ND = [
    # Easy — famous duos
    ("OKC", 2012, "pts_per_game", "easy"),    # KD #1, Westbrook #2
    ("OKC", 2013, "pts_per_game", "easy"),    # KD #1, Westbrook #2
    ("MIA", 2013, "pts_per_game", "easy"),    # LeBron #1, Wade #2
    ("GSW", 2016, "pts_per_game", "easy"),    # Curry #1, Klay #2
    ("BOS", 2008, "pts_per_game", "easy"),    # Pierce #1, Allen #2
    ("CLE", 2016, "pts_per_game", "easy"),    # LeBron #1, Kyrie #2
    ("SAS", 2014, "pts_per_game", "easy"),    # Kawhi/Parker/Duncan era
    ("DAL", 2011, "pts_per_game", "easy"),    # Dirk #1, Terry #2
    ("MIL", 2020, "pts_per_game", "easy"),    # Giannis #1, Middleton #2
    ("MIL", 2021, "pts_per_game", "easy"),    # Giannis #1, Middleton #2
    ("DEN", 2021, "pts_per_game", "easy"),    # Jokic #1, Murray #2
    ("PHI", 2023, "pts_per_game", "easy"),    # Embiid #1, Maxey #2
    ("PHX", 2006, "pts_per_game", "easy"),    # Amare #1, Nash #2
    ("BOS", 2008, "trb_per_game", "easy"),    # KG leads
    ("OKC", 2012, "ast_per_game", "easy"),    # Westbrook leads
    ("MEM", 2022, "pts_per_game", "easy"),    # Ja #1, Desmond Bane #2
    ("MIA", 2023, "pts_per_game", "easy"),    # Butler #1, Bam #2
    ("BKN", 2021, "pts_per_game", "easy"),    # KD/Harden/Irving trio
    ("LAL", 2009, "trb_per_game", "easy"),    # Pau Gasol leads rebounding
    ("DEN", 2022, "pts_per_game", "easy"),    # Jokic #1, Porter Jr #2
    ("TOR", 2019, "pts_per_game", "easy"),    # Kawhi #1, Pascal #2
    ("PHX", 2022, "pts_per_game", "easy"),    # Booker #1, CP3 #2
    ("GSW", 2022, "pts_per_game", "easy"),    # Curry #1, Klay #2 (comeback)
    ("MIN", 2024, "pts_per_game", "easy"),    # Edwards #1, Towns #2
    ("LAC", 2020, "pts_per_game", "easy"),    # Kawhi #1, PG #2
    # Hard
    ("SAC", 2002, "pts_per_game", "hard"),
    ("NJN", 2002, "pts_per_game", "hard"),
    ("DET", 2004, "pts_per_game", "hard"),
    ("MEM", 2014, "pts_per_game", "hard"),
    ("IND", 2014, "pts_per_game", "hard"),
    ("UTA", 2007, "pts_per_game", "hard"),
    ("MIN", 2004, "pts_per_game", "hard"),
    ("WAS", 2006, "pts_per_game", "hard"),
    ("NOH", 2008, "pts_per_game", "hard"),
    ("ATL", 2015, "pts_per_game", "hard"),
    ("POR", 2014, "pts_per_game", "hard"),
    ("ORL", 2009, "pts_per_game", "hard"),
    ("MEM", 2015, "trb_per_game", "hard"),
    ("IND", 2014, "trb_per_game", "hard"),
    ("TOR", 2020, "pts_per_game", "hard"),
]

# (player_id, team_a, team_b) for 2-team career
CURATED_CAREER_2TEAM_EASY = [
    # Excluded: jamesle01, bryanko01, onealsh01, curryst01, duranke01, garneke01, hardeja01, antetgi01
    # Added mid-tier stars that are "known but not obvious"
    ("westbru01",  "OKC",  "HOU"),
    ("irvinky01",  "CLE",  "BOS"),
    ("leonaka01",  "SAS",  "TOR"),
    ("paulch01",   "NOH",  "LAC"),
    ("paulch01",   "LAC",  "HOU"),
    ("paulch01",   "HOU",  "OKC"),
    ("gasolpa01",  "MEM",  "LAL"),
    ("gasolpa01",  "LAL",  "SAS"),
    ("anthoca01",  "DEN",  "NYK"),
    ("anthoca01",  "NYK",  "OKC"),
    ("piercpa01",  "BOS",  "BKN"),
    ("allenary01", "MIL",  "BOS"),
    ("nashst01",   "DAL",  "PHX"),
    ("gasolma01",  "MEM",  "LAC"),
    ("billuch01",  "MIN",  "DEN"),
    ("westbru01",  "HOU",  "WAS"),
    ("irvinky01",  "BOS",  "BKN"),
    ("mariosh01",  "PHX",  "MIA"),
    ("milleami01", "POR",  "PHI"),
    ("mcgratr01",  "ORL",  "HOU"),
]

CURATED_CAREER_2TEAM_HARD = [
    ("stackja01",  "GSW",  "DET"),
    ("iveral01",   "PHI",  "DEN"),
    ("milleami01", "DEN",  "LAL"),
    ("mcgratr01",  "HOU",  "ATL"),
    ("ratlith01",  "ORL",  "MEM"),
    ("billuch01",  "DEN",  "DET"),
    ("mariosh01",  "TOR",  "DAL"),
    ("spreelo01",  "GSW",  "NYK"),
    ("paytoga01",  "SEA",  "MIL"),
    ("mutomdi01",  "DEN",  "PHI"),
    ("abdulma01",  "LAL",  "HOU"),
    ("moblelou01", "CLE",  "SAC"),
    ("abdulma01",  "HOU",  "DET"),
    ("marionsh01", "DAL",  "CLE"),
    ("turkoghu01", "SAS",  "ORL"),
]

# (player_id, team_a, team_b, team_c) for 3-team career
CURATED_3TEAM_EASY = [
    # Excluded EXCLUDE_FROM_EASY; using mid-tier stars
    ("paulch01",   "NOH",  "LAC",  "HOU"),
    ("westbru01",  "OKC",  "HOU",  "WAS"),
    ("irvinky01",  "CLE",  "BOS",  "BKN"),
    ("leonaka01",  "SAS",  "TOR",  "LAC"),
    ("gasolpa01",  "MEM",  "LAL",  "SAS"),
    ("anthoca01",  "DEN",  "NYK",  "OKC"),
    ("nashst01",   "DAL",  "PHX",  "LAL"),
    ("piercpa01",  "BOS",  "BKN",  "WAS"),
    ("allenary01", "MIL",  "BOS",  "MIA"),
    ("gasolma01",  "MEM",  "LAC",  "TOR"),
    ("milleami01", "POR",  "PHI",  "DEN"),
    ("mcgratr01",  "ORL",  "HOU",  "ATL"),
    ("billuch01",  "MIN",  "DEN",  "DET"),
    ("mariosh01",  "PHX",  "TOR",  "MIA"),
    ("westbru01",  "HOU",  "OKC",  "WAS"),  # re-visit with different trio
]

CURATED_3TEAM_HARD = [
    ("stackja01",  "GSW",  "CHI",  "DET"),
    ("iveral01",   "PHI",  "DEN",  "DET"),
    ("ratlith01",  "ORL",  "MEM",  "UTA"),
    ("milleami01", "CLE",  "SAC",  "DEN"),  # Andre Miller various
    ("mutomdi01",  "DEN",  "ATL",  "PHI"),
    ("spreelo01",  "GSW",  "NYK",  "CLE"),
    ("abdulma01",  "LAL",  "HOU",  "DET"),
    ("paytoga01",  "SEA",  "MIL",  "BOS"),
    ("turkoghu01", "SAS",  "ORL",  "PHX"),
    ("marionsh01", "PHX",  "TOR",  "MIA"),
    ("moblelou01", "CLE",  "HOU",  "SAC"),
    ("bibbyemi01", "SAC",  "ATL",  "MIA"),
    ("masonant01", "NYK",  "WAS",  "SAS"),  # Anthony Mason
    ("finlemi01",  "DAL",  "SAS",  "BOS"),  # Michael Finley
    ("delpied01",  "BOS",  "NJN",  "IND"),  # Dell Curry etc — replace
]

# ---------------------------------------------------------------------------
# Data loading
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
            if season < 2000 or g < 20:
                continue
            rows.append(row)
    return rows


def build_structures(rows):
    team_season = defaultdict(list)
    player_seasons = defaultdict(list)
    for row in rows:
        team = row["team"]
        season = int(row["season"])
        if team not in ("2TM", "3TM"):
            team_season[(team, season)].append(row)
        player_seasons[row["player_id"]].append((season, team, row))
    for pid in player_seasons:
        player_seasons[pid].sort(key=lambda x: x[0])
    return team_season, player_seasons


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

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


def get_wrong_names_from_team(rows, team, exclude_pid, n=3):
    """Return up to n player names from a given team, excluding exclude_pid."""
    names = list({row["player"] for row in rows if row["team"] == team and row["player_id"] != exclude_pid})
    random.shuffle(names)
    return names[:n]


# ---------------------------------------------------------------------------
# Stats 1st-place question
# ---------------------------------------------------------------------------

# Dominant combos to skip for easy (player is obviously the answer)
SKIP_EASY_STATS_1ST = {
    ("LAL", 2006, "pts_per_game"),   # Kobe 35 PPG — too obvious
    ("GSW", 2016, "pts_per_game"),   # Curry 30 PPG
    ("GSW", 2017, "pts_per_game"),   # Durant on GSW
    ("HOU", 2018, "pts_per_game"),   # Harden 36 PPG
    ("OKC", 2012, "pts_per_game"),   # KD 28 PPG
    ("OKC", 2014, "pts_per_game"),   # KD MVP 32 PPG
    ("CLE", 2018, "pts_per_game"),   # LeBron
    ("MIA", 2013, "pts_per_game"),   # LeBron
    ("BKN", 2021, "pts_per_game"),   # KD post-COVID
}

SKIP_EASY_STATS_2ND = {
    # 2nd-place with gap>=5 will be caught by runtime filter,
    # but a few extra obvious skips
    ("OKC", 2014, "pts_per_game"),   # KD 32, Westbrook 21 — gap 11
    ("HOU", 2018, "pts_per_game"),   # Harden 36, Paul 18 — gap 18
}


def make_stats_1st_question(team_season, team, season, stat, difficulty, used_keys,
                             max_gap_easy=5.0):
    key = ("1st", team, season, stat)
    if key in used_keys:
        return None
    if difficulty == "easy" and (team, season, stat) in SKIP_EASY_STATS_1ST:
        return None

    players = team_season.get((team, season), [])
    if len(players) < 4:
        return None

    sorted_p = sorted(players, key=lambda r: fmt_float(r.get(stat, 0)), reverse=True)
    leader = sorted_p[0]
    second = sorted_p[1] if len(sorted_p) > 1 else None

    val = fmt_float(leader.get(stat, 0))
    if val == 0:
        return None

    # For easy: skip if gap between 1st and 2nd is too large (too obvious)
    if difficulty == "easy" and second is not None:
        second_val = fmt_float(second.get(stat, 0))
        if val - second_val >= max_gap_easy:
            return None

    # Wrong answers from same team
    wrong_candidates = [r["player"] for r in sorted_p[1:] if r["player"] != leader["player"]]
    if len(wrong_candidates) < 3:
        for delta in [-1, 1, -2, 2, -3, 3]:
            for row in team_season.get((team, season + delta), []):
                if row["player"] != leader["player"] and row["player"] not in wrong_candidates:
                    wrong_candidates.append(row["player"])
            if len(wrong_candidates) >= 9:
                break
    if len(wrong_candidates) < 3:
        return None

    random.shuffle(wrong_candidates)
    correct_name = leader["player"]
    options = [correct_name] + wrong_candidates[:3]
    random.shuffle(options)
    answer_index = options.index(correct_name)

    slabel = season_label(season)
    stat_lbl = STAT_LABELS.get(stat, stat)
    stat_disp = STAT_DISPLAY.get(stat, stat)

    used_keys.add(key)
    return {
        "type": "stats",
        "difficulty": difficulty,
        "question": f"Who led the {slabel} {team} in {stat_lbl}?",
        "options": options,
        "answer_index": answer_index,
        "explanation": f"{esc(correct_name)} averaged {val} {stat_disp} for the {slabel} {team}.",
        "season": slabel,
        "team_id": team,
        "player_name": correct_name,
        "template": "stats_leader",
        "params": {"season": slabel, "team_id": team, "stat": stat, "rank": 1},
    }


# ---------------------------------------------------------------------------
# Stats 2nd-place question
# ---------------------------------------------------------------------------

def make_stats_2nd_question(team_season, team, season, stat, difficulty, used_keys,
                             max_gap_easy=5.0):
    key = ("2nd", team, season, stat)
    if key in used_keys:
        return None
    if difficulty == "easy" and (team, season, stat) in SKIP_EASY_STATS_2ND:
        return None

    players = team_season.get((team, season), [])
    if len(players) < 4:
        return None

    sorted_p = sorted(players, key=lambda r: fmt_float(r.get(stat, 0)), reverse=True)
    leader = sorted_p[0]
    second = sorted_p[1]

    leader_val = fmt_float(leader.get(stat, 0))
    second_val = fmt_float(second.get(stat, 0))

    if second_val == 0:
        return None
    if leader["player"] == second["player"]:
        return None
    if leader_val - second_val < 1.0:
        return None

    # For easy: skip if gap between 1st and 2nd is too large (2nd too obvious by elimination)
    if difficulty == "easy" and leader_val - second_val >= max_gap_easy:
        return None

    wrong_candidates = [r["player"] for r in sorted_p[2:] if r["player"] not in (leader["player"], second["player"])]
    if len(wrong_candidates) < 3:
        for delta in [-1, 1, -2, 2, -3, 3]:
            for row in team_season.get((team, season + delta), []):
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

    slabel = season_label(season)
    stat_lbl = STAT_LABELS.get(stat, stat)
    stat_disp = STAT_DISPLAY.get(stat, stat)

    used_keys.add(key)
    return {
        "type": "stats",
        "difficulty": difficulty,
        "question": f"Who was the 2nd leading {stat_lbl} player on the {slabel} {team}?",
        "options": options,
        "answer_index": answer_index,
        "explanation": (
            f"{esc(correct_name)} averaged {second_val} {stat_disp}, "
            f"2nd on the {slabel} {team} behind {esc(leader['player'])} ({leader_val} {stat_disp})."
        ),
        "season": slabel,
        "team_id": team,
        "player_name": correct_name,
        "template": "stats_leader",
        "params": {"season": slabel, "team_id": team, "stat": stat, "rank": 2},
    }


# ---------------------------------------------------------------------------
# Career 2-team question
# ---------------------------------------------------------------------------

def make_career_2team_question(pid, team_a, team_b, player_seasons, rows, used_keys, difficulty):
    if pid not in player_seasons:
        return None
    seasons = player_seasons[pid]
    teams_played = {t for _, t, _ in seasons}
    if team_a not in teams_played or team_b not in teams_played:
        return None
    if team_a == team_b:
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


def auto_career_2team(player_seasons, rows, used_keys, difficulty, target):
    """Auto-generate 2-team career questions."""
    questions = []
    candidates = []
    for pid, seasons in player_seasons.items():
        if difficulty == "easy" and pid in EXCLUDE_FROM_EASY:
            continue
        if difficulty == "hard" and pid not in EXCLUDE_FROM_EASY:
            # For hard: allow any non-excluded player with multiple notable teams
            pass
        notable = []
        for s, t, row in seasons:
            if t in NOTABLE_TEAMS and (not notable or notable[-1] != t):
                notable.append(t)
        unique = list(dict.fromkeys(notable))
        if len(unique) >= 2:
            candidates.append((pid, unique))
    random.shuffle(candidates)

    for pid, notable in candidates:
        if len(questions) >= target:
            break
        for i in range(len(notable) - 1):
            ta, tb = notable[i], notable[i + 1]
            if ta == tb:
                continue
            q = make_career_2team_question(pid, ta, tb, player_seasons, rows, used_keys, difficulty)
            if q:
                questions.append(q)
                break
    return questions


# ---------------------------------------------------------------------------
# Career 3-team question
# ---------------------------------------------------------------------------

def make_career_3team_question(pid, ta, tb, tc, player_seasons, rows, used_keys, difficulty):
    if pid not in player_seasons:
        return None
    seasons = player_seasons[pid]
    teams_played = {t for _, t, _ in seasons}
    if not all(t in teams_played for t in (ta, tb, tc)):
        return None
    if ta == tb or tb == tc or ta == tc:
        return None

    # Ensure chronological order
    team_first = {}
    for s, t, _ in seasons:
        if t not in team_first:
            team_first[t] = s
    if not all(t in team_first for t in (ta, tb, tc)):
        return None
    if not (team_first[ta] <= team_first[tb] <= team_first[tc]):
        return None

    key = (pid, ta, tb, tc)
    if key in used_keys:
        return None

    player_name = seasons[0][2]["player"]
    wrong_names = list({row["player"] for row in rows if row["team"] == ta and row["player_id"] != pid})
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
        "question": f"Which player played for the {ta}, {tb}, and {tc}?",
        "options": options,
        "answer_index": answer_index,
        "explanation": f"{esc(player_name)} played for the {ta}, then {tb}, then {tc}.",
        "season": None,
        "team_id": None,
        "player_name": None,
        "template": "played_for_all",
        "params": {"teams": [ta, tb, tc]},
    }


def auto_career_3team(player_seasons, rows, used_keys, difficulty, target):
    """Auto-generate 3-team career questions."""
    questions = []
    candidates = []
    for pid, seasons in player_seasons.items():
        if difficulty == "easy" and pid in EXCLUDE_FROM_EASY:
            continue
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
            ta, tb, tc = notable[i], notable[i + 1], notable[i + 2]
            q = make_career_3team_question(pid, ta, tb, tc, player_seasons, rows, used_keys, difficulty)
            if q:
                questions.append(q)
                break
    return questions


# ---------------------------------------------------------------------------
# Main generation
# ---------------------------------------------------------------------------

def generate_section(name, generator_fn, curated_easy, curated_hard, target=35):
    """Generic function to generate a 35-question section."""
    questions = []
    used_keys = set()

    easy_target = 18  # ~half easy
    hard_target = target - easy_target

    # Curated easy
    for entry in curated_easy:
        if len([q for q in questions if q["difficulty"] == "easy"]) >= easy_target:
            break
        q = generator_fn(*entry, "easy", used_keys)
        if q:
            questions.append(q)

    # Auto-fill easy
    easy_count = len([q for q in questions if q["difficulty"] == "easy"])
    if easy_count < easy_target:
        print(f"  [{name}] easy curated: {easy_count}, need auto-fill {easy_target - easy_count}")

    # Curated hard
    for entry in curated_hard:
        if len([q for q in questions if q["difficulty"] == "hard"]) >= hard_target:
            break
        q = generator_fn(*entry, "hard", used_keys)
        if q:
            questions.append(q)

    hard_count = len([q for q in questions if q["difficulty"] == "hard"])
    if hard_count < hard_target:
        print(f"  [{name}] hard curated: {hard_count}, need auto-fill {hard_target - hard_count}")

    return questions, used_keys


def generate_stats_1st(team_season, target=35):
    questions = []
    used_keys = set()
    easy_target = 18
    hard_target = target - easy_target
    stats_cycle = ["pts_per_game", "trb_per_game", "ast_per_game"]

    # Curated easy
    for team, season, stat, diff in CURATED_STATS_1ST:
        if diff != "easy":
            continue
        if len([q for q in questions if q["difficulty"] == "easy"]) >= easy_target:
            break
        q = make_stats_1st_question(team_season, team, season, stat, "easy", used_keys)
        if q:
            questions.append(q)

    # Auto-fill easy
    easy_count = len([q for q in questions if q["difficulty"] == "easy"])
    if easy_count < easy_target:
        for team in NOTABLE_TEAMS:
            for season in range(2010, 2026):
                for stat in stats_cycle:
                    if easy_count >= easy_target:
                        break
                    q = make_stats_1st_question(team_season, team, season, stat, "easy", used_keys)
                    if q:
                        questions.append(q)
                        easy_count += 1

    # Curated hard
    for team, season, stat, diff in CURATED_STATS_1ST:
        if diff != "hard":
            continue
        if len([q for q in questions if q["difficulty"] == "hard"]) >= hard_target:
            break
        q = make_stats_1st_question(team_season, team, season, stat, "hard", used_keys)
        if q:
            questions.append(q)

    # Auto-fill hard
    hard_count = len([q for q in questions if q["difficulty"] == "hard"])
    if hard_count < hard_target:
        all_teams = list(set(k[0] for k in team_season.keys()))
        random.shuffle(all_teams)
        for team in all_teams:
            for season in range(2000, 2026):
                for stat in stats_cycle:
                    if hard_count >= hard_target:
                        break
                    q = make_stats_1st_question(team_season, team, season, stat, "hard", used_keys)
                    if q:
                        questions.append(q)
                        hard_count += 1

    return questions[:target]


def generate_stats_2nd(team_season, target=35):
    questions = []
    used_keys = set()
    easy_target = 18
    hard_target = target - easy_target
    stats_cycle = ["pts_per_game", "ast_per_game", "trb_per_game"]

    # Curated easy
    for team, season, stat, diff in CURATED_STATS_2ND:
        if diff != "easy":
            continue
        if len([q for q in questions if q["difficulty"] == "easy"]) >= easy_target:
            break
        q = make_stats_2nd_question(team_season, team, season, stat, "easy", used_keys)
        if q:
            questions.append(q)

    # Auto-fill easy
    easy_count = len([q for q in questions if q["difficulty"] == "easy"])
    if easy_count < easy_target:
        for team in NOTABLE_TEAMS:
            for season in range(2010, 2026):
                for stat in stats_cycle:
                    if easy_count >= easy_target:
                        break
                    q = make_stats_2nd_question(team_season, team, season, stat, "easy", used_keys)
                    if q:
                        questions.append(q)
                        easy_count += 1

    # Curated hard
    for team, season, stat, diff in CURATED_STATS_2ND:
        if diff != "hard":
            continue
        if len([q for q in questions if q["difficulty"] == "hard"]) >= hard_target:
            break
        q = make_stats_2nd_question(team_season, team, season, stat, "hard", used_keys)
        if q:
            questions.append(q)

    # Auto-fill hard
    hard_count = len([q for q in questions if q["difficulty"] == "hard"])
    if hard_count < hard_target:
        all_teams = list(set(k[0] for k in team_season.keys()))
        random.shuffle(all_teams)
        for team in all_teams:
            for season in range(2000, 2026):
                for stat in stats_cycle:
                    if hard_count >= hard_target:
                        break
                    q = make_stats_2nd_question(team_season, team, season, stat, "hard", used_keys)
                    if q:
                        questions.append(q)
                        hard_count += 1

    return questions[:target]


def generate_career_2team(player_seasons, rows, target=35):
    questions = []
    used_keys = set()
    easy_target = 18
    hard_target = target - easy_target

    # Curated easy
    for pid, ta, tb in CURATED_CAREER_2TEAM_EASY:
        if len([q for q in questions if q["difficulty"] == "easy"]) >= easy_target:
            break
        q = make_career_2team_question(pid, ta, tb, player_seasons, rows, used_keys, "easy")
        if q:
            questions.append(q)

    # Auto-fill easy
    easy_count = len([q for q in questions if q["difficulty"] == "easy"])
    if easy_count < easy_target:
        questions += auto_career_2team(player_seasons, rows, used_keys, "easy", easy_target - easy_count)

    # Curated hard
    for pid, ta, tb in CURATED_CAREER_2TEAM_HARD:
        if len([q for q in questions if q["difficulty"] == "hard"]) >= hard_target:
            break
        q = make_career_2team_question(pid, ta, tb, player_seasons, rows, used_keys, "hard")
        if q:
            questions.append(q)

    # Auto-fill hard
    hard_count = len([q for q in questions if q["difficulty"] == "hard"])
    if hard_count < hard_target:
        questions += auto_career_2team(player_seasons, rows, used_keys, "hard", hard_target - hard_count)

    return questions[:target]


def generate_career_3team(player_seasons, rows, target=35):
    questions = []
    used_keys = set()
    easy_target = 18
    hard_target = target - easy_target

    # Curated easy
    for pid, ta, tb, tc in CURATED_3TEAM_EASY:
        if len([q for q in questions if q["difficulty"] == "easy"]) >= easy_target:
            break
        q = make_career_3team_question(pid, ta, tb, tc, player_seasons, rows, used_keys, "easy")
        if q:
            questions.append(q)

    # Auto-fill easy
    easy_count = len([q for q in questions if q["difficulty"] == "easy"])
    if easy_count < easy_target:
        questions += auto_career_3team(player_seasons, rows, used_keys, "easy", easy_target - easy_count)

    # Curated hard
    for pid, ta, tb, tc in CURATED_3TEAM_HARD:
        if len([q for q in questions if q["difficulty"] == "hard"]) >= hard_target:
            break
        q = make_career_3team_question(pid, ta, tb, tc, player_seasons, rows, used_keys, "hard")
        if q:
            questions.append(q)

    # Auto-fill hard
    hard_count = len([q for q in questions if q["difficulty"] == "hard"])
    if hard_count < hard_target:
        questions += auto_career_3team(player_seasons, rows, used_keys, "hard", hard_target - hard_count)

    return questions[:target]


# ---------------------------------------------------------------------------
# SQL writer
# ---------------------------------------------------------------------------

def write_sql(all_questions, path):
    lines = [
        "DELETE FROM trivia_questions;",
        "INSERT INTO trivia_questions "
        "(type, difficulty, question, options, answer_index, explanation, season, team_id, player_name, template, params) VALUES"
    ]
    value_rows = []
    for q in all_questions:
        opts = json.dumps(q["options"], ensure_ascii=False).replace("'", "''")
        params = json.dumps(q.get("params", {}), ensure_ascii=False).replace("'", "''")
        season = f"'{esc(q['season'])}'" if q.get("season") else "NULL"
        team_id = f"'{esc(q['team_id'])}'" if q.get("team_id") else "NULL"
        player_name = f"'{esc(q['player_name'])}'" if q.get("player_name") else "NULL"
        value_rows.append(
            f"('{esc(q['type'])}', '{esc(q['difficulty'])}', '{esc(q['question'])}', '{opts}', "
            f"{q['answer_index']}, '{esc(q['explanation'])}', {season}, {team_id}, {player_name}, "
            f"'{esc(q.get('template', 'freetext'))}', '{params}')"
        )
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

    print("\n--- Generating stats_1st (35 questions) ---")
    q_stats_1st = generate_stats_1st(team_season, target=35)
    print(f"  stats_1st: {len(q_stats_1st)} questions")

    print("\n--- Generating stats_2nd (35 questions) ---")
    q_stats_2nd = generate_stats_2nd(team_season, target=35)
    print(f"  stats_2nd: {len(q_stats_2nd)} questions")

    print("\n--- Generating career_2team (35 questions) ---")
    q_career_2 = generate_career_2team(player_seasons, rows, target=35)
    print(f"  career_2team: {len(q_career_2)} questions")

    print("\n--- Generating career_3team (35 questions) ---")
    q_career_3 = generate_career_3team(player_seasons, rows, target=35)
    print(f"  career_3team: {len(q_career_3)} questions")

    all_questions = q_stats_1st + q_stats_2nd + q_career_2 + q_career_3
    print(f"\n=== Total: {len(all_questions)} questions ===")

    # Breakdown
    counts = {}
    for q in all_questions:
        k = (q["type"], q["difficulty"])
        counts[k] = counts.get(k, 0) + 1
    for k in sorted(counts):
        print(f"  {k}: {counts[k]}")

    if len(all_questions) < 140:
        print(f"\nWARNING: Only {len(all_questions)} questions generated (need 140)")

    write_sql(all_questions, SQL_PATH)

    # Quick verify
    print("\n--- SQL row count verification ---")
    with open(SQL_PATH) as f:
        content = f.read()
    insert_count = content.count("stats_leader") + content.count("played_for_all")
    print(f"  template references: {insert_count} (expected 140)")
