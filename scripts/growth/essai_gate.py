#!/usr/bin/env python3
"""One trial of the placement: poser.py, a build, the atelier's check on the tiers asked (default stage), the lines lire_gate.py reads.

    essai_gate.py 12        tier 12 only
"""
import glob
import os
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
CHK = ROOT / "docs/designs/village/growth/scratch/fixe4/chk"


def run(cmd):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if r.returncode and "GATE FAILED" not in r.stdout:
        print(r.stdout[-1500:], r.stderr[-1500:])
        sys.exit(1)
    return r.stdout


def main():
    tiers = sys.argv[1]
    run(["python3", "scripts/growth/poser.py"])
    run(["npx", "biome", "check", "--write", "components/village/iso/piecesPosees.ts", "components/village/iso/piecesImages.ts"])
    (ROOT / "node_modules/.cache/atelier-web/.empreinte").unlink(missing_ok=True)
    run(["node", "scripts/atelier/atelier.js", "render", "--tier", "1", "--out", str(CHK / "tmp")])
    run(["node", "scripts/atelier/atelier.js", "check", "--tier", tiers, "--light", "jour", "--no-build", "--out", str(CHK)])
    f = max(glob.glob(str(CHK / "check-*.json")), key=os.path.getmtime)
    print(run(["python3", "scripts/growth/lire_gate.py", f]))


if __name__ == "__main__":
    main()
