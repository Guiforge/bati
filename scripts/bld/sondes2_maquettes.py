#!/usr/bin/env python3
"""Windmill r1 probes, round 2, step A: the five painting maquettes with the round-2 fixes, never overwritten.

    python3 scripts/bld/sondes2_maquettes.py

Writes windmill/r1/sondes2/maquettes/<stage>.peinture.png, <stage>.mask.png (slab footprint) and, for the mythic, the
silhouette (with its sails at 45 degrees) and its 96 dp blur for G-ID; maquettes.json holds footprint hash and top heights.
"""
import colorsys
import hashlib
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import render_cartes as RC  # noqa: E402
import maquette_peinture as M  # noqa: E402
from PIL import Image  # noqa: E402

R1 = pathlib.Path("/home/guiforge/Documents/code/bati/.claude/worktrees/iso/docs/designs/village-buildings/windmill/r1")
OUT = R1 / (sys.argv[1] if len(sys.argv) > 1 else "sondes2") / "maquettes"  # the round folder, e.g. sondes3
STAGES = ["rough", "solid", "grand", "legendary", "mythic"]
CARD_Z = {"rough": 1.7, "solid": 2.32, "grand": 2.88, "legendary": 3.17, "mythic": 4.34}  # cap top; mythic: top of the shard
TOP_Y = {s: round(1087 - 235 * z) for s, z in CARD_Z.items()}  # (1,1,0) projects to y 1087; 235 px per unit of z


def top_of(im):
    return Image.eval(M.ImageChops.difference(im.convert("RGB"), Image.new("RGB", im.size, M.MAGENTA)).convert("L"), lambda v: 255 if v > 60 else 0).getbbox()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rep, masks = {}, {}
    b = RC.Building("windmill", [], OUT)
    b.load()
    for s in STAGES:
        pe, mk = OUT / f"{s}.peinture.png", OUT / f"{s}.mask.png"
        if pe.exists():
            sys.exit(f"{pe} exists: never overwritten")
        im = M.render(f"pilote/windmill_{s}", pe, mk)
        bb = top_of(im)
        masks[s] = hashlib.sha1(mk.read_bytes()).hexdigest()[:10]
        rep[s] = {"bbox": list(bb), "top_y": bb[1], "card_top_y": TOP_Y[s], "delta_px": bb[1] - TOP_Y[s],
                  "footprint_bbox": list(Image.open(mk).getbbox()), "footprint_sha": masks[s]}
    rep["footprint_identical"] = len(set(masks.values())) == 1
    import math
    im = Image.open(OUT / "mythic.peinture.png").convert("RGB").crop((0, 0, im_w := 896, 330))
    hs = [colorsys.rgb_to_hsv(*(c / 255 for c in p)) for p in im.getdata() if p != (255, 0, 255)]
    hs = [h for h in hs if h[2] > 0.3]
    rep["mythic_peak"] = {"pixels": len(hs), "mean_hue_deg": round(math.degrees(math.atan2(sum(math.sin(2 * math.pi * h) for h, _, _ in hs), sum(math.cos(2 * math.pi * h) for h, _, _ in hs))) % 360, 1),
                          "mean_saturation": round(sum(s for _, s, _ in hs) / len(hs), 3)}
    # mythic silhouette with its sails at 45 degrees, and its 96 dp blur
    full = b.compose("mythic", RC.WM_SHEET["mythic"], [])
    RC.T.silhouette_of(RC.mask(full), str(OUT / "mythic"))
    (OUT / "maquettes.json").write_text(json.dumps(rep, indent=2))
    print(json.dumps(rep, indent=1))


if __name__ == "__main__":
    main()
