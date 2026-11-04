#!/usr/bin/env python3
"""Top-down plan images of constants/isoLayout.json (L7 to L9), JPEG, for docs/designs/village/layout/img.

    python3 scripts/layout/plan.py bands OUT_PREFIX     # OUT_PREFIX-t1-3.jpg, -t4-6, -t7-9, -t10-12
    python3 scripts/layout/plan.py slots OUT.jpg        # the quarter slots of slots.json over the tier 12 plan

One square per cell, gx to the right, gy down (not the iso view): the plan reads like a map.
"""
import json
import pathlib
import sys

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parents[2]
L = json.loads((ROOT / "constants/isoLayout.json").read_text())
S = json.loads((ROOT / "constants/isoSpec.json").read_text())["batiments"]
S.pop("_doc", None)
D = L["debut"]
N = len(L["sol"])
K = 18  # px per cell
LETTRES = "123456789abc"
SOL = {".": (150, 170, 100), "#": (196, 160, 110), "=": (140, 100, 60), "~": (90, 140, 190), "T": (70, 110, 70)}
NOMS = {"campfire": "feu", "tent": "tente", "training_dummy": "mannequin", "heroes_hall": "salle", "well": "puits",
        "forge": "forge", "archery_range": "tir", "fountain": "fontaine", "farm": "ferme", "armory": "armurerie",
        "quarry": "carriere", "windmill": "moulin", "wizard_tower": "sorcier", "barn": "grange", "druid_grove": "bosquet",
        "castle_wall": "porte", "watchtower": "guet", "observatory": "observ.", "high_road": "route", "dragon_lair": "antre",
        "champion_arena": "arene"}


def tier(x, y):
    c = L["paliers"][y - D][x - D]
    return None if c == "-" else LETTRES.index(c) + 1


def base(draw, palier, nouveau=None):
    for y in range(D, D + N):
        for x in range(D, D + N):
            t = tier(x, y)
            px, py = (x - D) * K, (y - D) * K
            if t is None or t > palier:
                col = (50, 50, 50) if t is None else (86, 90, 80)
            else:
                col = SOL[L["sol"][y - D][x - D]]
                if nouveau and t >= nouveau:
                    col = tuple(min(255, int(v * 1.25) + 15) for v in col)
            draw.rectangle([px, py, px + K - 1, py + K - 1], fill=col)
    for x, y in L["rempart"]:
        if tier(x, y) is not None and tier(x, y) <= palier:
            draw.rectangle([(x - D) * K, (y - D) * K, (x - D + 1) * K - 1, (y - D + 1) * K - 1], fill=(190, 170, 130))


def batiments(draw, palier, nouveau=None):
    for code, (gx, gy) in L["batiments"].items():
        w, d = S[code]["emprise"]
        t = L["etapes"].get(code, 1)
        if t > palier:
            continue
        col = (200, 60, 50) if nouveau and t >= nouveau else (240, 220, 120)
        x0, y0 = (gx - D) * K, (gy - D) * K
        draw.rectangle([x0, y0, x0 + w * K - 1, y0 + d * K - 1], outline=col, width=2, fill=(60, 45, 30))
        draw.text((x0 + 2, y0 + 2), NOMS.get(code, code)[:7], fill=(255, 255, 255))


def grille(draw):
    for i in range(N + 1):
        if (i + D) % 5 == 0:
            draw.line([(i * K, 0), (i * K, N * K)], fill=(255, 255, 255, 60), width=1)
            draw.line([(0, i * K), (N * K, i * K)], fill=(255, 255, 255, 60), width=1)
            draw.text((i * K + 2, 2), str(i + D), fill=(255, 255, 255))
            draw.text((2, i * K + 2), str(i + D), fill=(255, 255, 255))


def bandes(prefixe):
    for a, b in ((1, 3), (4, 6), (7, 9), (10, 12)):
        im = Image.new("RGB", (N * K, N * K))
        dr = ImageDraw.Draw(im)
        base(dr, b, a)
        grille(dr)
        batiments(dr, b, a)
        dr.text((N * K - 150, N * K - 14), f"paliers {a} a {b}: nouveau en clair", fill=(255, 255, 255))
        im.save(f"{prefixe}-t{a}-{b}.jpg", quality=85)


def fente(sortie):
    data = json.loads((ROOT / "docs/designs/village/layout/slots.json").read_text())
    im = Image.new("RGB", (N * K, N * K))
    dr = ImageDraw.Draw(im)
    base(dr, 12)
    grille(dr)
    for s in data["slots"]:
        x0, y0, x1, y1 = s["box"]
        col = (255, 90, 160) if s["kind"] == "quartier" else (80, 200, 255)
        dr.rectangle([(x0 - D) * K, (y0 - D) * K, (x1 + 1 - D) * K - 1, (y1 + 1 - D) * K - 1], outline=col, width=2)
        dr.text(((x0 - D) * K + 3, (y0 - D) * K + 3), s["id"], fill=col)
    batiments(dr, 12)
    im.save(sortie, quality=85)


if __name__ == "__main__":
    {"bands": bandes, "slots": fente}[sys.argv[1]](sys.argv[2])
