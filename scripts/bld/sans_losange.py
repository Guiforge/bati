#!/usr/bin/env python3
"""CLEAN track: remove the pale grey footprint plate FLUX copied around the ground of a painted building. By mask, no FLUX, 0 $.

    python3 scripts/bld/sans_losange.py dry   [codes...]   # table of the share removed per stage + boards, writes nothing
    python3 scripts/bld/sans_losange.py apply <code> [stage...]   # all stages when none; plate, then the straight diamond edge; rewrites <stage>.png, backup <stage>.avant-losange.png kept

The plate is flat grey (low chroma, pale) and smooth, with straight edges; the painted ground and stone are textured. So the plate is
the region reached by flooding inward from the transparent outside through pixels that are low chroma, pale and locally smooth.
It prefers leaving a little grey over cutting into the painting: the flood only enters pixels that pass all three tests, and a
region that never touches the outside is never touched. A rerun starts from the backup, so it is idempotent."""

import pathlib
import shutil
import sys
import zlib

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


# --- second pass: the straight cut along the iso diamond, dissolved into an organic edge ---------------------------------
PROF, FONDU = 18, 10  # px: the cut reaches 2 to PROF px in, then fades over FONDU px (max reach 28)
MIN_DROIT = 120  # boundary px in one diamond-direction run (and 45% of the lower boundary; 250 px and 28% for a busy edge) before a stage counts as having the defect
INK = 48  # luma below this is ink: an object standing on the edge keeps its outline and what is within ENCRE px of it
ENCRE = 5


def profondeur(al: np.ndarray, cap: int = 40) -> np.ndarray:
    """Octagonal distance, in px, from the transparent outside (0 outside, 1 first opaque row...), capped."""
    out = al <= SEUIL
    d = np.where(out, 0, cap).astype(np.int16)
    cur = out.copy()
    for k in range(1, cap):
        nxt = _dilate(cur) if k % 2 else _dilate(cur) | _dilate8(cur)
        d[nxt & ~cur & (d == cap)] = k
        cur = nxt
    return d


def _dilate8(m: np.ndarray) -> np.ndarray:
    return _dilate(_dilate(m))


