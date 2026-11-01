"""Draws the world's forest and shore tiles (L6-T17) into webp files next to this script.

    python3 components/village/iso/mondeTuiles/generer.py

Reads tuiles.json (what each tile holds) and the iso* tokens of constants/rawColors.ts (the only
place a colour lives). Deterministic: a seed per tile. Flat shapes with an ink outline, like the
island. A forest tile is 384 x 384 dp (a 320 dp cell and its margins: 32 each side, 64 above) so a
crown never gets cut at a seam; a shore tile is 192 x 320 dp. Drawn at 1.5 px per dp.
"""

import json
import math
import random
import re
from pathlib import Path

from PIL import Image, ImageDraw

ICI = Path(__file__).resolve().parent
RACINE = ICI.parents[3]
PX = 1.5  # output pixels per dp
SS = 4  # supersampling
K = PX * SS
CELLULE = 320
MARGE_X, MARGE_HAUT = 32, 64
IMAGE = 384

couleurs = {
    m[1]: m[2]
    for m in re.finditer(r'(iso\w+):\s*"(#[0-9A-Fa-f]{6})"', (RACINE / "constants/rawColors.ts").read_text())
}


def rgb(nom, t=0.0, vers="isoInk"):
    """Token `nom` mixed t of the way to token `vers`."""
    a = couleurs[nom]
    b = couleurs[vers]
    c = [round(int(a[i : i + 2], 16) * (1 - t) + int(b[i : i + 2], 16) * t) for i in (1, 3, 5)]
    return (*c, 255)


def clair(nom, t=0.25):
    return rgb(nom, t, "isoEcumeVive")


def pt(x, y):
    return (x * K, y * K)


def ellipse(d, cx, cy, rx, ry, fill, bord=True):
    d.ellipse(
        [pt(cx - rx, cy - ry), pt(cx + rx, cy + ry)],
        fill=fill,
        outline=rgb("isoInk") if bord else None,
        width=max(1, round(1.1 * K)) if bord else 0,
    )


def tronc(d, x, y, h):
    l = 0.045 * h
    d.rectangle([pt(x - l, y - 0.34 * h), pt(x + l, y)], fill=rgb("isoTronc"), outline=rgb("isoInk"), width=round(0.8 * K))


def ombre(d, x, y, h):
    ellipse(d, x, y, 0.28 * h, 0.07 * h, rgb("isoForetSol", 0.45), bord=False)


def arbre(d, espece, x, y, h):
    ombre(d, x, y, h)
    tronc(d, x, y, h)
    if espece == "rond":
        f = rgb("isoArbreRond")
        for cx, cy, r in ((x - 0.2 * h, y - 0.47 * h, 0.22 * h), (x + 0.2 * h, y - 0.47 * h, 0.22 * h), (x, y - 0.6 * h, 0.3 * h)):
            ellipse(d, cx, cy, r, r, f)
        ellipse(d, x - 0.08 * h, y - 0.68 * h, 0.12 * h, 0.09 * h, clair("isoArbreRond"), bord=False)
    elif espece == "clair":
        f = rgb("isoArbreClair")
        ellipse(d, x + 0.12 * h, y - 0.42 * h, 0.13 * h, 0.13 * h, f)
        ellipse(d, x, y - 0.58 * h, 0.17 * h, 0.4 * h, f)
        ellipse(d, x - 0.05 * h, y - 0.7 * h, 0.06 * h, 0.14 * h, clair("isoArbreClair", 0.3), bord=False)
    else:
        f = rgb("isoArbreConifere")
        for i in range(3):
            sommet = y - h + i * 0.27 * h
            bas = sommet + 0.46 * h
            demi = (0.15 + i * 0.07) * h
            d.polygon(
                [pt(x, sommet), pt(x + demi, bas), pt(x - demi, bas)],
                fill=f,
                outline=rgb("isoInk"),
                width=round(1.0 * K),
            )
            d.polygon([pt(x, sommet + 0.04 * h), pt(x - 0.05 * h, sommet + 0.2 * h), pt(x, sommet + 0.2 * h)], fill=clair("isoArbreConifere", 0.18))


