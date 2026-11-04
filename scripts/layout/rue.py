#!/usr/bin/env python3
"""Applies one of the two street options of L8 to constants/isoLayout.json (sol, `rue`, then paliers).

    python3 scripts/layout/rue.py nord     # the street crosses the river by a second bridge at [2, 2] and climbs gx 0 to the forest
    python3 scripts/layout/rue.py ouest    # the street keeps the one bridge at [2, 10] and climbs the west bank along gx -4

Both start at the south gate, cross the fire square and meet the existing roads; they differ after
the square. The other option's cells go back to grass (or water for a bridge). Ranks, widths and
stones come from the existing `classeDe` (by distance to the fire), so the street never outshines
the square. The island's tiers are rewritten (`paliers.py`).
"""
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
P = ROOT / "constants/isoLayout.json"

# Cells that are path, by option; (2, 2) is the bridge of `nord`.
NORD = [(9, 3), (10, 3), (3, 2), (2, 2), (1, 2), (0, 2)] + [(0, y) for y in range(1, -4, -1)] + [(-1, -3)] + [(-1, y) for y in range(-4, -9, -1)]
OUEST = [(-4, y) for y in range(-5, -9, -1)]
PONTS = {(2, 2)}
PALIER_RUE = 5


def main():
    option = sys.argv[1]
    cells = {"nord": NORD, "ouest": OUEST}[option]
    autre = {"nord": OUEST, "ouest": NORD}[option]
    L = json.loads(P.read_text())
    D = L["debut"]
    sol = [list(r) for r in L["sol"]]

    def put(c, ch):
        sol[c[1] - D][c[0] - D] = ch

    for c in autre:
        put(c, "~" if c in PONTS else ".")
    for c in cells:
        put(c, "=" if c in PONTS else "#")
    L["sol"] = ["".join(r) for r in sol]
    L["rue"] = {"option": option, "palier": PALIER_RUE, "cases": [list(c) for c in cells]}
    P.write_text(json.dumps(L, indent=2, ensure_ascii=False) + "\n")
    subprocess.run([sys.executable, str(ROOT / "scripts/layout/paliers.py")], check=True)
    print("street:", option)


if __name__ == "__main__":
    main()
