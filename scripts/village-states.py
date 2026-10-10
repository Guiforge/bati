#!/usr/bin/env python3
"""Build the dev databases behind the "Un village qui te ressemble" mock-ups (V-01).

    scripts/village-states.py <base.db> <state> <out.db>

<base.db> is a dev database pulled from the emulator (already migrated and onboarded). The script
copies it, deletes every session, then writes a believable history that lands on the state the
design spec names in "Données d'exemple" (docs/designs/village-personnalisation.md): session
counts per practice, total XP (hence level, title, village tier), a flame of the right length,
and villageName. Every state ends with a check that reads the finished database back through
plain SQL and fails the script if the state is wrong.

States: jour1 a-avant a b-avant b palier-avant palier c e sanglier nom-long. `x-avant` is `x` minus its last
session, the one the hero is meant to play on the emulator to reach `x`.

Not touched: the streak_* caches are deleted, not forged. Their day stamp is stale, so the app
recomputes the flame from the journal on the first read. Stdlib only.
"""

import json
import math
import os
import random
import shutil
import sqlite3
import sys
import time
from collections import Counter
from datetime import date, datetime, timedelta
from datetime import time as dtime

FORCE_QUESTS = [1, 2, 3, 4, 5, 8, 9, 11, 12, 15, 23, 32]  # every exercise strength
COURSE_QUESTS = [14, 26]  # cardio 3 of 4 exercises
YOGA_QUESTS = [28, 29, 30]  # every exercise yoga
OUTING_QUEST = {"run": 36, "ride": 37}
STYLE_PRACTICE = {"strength": "force", "calisthenics": "calisthenics", "yoga": "yoga", "cardio": "course"}
FLAME_NAMES = ["", "Étincelle", "Braise", "", "Fournaise", "Éternelle"]  # by getFlameLevel; 0 = out
LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 6600, 7800, 9100,
                    10500, 12000, 13600, 15300, 17100, 19000]
TIER_FLOORS = [1, 3, 5, 8, 10, 13, 15, 18, 20, 25, 32, 40]
TIER_NAMES = ["Hameau", "Clairière", "Village", "Carrefour", "Bourg", "Ville franche", "Cité",
              "Cité marchande", "Cité florissante", "Citadelle", "Métropole", "Capitale éternelle"]

FIRST8_FORCE_LED = ["force", "force", "course", "force", "yoga", "force", "course", "force"]

# counts: practice -> sessions. first8: the opening eight, in order. last: practice of the final
# session (the one an -avant state leaves unplayed). xp: total after it; last_xp: what it earned.
# flame: lit days in a row ending today. span: days between the first session and today.
B_COUNTS = {"force": 78, "course": 39, "yoga": 13}  # the first year of C is B's whole history
STATES = {
    "jour1": dict(counts={}, xp=0, flame=0, level=1, tier="Hameau", name="Brumeval"),
    "a": dict(counts={"force": 5, "course": 2, "yoga": 1}, xp=1118, last_xp=118, flame=4, span=50,
              first8=["force", "course", "force", "yoga", "force", "course", "force", "force"],
              last="force", level=5, tier="Village", name="Brumeval"),
    "b": dict(counts={"force": 78, "course": 39, "yoga": 13}, xp=21020, last_xp=150, flame=9,
              span=365, first8=FIRST8_FORCE_LED, last="course", level=21,
              tier="Cité florissante", name="Brumeval"),
    # A revealed hero (the reveal is in `bigFeastsShown`), 5 XP short of level 8 (a quick session crosses it), Carrefour: the
    # session played from `palier-avant` crosses the tier and earns the tier's big feast.
    "palier": dict(counts={"force": 12, "course": 6, "yoga": 3}, xp=2925, last_xp=130, flame=9, span=90,
                   first8=FIRST8_FORCE_LED, last="force", level=8, tier="Carrefour", name="Brumeval",
                   shown=["reveal"]),
    "c": dict(counts={"force": 320, "course": 70, "yoga": 26}, head=B_COUNTS, xp=83400, flame=40, span=1130,
              first8=FIRST8_FORCE_LED, last="force", level=52, tier="Capitale éternelle",
              name="Brumeval"),
    "e": dict(counts={"run": 40, "ride": 20}, xp=9800, flame=9, span=220, first8=["run"] * 8,
              last="run", level=14, tier="Ville franche", name="Brumeval"),
    "sanglier": dict(counts={"force": 14, "course": 13, "yoga": 13}, xp=3900, flame=9, span=150,
                     first8=["force", "course", "yoga", "force", "course", "yoga", "force", "course"],
                     last="course", level=9, tier="Carrefour", name="Brumeval"),
    "nom-long": dict(counts={"force": 320, "course": 70, "yoga": 26}, head=B_COUNTS, xp=83400, flame=1092,
                     span=1100, first8=FIRST8_FORCE_LED, last="force", level=52,
                     tier="Capitale éternelle", name="Rochebrune-sur-Lande"),
}
AVANT = {"a-avant": "a", "b-avant": "b", "palier-avant": "palier"}