def bruit(code: str, shape: tuple[int, int]) -> np.ndarray:
    """Low-frequency value noise in 0..1, seeded by the building alone: its stages share the canvas, so a shared edge dissolves the same way."""
    rng = np.random.default_rng(zlib.crc32(code.encode()))
    n = np.zeros(shape)
    for cell, wgt in ((64, 0.45), (24, 0.35), (9, 0.2)):
        g = rng.random((shape[0] // cell + 3, shape[1] // cell + 3)).astype(np.float32)
        n += wgt * np.asarray(Image.fromarray(g, "F").resize((g.shape[1] * cell, g.shape[0] * cell), Image.BICUBIC))[: shape[0], : shape[1]]
    return np.clip((n - n.min()) / max(1e-6, n.max() - n.min()), 0, 1)


def plus_long(m: np.ndarray) -> int:
    """Most boundary pixels of `m` in one piece (pieces joined across gaps of 6 px): a diamond side is one long piece, a round blob only short arcs."""
    g = m.copy()
    for _ in range(3):
        g = g | _dilate8(g)
    vu, best = np.zeros_like(g), 0
    h, w = g.shape
    for y, x in zip(*np.nonzero(m)):
        if vu[y, x]:
            continue
        pile, n = [(y, x)], 0
        vu[y, x] = True
        while pile:
            cy, cx = pile.pop()
            n += int(m[cy, cx])
            for ny in range(max(0, cy - 1), min(h, cy + 2)):
                for nx in range(max(0, cx - 1), min(w, cx + 2)):
                    if g[ny, nx] and not vu[ny, nx]:
                        vu[ny, nx] = True
                        pile.append((ny, nx))
        best = max(best, n)
    return best


def bord(rgba: Image.Image, code: str) -> tuple[Image.Image, np.ndarray, int]:
    """Dissolve the straight lower diamond edges (outward normal within ~20 deg of the 1:2 slopes) into an organic edge.
    Returns the image, the mask of pixels touched and the length in px of the straight run found (0: nothing was done)."""
    a = np.asarray(rgba, dtype=float).copy()
    al = a[..., 3]
    h, w = al.shape
    d = profondeur(al)
    ds = np.asarray(Image.fromarray((np.minimum(d, 40) * 6).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)), dtype=float)  # x6: 8-bit blur keeps the slope
    gy, gx = np.gradient(ds)
    nm = np.maximum(np.hypot(gx, gy), 1e-6)
    ny, nx = gy / nm * -1, gx / nm * -1  # outward normal; image y points down, so ny > 0 faces the bottom of the canvas
    droit = (ny >= 0.74) & (np.abs(nx) >= 0.25) & (np.abs(nx) <= 0.62) & (nm > 0.7)
    droit[: max(0, h - BAS)] = False
    run = plus_long(droit & (d == 1))
    bas = int(((d == 1) & (ny > 0.3) & (np.arange(h)[:, None] >= h - BAS)).sum())  # the lower boundary, straight or not
    if not (run >= 250 and run >= 0.28 * bas or run >= MIN_DROIT and run >= 0.45 * bas):
        return rgba, np.zeros_like(droit), 0
    luma = a[..., :3] @ np.array([0.299, 0.587, 0.114])
    objet = (luma < INK) & (al > 200)  # a faint fringe pixel with a dark colour is no ink
    objet = objet | ((a[..., 2] > a[..., 0] + 8) & (a[..., 2] >= a[..., 1] - 6) & (al > 200))  # water and glow are not ground either
    for _ in range(ENCRE):
        objet = objet | _dilate(objet)
    face = (ny >= 0.74) & (nm > 0.7)
    face[: max(0, h - BAS)] = False
    reste = droit.copy()
    for _ in range(14):  # the vertex and the first rows have a different normal: what faces down within 14 px of a straight pixel
        reste = reste | (_dilate(reste) & face)
    zone = reste & (d <= PROF + FONDU) & ~objet & (al > 0)
    zone_large = (d < 40) & face
    seuil = 2 + (PROF - 2) * bruit(code, al.shape)
    f = np.clip((d - seuil) / FONDU, 0, 1)
    f = np.where(zone, f, 1.0)
    a[..., 3] = al * f
    # a protected speck (ink dot, bit of water) cut off from the body would float: reach inward from the deep interior, drop the rest
    plein = a[..., 3] > 140
    reach = plein & (d >= 40)  # the depth cap
    for _ in range(PROF + FONDU + 14):
        nxt = reach | (_dilate8(reach) & plein)
        if (nxt == reach).all():
            break
        reach = nxt
    gardee = reach.copy()
    pale = (a[..., 3] > 0) & ~plein
    for _ in range(FONDU + 4):  # the faded ramp stays where it hangs on the body; a solid chunk joined by it alone does not
        gardee = gardee | (_dilate8(gardee) & pale)
    pres = zone.copy()
    for _ in range(14):  # only beside what was eroded: a gap inside a structure is not our business
        pres = pres | _dilate8(pres)
    a[..., 3] = np.where(zone_large & pres & ~gardee, 0, a[..., 3])
    return Image.fromarray(a.astype(np.uint8), "RGBA"), zone & (f < 1), run


def traite(rgba: Image.Image, code: str) -> tuple[Image.Image, np.ndarray, int]:
    """The whole job for one stage: plate by mask, then the straight edge dissolved."""
    sp, m = retire(rgba)
    sb, mb, run = bord(sp, code)
    return sb, m | mb, run


def part(rgba: Image.Image, apres: Image.Image) -> float:
    """Share of the visible alpha the pass took away."""
    a0 = np.asarray(rgba)[..., 3].astype(float)
    a1 = np.asarray(apres)[..., 3].astype(float)
    return float((a0 - a1).clip(0).sum() / max(1.0, a0.sum()))


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


def survol(code: str, apres: list[Image.Image]) -> None:
    """One sheet per building: every stage after the pass, lower 560 px on the ground colour, at x0.75 so the edge reads."""
    w, h = int(apres[0].width * 0.75), int(560 * 0.75)
    cols = 3
    sheet = Image.new("RGB", (w * cols, h * ((len(apres) + cols - 1) // cols)), (168, 136, 84))
    for i, im in enumerate(apres):
        bg = Image.new("RGBA", im.size, (168, 136, 84, 255))
        bg.alpha_composite(im)
        t = bg.convert("RGB").crop((0, im.height - 560, im.width, im.height)).resize((w, h), Image.LANCZOS)
        sheet.paste(t, ((i % cols) * w, (i // cols) * h))
    sheet.save(OUT / f"{code}-survol.png")


def dry(codes: list[str]) -> None:
    print("code stage removed%")
    for c in codes:
        faits = []
        for s in stades(c):
            im = Image.open(origine(c, s)).convert("RGBA")
            apres, m, run = traite(im, c)
            print(f"{c} {s} {100 * part(im, apres):.2f} run={run}")
            planche(im, apres, m, OUT / f"{c}-{s}.png")
            faits.append(apres)
        survol(c, faits)


SAUF = {"training_dummy"}  # its ink border around the ground is its own style: eroding behind it leaves the border floating as dashes


def apply(code: str, sts: list[str]) -> None:
    """A stage the pass leaves unchanged is not touched and gets no backup (so integrate does not mark it)."""
    if code in SAUF:
        print(f"{code} skipped (see SAUF)")
        return
    for s in sts or stades(code):
        d = SRC / code / "final"
        b = d / f"{s}.avant-losange.png"
        im = Image.open(b if b.exists() else d / f"{s}.png").convert("RGBA")
        apres, m, run = traite(im, code)
        if part(im, apres) == 0:
            print(f"{code} {s} untouched")
            continue
        if not b.exists():
            shutil.copy2(d / f"{s}.png", b)
        apres.save(d / f"{s}.png")
        print(f"{code} {s} {100 * part(im, apres):.2f}% removed, straight run {run}")


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ("dry", "apply"):
        sys.exit(__doc__)
    if sys.argv[1] == "dry":
        dry(sys.argv[2:] or sorted(p.name for p in SRC.iterdir() if (p / "final").is_dir()))
    else:
        apply(sys.argv[2], sys.argv[3:])
