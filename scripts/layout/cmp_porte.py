#!/usr/bin/env python3
"""Path cells of the south gate area (x 0..19, y 10..19) visible at tiers 4 to 6 now but not in the old layout, and the lost ones; then the bottom half's brightness in crops/monde-porte-*.png if present."""
import json
import pathlib
import subprocess

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
LET = "123456789abc"
new = json.loads((ROOT / "constants/isoLayout.json").read_text())
old = json.loads(subprocess.run(["/usr/bin/git", "show", "85d449d1f~1:constants/isoLayout.json"], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
D = new["debut"]


def vis(L, x, y, t, d):
    c = L["paliers"][y - d][x - d]
    return c != "-" and LET.index(c) + 1 <= t


for T in (4, 5, 6):
    for y in range(10, 20):
        for x in range(0, 20):
            s = new["sol"][y - D][x - D]
            if s in "#=" and vis(new, x, y, T, D) and not vis(old, x, y, T, 0):
                print(f"tier {T}: path cell visible now, not before: {x},{y}")
            if s in "#=" and vis(old, x, y, T, 0) and not vis(new, x, y, T, D):
                print(f"tier {T}: path cell visible before, not now: {x},{y}")
d = ROOT / "docs/designs/village/layout-proposition/scratch/crops"
if (d / "monde-porte-avant.png").exists():
    a = np.asarray(Image.open(d / "monde-porte-avant.png").convert("L")).astype(float)
    b = np.asarray(Image.open(d / "monde-porte-apres.png").convert("L")).astype(float)
    h = a.shape[0] // 2
    print("bottom half (fields, road): mean luminance before", a[h:].mean().round(2), "after", b[h:].mean().round(2), "mean abs diff", abs(a[h:] - b[h:]).mean().round(2))
