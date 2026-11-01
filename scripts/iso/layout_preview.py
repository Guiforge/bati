#!/usr/bin/env python3
"""Quick look at constants/isoLayout.json for Guillaume (L0-T03): the island at village tiers 3, 6,
9 and 12, top-down and isometric, with footprints, path, water, decor and every building's shadow
zone (the largest of its stages, plus the windmill's swept sails and their overhang).

Reads isoLayout.json, isoSpec.json (footprints) and scripts/iso/exports/heights.json (shadows,
heights, and the decor's shadows). A building is drawn at a tier once its whole plot is on the
island; the early reveal of a building that stands before its plot opens (isoLayout.ts,
ileVisible) is not drawn here.

    python3 scripts/iso/layout_preview.py [out_dir]
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "docs/designs/village-iso-v1/evidence/L0-T03"
TIERS = (3, 6, 9, 12)

layout = json.loads((ROOT / "constants/isoLayout.json").read_text())
spec = json.loads((ROOT / "constants/isoSpec.json").read_text())["batiments"]
exports = json.loads((ROOT / "scripts/iso/exports/heights.json").read_text())
heights, decors = exports["batiments"], exports["decors"]
legende = layout["legende"]
SOL, PAL = layout["sol"], layout["paliers"]
N = len(SOL)

GROUND = {
    "herbe": (52, 74, 58), "chemin": (128, 112, 88), "pont": (150, 120, 84), "eau": (54, 88, 128),
    "cascade": (150, 190, 220), "arbre": (30, 54, 38), "rochers": (104, 104, 110), "bosquet": (40, 70, 44),
}
VOID = (16, 18, 26)
SHADOW = (0, 0, 0, 110)
FONT = ImageFont.load_default()


def palier(x, y):
    c = PAL[y][x]
    return None if c == "-" else int(c, 16)


def hull(pts):
    pts = sorted(set(pts))
    if len(pts) < 3:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]


def shadow_zone(code):
    """Grid polygon: hull of every stage's ground shadow, the sails' swept shadow and their box."""
    gx, gy = layout["batiments"][code]
    pts = []
    for stage in heights[code]["stades"].values():
        pts += [tuple(p) for p in stage["ombre"]["polygone"]]
        for m in stage.get("mobile", []):
            if m.get("ombrePortee"):
                pts += [tuple(p) for p in m["ombre"]]
            if m["nom"] == "ailes":
                (a, b, _), (c, d, _) = m["boite"]
                pts += [(a, b), (c, b), (c, d), (a, d)]
    return [(gx + x, gy + y) for x, y in hull(pts)]


def decor_zones(tier):
    """Grid polygons of the decor's shadows (heights.json `decors`) on the island at this tier."""
    return [
        [(x + px, y + py) for px, py in decors[legende[ch]]["ombre"]["polygone"]]
        for y, row in enumerate(SOL) for x, ch in enumerate(row)
        if legende[ch] in decors and (p := palier(x, y)) is not None and p <= tier
    ]


def plot(code):
    gx, gy = layout["batiments"][code]
    w, d = spec[code]["emprise"]
    return gx, gy, w, d


def standing(code, tier):
    gx, gy, w, d = plot(code)
    return all((p := palier(gx + i, gy + j)) is not None and p <= tier for i in range(w) for j in range(d))


def short(code):
    return "".join(part[:3] for part in code.split("_"))[:6]


