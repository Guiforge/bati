#!/usr/bin/env python3
"""Windmill r1 probes, round 4, step A: the painting maquettes with soft local light, and the diagonal measure.

    python3 scripts/bld/sondes4_maquettes.py render    # five stages + the ribbons + the rough sails, into sondes4/maquettes/
    python3 scripts/bld/sondes4_maquettes.py measure   # iso-line tilt of the shaft bands, sondes3 (before) vs sondes4 (after)

Round 3's maquette had no cast shadow (occludedRatio 0, nothing flagged in the classes map): the diagonals came from
maquette_peinture.soften, whose 70 px blur of one global lit field let the dark roof and the dark gallery deck leak into each
short band of shaft. The iso-lines of the stone tilted by about 30 degrees; FLUX read them as straight cast shadows. LOCAL_LIGHT
blurs the lit field inside each material instead. Rough and solid have no gallery: the measure says whether they moved.
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import maquette_peinture as M  # noqa: E402
import numpy as np  # noqa: E402
from PIL import Image, ImageFilter  # noqa: E402

R1 = pathlib.Path("/home/guiforge/Documents/code/bati/.claude/worktrees/iso/docs/designs/village-buildings/windmill/r1")
BEFORE, AFTER = R1 / "sondes3/maquettes", R1 / "sondes4/maquettes"
STAGES = ["rough", "solid", "grand", "legendary", "mythic"]
# stone shaft bands (px y) read off the round 3 maquettes; grand and up: under the roof, then under the gallery
BANDS = {"rough": [(930, 1030)], "solid": [(830, 940), (1000, 1100)], "grand": [(680, 790), (860, 1000)],
         "legendary": [(680, 790), (860, 1000)], "mythic": [(660, 790), (860, 1000)]}


def render():
    M.LOCAL_LIGHT = True
    AFTER.mkdir(parents=True, exist_ok=True)
    for s in STAGES:
        pe, mk = AFTER / f"{s}.peinture.png", AFTER / f"{s}.mask.png"
        if not pe.exists():
            M.render(f"pilote/windmill_{s}", pe, mk)
    for name, out in (("windmill_rubans", "rubans.peinture.png"), ("windmill_sails_rough", "sails_rough.peinture.png")):
        if not (AFTER / out).exists():
            M.render(f"pilote/{name}", AFTER / out)


def is_mag(a):
    return (a[..., 0] > 200) & (a[..., 2] > 200) & (a[..., 1] < 80)


def stone_sel(path, y0, y1, x0=200, x1=760, painted=False):
    """(luminance of the image, raw luminance, mask) of the stone over the rows y0..y1: ink, roof, deck and a 6 px margin left
    out. `painted`: a FLUX cut, the alpha is the mask and the luminance is blurred (sigma 10) to average the stone texture out."""
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im, float)
    mag = is_mag(a[..., :3]) | (a[..., 3] < 255)
    lum = np.asarray(im.convert("RGB").filter(ImageFilter.GaussianBlur(10 if painted else 3)).convert("L"), float)
    raw = a[..., :3] @ [0.299, 0.587, 0.114]
    ok = ~mag & (raw > (90 if painted else 120))
    ok = np.asarray(Image.fromarray((ok * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(13)), bool)
    sel = np.zeros_like(ok)
    sel[y0:y1, x0:x1] = ok[y0:y1, x0:x1]
    return lum, raw, sel


def _gauss(a, sigma):
    """Separable Gaussian blur of a float array, zero outside it (np.convolve 'same' misbehaves when the kernel is longer)."""
    n = int(3 * sigma)
    k = np.exp(-0.5 * (np.arange(-n, n + 1) / sigma) ** 2)
    k /= k.sum()
    for axis in (0, 1):
        pad = [(0, 0), (0, 0)]
        pad[axis] = (n, n)
        a = np.apply_along_axis(lambda v: np.convolve(v, k, "valid"), axis, np.pad(a, pad))
    return a


def iso_tilt(path, y0, y1, painted=False, stage=None):
    """Structure tensor of the stone's light over the rows y0..y1, on the stone only, the field smoothed inside the mask so what
    lies beyond it (ink, roof, deck) never leaks in: sigma 3 for a maquette, 20 for a paint, which averages its strokes out. A
    paint is read through its stage's sondes4 maquette stone mask (same geometry for every round), its own ink left out.
    tilt_deg: angle of the iso-lines from the vertical (0 = vertical iso-lines, a clean light turning round the shaft;
    +-45 = diagonal). vert_over_horiz: rms vertical gradient over rms horizontal (1 = as much darkening up and down as across)."""
    if painted:
        _, _, sel = stone_sel(AFTER / f"{stage}.peinture.png", y0, y1)
        im = Image.open(path).convert("RGBA")
        a = np.asarray(im, float)
        raw = a[..., :3] @ [0.299, 0.587, 0.114]
        sel = sel & (raw > 60) & (a[..., 3] == 255)
    else:
        _, raw, sel = stone_sel(path, y0, y1)
    if sel.sum() < 500:
        return None
    ys, xs = np.nonzero(sel)
    sl = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
    m = sel[sl].astype(float)
    sigma = 20 if painted else 3
    f = _gauss(raw[sl] * m, sigma) / np.maximum(_gauss(m, sigma), 1e-3)
    core = np.asarray(Image.fromarray((sel[sl] * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(17)), bool)
    gy, gx = np.gradient(f)
    if core.sum() < 300:
        return None
    jxx, jyy, jxy = (gx[core] ** 2).sum(), (gy[core] ** 2).sum(), (gx[core] * gy[core]).sum()
    theta = 0.5 * np.arctan2(2 * jxy, jxx - jyy)  # gradient direction, from the horizontal
    # the hardest edge: 99th percentile of the gradient of the field smoothed at sigma 6, in luminance levels per 20 px
    f6 = _gauss(raw[sl] * m, 6) / np.maximum(_gauss(m, 6), 1e-3)
    g6 = np.hypot(*np.gradient(f6))
    return {"tilt_deg": round(float(np.degrees(theta)), 1), "vert_over_horiz": round(float(np.sqrt(jyy / jxx)), 2),
            "lum_range": round(float(np.percentile(f[core], 95) - np.percentile(f[core], 5)), 1),
            "hard_edge_per_20px": round(float(np.percentile(g6[core], 99) * 20), 1), "px": int(core.sum())}


def specks(path, y0, y1):
    """Dark specks of a painted stone per 10 000 px: connected dark blobs (luminance under 55 % of the stone's median) of 1 to 30
    px and no more than 8 px across, inside the stone mask. Returns (count per 10 kpx, share of the stone in dark pixels)."""
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im, float)
    raw = a[..., :3] @ [0.299, 0.587, 0.114]
    mask = ~(is_mag(a[..., :3]) | (a[..., 3] < 255))
    m6 = np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(13)), bool)
    sel = np.zeros_like(m6)
    sel[y0:y1, 200:760] = m6[y0:y1, 200:760]
    med = np.median(raw[sel])
    dark = sel & (raw < 0.55 * med)
    seen = np.zeros_like(dark)
    n = 0
    for y, x in zip(*np.nonzero(dark)):
        if seen[y, x]:
            continue
        stack, comp = [(y, x)], []
        seen[y, x] = True
        while stack:
            cy, cx = stack.pop()
            comp.append((cy, cx))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < dark.shape[0] and 0 <= nx < dark.shape[1] and dark[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
            if len(comp) > 30:
                break
        if len(comp) <= 30:
            ys, xs = zip(*comp)
            if max(ys) - min(ys) < 8 and max(xs) - min(xs) < 8:
                n += 1
    return round(10000 * n / max(1, sel.sum()), 2), round(float(dark.sum() / max(1, sel.sum())), 4)


def measure():
    rep = {}
    for s in STAGES:
        rep[s] = {}
        for k, (y0, y1) in enumerate(BANDS[s]):
            rep[s][f"band{k}"] = {"y": [y0, y1], "before": iso_tilt(BEFORE / f"{s}.peinture.png", y0, y1),
                                  "after": iso_tilt(AFTER / f"{s}.peinture.png", y0, y1)}
        b, a = (np.asarray(Image.open(d / f"{s}.peinture.png").convert("RGB"), int) for d in (BEFORE, AFTER))
        ok = ~is_mag(b) & ~is_mag(a)
        rep[s]["mean_abs_diff_rgb"] = round(float(np.abs(b - a)[ok].mean()), 2)
        rep[s]["silhouette_equal"] = bool((is_mag(b) == is_mag(a)).all())
    (AFTER / "diagonales.json").write_text(json.dumps(rep, indent=1))
    print(json.dumps(rep, indent=1))


if __name__ == "__main__":
    globals()[sys.argv[1]]()
