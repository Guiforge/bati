#!/usr/bin/env python3
"""Measures several one-building nudges at tier 12 (tallest stage): essais.py code=gx,gy [code=gx,gy ...]; each one alone, file restored.
Prints, for each, the hook list (covered %) and the counts under the thresholds. Slow: one build per nudge."""
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
P = ROOT / "constants/isoLayout.json"
orig = P.read_text()
try:
    for a in sys.argv[1:]:
        code, xy = a.split("=")
        L = json.loads(orig)
        L["batiments"][code] = [int(v) for v in xy.split(",")]
        P.write_text(json.dumps(L, indent=2, ensure_ascii=False) + "\n")
        subprocess.run(["python3", "scripts/layout/paliers.py"], cwd=ROOT, capture_output=True)
        r = subprocess.run(["scripts/layout/mesure12.sh"], cwd=ROOT, capture_output=True, text=True).stdout
        h = re.findall(r"^  (\w+ \w+): ([\d.]+) % covered", r, re.M)
        o = re.findall(r"GATE (?:props|hooks|occlusion): (\d+) of", r)
        print(a, "| occ/props/hooks:", o, "|", ", ".join(f"{n} {p}" for n, p in h), flush=True)
finally:
    P.write_text(orig)
    subprocess.run(["python3", "scripts/layout/paliers.py"], cwd=ROOT, capture_output=True)
