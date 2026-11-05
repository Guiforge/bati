#!/usr/bin/env python3
"""G11: the strips of the real scene, read in the fixed camera renders (scratch/fixe2/t<N>-<jour|nuit>.png, rendre_fixe.py).

    bande_apres.py     img/apres2-strip-jour.jpg (tiers 1 to 12, 4 columns) and img/apres2-strip-nuit.jpg (3, 6, 9, 12), 1080 px wide,
                       the frame cropped to the village and the countryside (y 330 to 1560); img/apres2-phone-<N>.jpg, the frame at phone size
"""
import pathlib

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
D = ROOT / "docs/designs/village/growth"
FIXE = D / "scratch/fixe3"
CROP = (0, 330, 1080, 1560)


def sheet(tiers, lum, cols, dst):
    w = 1080 // cols
    ims = [Image.open(FIXE / f"t{t}-{lum}.png").convert("RGB").crop(CROP) for t in tiers]
    h = round(w * ims[0].height / ims[0].width)
    rows = (len(ims) + cols - 1) // cols
    out = Image.new("RGB", (w * cols, h * rows), (24, 28, 26))
    font = ImageFont.load_default(18)
    for i, (t, im) in enumerate(zip(tiers, ims, strict=True)):
        out.paste(im.resize((w, h), Image.LANCZOS), (i % cols * w, i // cols * h))
        ImageDraw.Draw(out).text((i % cols * w + 6, i // cols * h + 4), f"tier {t}", fill=(255, 240, 200), font=font, stroke_width=2, stroke_fill=(15, 21, 24))
    out.save(dst, quality=88)


def main():
    (D / "img").mkdir(exist_ok=True)
    sheet(range(1, 13), "jour", 4, D / "img/apres2-strip-jour.jpg")
    sheet((3, 6, 9, 12), "nuit", 4, D / "img/apres2-strip-nuit.jpg")
    for t in (6, 8, 10, 11, 12):
        im = Image.open(FIXE / f"t{t}-jour.png").convert("RGB")
        im.resize((412, round(412 * im.height / im.width)), Image.LANCZOS).save(FIXE / f"phone-t{t}-jour.jpg", quality=90)


if __name__ == "__main__":
    main()
