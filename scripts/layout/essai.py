#!/usr/bin/env python3
"""Tries a position change on a copy of the plan, renders tier 1 and checks tier 12, then restores the file.

    python3 scripts/layout/essai.py NOM OUT_DIR code=gx,gy [code=gx,gy ...]

Prints the tier 12 occlusion lines. Writes OUT_DIR/NOM-t1.png. The plan's file is always put back.
"""
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
P = ROOT / "constants/isoLayout.json"
nom, out = sys.argv[1], pathlib.Path(sys.argv[2])
orig = P.read_text()
try:
    L = json.loads(orig)
    for a in sys.argv[3:]:
        code, xy = a.split("=")
        L["batiments"][code] = [int(v) for v in xy.split(",")]
    P.write_text(json.dumps(L, indent=2, ensure_ascii=False) + "\n")
    subprocess.run(["python3", "scripts/layout/paliers.py"], cwd=ROOT, check=True, capture_output=True)
    out.mkdir(parents=True, exist_ok=True)
    subprocess.run(["node", "scripts/atelier/atelier.js", "render", "--tier", "1", "--light", "jour", "--out", str(out / "r1")], cwd=ROOT, capture_output=True)
    for f in (out / "r1").glob("*.png"):
        f.rename(out / f"{nom}-t1.png")
    r = subprocess.run(["node", "scripts/atelier/atelier.js", "check", "--tier", "12", "--light", "jour", "--no-build"], cwd=ROOT, capture_output=True, text=True).stdout
    print(nom, re.findall(r"GATE occlusion[^\n]*", r), re.findall(r"^  (?:\w+) +[\d.]+ %", r.split("GATE anchors")[0], re.M)[:3])
finally:
    P.write_text(orig)
