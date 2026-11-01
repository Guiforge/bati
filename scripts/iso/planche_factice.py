#!/usr/bin/env python3
"""FIN-MAG tour 0: a stand-in sprite sheet for the reveal's burst, to prove the player and measure it.

    python3 scripts/iso/planche_factice.py

Writes components/village/iso/planches/eclat-factice.png: 4 x 2 drawings of 128 x 216 px (a
64 x 108 dp burst at 2x), 512 x 432 in all. Inked shapes only, no artistic claim: a spark that
rises, peaks at drawing 4 and thins out, the last drawing nearly empty (the fade is painted, the
player never touches opacity). Colours are read from constants/rawColors.ts.
"""

import math
import pathlib
import re

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "components/village/iso/planches/eclat-factice.png"
COLS, ROWS, W, H, SS = 4, 2, 128, 216, 4


def couleur(nom: str) -> tuple[int, int, int, int]:
    texte = (ROOT / "constants/rawColors.ts").read_text()
    h = re.search(rf'\b{nom}:\s*"#([0-9A-Fa-f]{{6}})"', texte).group(1)
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


INK, OR, PALE = couleur("isoInk"), couleur("resourceGold"), couleur("isoEclat")


def etoile(d, cx, cy, r, fill):
    """A four-pointed spark with an inked outline, `r` the long radius."""
    pts = []
    for i in range(8):
        a = math.pi / 4 * i
        k = r if i % 2 == 0 else r * 0.28
        pts.append((cx + k * math.cos(a), cy + k * math.sin(a)))
    d.polygon(pts, fill=fill, outline=INK, width=5 * SS // 2)


def dessin(i: int) -> Image.Image:
    im = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    v = i / 7
    # Grows to the peak (drawing 4), then thins: the size of the whole burst.
    taille = 0.25 + 0.75 * (v / 0.57) if v < 0.57 else 1.0 - 0.8 * ((v - 0.57) / 0.43)
    taille = max(0.12, taille)
    # Five sparks climbing from the foot of the box (the building's top) to its head.
    for k, (dx, vit, r0, ton) in enumerate(
        [(0, 1.0, 34, PALE), (-34, 0.8, 22, OR), (36, 0.7, 24, OR), (-14, 0.55, 15, PALE), (18, 0.4, 13, OR)]
    ):
        cx = (W / 2 + dx * (0.6 + 0.4 * v)) * SS
        cy = (H - 30 - (H - 70) * v * vit) * SS
        etoile(d, cx, cy, r0 * taille * SS, ton)
    return im.resize((W, H), Image.LANCZOS)


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    feuille = Image.new("RGBA", (COLS * W, ROWS * H), (0, 0, 0, 0))
    for i in range(COLS * ROWS):
        feuille.paste(dessin(i), ((i % COLS) * W, (i // COLS) * H))
    feuille.save(OUT, optimize=True)
    print(OUT.relative_to(ROOT), feuille.size, OUT.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
