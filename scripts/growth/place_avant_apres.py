#!/usr/bin/env python3
"""The square at tiers 10, 11, 12, day and night, before (scratch/fixe3) and after (scratch/fixe4): img/place-avant-apres.jpg, labelled.
Columns: tiers 10, 11, 12; rows: day before, day after, night before, night after."""
import pathlib

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
D = ROOT / "docs/designs/village/growth"
BOX = (240, 880, 840, 1480)
W = 400


def main():
    font = ImageFont.load_default(20)
    rows = [("jour", "fixe3", "day, before"), ("jour", "fixe4", "day, after"), ("nuit", "fixe3", "night, before"), ("nuit", "fixe4", "night, after")]
    out = Image.new("RGB", (W * 3, W * len(rows)), (24, 28, 26))
    for r, (lum, folder, label) in enumerate(rows):
        for c, t in enumerate((10, 11, 12)):
            p = D / "scratch" / folder / f"t{t}-{lum}.png"
            if not p.exists():
                continue
            out.paste(Image.open(p).convert("RGB").crop(BOX).resize((W, W), Image.LANCZOS), (c * W, r * W))
            ImageDraw.Draw(out).text((c * W + 8, r * W + 6), f"tier {t}, {label}", fill=(255, 240, 200), font=font, stroke_width=2, stroke_fill=(15, 21, 24))
    out.save(D / "img/place-avant-apres.jpg", quality=88)


if __name__ == "__main__":
    main()
