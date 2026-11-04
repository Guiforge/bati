#!/usr/bin/env python3
"""G5 check: every painted stage as the ink silhouette the app shows, on parchment, at 64 dp x3: the sprite at 25 % under the ink at 70 %, as Silhouette.tsx draws it.

Writes a contact sheet (argv[1]) and prints each building's solid share: a share near the top
of the table means a blob, and two close heights mean the next stage reads like the current one.
"""
import sys
from pathlib import Path

from PIL import Image

PEINTS = Path("assets/images/village/iso/peints")
ORDRE = ["rough", "solid", "grand", "legendary", "mythic"]
T = 192
PAPIER, ENCRE = (221, 211, 188), (15, 21, 24)


def main() -> None:
    codes = sorted(p.name for p in PEINTS.iterdir() if p.is_dir())
    o = Image.new("RGB", (T * 5 + 10, (T + 6) * len(codes)), PAPIER)
    for y, code in enumerate(codes):
        ligne = []
        for x, stade in enumerate(ORDRE):
            f = PEINTS / code / f"{stade}.jour.webp"
            if not f.exists():
                ligne.append(f"{stade}=-")
                continue
            alpha = Image.open(f).convert("RGBA").getchannel("A").point(lambda a: 255 if a > 40 else 0)
            x0, y0, x1, y1 = alpha.getbbox()
            plein = sum(alpha.crop((x0, y0, x1, y1)).point(lambda a: a // 255).getdata())
            ligne.append(f"{stade}:h{y1 - y0}/p{100 * plein // ((x1 - x0) * (y1 - y0))}")
            # Silhouette.tsx: the sprite at OPACITE_SPRITE, then the ink tint at OPACITE_ENCRE.
            rgba = Image.open(f).convert("RGBA")
            rgba.thumbnail((T, T))
            masque = rgba.getchannel("A")
            pos = (x * T + (T - rgba.width) // 2, y * (T + 6))
            o.paste(rgba.convert("RGB"), pos, masque.point(lambda a: a * 25 // 100))
            o.paste(ENCRE, pos, masque.point(lambda a: a * 70 // 100))
        print(f"{code:16}", " ".join(ligne))
    o.save(sys.argv[1])


if __name__ == "__main__":
    main()
