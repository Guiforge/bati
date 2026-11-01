#!/usr/bin/env python3
"""Control sheet of the anchor points: blockout renders with foyer, fenetres, porte, cheminee, faite drawn on.

    python3 scripts/iso/exports/accroches_planche.py        # -> scripts/iso/blockouts/renders/accroches_planche.png

Colours: foyer = red circle of its demiLargeur, fenetres = cyan rectangles (largeur x hauteur; L/R the
face), porte = green cross, cheminee = magenta cross, faite = yellow cross. No render, reads the files.
"""

import json
import pathlib

from PIL import Image, ImageDraw

RENDERS = pathlib.Path(__file__).resolve().parent.parent / "blockouts" / "renders"
STAGES = ["forge_solid", "campfire_solid", "windmill_solid", "farm_solid", "tent_rough"]
WIDTH = 640  # px per panel, after the crop


def cross(d, p, color, r=12):
    d.line([p[0] - r, p[1], p[0] + r, p[1]], fill=color, width=4)
    d.line([p[0], p[1] - r, p[0], p[1] + r], fill=color, width=4)


def panel(slug):
    info = json.loads((RENDERS / f"{slug}.anchor.json").read_text())
    pa = info["pointsAccroche"]
    img = Image.open(RENDERS / f"{slug}.rgba.png").convert("RGBA")
    bg = Image.new("RGBA", img.size, (58, 52, 70, 255))
    bg.alpha_composite(img)
    d = ImageDraw.Draw(bg)
    for name, color in (("porte", "lime"), ("cheminee", "magenta"), ("faite", "yellow")):
        if pa["px"][name]:
            cross(d, pa["px"][name], color)
    if pa["foyer"]:
        (x, y), r = pa["foyer"]["px"], pa["foyer"]["demiLargeur"]
        d.ellipse([x - r, y - r / 2, x + r, y + r / 2], outline="red", width=4)
        cross(d, (x, y), "red", 8)
    for w in pa["fenetres"]:
        (x, y), hw, hh = w["px"], w["largeur"] / 2, w["hauteur"] / 2
        d.rectangle([x - hw, y - hh, x + hw, y + hh], outline="cyan", width=3)
        d.text((x - 4, y - hh - 16), w["face"][0].upper(), fill="cyan")
    box = img.getchannel("A").getbbox() or (0, 0, *img.size)
    box = (box[0] - 30, box[1] - 30, box[2] + 30, box[3] + 30)
    crop = bg.crop(box)
    ImageDraw.Draw(crop).text((8, 8), slug, fill="white")
    return crop.resize((WIDTH, round(crop.height * WIDTH / crop.width)), Image.LANCZOS)


def main():
    panels = [panel(s) for s in STAGES]
    sheet = Image.new("RGBA", (WIDTH * len(panels), max(p.height for p in panels)), (58, 52, 70, 255))
    for i, p in enumerate(panels):
        sheet.alpha_composite(p, (i * WIDTH, 0))
    out = RENDERS / "accroches_planche.png"
    sheet.convert("RGB").save(out)
    print(out, sheet.size)


if __name__ == "__main__":
    main()