def buisson(d, x, y, r):
    ombre(d, x, y, r * 3)
    for dx in (-0.6, 0.6, 0):
        ellipse(d, x + dx * r, y - r * (0.7 if dx else 1.0), r * 0.8, r * 0.7, rgb("isoBuisson"))
    ellipse(d, x, y - r * 1.2, r * 0.3, r * 0.2, clair("isoBuisson", 0.2), bord=False)


def rocher(d, x, y, r):
    ellipse(d, x, y, r * 1.1, r * 0.3, rgb("isoForetSol", 0.45), bord=False)
    d.polygon(
        [pt(x - r, y), pt(x - 0.7 * r, y - 0.8 * r), pt(x + 0.1 * r, y - r), pt(x + r, y - 0.5 * r), pt(x + 0.9 * r, y)],
        fill=rgb("isoRocheMonde"),
        outline=rgb("isoInk"),
        width=round(0.9 * K),
    )
    d.polygon([pt(x - 0.6 * r, y - 0.7 * r), pt(x + 0.1 * r, y - 0.92 * r), pt(x - 0.1 * r, y - 0.5 * r)], fill=clair("isoRocheMonde", 0.3))


def herbe(d, x, y, g):
    c = rgb("isoHerbeHaute", 0.25)
    for i in (-1, 0, 1):
        d.line([pt(x + i * 2, y), pt(x + i * 3.5 + g, y - 7 - abs(i))], fill=c, width=round(1.2 * K))


def tuile(nom, spec):
    r = random.Random(spec["graine"])
    img = Image.new("RGBA", (round(IMAGE * K), round(IMAGE * K)), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pose = []  # (kind, x, y, size)
    places = []

    def libre(dist):
        for _ in range(60):
            x, y = r.uniform(4, CELLULE - 4), r.uniform(6, CELLULE - 2)
            if all((x - px) ** 2 + (y - py) ** 2 > (dist * 0.55 + pr * 0.45) ** 2 for px, py, pr in places):
                return x, y
        return r.uniform(4, CELLULE - 4), r.uniform(6, CELLULE - 2)

    lo, hi = spec["hauteur"]
    for espece, n in spec["arbres"].items():
        for _ in range(n):
            h = r.uniform(lo, hi)
            x, y = libre(h * 0.7)
            places.append((x, y, h * 0.7))
            pose.append((espece, x, y, h))
    for _ in range(spec["buissons"]):
        x, y = libre(12)
        places.append((x, y, 8))
        pose.append(("buisson", x, y, r.uniform(5, 8)))
    for _ in range(spec["rochers"]):
        x, y = libre(14)
        places.append((x, y, 9))
        pose.append(("rocher", x, y, r.uniform(5, 12)))
    # Grass first (under everything), then back to front.
    for _ in range(26 if spec["arbres"]["conifere"] + spec["arbres"]["rond"] < 6 else 10):
        herbe(d, MARGE_X + r.uniform(8, CELLULE - 8), MARGE_HAUT + r.uniform(10, CELLULE - 2), r.uniform(-1.5, 1.5))
    for kind, x, y, s in sorted(pose, key=lambda p: p[2]):
        X, Y = MARGE_X + x, MARGE_HAUT + y
        if kind == "buisson":
            buisson(d, X, Y, s)
        elif kind == "rocher":
            rocher(d, X, Y, s)
        else:
            arbre(d, kind, X, Y, s)
    sortie(img, nom, IMAGE, IMAGE)


def sortie(img, nom, w, h):
    img.resize((round(w * PX), round(h * PX)), Image.LANCZOS).save(ICI / f"{nom}.webp", "WEBP", quality=88, method=6)


if __name__ == "__main__":
    donnees = json.loads((ICI / "tuiles.json").read_text())
    for nom, spec in donnees["tuiles"].items():
        tuile(nom, spec)
