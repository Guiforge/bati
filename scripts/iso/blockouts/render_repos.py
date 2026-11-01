#!/usr/bin/env python3
"""Render the rest poses of gen_repos.py (T40) with their exports, and make the board.

    python3 scripts/iso/blockouts/gen_repos.py
    scripts/iso/team/heavy.sh python3 scripts/iso/blockouts/render_repos.py render [slug ...]
    python3 scripts/iso/blockouts/render_repos.py sheet                      # no Blender

`render` runs stage_exports.export on each `repos/<slug>` into renders/repos/; the mock-up webp goes to
renders/repos-maquettes/, never to assets/. `sheet` writes the board in docs/designs/village-iso-v1/evidence/T40/blockouts/.
"""

import pathlib
import sys

from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "exports"))
sys.path.insert(0, str(HERE.parent))
import isolib as L  # noqa: E402
import stage_exports as X  # noqa: E402

R = L.RENDERS / "repos"
EVID = L.ROOT / "docs/designs/village-iso-v1/evidence/T40/blockouts"
SLUGS = sorted(p.stem for p in (HERE / "repos").glob("*.json"))


def render(only=()):
    X.MOCKUPS = L.RENDERS / "repos-maquettes"
    for s in SLUGS:
        if not only or s in only:
            X.export(f"repos/{s}")


def sheet():
    bg = tuple(int(L.ISO["background"]["green"][i:i + 2], 16) for i in (1, 3, 5))
    EVID.mkdir(parents=True, exist_ok=True)
    tw = th = 384
    cols = 5
    rows = -(-len(SLUGS) // cols)
    out = Image.new("RGB", (cols * tw, rows * (th + 18)), bg)
    d = ImageDraw.Draw(out)
    for i, s in enumerate(SLUGS):
        im = Image.open(R / f"{s}.rgba.png").convert("RGBA")
        bb = im.getchannel("A").point(lambda a: 255 if a >= 128 else 0).getbbox()
        x, y = (i % cols) * tw, (i // cols) * (th + 18)
        cell = Image.new("RGB", im.size, bg)
        cell.paste(im, (0, 0), im)
        out.paste(cell.resize((tw, th), Image.LANCZOS), (x, y + 18))
        h, w = (bb[3] - bb[1]) / im.size[1], (bb[2] - bb[0]) / im.size[0]
        d.text((x + 4, y + 3), f"{s}  h {h:.0%} w {w:.0%}", fill=(255, 255, 255))
        print(f"{s:22s} h {h:.0%} w {w:.0%}")
    path = EVID / "repos.png"
    out.save(path)
    print(path, out.size)


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "render"
    render(sys.argv[2:]) if mode == "render" else sheet()
