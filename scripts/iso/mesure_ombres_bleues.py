#!/usr/bin/env python3
"""Loupe BC criterion 10 (slate shadows): on a capture and a screen rect, the darkest 10 % of the pixels must lean blue.

    python3 scripts/iso/mesure_ombres_bleues.py <capture.png> <x,y,w,h> [--share 0.10]

The rect is in capture pixels and should hold ground only (a tile or a few: a rect over sprites measures the sprites).
Pixels are ranked by luma; for the darkest `share`, prints the mean R, G, B and the share of pixels with B > R and
with B > G. PASS when the means satisfy B > R and B > G (the contract's wording), exit code 1 otherwise. Pillow only.
"""
import argparse
import sys

from PIL import Image


def measure(img, rect, share=0.10):
    x, y, w, h = rect
    px = list(img.convert("RGB").crop((x, y, x + w, y + h)).getdata())
    px.sort(key=lambda p: 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2])
    dark = px[: max(1, int(len(px) * share))]
    n = len(dark)
    mean = [sum(p[k] for p in dark) / n for k in range(3)]
    return {
        "n": n,
        "mean_rgb": [round(m, 1) for m in mean],
        "share_b_gt_r": round(sum(p[2] > p[0] for p in dark) / n, 3),
        "share_b_gt_g": round(sum(p[2] > p[1] for p in dark) / n, 3),
        "pass": mean[2] > mean[0] and mean[2] > mean[1],
    }


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("capture")
    ap.add_argument("rect", help="x,y,w,h in capture px")
    ap.add_argument("--share", type=float, default=0.10)
    a = ap.parse_args(argv)
    r = measure(Image.open(a.capture), tuple(int(v) for v in a.rect.split(",")), a.share)
    print(r)
    print("PASS" if r["pass"] else "FAIL")
    return 0 if r["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
