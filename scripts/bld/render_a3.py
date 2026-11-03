#!/usr/bin/env python3
"""Renders the observatory mythic A3 variants (a, b, c) and the pilot mythic as the footprint reference.

    scripts/iso/team/heavy.sh python3 scripts/bld/render_a3.py [a b c]

Into docs/designs/village-buildings/observatory/A3/ (ignored by git), per variant x:
    x.png            colour on the neutral ground
    x.sil.png        black silhouette, no slab and no stand-in (as render_pilot.py)
    x.96.png         the same at 96 dp, blurred 1 dp
    x.report.json    top y, hauteurMax, parts outside the footprint, footprint IoU and anchor against the pilot mythic
Scratch goes to ~/.cache/bati-buildings/a3. One Blender run at a time. Files that exist are overwritten.
"""

import json
import sys

import render_pilot as R
from PIL import Image

T, L = R.T, R.L
SPECS = R.ROOT / "scripts" / "iso" / "blockouts" / "bld"
OUT = R.ROOT / "docs" / "designs" / "village-buildings" / "observatory" / "A3"
WORK = R.CACHE / "a3"


def main(argv=None) -> int:
    letters = (argv if argv is not None else sys.argv[1:]) or list("abc")
    OUT.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)
    ref = WORK / "pilot_mythic.rgba.png"
    if not ref.exists():
        L.blender(SPECS / "pilote" / "observatory_mythic.json", ref, socle_shadow=False)
    ref_mask, ref_anchor = T.contact(ref)
    for x in letters:
        spec_path = SPECS / "a3" / f"observatory_mythic_A3{x}.json"
        spec = json.loads(spec_path.read_text())
        rgba = WORK / f"{x}.rgba.png"
        info = L.blender(spec_path, rgba, socle_shadow=False)
        report = R.check(spec, info)
        mask, anchor = T.contact(rgba)
        report["footprintIoU"] = round(T.A.iou(mask, ref_mask), 4)
        report["anchor"], report["pilotAnchor"] = list(anchor), list(ref_anchor)
        report["anchorJson"] = info["anchor"]
        box = Image.open(rgba).convert("RGBA").getchannel("A").point(lambda v: 255 if v >= 128 else 0).getbbox()
        report["bbox"], report["topY"] = list(box), box[1]
        T.flat(rgba).save(OUT / f"{x}.png", optimize=True)
        bare = dict(spec, parts=[p for p in spec["parts"] if not (p.get("_plate") or p.get("_marker"))])
        (WORK / f"{x}.bare.json").write_text(json.dumps(bare))
        L.blender(WORK / f"{x}.bare.json", WORK / f"{x}.bare.rgba.png", socle_shadow=False)
        T.silhouette(WORK / f"{x}.bare.rgba.png", str(OUT / x))
        (OUT / f"{x}.report.json").write_text(json.dumps(report, indent=1) + "\n")
        print(x, json.dumps(report))
    return 0


if __name__ == "__main__":
    sys.exit(main())
