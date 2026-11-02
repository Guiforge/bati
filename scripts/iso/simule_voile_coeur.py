"""Predicts loupe_checks.py core after an extra olive veil over the north clearing, on a real capture.

usage: simule_voile_coeur.py <dump.json> <png> <cx,cy,rx,ry screen px> <extra opacity> [flat share]
The extra layer is a radial ellipse like CLAIRIERE_NORD_ASSOMBRIE (flat to `plat`, linear to 0), olive #2A2C18.
"""
import json, sys
from PIL import Image, ImageDraw
sys.path.insert(0, __file__.rsplit("/", 1)[0])
import loupe_checks as lc

dump = json.load(open(sys.argv[1]))
img = Image.open(sys.argv[2]).convert("RGB")
cx, cy, rx, ry = map(float, sys.argv[3].split(","))
a, plat = float(sys.argv[4]), float(sys.argv[5]) if len(sys.argv) > 5 else 0.45
mask = Image.new("L", img.size, 0)
d = ImageDraw.Draw(mask)
N = 80  # concentric steps, outer to inner
for k in range(N):
    r = 1 - k / N
    t = min(1, (1 - r) / (1 - plat))
    d.ellipse([cx - rx * r, cy - ry * r, cx + rx * r, cy + ry * r], fill=round(255 * a * t))
out = Image.composite(Image.new("RGB", img.size, (0x2A, 0x2C, 0x18)), img, mask)
lines, ok = lc.core(dump, out)
print("\n".join(lines))
# Highest window mean outside the box, for the margin (same windows as core, brute force on the thumbnail).
th = out.reduce(8)
lum = th.convert("L")
bl = [s for s in dump["sprites"] if s.get("layer") == "building"]
x0, x1 = int(min(s["x"] for s in bl) // 8), -int(-max(s["x"] + s["w"] for s in bl) // 8)
y0, y1 = int(min(s["y"] for s in bl) // 8), -int(-max(s["y"] + s["h"] for s in bl) // 8)
bw, bh = x1 - x0, y1 - y0
best = 0
for wy in range(130 // 8, 2340 // 8 - bh + 1, 2):
    for wx in range(0, th.width - bw + 1, 2):
        if max(0, min(wx + bw, x1) - max(wx, x0)) * max(0, min(wy + bh, y1) - max(wy, y0)) < 0.25 * bw * bh:
            best = max(best, lc._stats(lum, (wx, wy, wx + bw, wy + bh))[0])
print(f"highest window mean {best:.1f}")