# ---- the app's rules, ported (db/streaks.ts, db/userLevel.ts, db/village.ts) -------------------

def level_of(xp):
    if xp >= LEVEL_THRESHOLDS[-1]:
        return len(LEVEL_THRESHOLDS) + (xp - LEVEL_THRESHOLDS[-1]) // 2000
    return max(i + 1 for i, t in enumerate(LEVEL_THRESHOLDS) if xp >= t)


def tier_of(level):
    return TIER_NAMES[max(i for i, f in enumerate(TIER_FLOORS) if level >= f)]


def flame_level(days):
    return 5 if days >= 100 else 4 if days >= 30 else 3 if days >= 14 else 2 if days >= 7 else 1 if days >= 3 else 0


def flame_run(day_offsets, quota=2):  # quota 2 = DEFAULT_WEEKLY_QUOTA in constants/weeklyTargets.ts
    """Lit days in a row ending today. Offsets are days before today (0 = today, 3 = three ago)."""
    if not day_offsets:
        return 0
    per_day = Counter(-o for o in day_offsets)  # day 0 = today, the past is negative

    def win(d):  # sessions in the seven days ending on d
        return sum(per_day.get(k, 0) for k in range(d - 6, d + 1))

    first = min(per_day)
    run = 0
    for d in range(first, 1):
        lit = win(d) >= quota or win(d - 7) >= quota
        run = run + 1 if lit else 0
    return run


# ---- the schedule ------------------------------------------------------------------------------

def make_days(n, flame, span, rng):
    """n distinct days (negative = past, last is 0) whose flame run ends today at `flame` days."""
    if flame == 0 or n == 0:
        return []
    start = -(flame - 1)
    if flame >= 60:  # the whole history is the run
        body = [round(start + (0 - start) * i / (n - 2)) for i in range(n - 1)]
        tail = [start - 3] + body
    else:
        m = max(2, math.ceil((flame - 1) / 3) + 1)
        tail = [start - 3] + sorted({round(start + (0 - start) * i / (m - 1)) for i in range(m)})
    tail = sorted(set(tail))
    assert len(tail) <= n, "tail longer than the history"
    old = n - len(tail)
    for gap in range(8, 45):
        days = list(tail)
        if old:
            top = tail[0] - gap
            step = (span - -top) / max(old - 1, 1)
            assert step >= 1, f"{old} sessions do not fit in {span} days"
            r = random.Random(rng.random())
            for i in range(old):
                days.append(round(top - i * step) + (r.choice([-1, 0, 1]) if 0 < i < old - 1 else 0))
            days = sorted(set(days))
            if len(days) != n:  # jitter collided: nudge into free days
                free = [d for d in range(min(days), 0) if d not in days]
                while len(days) < n:
                    days.append(free.pop(0))
                days = sorted(days)
        if len(days) == n and days[-1] == 0 and flame_run([-d for d in days]) == flame:
            return days
        if not old:
            break
    raise SystemExit(f"cannot place {n} sessions for a {flame}-day flame")


def split_weights(total, weights, fixed_last=None):
    """Integers following `weights` that sum to `total`; the last one pinned when asked."""
    pinned = fixed_last or 0
    body = weights[:-1] if fixed_last else weights
    scale = (total - pinned) / sum(body)
    out = [max(25, round(w * scale)) for w in body]
    out[max(range(len(out)), key=out.__getitem__)] += (total - pinned) - sum(out)
    return out + ([fixed_last] if fixed_last else [])


