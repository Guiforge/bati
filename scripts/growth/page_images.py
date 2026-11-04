#!/usr/bin/env python3
"""The checkpoint page's images (scratch/page/img), the committed board (img/pieces.jpg), and the value rule on the montages.
    page_images.py"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "growth"))
from montage import CROP, P
from PIL import Image, ImageDraw, ImageFont, ImageStat

D = ROOT / "docs/designs/village/growth"
S = D / "scratch"
OUT = S / "page/img"
RUNGS = ["ferme1_x", "ferme3_R", "ferme3_T", "ferme3_F", "ferme4_R", "ferme4_T", "ferme4_F", "hameau1_R", "hameau1_T", "hameau1_F",
         "hameau2_R", "hameau2_T", "hameau2_F", "bourg_R", "bourg_T", "bourg_F", "route1_x", "route2_x", "route3_x"]
# In the montage's cropped frame: the village core, and where each proposal's added land lies at tier 12.
CORE = (390, 700, 620, 830)


def jpg(src, dst, w, q=80):
    im = Image.open(src).convert("RGB")
    im.resize((w, round(w * im.height / im.width)), Image.LANCZOS).save(OUT / dst, quality=q)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for t in range(1, 13):
        Image.open(S / f"fixe/t{t}-jour.png").convert("RGB").crop(CROP).resize((540, 852), Image.LANCZOS).save(OUT / f"today_{t:02d}.jpg", quality=80)
        for p in P:
            jpg(S / f"montage/{p}_{t:02d}.png", f"{p}_{t:02d}.jpg", 540)
    for t in (3, 6, 9, 12):
        Image.open(S / f"fixe/t{t}-nuit.png").convert("RGB").crop(CROP).resize((420, 662), Image.LANCZOS).save(OUT / f"today_n{t:02d}.jpg", quality=78)
        for p in P:
            jpg(S / f"montage/nuit_{p}_{t:02d}.png", f"{p}_n{t:02d}.jpg", 420, 78)
    for r in RUNGS:
        for v in (1, 2):
            jpg(S / f"concepts/{r}_v{v}.png", f"{r}_v{v}.jpg", 360, 82)
    for name in ("avant-strip-jour", "avant-strip-nuit"):
        jpg(D / f"img/{name}.jpg", f"{name}.jpg", 1080, 82)

    w, cols = 216, 8
    rows = (2 * len(RUNGS) + cols - 1) // cols
    board = Image.new("RGB", (cols * w, rows * w), (24, 24, 24))
    draw, font = ImageDraw.Draw(board), ImageFont.load_default(14)
    for i, (r, v) in enumerate((r, v) for r in RUNGS for v in (1, 2)):
        x, y = i % cols * w, i // cols * w
        board.paste(Image.open(S / f"concepts/{r}_v{v}.png").convert("RGB").resize((w, w), Image.LANCZOS), (x, y))
        draw.rectangle((x, y, x + 100, y + 18), fill=(0, 0, 0))
        draw.text((x + 3, y + 1), f"{r} v{v}", fill="white", font=font)
    board.thumbnail((1080, 1080))
    board.save(D / "img/pieces.jpg", quality=86)

    for p, spec in P.items():
        im = Image.open(S / f"montage/{p}_12.png").convert("L")
        core = ImageStat.Stat(im.crop(CORE)).mean[0]
        added = []
        for first, end, name, x, y, width in spec["pieces"]:
            if first <= 12 <= end:
                y -= CROP[1]
                added.append((round(ImageStat.Stat(im.crop((x - width // 3, y - width // 4, x + width // 3, y + width // 4))).mean[0]), name))
        print(p, f"core {core:.0f}", "max piece", max(added), "all", sorted(a for a, _ in added))


if __name__ == "__main__":
    main()
