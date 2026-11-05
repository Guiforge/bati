#!/usr/bin/env python3
"""The fixed camera (foyer=campfire zoom 0.45) at the tiers asked, through the atelier: scratch/fixe2/t<N>-<jour|nuit>.png.

    rendre_fixe.py jour 1 2 3 ...     the first call builds, the others reuse the build
    rendre_fixe.py nuit 3 6 9 12
"""
import pathlib
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
OUT = ROOT / "docs/designs/village/growth/scratch/fixe4"
TMP = OUT / "tmp"


def main():
    lum, tiers = sys.argv[1], sys.argv[2:]
    TMP.mkdir(parents=True, exist_ok=True)
    # the atelier's build stamp reads the diff and the names of untracked files, never their content: a regenerated table would not rebuild
    (ROOT / "node_modules/.cache/atelier-web/.empreinte").unlink(missing_ok=True)
    for n, t in enumerate(tiers):
        cmd = ["node", "scripts/atelier/atelier.js", "render", "--tier", t, "--light", lum, "--query", "foyer=campfire&zoom=0.45", "--out", str(TMP)]
        if n or "--no-build" in sys.argv:
            cmd.append("--no-build")
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
        if r.returncode:
            print(r.stdout[-800:], r.stderr[-1500:])
            sys.exit(1)
        png = sorted(TMP.glob(f"render-t{t}-{lum}-*.png"), key=lambda p: p.stat().st_mtime)[-1]
        shutil.copy(png, OUT / f"t{t}-{lum}.png")
        print("ok", t, lum)


if __name__ == "__main__":
    main()
