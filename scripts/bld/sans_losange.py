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
from PIL import Image, ImageDraw, ImageFilter

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


def bord_v2(rgba: Image.Image, code: str) -> tuple[Image.Image, np.ndarray, int]:
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


# --- third pass: ground edges all around the footprint, never above the ground zone ----------------------------------------
CLE = np.array([255.0, 0.0, 255.0])
BANDE = 12  # px: magenta decontamination reaches this deep, fading to nothing
V2 = {"fountain", "tent", "wizard_tower", "watchtower"}  # the judge passed these on the second pass: their edge stays as it was
CONTOUR = {("training_dummy", None)}  # (code, stage or None for all): an ink contour runs along the ground edge
MARGE_POLY = 52  # px around the footprint diamond's edges where the ground edge may be dissolved
BAS_SEUL = {("quarry", "rough")}
PETIT = 700  # px: a detached bit smaller than this, low on the canvas, is a speck
FONDU_3 = 14
PROF_3 = 12
_EMP: dict = {}
STRONG = {("farm", "rough"), ("farm", "solid"), ("farm", "grand"), ("heroes_hall", "solid"), ("heroes_hall", "grand"), ("castle_wall", "grand")}  # the lower diagonals still read as a diamond: a deeper, longer ramp, and only dense outlines count as an object
PROF_S, FONDU_S, MARGE_S = 20, 16, 52
SOMBRE = {"windmill"}  # dark key-contaminated patches on the ground edge (luma and chroma low), flooded from the outside
SANS_PLAQUE = {("quarry", "rough")}  # a pale sandy patch of the painting itself reads as a plate: the mask bit a hole in the ground
FLOTTANT = {("barn", "mythic"): (20, 4000, BAS)}  # (alpha floor, px, rows from the bottom): detached shadows are faint, so the speck pass looks lower and takes bigger bits
OUVERTURE = {("barn", "mythic"): (770, 60, 878, 280, 21)}  # (x0, y0, x1, y1 in the lower BAS rows, window): thin spurs and detached dark bits there are opened away
TROUS = {("quarry", "rough")}  # dithered, semi-transparent ground inside the body must not count as outside, or the ramp bites a hole there
POINTE = {"training_dummy", ("castle_wall", "solid")}  # the lowest vertex of the diamond is a thin tail under the ground: cut it


def emprise_pts(code: str, h: int) -> list[tuple[float, float]]:
    """The footprint diamond on a canvas of height h (its lowest corner 64 px above the bottom), as final.py draws it."""
    import json
    if not _EMP:
        _EMP.update(json.loads((pathlib.Path(__file__).resolve().parents[2] / "constants/isoSpec.json").read_text())["batiments"])
    a, b = _EMP[code]["emprise"]
    cell, w, bottom = 192, 896, h - 64
    x0, y0 = w // 2 - (a - b) * cell, bottom - (a + b) * cell // 2
    return [(x0 + (gx - gy) * cell, y0 + (gx + gy) * cell // 2) for gx, gy in ((0, 0), (a, 0), (a, b), (0, b))]


def pres_du_losange(code: str, shape: tuple[int, int], marge: float = MARGE_POLY) -> np.ndarray:
    """Pixels within `marge` px of an edge of the footprint diamond (inside or outside)."""
    h, w = shape
    pts = emprise_pts(code, h)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    best = np.full(shape, 1e9, np.float32)
    for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]):
        dx, dy = x2 - x1, y2 - y1
        t = np.clip(((xx - x1) * dx + (yy - y1) * dy) / (dx * dx + dy * dy), 0, 1)
        best = np.minimum(best, np.hypot(xx - (x1 + t * dx), yy - (y1 + t * dy)))
    return best <= marge


