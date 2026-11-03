#!/usr/bin/env python3
"""CLEAN track: remove the pale grey footprint plate FLUX copied around the ground of a painted building. By mask, no FLUX, 0 $.

    python3 scripts/bld/sans_losange.py dry   [codes...]   # table of the share removed per stage + boards, writes nothing
    python3 scripts/bld/sans_losange.py apply <code> <stage>...   # rewrites <stage>.png, backup <stage>.avant-losange.png kept

The plate is flat grey (low chroma, pale) and smooth, with straight edges; the painted ground and stone are textured. So the plate is
the region reached by flooding inward from the transparent outside through pixels that are low chroma, pale and locally smooth.
It prefers leaving a little grey over cutting into the painting: the flood only enters pixels that pass all three tests, and a
region that never touches the outside is never touched. A rerun starts from the backup, so it is idempotent."""

import pathlib
import shutil
import sys

import numpy as np
from PIL import Image, ImageFilter

SRC = pathlib.Path("/home/guiforge/Documents/code/bati/.claude/worktrees/iso/docs/designs/village-buildings")
OUT = pathlib.Path(__file__).resolve().parents[2] / "docs/designs/village/clean/scratch/losange"
STADES = ["rough", "solid", "grand", "legendary", "mythic"]
MIN_PIECE = 400  # px of one plate piece (a corner of the diamond is 600 to 2000; painted-edge specks are under 250)
BAS = 560  # rows from the canvas bottom
CHROMA, PALE, LISSE, SEUIL = 16, 105, 5.0, 24  # max-min of RGB, min luma, max local std of luma (5x5), alpha below = outside


def _local_std(luma: np.ndarray, w: np.ndarray, r: int = 2) -> np.ndarray:
    """Std of the luma over the opaque pixels (weight w, 0 or 1) of a (2r+1)^2 window, so a transparent neighbour is no texture."""
    box = lambda x: sum(np.pad(x, r, mode="edge")[dy:dy + x.shape[0], dx:dx + x.shape[1]] for dy in range(2 * r + 1) for dx in range(2 * r + 1))  # noqa: E731
    n = np.maximum(box(w), 1)
    m = box(luma * w) / n
    return np.sqrt(np.maximum(box(luma * luma * w) / n - m * m, 0))


def plaque(rgba: Image.Image, chroma=CHROMA, pale=PALE, lisse=LISSE) -> np.ndarray:
    """Boolean mask of the plate pixels: flood from the transparent outside through low chroma, pale, smooth pixels."""
    a = np.asarray(rgba, dtype=float)
    rgb, al = a[..., :3], a[..., 3]
    luma = rgb @ np.array([0.299, 0.587, 0.114])
    cand = (al > SEUIL) & ((rgb.max(-1) - rgb.min(-1)) <= chroma) & (luma >= pale) & (_local_std(luma, (al > SEUIL).astype(float)) <= lisse)
    cand[: max(0, al.shape[0] - BAS)] = False  # the plate lies on the ground: nothing above the lower BAS rows (a pale glow arc is not it)
    out = al <= SEUIL
    h, w = cand.shape
    reach = np.zeros_like(cand)
    for y, x in zip(*np.nonzero(cand & _dilate(out))):
        if reach[y, x]:
            continue
        comp, pile = [], [(y, x)]
        reach[y, x] = True
        while pile:  # 4-connected flood, one plate piece at a time
            cy, cx = pile.pop()
            comp.append((cy, cx))
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < h and 0 <= nx < w and cand[ny, nx] and not reach[ny, nx]:
                    reach[ny, nx] = True
                    pile.append((ny, nx))
        if len(comp) < MIN_PIECE:  # specks along a painted edge are not a plate
            for cy, cx in comp:
                reach[cy, cx] = False
                cand[cy, cx] = False  # shortcut: a refused piece stays refused, its pixels are never re-entered from another seed
    return reach


