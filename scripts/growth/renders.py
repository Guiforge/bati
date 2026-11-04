#!/usr/bin/env python3
"""The village at every tier on ONE fixed camera, so what grows outside the walls can be compared, and how much changes.
    renders.py render   atelier renders into scratch/fixe/ (tiers 1 to 12 by day, 3 6 9 12 by night)
    renders.py mesure   mean difference between neighbouring tiers, per zone off the island"""
import pathlib
import subprocess
import sys

from PIL import Image, ImageChops, ImageStat

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
D = ROOT / "docs/designs/village/growth/scratch"
FIXE = D / "fixe"
QUERY = "foyer=campfire&zoom=0.45"
# Off the island in the fixed 1080 px frame; the island itself is a player matter.
ZONES = {"nord": (0, 500, 1080, 900), "sud": (0, 1400, 1080, 2100), "ouest": (0, 900, 120, 1400), "est": (960, 900, 1080, 1400)}


def render(tier, light):
    out = subprocess.run(["node", "scripts/atelier/atelier.js", "render", "--tier", str(tier), "--light", light, "--no-build", "--query", QUERY],
                         cwd=ROOT, capture_output=True, text=True, check=True, timeout=120).stdout.strip().splitlines()[-1]
    pathlib.Path(out).replace(FIXE / f"t{tier}-{light}.png")


def mesure():
    ims = {t: Image.open(FIXE / f"t{t}-jour.png").convert("L") for t in range(1, 13)}
    for name, box in ZONES.items():
        row = [f"{t}>{t + 1} {ImageStat.Stat(ImageChops.difference(ims[t].crop(box), ims[t + 1].crop(box))).mean[0]:.1f}" for t in range(1, 12)]
        print(name, "  ".join(row))


if __name__ == "__main__":
    FIXE.mkdir(parents=True, exist_ok=True)
    if sys.argv[1] == "render":
        for t in range(1, 13):
            render(t, "jour")
        for t in (3, 6, 9, 12):
            render(t, "nuit")
    mesure()
