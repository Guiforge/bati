"""Print every boss image whose edge is a white frame (mean brightness > 0.9 over a 3 px band).

Used by __tests__/boss-art-frames.test.ts: no webp decoder lives in node_modules, Pillow does.
Exit 0 and print nothing when clean; exit 2 when Pillow is missing.
"""
import sys
from pathlib import Path

try:
    from PIL import Image, ImageStat
except ImportError:
    sys.exit(2)

DEPTH = 3
LIMIT = 0.9
root = Path(__file__).resolve().parent.parent / "assets" / "images" / "bosses"
for path in sorted(root.glob("*.webp")):
    im = Image.open(path).convert("L")
    w, h = im.size
    bands = {
        "top": (0, 0, w, DEPTH),
        "bottom": (0, h - DEPTH, w, h),
        "left": (0, 0, DEPTH, h),
        "right": (w - DEPTH, 0, w, h),
    }
    for side, box in bands.items():
        mean = ImageStat.Stat(im.crop(box)).mean[0] / 255
        if mean > LIMIT:
            print(f"{path.name} {side} {mean:.2f}")
