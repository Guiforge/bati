#!/usr/bin/env python3
"""Render the painting references of gen_peinture.py (T36 lots D, F, G) with their exports, fit their scale, make the sheets.

    scripts/iso/team/heavy.sh python3 scripts/iso/blockouts/render_peinture.py render [slug ...]
    python3 scripts/iso/blockouts/render_peinture.py sheet                              # no Blender

`render` runs stage_exports.export on each `peinture/<slug>` (render, masks, anchor, shadow, volumes,
points) into renders/peinture/; the mock-up webp goes to renders/peinture-maquettes/, never to assets/.
`sheet` writes one board per lot in docs/designs/village-iso-v1/evidence/T36/blockouts/ and prints the fill table.
"""

import json
import pathlib
import sys

from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "exports"))
sys.path.insert(0, str(HERE.parent))
import isolib as L  # noqa: E402
import stage_exports as X  # noqa: E402

R = L.RENDERS / "peinture"
EVID = L.ROOT / "docs/designs/village-iso-v1/evidence/T36/blockouts"
LOTS = {
    "D-villageois": ["villageois_%s_face" % r for r in ("smith", "watcher", "sage", "champion", "herbalist", "minstrel", "farmer")],
    "G-animaux": ["animal_chat_%s" % p for p in ("dort", "assis", "etire", "marche")]
    + ["animal_poule_%s" % p for p in ("picore", "marche", "sursaute", "ailes")],
    "F-premier-plan": ["decor_tas_bois", "decor_cloture", "decor_lanterne"],
}
SLUGS = [s for lot in LOTS.values() for s in lot]


def render(only=()):
    X.MOCKUPS = L.RENDERS / "peinture-maquettes"
    for s in SLUGS:
        if not only or s in only:
            X.export(f"peinture/{s}")


def box(slug):
    im = Image.open(R / f"{slug}.rgba.png").convert("RGBA")
    return im, im.getchannel("A").point(lambda a: 255 if a >= 128 else 0).getbbox()


def sheet():
    bg = tuple(int(L.ISO["background"]["green"][i:i + 2], 16) for i in (1, 3, 5))
    EVID.mkdir(parents=True, exist_ok=True)
    for lot, slugs in LOTS.items():
        cw, ch = (512, 768) if lot.startswith("F") else (768, 768)
        k = 0.5 if not lot.startswith("F") else 0.75  # thumbnails
        tw, th = int(cw * k), int(ch * k)
        cols = 4 if len(slugs) > 4 else len(slugs)
        rows = -(-len(slugs) // cols)
        out = Image.new("RGB", (cols * tw, rows * (th + 18)), bg)
        d = ImageDraw.Draw(out)
        for i, s in enumerate(slugs):
            im, bb = box(s)
            x, y = (i % cols) * tw, (i // cols) * (th + 18)
            cell = Image.new("RGB", im.size, bg)
            cell.paste(im, (0, 0), im)
            out.paste(cell.resize((tw, th), Image.LANCZOS), (x, y + 18))
            fill = (bb[3] - bb[1]) / im.size[1]
            wide = (bb[2] - bb[0]) / im.size[0]
            d.text((x + 4, y + 3), f"{s}  h {fill:.0%} w {wide:.0%}", fill=(255, 255, 255))
            print(f"{lot:16s} {s:26s} h {fill:.0%} w {wide:.0%}")
        path = EVID / f"{lot}.png"
        out.save(path)
        print(path, out.size)


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "render"
    if mode == "render":
        render(sys.argv[2:])
    else:
        sheet()
