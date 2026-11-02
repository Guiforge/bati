"""Loupe BC series 2: a real crop of the in-game day terrain (the 12 terrain_*.webp tiles form one picture).

The tiles sit in a 3 columns x 4 rows mosaic, 1656 x 1614 px each. Boxes are in 'sheet units' (4 real px per unit,
x0 and y0 as read on a contact sheet of 414 x 404 per tile).
"""
import pathlib

from PIL import Image

ISO = pathlib.Path(__file__).resolve().parents[2] / "assets/images/village/iso"
_T: dict = {}


def tile(a, b):
    if (a, b) not in _T:
        _T[(a, b)] = Image.open(ISO / f"sol/terrain_{a}{b}.webp").convert("RGB")
    return _T[(a, b)]


def crop(x0, y0, x1, y1):
    """Real pixels of the mosaic for a box in sheet units."""
    x0, y0, x1, y1 = x0 * 4, y0 * 4, x1 * 4, y1 * 4
    out = Image.new("RGB", (x1 - x0, y1 - y0))
    for a in range(4):
        for b in range(3):
            tx, ty = b * 1656, a * 1614
            if tx + 1656 <= x0 or tx >= x1 or ty + 1614 <= y0 or ty >= y1:
                continue
            out.paste(tile(a, b), (tx - x0, ty - y0))
    return out


def crop_px(x0, y0, x1, y1):
    """Same, in real pixels of the whole terrain (4968 x 6456)."""
    return crop(x0 // 4, y0 // 4, -(-x1 // 4), -(-y1 // 4)).crop((x0 % 4, y0 % 4, x0 % 4 + x1 - x0, y0 % 4 + y1 - y0))


def tile_px(i, j):
    """Pixel of tile (i, j)'s middle on the whole terrain (cuire_sol.centre_px)."""
    return round(((i - j) * 24 + 480 + 348) * 3), round(((i + j + 1) * 12 + 836) * 3)