def colour(code):
    h = sum(map(ord, code)) * 47
    return (120 + h % 100, 70 + (h // 7) % 90, 60 + (h // 13) % 100)


def top_down(tier, cell=26):
    img = Image.new("RGB", (N * cell, N * cell), VOID)
    shade = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for y in range(N):
        for x in range(N):
            p = palier(x, y)
            if p is None or p > tier:
                continue
            d.rectangle([x * cell, y * cell, (x + 1) * cell - 1, (y + 1) * cell - 1], fill=GROUND[legende[SOL[y][x]]])
    codes = [c for c in layout["batiments"] if standing(c, tier)]
    sd = ImageDraw.Draw(shade)
    for z in [shadow_zone(c) for c in codes] + decor_zones(tier):
        sd.polygon([(x * cell, y * cell) for x, y in z], fill=SHADOW)
    img.paste(shade, (0, 0), shade)
    for c in codes:
        gx, gy, w, h = plot(c)
        d.rectangle([gx * cell + 2, gy * cell + 2, (gx + w) * cell - 3, (gy + h) * cell - 3], fill=colour(c), outline=(240, 230, 210))
        d.text((gx * cell + 4, gy * cell + 4), short(c), fill=(10, 10, 10), font=FONT)
    for i in range(N + 1):
        d.line([(i * cell, 0), (i * cell, N * cell)], fill=(0, 0, 0), width=1)
        d.line([(0, i * cell), (N * cell, i * cell)], fill=(0, 0, 0), width=1)
    return img


def iso(tier, cw=44):
    zu = 0.612 * cw  # one unit of height on screen, from the 60 deg camera (isoSpec pxPerUnit / S)
    top = 4.2 * zu
    W, H = N * cw + 2, int(N * cw / 2 + top + 4)

    def pt(gx, gy, z=0.0):
        return ((gx - gy) * cw / 2 + N * cw / 2 + 1, (gx + gy) * cw / 4 + top - z * zu)

    img = Image.new("RGB", (W, H), VOID)
    d = ImageDraw.Draw(img)
    for y in range(N):
        for x in range(N):
            p = palier(x, y)
            if p is None or p > tier:
                continue
            fill = GROUND[legende[SOL[y][x]]]
            d.polygon([pt(x, y), pt(x + 1, y), pt(x + 1, y + 1), pt(x, y + 1)], fill=fill, outline=tuple(max(0, v - 18) for v in fill))
    codes = [c for c in layout["batiments"] if standing(c, tier)]
    shade = Image.new("RGBA", img.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shade)
    for z in [shadow_zone(c) for c in codes] + decor_zones(tier):
        sd.polygon([pt(x, y) for x, y in z], fill=SHADOW)
    img.paste(shade, (0, 0), shade)
    for c in sorted(codes, key=lambda c: (lambda g: g[0] + g[1] + g[2] + g[3])(plot(c))):
        gx, gy, w, h = plot(c)
        z = max(s["hauteurMax"] for s in heights[c]["stades"].values())
        base = colour(c)
        # the two visible walls (+gy face lit, +gx face in shadow) and the roof
        d.polygon([pt(gx, gy + h), pt(gx + w, gy + h), pt(gx + w, gy + h, z), pt(gx, gy + h, z)], fill=tuple(int(v * 0.8) for v in base), outline=(0, 0, 0))
        d.polygon([pt(gx + w, gy), pt(gx + w, gy + h), pt(gx + w, gy + h, z), pt(gx + w, gy, z)], fill=tuple(int(v * 0.5) for v in base), outline=(0, 0, 0))
        d.polygon([pt(gx, gy, z), pt(gx + w, gy, z), pt(gx + w, gy + h, z), pt(gx, gy + h, z)], fill=base, outline=(0, 0, 0))
        cx, cy = pt(gx + w / 2, gy + h / 2, z)
        d.text((cx - 14, cy - 5), short(c), fill=(10, 10, 10), font=FONT)
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for t in TIERS:
        a, b = top_down(t), iso(t)
        sheet = Image.new("RGB", (a.width + b.width + 30, max(a.height, b.height) + 24), VOID)
        sheet.paste(a, (10, 20))
        sheet.paste(b, (a.width + 20, 20))
        ImageDraw.Draw(sheet).text((10, 4), f"palier {t} : a gauche vu de dessus (gx vers la droite, gy vers le bas), a droite en iso ; ombres = zone max de tous les stades, et celle des decors", fill=(230, 230, 230), font=FONT)
        path = OUT / f"palier_{t:02d}.png"
        sheet.save(path, optimize=True)
        print(path.relative_to(ROOT), path.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
