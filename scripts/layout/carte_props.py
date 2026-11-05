#!/usr/bin/env python3
"""Prints the plan as text with plots (letters), streets, water and props (digits): carte_props.py [x0 x1 y0 y1]"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
L = json.loads((ROOT / "constants/isoLayout.json").read_text())
S = json.loads((ROOT / "constants/isoSpec.json").read_text())["batiments"]
S.pop("_doc")
D = L["debut"]
g = [list(r) for r in L["sol"]]
for c, (x, y) in L["batiments"].items():
    w, d = S[c]["emprise"]
    for i in range(w):
        for j in range(d):
            g[y + j - D][x + i - D] = c[0].upper()
props = {}
src = (ROOT / "components/village/iso/alentours.ts").read_text()
for k, m in enumerate(re.finditer(r'\{ nom: "(\w+)", case: \[(-?\d+), (-?\d+)\]([^}\n]*)\}', src)):
    if "hors" in m.group(4):
        continue
    x, y = int(m.group(2)), int(m.group(3))
    props[(x, y)] = m.group(1)
    g[y - D][x - D] = str(len(props) % 10)
x0, x1, y0, y1 = (int(a) for a in sys.argv[1:5]) if len(sys.argv) > 4 else (D, 19, D, 19)
print("    " + "".join(str(abs(x) % 10) for x in range(x0, x1 + 1)))
for y in range(y0, y1 + 1):
    print(f"{y:3d} " + "".join(g[y - D][x - D] for x in range(x0, x1 + 1)))
for i, ((x, y), n) in enumerate(props.items(), 1):
    print(i % 10, n, (x, y), end="; ")
print()