def decontamine(a: np.ndarray, d: np.ndarray, bande: int = BANDE) -> np.ndarray:
    """Pull the magenta of the key out of the silhouette's last BANDE px: where R and B both exceed G, take their common excess
    away, fading with depth; a pixel close to the pure key loses alpha. RGB and alpha in the band only; warm reds (B below G) are
    untouched because the common excess min(R-G, B-G) is zero there."""
    out = a.copy()
    w = np.clip(1.0 - (d - 1) / bande, 0, 1)
    w[d == 0] = 0
    g = a[..., 1]
    ex = np.maximum(np.minimum(a[..., 0] - g, a[..., 2] - g), 0) * w
    out[..., 0] -= ex
    out[..., 2] -= ex
    rose = (np.abs(a[..., 2] - g) <= 12) & (a[..., 0] - g > 15) & (a[..., 0] - g <= 80)  # the key unmixed leaves R high, G and B level
    out[..., 0] -= np.where(rose, 0.85 * (a[..., 0] - g), 0) * w
    dist = np.linalg.norm(a[..., :3] - CLE, axis=-1)
    quasi = np.clip((dist - 40) / 90, 0, 1)  # 0 at the key itself, 1 from 130 away
    out[..., 3] = np.where((w > 0) & (dist < 130), a[..., 3] * quasi, a[..., 3])
    return out


def couches(d: np.ndarray, graines_sol: np.ndarray, graines_obj: np.ndarray, prof: int) -> tuple[np.ndarray, np.ndarray]:
    """Type of every pixel within `prof` px of the outside by its nearest boundary seed, layer by layer, objects win a tie."""
    sol, obj = graines_sol.copy(), graines_obj.copy()
    for k in range(2, prof + 1):
        lay = d == k
        o = _dilate8(obj) & lay
        g = _dilate8(sol) & lay & ~o
        obj |= o
        sol |= g
    return sol, obj