def _dilate(m: np.ndarray) -> np.ndarray:
    p = np.pad(m, 1)
    h, w = m.shape
    return p[:h, 1:w + 1] | p[2:, 1:w + 1] | p[1:h + 1, :w] | p[1:h + 1, 2:]


def retire(rgba: Image.Image, **kw) -> tuple[Image.Image, np.ndarray]:
    """The image with the plate transparent (a 1 px soft edge), and the plate mask."""
    m = plaque(rgba, **kw)
    # grow up to two pixels into the antialiased fringe of the plate (low chroma too), then feather
    a = np.asarray(rgba, dtype=float).copy()
    luma = a[..., :3] @ np.array([0.299, 0.587, 0.114])
    grise = ((a[..., :3].max(-1) - a[..., :3].min(-1)) <= CHROMA * 1.5) & (luma >= PALE - 15)
    m2 = m | (_dilate(m) & grise)
    m2 = m2 | (_dilate(m2) & grise & (_local_std(luma, (a[..., 3] > SEUIL).astype(float)) <= LISSE * 2))
    soft = np.asarray(Image.fromarray((m2 * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))) / 255.0
    a[..., 3] = np.where(m2, 0, a[..., 3] * (1 - np.clip((soft - 0.1) / 0.5, 0, 1)))
    return Image.fromarray(a.astype(np.uint8), "RGBA"), m2


def part(rgba: Image.Image, m: np.ndarray) -> float:
    vis = np.asarray(rgba)[..., 3] > SEUIL
    return float((m & vis).sum()) / max(1, int(vis.sum()))


def planche(rgba: Image.Image, apres: Image.Image, m: np.ndarray, dest: pathlib.Path) -> None:
    """Lower 560 px on the real ground colour: before, after, before with the removed pixels in red. Zoom x1 per panel."""
    def sur_sol(im):
        bg = Image.new("RGBA", im.size, (168, 136, 84, 255))
        bg.alpha_composite(im)
        return bg.convert("RGB").crop((0, im.height - 560, im.width, im.height))
    avant = sur_sol(rgba)
    rouge = np.asarray(avant).copy()
    mm = m[-560:]
    rouge[mm] = (255, 0, 0)
    w, h = avant.size
    pl = Image.new("RGB", (w * 3, h))
    for i, p in enumerate((avant, sur_sol(apres), Image.fromarray(rouge))):
        pl.paste(p, (i * w, 0))
    dest.parent.mkdir(parents=True, exist_ok=True)
    pl.save(dest)


def stades(code: str) -> list[str]:
    return [s for s in STADES if (SRC / code / "final" / f"{s}.png").exists()]


def origine(code: str, s: str) -> pathlib.Path:
    """The backup if there is one (never overwritten), else the source."""
    d = SRC / code / "final"
    b = d / f"{s}.avant-losange.png"
    return b if b.exists() else d / f"{s}.png"


def dry(codes: list[str]) -> None:
    print("code stage removed%")
    for c in codes:
        for s in stades(c):
            im = Image.open(origine(c, s)).convert("RGBA")
            apres, m = retire(im)
            print(f"{c} {s} {100 * part(im, m):.2f}")
            planche(im, apres, m, OUT / f"{c}-{s}.png")


def apply(code: str, sts: list[str]) -> None:
    for s in sts:
        d = SRC / code / "final"
        b = d / f"{s}.avant-losange.png"
        if not b.exists():
            shutil.copy2(d / f"{s}.png", b)
        im = Image.open(b).convert("RGBA")
        apres, m = retire(im)
        apres.save(d / f"{s}.png")
        print(f"{code} {s} {100 * part(im, m):.2f}% removed")


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ("dry", "apply"):
        sys.exit(__doc__)
    if sys.argv[1] == "dry":
        dry(sys.argv[2:] or sorted(p.name for p in SRC.iterdir() if (p / "final").is_dir()))
    else:
        apply(sys.argv[2], sys.argv[3:])