def second_entry(seq):
    """(index, course count) where course first holds 30 % of the sessions so far with >= 20 of them."""
    c = 0
    for i, p in enumerate(seq, 1):
        c += p == "course"
        if i >= 20 and c * 100 >= 30 * i:
            return i, c
    return None


def head_sequence(counts, first8, rng):
    """B's order: the opening eight, then a shuffle ending on course, redrawn until the cerf enters
    exactly on the last session (39/130), as the spec's example B says."""
    while True:
        rest = list((Counter(counts) - Counter(first8)).elements())
        rest.remove("course")
        rng.shuffle(rest)
        seq = first8 + rest + ["course"]
        if second_entry(seq) == (sum(counts.values()), counts["course"]):
            return seq


def tail_sequence(counts, last, rng):
    rest = list(counts.elements())
    rest.remove(last)
    rng.shuffle(rest)
    return rest + [last]


def uuid7(ms, rng):
    rand = rng.getrandbits(74)
    b = (ms << 80) | (0x7 << 76) | ((rand >> 62) << 64) | (0b10 << 62) | (rand & ((1 << 62) - 1))
    h = f"{b:032x}"
    return f"{h[:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:]}"


# ---- build -------------------------------------------------------------------------------------

def build(base, state, out):
    drop_last = state in AVANT
    spec = STATES[AVANT.get(state, state)]
    rng = random.Random(f"village-{state.removesuffix('-avant')}")
    shutil.copyfile(base, out)
    db = sqlite3.connect(out)
    db.execute("PRAGMA foreign_keys=ON")
    for t in ("gps_points", "completed_exercises", "boss_damage_log", "completed_sessions", "deleted_sessions"):
        db.execute(f"DELETE FROM {t}")
    db.execute("DELETE FROM user_preferences WHERE key LIKE 'streak\\_%' ESCAPE '\\' OR key='savedSession'")
    db.execute(
        "INSERT INTO user_preferences(key,value,updatedAt) VALUES('villageName',?,strftime('%s','now')) "
        "ON CONFLICT(key) DO UPDATE SET value=excluded.value", (spec["name"],))

    if "shown" in spec:
        db.execute(
            "INSERT INTO user_preferences(key,value,updatedAt) VALUES('bigFeastsShown',?,strftime('%s','now')) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value", (json.dumps(spec["shown"]),))
    else:
        db.execute("DELETE FROM user_preferences WHERE key='bigFeastsShown'")

    counts = spec["counts"]
    n = sum(counts.values())
    if n:
        days = make_days(n, spec["flame"], spec["span"], rng)
        first8 = spec["first8"]
        if "head" in spec:  # B's year (cerf enters on its last session), then the rest of the history
            seq = head_sequence(spec["head"], first8, rng) + tail_sequence(
                Counter(counts) - Counter(spec["head"]), spec["last"], rng)
        else:
            rest = list((Counter(counts) - Counter(first8)).elements())
            rest.remove(spec["last"]) if len(first8) < n else None
            rng.shuffle(rest)
            seq = first8 + rest + ([spec["last"]] if n > 8 else [])
        assert Counter(seq) == Counter(counts) and seq[-1] == spec["last"], "practice sequence drifted"
        factor = {"force": 1.0, "course": 1.1, "yoga": 0.8, "run": 1.0, "ride": 1.2}
        weights = [factor[p] * rng.uniform(0.75, 1.25) for p in seq]
        xps = split_weights(spec["xp"], weights, spec.get("last_xp"))
        qx = {}
        for q, e, o, tt, lo, hi in db.execute(
                "SELECT questId, exerciseId, sortOrder, targetType, targetMin, targetMax FROM quest_exercises"):
            qx.setdefault(q, []).append((e, o, tt, lo, hi))
        rounds = dict(db.execute("SELECT id, rounds FROM quests"))
        device = (db.execute("SELECT value FROM user_preferences WHERE key='deviceId'").fetchone() or [None])[0]
        today, now = date.today(), time.time()
        for i, (d, practice, xp) in enumerate(zip(days, seq, xps)):
            if d == 0:
                ts = int(now) - 300
            else:
                at = datetime.combine(today + timedelta(days=d), dtime(17 + rng.randrange(3), rng.randrange(60)))
                ts = int(at.timestamp())
            tz = time.localtime(ts).tm_gmtoff // 60
            level = "easy" if i < n * 0.4 else "medium" if i < n * 0.8 else "hard"
            outing = practice if practice in OUTING_QUEST else None
            if outing:
                moving = rng.randrange(1800, 3300) if outing == "run" else rng.randrange(2400, 5400)
                quest, dur = OUTING_QUEST[outing], moving + rng.randrange(0, 300)
                leagues = round(moving * (2.8 if outing == "run" else 6.1))
                ascent = rng.randrange(10, 150)
            else:
                moving = leagues = ascent = None
                pool = {"force": FORCE_QUESTS, "course": COURSE_QUESTS, "yoga": YOGA_QUESTS}[practice]
                quest = pool[rng.randrange(len(pool))]
                dur = rng.randrange(1200, 2700)
            cur = db.execute(
                "INSERT INTO completed_sessions(questId,userLevel,durationSeconds,xpEarned,notes,feedback,"
                "hasNewRecords,performedAt,uuid,leaguesM,movingSeconds,ascentM,outing,originDevice,tzOffsetMin)"
                " VALUES(?,?,?,?,'',?,0,?,?,?,?,?,?,?,?)",
                (quest, level, dur, xp, rng.choice(["easy", "good", "good", "hard"]), ts,
                 uuid7(ts * 1000, rng), leagues, moving, ascent, outing, device, tz))
            sid = cur.lastrowid
            for e, o, tt, lo, hi in qx[quest]:
                for r in range(1 if outing else rounds[quest]):
                    value = moving if outing else rng.randint(lo, hi)
                    db.execute(
                        "INSERT INTO completed_exercises(sessionId,exerciseId,roundIndex,sortOrder,resultType,"
                        "resultValue,targetType,targetValue,notes,performedAt) VALUES(?,?,?,?,?,?,?,?,'',?)",
                        (sid, e, r, o, tt, value, tt, rng.randint(lo, hi), min(ts + o * 90 + r * 240, int(now))))
        if drop_last:  # the unplayed session; completed_exercises follow by cascade
            db.execute("DELETE FROM completed_sessions WHERE id=(SELECT id FROM completed_sessions ORDER BY performedAt DESC LIMIT 1)")
    db.commit()
    db.execute("PRAGMA journal_mode=DELETE")
    verify(db, state, spec, drop_last)
    db.close()


