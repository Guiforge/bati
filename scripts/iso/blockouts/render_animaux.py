#!/usr/bin/env python3
"""Render the nine animal poses of gen_animaux.py with their exports (L4-T08b), then the control sheet.

    scripts/iso/team/heavy.sh python3 scripts/iso/blockouts/render_animaux.py [render|sheet]

`render` runs stage_exports.export on each `pieces/animal_*` (render, masks, anchor, shadow, volumes,
points) into renders/pieces/; the lot-1 mock-up webp it also writes goes to renders/animaux-maquettes/,
not into assets/ (the animals are not shown by the app yet). `sheet` (no Blender) writes
renders/animaux_planche.png: the animals, the farmer and a cell's diamond to scale, then every pose.
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

NAMES = ("chat", "poule", "corbeau")
POSES = ("repos", "a", "b")
R = L.RENDERS / "pieces"
CROP = (-110, -190, 110, 30)  # around the anchor: wings up and tails stay in, the villager does not


def render() -> None:
    X.MOCKUPS = L.RENDERS / "animaux-maquettes"  # export() prints a path under the repo root
    for n in NAMES:
        for p in POSES:
            if not sys.argv[2:] or f"{n}_{p}" in sys.argv[2:]:  # e.g. `render corbeau_a`
                X.export(f"pieces/animal_{n}_{p}")


def sprite(stem: str) -> tuple[Image.Image, tuple[int, int]]:
    info = json.loads((R / f"{stem}.anchor.json").read_text())
    return Image.open(R / f"{stem}.rgba.png").convert("RGBA"), tuple(int(v) for v in info["anchor"])


def sheet() -> None:
    bg = tuple(int(L.ISO["background"]["legacy"][i:i + 2], 16) for i in (1, 3, 5))
    w, h = 2 * (CROP[2] - CROP[0]), 2 * (CROP[3] - CROP[1])  # poses at 2x
    k = 384  # sprite px per grid unit along the diagonals: x = (dgx - dgy) * k, y = (dgx + dgy) * k / 2
    # Top: one cell's diamond (768 x 384), the farmer on its middle, the three animals at rest around him.
    top = Image.new("RGB", (900, 560), bg)
    d = ImageDraw.Draw(top)
    cx, cy = 450, 300
    d.polygon([(cx, cy - k // 2), (cx + k, cy), (cx, cy + k // 2), (cx - k, cy)], outline=(120, 120, 120))
    d.text((cx - 20, cy - k // 2 + 8), "1 case", fill=(160, 160, 160))
    places = {"farmer": (0, 0), "chat": (-0.28, -0.1), "poule": (0.3, -0.25), "corbeau": (0.2, 0.3)}
    for name, (dx, dy) in sorted(places.items(), key=lambda kv: kv[1][0] + kv[1][1]):
        img, (ax, ay) = sprite("villageois_farmer_face" if name == "farmer" else f"animal_{name}_repos")
        top.paste(img, (int(cx + (dx - dy) * k - ax), int(cy + (dx + dy) * k / 2 - ay)), img)
    rows = [Image.new("RGB", (w * 3, h), bg) for _ in NAMES]
    for row, n in zip(rows, NAMES):
        for i, p in enumerate(POSES):
            img, (ax, ay) = sprite(f"animal_{n}_{p}")
            cell = img.crop((ax + CROP[0], ay + CROP[1], ax + CROP[2], ay + CROP[3])).resize((w, h), Image.LANCZOS)
            row.paste(cell, (i * w, 0), cell)
            ImageDraw.Draw(row).text((i * w + 6, 6), f"{n} {p}", fill=(200, 200, 200))
    out = Image.new("RGB", (max(900, w * 3), 560 + h * 3), bg)
    out.paste(top, (0, 0))
    for i, row in enumerate(rows):
        out.paste(row, (0, 560 + i * h))
    out.save(L.RENDERS / "animaux_planche.png")
    print(L.RENDERS / "animaux_planche.png", out.size)


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "render"
    if mode == "render":
        render()
    sheet()
