#!/usr/bin/env python3
"""Lists the path cells of the south gate window (crop `porte`, tiles 11..23 x 12..24) visible at tier 6 now but not in the old layout."""
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[2]
LET = "123456789abc"
new = json.loads((ROOT / "constants/isoLayout.json").read_text())
old = json.loads(subprocess.run(["/usr/bin/git", "show", "85d449d1f~1:constants/isoLayout.json"], cwd=ROOT, capture_output=True, text=True, check=True).stdout)


def vis(L, x, y, t, d):
    c = L["paliers"][y - d][x - d]
    return c != "-" and LET.index(c) + 1 <= t


for y in range(12, 20):
    for x in range(11, 20):
        s = new["sol"][y - new["debut"]][x - new["debut"]]
        if s in "#=" and vis(new, x, y, 6, new["debut"]) and not vis(old, x, y, 6, 0):
            print("new path cell visible at tier 6:", x, y)