# ---- self-check: read the finished file back through SQL, trust nothing from the generator ------

PRACTICE_SQL = """
SELECT s.performedAt, s.xpEarned, s.outing, COALESCE(s.movingSeconds, s.durationSeconds),
  (SELECT e.style FROM completed_exercises ce JOIN exercises e ON e.id = ce.exerciseId
    WHERE ce.sessionId = s.id GROUP BY e.style ORDER BY COUNT(*) DESC,
      CASE e.style WHEN 'strength' THEN 0 WHEN 'calisthenics' THEN 1 WHEN 'yoga' THEN 2 ELSE 3 END LIMIT 1)
FROM completed_sessions s ORDER BY s.performedAt, s.id"""


def practices(db):
    """(practice, performedAt, xp) per session, by the rule of the spec; None = does not count."""
    out = []
    for at, xp, outing, secs, style in db.execute(PRACTICE_SQL):
        if outing:
            p = None if (secs or 0) < 600 else "vélo" if outing == "ride" else "course"
        else:
            p = STYLE_PRACTICE[style]
        out.append((p, at, xp))
    return out


def verify(db, state, spec, drop_last):
    rows = practices(db)
    uuids = [u for (u,) in db.execute("SELECT uuid FROM completed_sessions ORDER BY performedAt, id")]
    counts = Counter(p for p, _, _ in rows)
    want = Counter({("vélo" if k == "ride" else "course" if k == "run" else k): v
                    for k, v in spec["counts"].items()})
    xp = sum(x for _, _, x in rows)
    if drop_last:
        want[spec["last"]] -= 1
        left = spec["xp"] - spec["last_xp"]  # b-avant sits one level under b: the session crosses it
        spec = {**spec, "xp": left, "level": level_of(left), "tier": tier_of(level_of(left))}
    want = +want
    assert counts == want, f"{state}: practices {dict(counts)} != {dict(want)}"
    assert xp == spec["xp"], f"{state}: xp {xp} != {spec['xp']}"
    level = level_of(xp)
    assert level == spec["level"], f"{state}: level {level} != {spec['level']}"
    assert tier_of(level) == spec["tier"], f"{state}: tier {tier_of(level)} != {spec['tier']}"
    today = date.today()
    offsets = [(today - datetime.fromtimestamp(at).date()).days for _, at, _ in rows]
    run = flame_run(offsets)
    want_run = spec["flame"] if rows else 0
    assert run == want_run, f"{state}: flame {run} != {want_run}"
    assert len(set(offsets)) == len(offsets), f"{state}: two sessions on one day"
    assert max(at for _, at, _ in rows) <= time.time() if rows else True, f"{state}: session in the future"
    late = db.execute("SELECT COUNT(*) FROM completed_exercises WHERE performedAt > ?", (int(time.time()),)).fetchone()[0]
    assert late == 0, f"{state}: {late} exercises in the future"
    first8 = Counter(p for p, _, _ in rows[:8])
    animal = first8.most_common(1)[0][0] if first8 else None
    if state.startswith("sanglier"):
        assert max(first8.values()) < 4, f"{state}: a practice has 4 of the first 8: {dict(first8)}"
        last = {p: max(at for q, at, _ in rows if q == p) for p in ("course", "yoga")}
        assert last["course"] > last["yoga"], f"{state}: course must be more recent than yoga"
    elif rows:
        expect = "course" if state == "e" else "force"
        assert animal == expect and first8[expect] > len(rows[:8]) / 2, f"{state}: first 8 {dict(first8)}, wanted {expect}"
    if "head" in spec:  # the cerf must enter during B's year and stay, though C ends at 17 %
        order = [p for p, _, _ in sorted(((p, at, u) for (p, at, _), u in zip(rows, uuids)), key=lambda r: (r[1], r[2]))]
        hit = second_entry(order)
        assert hit, f"{state}: course never reaches 30 % with 20 sessions"
        assert counts["course"] == 70 and len(rows) == 416, f"{state}: course {counts['course']}/{len(rows)} != 70/416"
        print(f"{state}: cerf enters at session {hit[0]} with course={hit[1]}, ends {counts['course']}/{len(rows)}")
    name = db.execute("SELECT value FROM user_preferences WHERE key='villageName'").fetchone()[0]
    assert name == spec["name"], f"{state}: villageName {name}"
    shown = db.execute("SELECT value FROM user_preferences WHERE key='bigFeastsShown'").fetchone()
    assert (json.loads(shown[0]) if shown else None) == spec.get("shown"), f"{state}: bigFeastsShown {shown}"
    assert not db.execute("SELECT 1 FROM user_preferences WHERE key LIKE 'streak%' OR key='savedSession'").fetchall()
    assert not [r for r in db.execute("PRAGMA foreign_key_check") if r[0] in ("completed_exercises", "completed_sessions")]
    print(f"{state}: OK  sessions={len(rows)} {dict(counts)} xp={xp} level={level} tier={tier_of(level)!r} "
          f"flame={run}j ({FLAME_NAMES[flame_level(run)] or 'éteinte'}) first8={dict(first8)} name={name!r}")


if __name__ == "__main__":
    if len(sys.argv) != 4 or (sys.argv[2] not in STATES and sys.argv[2] not in AVANT):
        sys.exit(f"usage: {sys.argv[0]} <base.db> <{'|'.join([*STATES, *AVANT])}> <out.db>")
    if os.path.abspath(sys.argv[1]) == os.path.abspath(sys.argv[3]):
        sys.exit("refusing to overwrite the base database")
    build(*sys.argv[1:])