def detache(al: np.ndarray, d: np.ndarray, h: int, seuil: int = 128, petit: int = PETIT, haut: int = 420) -> np.ndarray:
    """Specks: opaque bits not reached from the body (half resolution flood from the deep interior), small, low on the canvas."""
    hh, ww = al.shape[0] // 2 * 2, al.shape[1] // 2 * 2
    pl = (al[:hh, :ww] > seuil).reshape(hh // 2, 2, ww // 2, 2).max(axis=(1, 3))
    reach = (d[:hh, :ww] >= 27).reshape(hh // 2, 2, ww // 2, 2).max(axis=(1, 3)) & pl
    for _ in range(600):
        nxt = (reach | _dilate8(reach) | _dilate8(_dilate8(reach))) & pl  # bridges a 2 px gap at half resolution
        if (nxt == reach).all():
            break
        reach = nxt
    gone = pl & ~reach
    kill = np.zeros_like(gone)
    seen = np.zeros_like(gone)
    for y, x in zip(*np.nonzero(gone)):
        if seen[y, x]:
            continue
        pile, comp = [(y, x)], []
        seen[y, x] = True
        while pile:
            cy, cx = pile.pop()
            comp.append((cy, cx))
            for ny in range(max(0, cy - 1), min(gone.shape[0], cy + 2)):
                for nx in range(max(0, cx - 1), min(gone.shape[1], cx + 2)):
                    if gone[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        pile.append((ny, nx))
        if len(comp) * 4 < petit and min(c[0] for c in comp) * 2 > h - haut:
            for cy, cx in comp:
                kill[cy, cx] = True
    full = np.zeros(al.shape, bool)
    full[:hh, :ww] = kill.repeat(2, 0).repeat(2, 1)
    return full & (al > 0)


def bruit_doux(code: str, shape: tuple[int, int]) -> np.ndarray:
    """Like bruit() without the finest octave: the edge wanders, it does not tear."""
    rng = np.random.default_rng(zlib.crc32(code.encode()))
    n = np.zeros(shape)
    for cell, wgt in ((72, 0.55), (30, 0.45)):
        g = rng.random((shape[0] // cell + 3, shape[1] // cell + 3)).astype(np.float32)
        n += wgt * np.asarray(Image.fromarray(g, "F").resize((g.shape[1] * cell, g.shape[0] * cell), Image.BICUBIC))[: shape[0], : shape[1]]
    return np.clip((n - n.min()) / max(1e-6, n.max() - n.min()), 0, 1)


def sombres(a: np.ndarray, d: np.ndarray) -> np.ndarray:
    """Dark, grey patches (luma under 108, chroma under 45) within 36 px of the outside, reached from it, 150 px or more: key contamination, not ground."""
    h = a.shape[0]
    luma = a[..., :3] @ np.array([0.299, 0.587, 0.114])
    cand = (a[..., 3] > SEUIL) & (luma < 108) & ((a[..., :3].max(-1) - a[..., :3].min(-1)) < 45) & (d <= 36)
    cand[: h - BAS] = False
    reach = np.zeros_like(cand)
    hh, ww = cand.shape
    for y, x in zip(*np.nonzero(cand & (d == 1))):
        if reach[y, x]:
            continue
        comp, pile = [], [(y, x)]
        reach[y, x] = True
        while pile:
            cy, cx = pile.pop()
            comp.append((cy, cx))
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < hh and 0 <= nx < ww and cand[ny, nx] and not reach[ny, nx]:
                    reach[ny, nx] = True
                    pile.append((ny, nx))
        if len(comp) < 150:
            for cy, cx in comp:
                reach[cy, cx] = False
                cand[cy, cx] = False
    return reach | (_dilate(reach) & cand)


def pointe(al: np.ndarray, h: int) -> np.ndarray:
    """Pixels of the thin tail under the ground: below the lowest row 80 px wide, fading over 10 rows above it."""
    n = (al > 128).sum(1)
    larges = np.nonzero(n >= 80)[0]
    cut = np.zeros(al.shape[0])
    if len(larges):
        y0 = larges.max()
        cut[y0 + 1:] = 1
        cut[y0 - 9:y0 + 1] = np.linspace(0.9, 0.0, 10)
    return cut


def bord3(rgba: Image.Image, code: str, stade: str) -> tuple[Image.Image, np.ndarray, dict]:
    """Decontaminate the fringe, then dissolve every ground edge of the footprint (all four sides, and where painted ground meets
    the canvas edge) into an organic one, and drop detached specks. Nothing above the ground zone moves."""
    a = np.asarray(rgba, dtype=float).copy()
    h, w = a.shape[:2]
    al0 = a[..., 3].copy()
    a = decontamine(a, profondeur(al0), 28 if code in SOMBRE else BANDE)  # windmill: the pink of the key reaches deeper into its ground
    if code in SOMBRE:
        a[..., 3] = np.where(sombres(a, profondeur(a[..., 3])) & pres_du_losange(code, (h, w), MARGE_S) & (np.arange(h)[:, None] >= sorted(p[1] for p in emprise_pts(code, h))[1] + 30), 0, a[..., 3])
    al = a[..., 3]
    fort = (code, stade) in STRONG
    prof3, fondu3 = (PROF_S, FONDU_S) if fort else (PROF_3, FONDU_3)
    luma = a[..., :3] @ np.array([0.299, 0.587, 0.114])
    ink = (luma < 62) & (al > 200)
    P = pres_du_losange(code, (h, w), MARGE_S if (code, stade) in STRONG else MARGE_POLY)
    info: dict = {}
    # a painted contour along the ground edge (training_dummy, quarry rough): drop its outer band, the ground then fades like any other
    if (code, None) in CONTOUR or (code, stade) in CONTOUR:
        d0 = profondeur(al)
        ds0 = np.asarray(Image.fromarray((np.minimum(d0, 40) * 6).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)), dtype=float)
        gy, gx = np.gradient(ds0)
        nm = np.maximum(np.hypot(gx, gy), 1e-6)
        diam = (np.abs(gy) / nm >= 0.74) & (np.abs(gx / nm) >= 0.25) & (np.abs(gx / nm) <= 0.62) & (nm > 0.7)  # a diamond-direction edge
        s_d, o_d = couches(d0, (d0 == 1) & (al > SEUIL) & diam, (d0 == 1) & (al > SEUIL) & ~diam, 10)
        outer = ink & (d0 <= 10) & P & s_d & ~o_d
        outer = outer | (ink & (d0 <= 7) & (stade != "rough") & (np.arange(h)[:, None] >= h - BAS + 60))  # the contour on every side, not only along the diamond directions (the painting is wider than its footprint, so no P)
        al = np.where(outer, 0, al)
        a[..., 3] = al
        luma = a[..., :3] @ np.array([0.299, 0.587, 0.114])
        ink = (luma < 62) & (al > 200)
        info["contour"] = int(outer.sum())
    cap, sc = (64, 3) if fort else (40, 6)  # depth cap and its 8-bit scale (the strong ramp is deeper than 40)
    al_d = al
    if (code, stade) in TROUS:  # only the transparency connected to the canvas border is outside
        mk = Image.fromarray(((al <= SEUIL) * 255).astype(np.uint8))
        ImageDraw.floodfill(mk, (0, 0), 128)
        al_d = np.where((np.asarray(mk) == 255) & (al > 0), 255, al)  # an enclosed hole is body
    d = profondeur(np.pad(al_d, 1), cap)[1:-1, 1:-1]  # the canvas border counts as outside
    bord_toile = np.zeros((h, w), bool)
    bord_toile[:, 0] = bord_toile[:, -1] = bord_toile[0, :] = bord_toile[-1, :] = True
    bord_toile &= al > SEUIL
    ink_near = ink.copy()
    for _ in range(8):
        ink_near = ink_near | _dilate(ink_near)
    seed = (d == 1) & (al > SEUIL)
    dsv = np.asarray(Image.fromarray((np.minimum(d, 40) * 6).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5)), dtype=float)
    gyv, gxv = np.gradient(dsv)
    nmv = np.maximum(np.hypot(gxv, gyv), 1e-6)
    vertical = (np.abs(gxv) / nmv >= 0.93) & (nmv > 0.7)  # a vertical cut: the canvas edge, or its margin
    vertical &= (np.arange(w)[None, :] <= 18) | (np.arange(w)[None, :] >= w - 19)
    seed_toile = seed & (bord_toile | vertical)
    seed_alpha = seed & ~(bord_toile | vertical)
    bas = np.zeros((h, w), bool)
    bas[h - BAS:] = True
    if fort:  # a dark soil rim is not an object: only dense outlines (fence posts, barrels) are
        pd = np.pad((luma < 40).astype(np.float32) * (al > 200), 8)
        ink_near = ink_near & (sum(pd[dy:dy + h, dx:dx + w] for dy in range(17) for dx in range(17)) > 110)
        ink = ink & ink_near
    sol, obj = couches(d, seed_alpha & ~ink_near, seed_alpha & ink_near, prof3 + fondu3)
    zone = sol & P & ~obj
    ink40 = (luma < 40) & (al > 200)
    pad40 = np.pad(ink40.astype(np.float32), 8)
    dense = sum(pad40[dy:dy + h, dx:dx + w] for dy in range(17) for dx in range(17))
    ink40_near = dense > 45  # an object's outline is dense; a pebble or a tuft on the ground is not
    sol_t, obj_t = couches(d, seed_toile & ~ink40_near & bas, seed_toile & (ink40_near | ~bas), prof3 + fondu3)
    zt = sol_t & ~obj_t & bas
    zone_all = zone | zt
    prot = ink.copy()
    for _ in range(3):  # ink of an object standing in the zone: kept, and what hugs it
        prot = prot | _dilate(prot)
    zone_all &= ~prot
    if (code, stade) in BAS_SEUL:  # a stone face stands on the upper sides: only the two lower sides of the diamond dissolve
        ys = [p[1] for p in emprise_pts(code, h)]
        zone_all &= np.arange(h)[:, None] >= sorted(ys)[1] - 10
    if fort:  # the lower diagonals only: from the side vertices down
        zone_all &= np.arange(h)[:, None] >= sorted(p[1] for p in emprise_pts(code, h))[1] + 25
    # smoothed depth, a softer ramp: no torn paper
    ds = np.asarray(Image.fromarray((np.minimum(d, cap) * sc).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.2)), dtype=float) / sc
    seuil = 2 + (prof3 - 2) * bruit_doux(code, (h, w))
    t = np.clip((ds - seuil) / fondu3, 0, 1)
    f = np.where(zone_all, t * t * (3 - 2 * t), 1.0)
    a[..., 3] = al * f
    # what the ramp cut off from the body would float: reach inward from the deep interior, drop the rest near the zone
    plein = a[..., 3] > 140
    reach = plein & (d >= prof3 + fondu3 + 1)
    for _ in range(prof3 + fondu3 + 14):
        nxt = reach | (_dilate8(reach) & plein)
        if (nxt == reach).all():
            break
        reach = nxt
    gardee = reach.copy()
    pale = (a[..., 3] > 0) & ~plein
    for _ in range(fondu3 + 4):
        gardee = gardee | (_dilate8(gardee) & pale)
    pres = zone_all.copy()
    for _ in range(14):
        pres = pres | _dilate8(pres)
    if (code, stade) in TROUS:
        pres[:] = False  # no cleanup of floating bits here: the dithered ground is made of them
    a[..., 3] = np.where((d < cap) & pres & ~gardee, 0, a[..., 3])
    flou = np.asarray(Image.fromarray(a[..., 3].astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6)), dtype=float)  # stairs, dither
    a[..., 3] = np.where(pres & (d < cap) & (a[..., 3] < 250), np.where(flou < 14, 0, flou), a[..., 3])
    pet = detache(a[..., 3], d, h, *FLOTTANT.get((code, stade), (128, PETIT, 420)))  # bits detached from the body, low on the canvas
    if (code, stade) in OUVERTURE:
        x0, y0, x1, y1, k = OUVERTURE[(code, stade)]
        m8 = Image.fromarray(((a[..., 3] > 20) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(k)).filter(ImageFilter.MaxFilter(k))
        sp = (np.asarray(m8) == 0) & (a[..., 3] > 0)
        box = np.zeros(sp.shape, bool)
        box[h - BAS + y0:h - BAS + y1, x0:x1] = True
        a[..., 3] = np.where(sp & box, 0, a[..., 3])
    if code in POINTE or (code, stade) in POINTE:
        a[..., 3] = a[..., 3] * (1 - pointe(a[..., 3], h))[:, None]
    a[..., 3] = np.where(pet, 0, a[..., 3])
    info["specks"] = int(pet.sum())
    info["zone"] = int(zone_all.sum())
    info["toile"] = int(zt.sum())
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA"), np.abs(a[..., 3] - al0) > 0.5, info


def traite(rgba: Image.Image, code: str, stade: str = "") -> tuple[Image.Image, np.ndarray, dict]:
    """The whole job for one stage: plate by mask, then the third pass (or the second one, plus the fringe, for the codes the judge passed)."""
    sp, m = (rgba, np.zeros(rgba.size[::-1], bool)) if (code, stade) in SANS_PLAQUE else retire(rgba)
    if code in V2:
        sb, mb, run = bord_v2(sp, code)
        a = np.asarray(sb, dtype=float).copy()
        a = decontamine(a, profondeur(a[..., 3]))
        return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA"), m | mb, {"v2": run}
    sb, mb, info = bord3(sp, code, stade)
    return sb, m | mb, info


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
    """A `<stage>.edit.png` (a FLUX edit written beside the source) wins, then the backup (never overwritten), else the source."""
    d = SRC / code / "final"
    for n in (f"{s}.edit.png", f"{s}.avant-losange.png"):
        if (d / n).exists():
            return d / n
    return d / f"{s}.png"


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
    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "iso"))
    from famille_jour import nuit  # the night grade of the family, as integrate.py applies it

    sheet = Image.new("RGB", sheet.size, (40, 48, 60))
    for i, im in enumerate(apres):
        n = nuit(im, None)
        bg = Image.new("RGBA", im.size, (40, 48, 60, 255))
        bg.alpha_composite(n)
        t = bg.convert("RGB").crop((0, im.height - 560, im.width, im.height)).resize((w, h), Image.LANCZOS)
        sheet.paste(t, ((i % cols) * w, (i // cols) * h))
    sheet.save(OUT / f"{code}-survol-nuit.png")


def dry(codes: list[str]) -> None:
    print("code stage removed%")
    for c in codes:
        faits = []
        for s in stades(c):
            im = Image.open(origine(c, s)).convert("RGBA")
            apres, m, info = traite(im, c, s)
            print(f"{c} {s} {100 * part(im, apres):.2f} {info}")
            planche(im, apres, m, OUT / f"{c}-{s}.png")
            faits.append(apres)
        survol(c, faits)


SAUF: set = set()


def apply(code: str, sts: list[str]) -> None:
    """A stage the pass leaves unchanged is not touched and gets no backup (so integrate does not mark it)."""
    if code in SAUF:
        print(f"{code} skipped (see SAUF)")
        return
    for s in sts or stades(code):
        d = SRC / code / "final"
        b = d / f"{s}.avant-losange.png"
        im = Image.open(origine(code, s)).convert("RGBA")
        apres, m, info = traite(im, code, s)
        if np.array_equal(np.asarray(im), np.asarray(apres)):
            print(f"{code} {s} untouched")
            continue
        if not b.exists():
            shutil.copy2(d / f"{s}.png", b)
        apres.save(d / f"{s}.png")
        print(f"{code} {s} {100 * part(im, apres):.2f}% removed, {info}")


# --- element cut-outs: key magenta left inside the frame or in the shadow ----------------------------------------------------
ELEMENTS_CLE = ["high_road/teaser_r8", "observatory/gag_2", "champion_arena/gag_4", "archery_range/teaser_r9_great_frame",
                "fountain/teaser_b8_curved_former", "observatory/gag_3", "champion_arena/gag_2", "dragon_lair/gag_3", "farm/gag_6",
                "high_road/gag_9"]  # the 10 of the 176 elements the scan flagged; observatory/gag_9 is clean at source, it only needs re-integrating


def cle_element(rgba: Image.Image) -> Image.Image:
    """Key magenta left in an element: a mauve region (R and B both 28+ above G) of 120 px or more becomes transparent (enclosed key,
    key shadow); small mauve bits and the 3 px ring around what was cleared lose their magenta (RGB only)."""
    a = np.asarray(rgba, dtype=float).copy()
    m = np.minimum(a[..., 0] - a[..., 1], a[..., 2] - a[..., 1])
    mauve = (a[..., 3] > 128) & (m > 28)
    h, w = mauve.shape
    vu = np.zeros_like(mauve)
    gros = np.zeros_like(mauve)
    for y, x in zip(*np.nonzero(mauve)):
        if vu[y, x]:
            continue
        pile, comp = [(y, x)], []
        vu[y, x] = True
        while pile:
            cy, cx = pile.pop()
            comp.append((cy, cx))
            for ny in range(max(0, cy - 1), min(h, cy + 2)):
                for nx in range(max(0, cx - 1), min(w, cx + 2)):
                    if mauve[ny, nx] and not vu[ny, nx]:
                        vu[ny, nx] = True
                        pile.append((ny, nx))
        if len(comp) >= 120:
            for cy, cx in comp:
                gros[cy, cx] = True
    ring = gros.copy()
    for _ in range(3):
        ring = ring | _dilate8(ring)
    a[..., 3] = np.where(gros, 0, a[..., 3])
    fix = ((mauve & ~gros) | (ring & ~gros & (m > 8)) | (m > 16)) & (a[..., 3] > 0)  # a mauve shadow, however faint, goes neutral
    both = fix & (a[..., 0] > a[..., 1]) & (a[..., 2] > a[..., 1])
    a[..., 0] = np.where(both, a[..., 1], a[..., 0])  # R and B down to G where both exceed it: the mauve goes neutral
    a[..., 2] = np.where(both, a[..., 1], a[..., 2])
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGBA")


def cle_apply(spec: str) -> None:
    code, name = spec.split("/")
    d = SRC / code / "final" / "elements"
    b = d / f"{name}.avant-cle.png"
    if not b.exists():
        shutil.copy2(d / f"{name}.png", b)
    im = Image.open(b).convert("RGBA")
    out = cle_element(im)
    out.save(d / f"{name}.png")
    print(spec, f"{100 * part(im, out):.2f}% alpha removed")


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] not in ("dry", "apply", "cle"):
        sys.exit(__doc__)
    if sys.argv[1] == "cle":
        for sp in sys.argv[2:] or ELEMENTS_CLE:
            cle_apply(sp)
        sys.exit(0)
    if sys.argv[1] == "dry":
        dry(sys.argv[2:] or sorted(p.name for p in SRC.iterdir() if (p / "final").is_dir()))
    else:
        apply(sys.argv[2], sys.argv[3:])
