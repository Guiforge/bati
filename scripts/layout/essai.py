#!/usr/bin/env python3
"""Tries a position change on a copy of the plan, renders tier 12 (and tier 1), checks tier 12 at its tallest stages, then restores the file.

    python3 scripts/layout/essai.py NOM code=gx,gy [code=gx,gy ...]

Writes docs/designs/village/layout/img/prop-NOM-t12.jpg and prop-NOM-t1.jpg, prints the gate line of tier 12 and the worst
visible percentages (read from the check, not assumed). The plan's file is always put back.
"""
import json
import pathlib
import re
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
P = ROOT / "constants/isoLayout.json"
nom = sys.argv[1]
orig = P.read_text()


def rendre(tier, fichier, build):
    tmp = tempfile.mkdtemp()
    args = ["node", "scripts/atelier/atelier.js", "render", "--tier", str(tier), "--light", "jour", "--out", tmp]
    if not build:
        args.append("--no-build")
    subprocess.run(args, cwd=ROOT, capture_output=True)
    png = next(pathlib.Path(tmp).glob("*.png"))
    subprocess.run(["magick", str(png), "-resize", "1080x", "-quality", "85", str(ROOT / "docs/designs/village/layout/img" / fichier)], check=True)


try:
    L = json.loads(orig)
    for a in sys.argv[2:]:
        code, xy = a.split("=")
        L["batiments"][code] = [int(v) for v in xy.split(",")]
    P.write_text(json.dumps(L, indent=2, ensure_ascii=False) + "\n")
    subprocess.run(["python3", "scripts/layout/paliers.py"], cwd=ROOT, check=True, capture_output=True)
    rendre(12, f"prop-{nom}-t12.jpg", True)
    rendre(1, f"prop-{nom}-t1.jpg", False)
    r = subprocess.run(["node", "scripts/atelier/atelier.js", "check", "--tier", "12", "--light", "jour", "--query", "haut=1", "--no-build"], cwd=ROOT, capture_output=True, text=True).stdout
    print(nom, re.findall(r"^GATE (?:occlusion|FAILED)[^\n]*", r, re.M))
    print(re.findall(r"^  [a-z_]+ +[\d.]+ %", r.split("GATE anchors")[0], re.M)[:6])
finally:
    P.write_text(orig)
