#!/usr/bin/env python3
"""P1 contact sheets: each building's motion anchors drawn on its painting, one cell per stage.

    p1_ancres.py forge fountain ...   # docs/designs/village/life/scratch/p1/<code>.png
    p1_ancres.py all

Filled marks are the entries of components/village/iso/motion/<code>.json that show at the stage's first
rank (lueur = orange disc, particules = white disc + rising arrow, miroitement = cyan ellipse, vent =
green box with its pivot). Hollow dark rings are the seed: `lights` and `ancres` of constants/buildings/<code>.ts
that show there. Canvas px, read only.
"""
import json
import pathlib
import re
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[2]
PEINTS = ROOT / "assets/images/village/iso/peints"
OUT = ROOT / "docs/designs/village/life/scratch/p1"
TEN = [("rough", 1, 0), ("solid", 3, 0), ("grand", 5, 0), ("legendary", 7, 0), ("mythic", 10, 0)]
DEED = [("rough", 1, 0), ("solid", 3, 0), ("grand", 4, 0), ("mythic", 5, 0)]
UPG = [("rough", 1, 0), ("solid", 2, 0), ("grand", 3, 0), ("legendary", 3, 7), ("mythic", 3, 10)]
DEEDS = {"dragon_lair", "heroes_hall", "champion_arena"}
UPGRADES = {"armory", "barn", "castle_wall", "observatory", "watchtower"}
SEED = re.compile(r'kind: "(\w+)", at: \[(\d+), (\d+)\], fromRank: (\d+)(?:, fromBase: (\d+))?')
COUL = {"lueur": (255, 140, 0), "particules": (255, 255, 255), "miroitement": (0, 220, 255), "vent": (0, 200, 0)}
ECH = 0.45
FONT = ImageFont.load_default(size=30)


def atteint(e, rank, base):
    return rank >= e["fromRank"] and base >= e.get("fromBase", 0)


def sheet(code):
    stages = DEED if code in DEEDS else UPG if code in UPGRADES else TEN
    f = ROOT / f"components/village/iso/motion/{code}.json"
    effets = json.loads(f.read_text())["effets"] if f.exists() else []
    src = (ROOT / f"constants/buildings/{code}.ts").read_text()
    seed = [
        dict(kind=k, at=(int(x), int(y)), fromRank=int(r), fromBase=int(b or 0))
        for k, x, y, r, b in SEED.findall(src)
    ]
    cells = []
    for nom, rank, base in stages:
        p = PEINTS / code / f"{nom}.jour.webp"
        if not p.exists():
            continue
        im = Image.open(p).convert("RGBA")
        bg = Image.new("RGBA", im.size, (120, 130, 150, 255))
        bg.alpha_composite(im)
        d = ImageDraw.Draw(bg)
        for sd in seed:
            if atteint(sd, rank, base):
                x, y = sd["at"]
                d.ellipse([x - 14, y - 14, x + 14, y + 14], outline=(255, 0, 255), width=8)
                d.text((x + 16, y - 6), "s:" + sd["kind"][:4], fill=(255, 0, 255), font=FONT)
        for i, e in enumerate(effets):
            if not atteint(e, rank, base):
                continue
            c = COUL[e["kind"]]
            x, y = e["at"]
            if e["kind"] == "miroitement":
                r = e["rayon"]
                d.ellipse([x - r, y - r * 0.4, x + r, y + r * 0.4], outline=c, width=5)
            elif e["kind"] == "vent":
                zx, zy, zw, zh = e["zone"]
                d.rectangle([zx, zy, zx + zw, zy + zh], outline=c, width=4)
                px, py = e["pivot"]
                d.ellipse([px - 8, py - 8, px + 8, py + 8], fill=c)
            else:
                d.ellipse([x - 9, y - 9, x + 9, y + 9], fill=c, outline=(0, 0, 0), width=2)
                if e["kind"] == "particules":
                    d.line([x, y - 12, x, y - 12 - 20 * e["taille"] / 4], fill=c, width=4)
            d.text((x + 12, y + 8), f"{i}:{e['kind'][:4]}", fill=(255, 255, 0), font=FONT)
        d.text((10, 10), f"{code} {nom} rank {rank} base {base}", fill=(255, 255, 255))
        cells.append(bg.resize((int(bg.width * ECH), int(bg.height * ECH))))
    if not cells:
        return
    out = Image.new("RGB", (sum(c.width for c in cells), max(c.height for c in cells)), (30, 30, 30))
    x = 0
    for c in cells:
        out.paste(c.convert("RGB"), (x, 0))
        x += c.width
    OUT.mkdir(parents=True, exist_ok=True)
    out.save(OUT / f"{code}.png")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args == ["all"]:
        args = sorted(p.name for p in PEINTS.iterdir() if p.is_dir())
    for c in args:
        sheet(c)
