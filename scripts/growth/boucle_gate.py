#!/usr/bin/env python3
"""G11: the atelier's `props` gate as a loop. A painted piece under 50 % visible is dropped (scripts/growth/poser_drops.json, with the reason),
the table is written again, the atelier rebuilds and checks again; stops when none is left or after N rounds.

    boucle_gate.py <rounds> <tiers, comma separated> [query]    rounds 0: report only, drops nothing

A piece hidden by another piece waits until the other one is settled (the hider may be the one to go). The hooks are read by hand."""
import glob
import json
import os
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
CHK = ROOT / "docs/designs/village/growth/scratch/fixe2/chk"
DROPS = ROOT / "scripts/growth/poser_drops.json"
STAMP = ROOT / "node_modules/.cache/atelier-web/.empreinte"


def run(cmd):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if r.returncode and "GATE FAILED" not in r.stdout:
        print(r.stdout[-1500:], r.stderr[-1500:])
        sys.exit(1)
    return r.stdout


def failing(tiers, query):
    cmd = ["node", "scripts/atelier/atelier.js", "check", "--tier", tiers, "--light", "jour", "--no-build", "--out", str(CHK)]
    if query:
        cmd += ["--query", query]
    run(cmd)
    d = json.load(open(max(glob.glob(str(CHK / "check-*.json")), key=os.path.getmtime)))
    bad = {}
    for t in d["paliers"]:
        props = sorted((r for r in t["rangs"] if r["tid"].startswith("iso-accessoire-")), key=lambda r: r["idx"])
        for r, a in zip(props, t["accessoires"], strict=False):
            if a["nom"].startswith("piece_") and a["visible"] < 0.5:
                key = (a["nom"], r["tuile"][0], r["tuile"][1])
                prev = bad.get(key)
                if not prev or a["visible"] < prev[0]:
                    bad[key] = (a["visible"], t["tier"], a["pire"])
    return bad


def main():
    rounds, tiers = int(sys.argv[1]), sys.argv[2]
    query = sys.argv[3] if len(sys.argv) > 3 else None
    drops = json.loads(DROPS.read_text()) if DROPS.exists() else []
    for n in range(max(rounds, 1)):
        run(["python3", "scripts/growth/poser.py"])
        run(["npx", "biome", "check", "--write", "components/village/iso/piecesPosees.ts", "components/village/iso/piecesImages.ts"])
        STAMP.unlink(missing_ok=True)
        run(["node", "scripts/atelier/atelier.js", "render", "--tier", "1", "--out", str(CHK / "tmp")])  # builds
        bad = failing(tiers, query)
        print(f"round {n}: {len(bad)} pieces under 50 %")
        for k, v in bad.items():
            print("   ", k, f"{v[0] * 100:.0f} % at tier {v[1]}", v[2][:2])
        if not bad or rounds == 0:
            break
        names = {k[0] for k in bad}
        pick = {k: v for k, v in bad.items() if not v[2] or not (v[2][0][0].replace("iso-accessoire-", "") in names)}
        if not pick:
            worst = min(bad, key=lambda k: bad[k][0])
            pick = {worst: bad[worst]}
        for (nom, cx, cy), (vis, tier, pire) in pick.items():
            drops.append([nom, cx, cy, f"under 50 % visible ({vis * 100:.0f} % at tier {tier}, by {pire[0][0] if pire else '?'})"])
            print("  drop", nom, cx, cy, f"{vis * 100:.0f} %", tier)
        DROPS.write_text(json.dumps(drops, indent=1) + "\n")


if __name__ == "__main__":
    main()
