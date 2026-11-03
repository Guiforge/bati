#!/usr/bin/env python3
"""Vertical seam on the shaft of a maquette: the largest column-to-column jump of the row-averaged brightness over the shaft
band, for each stage, round 2 against round 3, and a before/after crop. Reads only; writes the crop next to the new maquettes.

    python3 scripts/bld/seam_check.py
"""
import json
import pathlib

from PIL import Image

R1 = pathlib.Path("/home/guiforge/Documents/code/bati/.claude/worktrees/iso/docs/designs/village-buildings/windmill/r1")
STAGES = ["rough", "solid", "grand", "legendary", "mythic"]
BAND = (840, 940)  # rows of the plain shaft, below the roof edge and above the door, at x 330..560


def worst_jump(path):
    im = Image.open(path).convert("L")
    best = (0, 0)
    for x in range(330, 560):
        d = []
        for y in range(*BAND):
            a, b = im.getpixel((x, y)), im.getpixel((x + 1, y))
            if im.getpixel((x, y)) and a not in (0,) and b not in (0,):
                d.append(abs(a - b))
        if d and sum(d) / len(d) > best[0]:
            best = (round(sum(d) / len(d), 2), x)
    return {"jump": best[0], "x": best[1]}


def main():
    out = {s: {"avant": worst_jump(R1 / "sondes2/maquettes" / f"{s}.peinture.png"),
               "apres": worst_jump(R1 / "sondes3/maquettes" / f"{s}.peinture.png")} for s in STAGES}
    pair = Image.new("RGB", (900, 600), (255, 0, 255))
    for i, d in enumerate(("sondes2", "sondes3")):
        pair.paste(Image.open(R1 / d / "maquettes/solid.peinture.png").convert("RGB").crop((300, 400, 750, 1000)), (i * 450, 0))
    dst = R1 / "sondes3/coupe_fut_avant_apres.png"
    if not dst.exists():
        pair.save(dst)
    (R1 / "sondes3/fut.json").write_text(json.dumps(out, indent=2))
    print(json.dumps(out))


if __name__ == "__main__":
    main()
