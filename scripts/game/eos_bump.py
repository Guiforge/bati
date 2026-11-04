#!/usr/bin/env python3
"""Puts a blank-ish test hero just under rank 2 of its most trained muscle, so its next session raises a building.

Usage: eos_bump.py <local copy of bati.v3.db>. Run by scripts/game/village-eos.sh on a copy pulled
from an emulator's dev build, never on a real hero's data. A hero gets 100 reps of a muscle in about
ten beginner sessions; a flow can't walk those.
"""
import sqlite3
import sys

RANG_2 = 100
MARGE = 8  # the next session gives each muscle well over this, even for a beginner

db = sqlite3.connect(sys.argv[1])
db.execute("PRAGMA wal_checkpoint(TRUNCATE)")
muscle, total, ligne = db.execute(
    """select m.muscle, sum(c.resultValue), max(c.id)
       from completed_exercises c join exercise_muscles m on m.exerciseId = c.exerciseId
       where c.resultType = 'reps'
       group by m.muscle order by 2 desc limit 1"""
).fetchone()
assert total < RANG_2 - MARGE, f"{muscle} already at {total} reps: not a blank hero"
ajout = RANG_2 - MARGE - total
db.execute("update completed_exercises set resultValue = resultValue + ? where id = ?", (ajout, ligne))
db.commit()
db.execute("PRAGMA journal_mode=DELETE")
db.close()
print(f"{muscle}: {total} -> {total + ajout} reps")
