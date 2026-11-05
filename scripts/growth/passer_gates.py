#!/usr/bin/env python3
"""The atelier's check on the 12 tiers, by day, default stage then `haut=1`: scratch/fixe3/chk/{default,haut}.txt and .json.

    passer_gates.py            both
    passer_gates.py default    or haut
"""
import glob
import os
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
CHK = ROOT / "docs/designs/village/growth/scratch/fixe3/chk"
TIERS = "1,2,3,4,5,6,7,8,9,10,11,12"


def main():
    for nom, query in (("default", None), ("haut", "haut=1")):
        if len(sys.argv) > 1 and nom not in sys.argv[1:]:
            continue
        cmd = ["node", "scripts/atelier/atelier.js", "check", "--tier", TIERS, "--light", "jour", "--no-build", "--out", str(CHK)]
        if query:
            cmd += ["--query", query]
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
        (CHK / f"{nom}.txt").write_text(r.stdout + r.stderr)
        shutil.copy(max(glob.glob(str(CHK / "check-*.json")), key=os.path.getmtime), CHK / f"{nom}.json")
        print(nom, "done:", r.stdout.strip().splitlines()[-1][:200])


if __name__ == "__main__":
    main()
