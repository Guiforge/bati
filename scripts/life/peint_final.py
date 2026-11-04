#!/usr/bin/env python3
"""Final painting of the LIFE track: motion particles, Contre-jour moment pieces, creature frames. FLUX 3 Image only (never Klein).

    peint_final.py gen <group> <attempt> <n> [key...]   # group: part | moment | crea. Raw PNGs in scratch/final/raw/<key>__<attempt>c<i>.png
    peint_final.py look <group>                          # contact sheet of every raw candidate, to choose from (look.png)
    peint_final.py pick <key>=<raw stem> ...             # record the chosen candidate in raw/picks.json
    peint_final.py export <group>                        # cut the picks, write the assets / scratch/u5, provenance
    peint_final.py sheet <group>                         # particules.png | moment.png | creatures.png, on ochre and night slate

Budget: reserve/settle through iso_loop with a named probe per group (never None), plus this dispatch's own 5 $ cap read from budget.json.
The chroma key is unmixed: alpha is the projection onto the local solid colour, so edges are graded and carry no key colour; the
key is global (holes between legs go too), the background is a plane fitted on the green-ish pixels (the frames' greens differ).
"""
import concurrent.futures
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "iso"))
sys.path.insert(0, str(ROOT / "scripts"))
import numpy as np  # noqa: E402
from PIL import Image, ImageDraw, ImageFilter  # noqa: E402

FINAL = ROOT / "docs/designs/village/life/scratch/final"
RAW = FINAL / "raw"
U5 = ROOT / "docs/designs/village/life/scratch/u5"
MOUV = ROOT / "assets/images/village/iso/mouvement"
CREA = ROOT / "assets/images/village/iso/creatures"
C1 = ROOT / "docs/designs/village/life/scratch/c1/flux/raw"
BUDGET = pathlib.Path.home() / ".cache/bati-art-loop/iso/budget.json"
LABEL, JOB_MAX, EACH = "peint_final", 5.0, 0.07
PROBE = {"part": "peint_final_part_real", "moment": "peint_final_moment_real", "crea": "peint_final_crea_real"}

MAG = "Flat magenta background (#FF00FF), one even colour, nothing else in the frame. "
BLK = "Flat pure black background (#000000), nothing else in the frame. "
TAIL = " Hand-painted matte gouache with soft visible brush touches, no outline, no gloss, no fine grain, no text, no letters."
GRN = "(0, 177, 64)"
CREA_COMMON = (
    "Repaint it as a clean hand-painted sprite. Very thick dark ink outline (#0F1518), about three times thicker than in image 1, even "
    "and bold around the whole shape and around every paw or claw. Only three to six big flat colour shapes, each with two soft values: "
    "fur, feathers and scales are plain colour masses, with no individual hairs, no feather lines, no hatching, no scale pattern. "
    "Simple gentle face. Warm light from the upper left, cool slate shade on the right side of the body. Matte, no gloss, no ground, "
    "no cast shadow. Flat pure green background (#00B140), one even colour filling the frame to every edge, nothing else. "
    "Same camera angle, same position and same size in the frame as image 1. ")
EDIT = ("Image 1 is the {n}. Paint the very same {n}: same colours, same markings, same size, same position in the frame, same camera "
        "angle, same thick ink line, same flat green background. Change only this: {c} Keep every other part exactly the same. ")

# key -> (group, prompt, bg, refs, cut kind, size)   refs: "c1:<file>" concept frame, "pick:<key>" a chosen frame of this script
J = {
    "dust": ("part", MAG + "Two separate small warm dust clouds side by side with clear space between, a left one and a right one, "
             "with different shapes. Each is a small cloud of soft irregular brush touches in light ochre and rosy beige, lit from the "
             "upper left so its left side is the lightest, rounded soft edges, the base fraying into thin transparent wisps." + TAIL, "mag", [], "soft", 1024),
    "smoke": ("part", MAG + "Two separate drawings side by side with clear space between, a left one and a right one, with different "
              "shapes. Each is a column of three or four stacked puffs of smoke, small at the bottom and widening upward, in warm "
              "brown-grey with two close values, soft irregular edges, each puff a readable brush touch slightly separate from its "
              "neighbour, the top puff the palest." + TAIL, "mag", [], "soft", 1024),
    "steam": ("part", MAG + "A rising trail of three small separate wisps of cream-white mist, stacked one above the other with a wide gap "
              "of empty background between them, each wisp a short soft elongated smudge of pale cream paint, slightly curved, its ends "
              "feathered and translucent." + TAIL, "mag", [], "soft", 1024),
    "spark": ("part", BLK + "One small drop-shaped spark with a round head and a short soft tail trailing downward, a cream core and a "
              "gold edge fading smoothly into the dark, small in the middle of the frame." + TAIL, "blk", [], "glow", 1024),
    "ember": ("part", BLK + "One small slightly irregular round ember, a cream core, an amber ring around it, and a brick red edge "
              "melting smoothly into the dark, small in the middle of the frame." + TAIL, "blk", [], "glow", 1024),
    "mote": ("part", BLK + "One warm grain of light, golden cream in the middle, a very soft amber halo around it fading smoothly "
             "into the dark, small in the middle of the frame." + TAIL, "blk", [], "glow", 1024),
    "lueur_jour": ("moment", BLK + "A large soft round glow of warm light filling the frame, strongest at the centre and melting evenly outward "
                   "to nothing well before the edge of the picture. A pale cream centre blending into soft pale gold. Across it, three "
                   "very broad, barely-there, irregular bands of paler light, each one wide, uneven and blurred into the glow. Every "
                   "transition is blended and gradual, painted with broad translucent washes." + TAIL, "blk", [], "lueur", 1024),
    "lueur_nuit": ("moment", BLK + "A large soft round glow of warm light filling the frame, strongest at the centre and melting evenly outward "
                   "to nothing well before the edge of the picture. A small centre of pale cream blending into deep amber (#F0A848). "
                   "Across it, three very broad, barely-there, irregular bands of slightly paler amber, each one wide, uneven and "
                   "blurred into the glow. Every transition is blended and gradual, painted with broad translucent washes." + TAIL, "blk", [], "lueur", 1024),
    "bouffee_jour": ("moment", MAG + "Three separate small clusters of dust in a row with clear space between, different sizes and shapes. "
                     "Each is a loose group of dabbed, uneven brush flecks in warm ochre and rosy beige, with a ragged torn outline and "
                     "gaps in it, the lower edge breaking up into scattered specks, lit from the upper left, matte and dry." + TAIL, "mag", [], "soft", 1024),
    "bouffee_nuit": ("moment", MAG + "Three separate small clusters of dust in a row with clear space between, different sizes and shapes. "
                     "Each is a loose airy drift of dabbed, uneven brush flecks in muted slate-grey and dusty mauve, dark and dull, floating and not piled up, with a "
                     "ragged torn outline and gaps in it, a soft dark underside with a touch of amber, the lower edge breaking up into "
                     "scattered specks, matte and dry." + TAIL, "mag", [], "soft", 1024),
}
J["echafaudage_3x3"] = ("moment", "Image 1 is a wooden building scaffold. Paint a larger version of it in exactly the same painted style, same dark purple-brown "
    "posts, rope lashings, pale blue-grey boards, thick ink line and isometric camera angle. Make it one and a half times wider in both ground "
    "directions: along each of the two front sides there are now three equal bays separated by four posts instead of two bays and three posts, "
    "and the structure fills the width of the picture. The height stays the same as image 1. Flat pure green background (#00B140), one even "
    "colour to every edge, nothing else, no ground, no shadow.", "grn", ["file:scaf2x2"], "scaf", 1024)
# creatures: frame -> (concept file, kind, change or pose note)
CR = {
    "mouse": ("a small russet harvest mouse with a cream belly", [
        ("run_a", "mouse_b_run_a", "base", "Thick rounded paws and a thick tail, at most three whiskers on each side, large round ears."),
        ("run_b", "mouse_b_run_b", "edit", "only the four legs go to the opposite phase of the stride. The ears, head, body and tail do not move at all."),
        ("sit", "mouse_b_sit", "sit", "Thick rounded paws and a thick tail, at most three whiskers on each side, large round ears.")]),
    "cat": ("a stocky black and white cat", [
        ("walk_a", "cat_b_walk_a", "base", "Soft face with big round eyes, a small pink nose, no heavy brows. All four legs complete and fully visible, including the far hind leg."),
        ("walk_b", "cat_b_walk_b", "edit", "only the legs go to the opposite phase of the stride, all four legs complete including the far hind leg. The head, ears, face, body and tail stay exactly where they are."),
        ("sit", "cat_b_sit", "sit", "Soft face with big round eyes, a small pink nose, no heavy brows.")]),
    "bird": ("a plump little blue-grey songbird with a cream belly and a dark cap", [
        ("wings_up", "bird_b_wings_up", "base", "One clear pair of wings, raised high. Legs tucked into the belly feathers, no legs visible."),
        ("wings_down", "bird_b_wings_down", "edit", "only the wings swing down below the body, one clear pair of wings. Body, head, tail, size and position stay exactly as in image 1, the bird is not bigger. Legs tucked, no legs visible."),
        ("perched", "bird_b_perched", "sit", "One pair of wings folded against the body. Two short thick legs on the ground. Same size as the bird in image 2.")]),
    "dragon": ("a big dragon curled asleep in a ring", [
        ("sleep", "dragon_b_breathe_in", "base", "The scales are only three flat bands of value: light on the back, a mid tone, a dark one underneath, no scale drawing. The back spikes are large, "
         "bold and clearly readable. The tail is tucked inside the curled shape. Head down, eyes closed, rust-red body with an ochre belly.")]),
}
SIZE = {"mouse": 128, "cat": 128, "bird": 128, "dragon": 320}
for c, (desc, frames) in CR.items():
    for fr, concept, kind, note in frames:
        if kind == "edit":
            p = EDIT.format(n=c if c != "dragon" else "dragon", c=note) + CREA_COMMON.split("Same camera")[0]
            refs = [f"pick:{c}_{frames[0][0]}"]
        elif kind == "sit":
            p = (f"Image 1 is a drawing of {desc}: keep its pose, its markings and its position. Image 2 is the finished sprite of the same animal, "
                 "copy its ink line, flat colours and look. " + CREA_COMMON + note)
            refs = [f"c1:{concept}", f"pick:{c}_{frames[0][0]}"]
        else:
            p = f"Image 1 is a drawing of {desc}. " + CREA_COMMON + note
            refs = [f"c1:{concept}"]
        J[f"{c}_{fr}"] = ("crea", p, "grn", refs, "crea", 1024 if c == "dragon" else 768)


# ------------------------------------------------------------------ budget and generation
def spent_job():
    b = json.loads(BUDGET.read_text())["v1"]["batches"]
    return round(sum(x["cost"] for x in b if x["label"].startswith(LABEL)), 4)


def picks():
    f = RAW / "picks.json"
    return json.loads(f.read_text()) if f.exists() else {}


def ref_path(r):
    kind, name = r.split(":", 1)
    if kind == "file":
        f = RAW / f"{name}.png"
        if not f.exists():
            im = Image.open(ROOT / "assets/images/village/iso/pieces/echafaudage_2x2.webp").convert("RGBA")
            bg = Image.new("RGBA", im.size, (0, 177, 64, 255))
            bg.alpha_composite(im)
            bg.convert("RGB").save(f)
        return f
    if kind == "c1":
        return C1 / f"{name}.png"
    return RAW / f"{picks()[name]}.png"


def gen(group, attempt, n, only):
    from iso_loop import FLUX3, guard_endpoint, reserve, settle
    from lib import flux
    flux.PROVENANCE = RAW / "provenance.json"  # scratch ledger, copied per pick at export
    guard_endpoint(FLUX3)
    RAW.mkdir(parents=True, exist_ok=True)
    jobs = [(k, i) for k, v in J.items() if v[0] == group and (not only or k in only) for i in range(n)]
    if not jobs:
        sys.exit("no job")
    if spent_job() + len(jobs) * EACH > JOB_MAX:
        sys.exit(f"dispatch cap {JOB_MAX} $: {spent_job()} spent + {len(jobs) * EACH:.2f}")
    batch = reserve(len(jobs), EACH, f"{LABEL} {group} {attempt}", PROBE[group])
    logs = {j: [] for j in jobs}

    def one(j):
        k, i = j
        _, prompt, _, refs, _, size = J[k]
        return flux.generate(slug=f"{k}__{attempt}c{i}", prompt=prompt, out=RAW / f"{k}__{attempt}c{i}.png", width=size if k != "echafaudage_3x3" else 896, height=size if k != "echafaudage_3x3" else 1344, attempts=1,
                             references=tuple(ref_path(r) for r in refs), submitted_log=logs[j], endpoint=FLUX3)
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            ok = list(pool.map(one, jobs))
    finally:
        entry = settle(batch, [r for v in logs.values() for r in v])
    f = RAW / "cost.json"
    old = json.loads(f.read_text()) if f.exists() else {}
    for j, k in zip(jobs, ok):
        old[f"{j[0]}__{attempt}c{j[1]}"] = {"model": "flux-3-image", "ok": k, "cost_usd": sum(float(r.get("cost") or 0) for r in logs[j]) / 100}
    f.write_text(json.dumps(old, indent=1))
    print(f"{group} {attempt}: batch cost {entry['cost']} $, dispatch total {spent_job()} $, failed {[j for j, k in zip(jobs, ok) if not k]}")


# ------------------------------------------------------------------ cutting
def gblur(a, s):
    r = int(3 * s) + 1
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / s) ** 2)
    k /= k.sum()
    for ax in (0, 1):
        a = sum(w * np.roll(a, i - r, ax) for i, w in enumerate(k))
    return a


def bg_plane(rgb):
    """Background colour field: a plane per channel fitted on the strongly key-coloured pixels (the frames' greens drift)."""
    h, w, _ = rgb.shape
    ref = np.median(np.concatenate([rgb[:8].reshape(-1, 3), rgb[-8:].reshape(-1, 3)]), 0)
    d = np.linalg.norm(rgb - ref, axis=2)
    m = d < 45
    ys, xs = np.nonzero(m[::4, ::4])
    ys, xs = ys * 4, xs * 4
    A = np.stack([xs / w, ys / h, np.ones_like(xs)], 1)
    yy, xx = np.mgrid[0:h, 0:w]
    out = np.zeros_like(rgb)
    for c in range(3):
        coef = np.linalg.lstsq(A, rgb[ys, xs, c], rcond=None)[0]
        out[..., c] = coef[0] * xx / w + coef[1] * yy / h + coef[2]
    return out


def unmix(rgb, lo=24.0, hi=70.0, sigma=2.5):
    """Key by projection onto the local solid colour. Returns colour (no key in it) and a graded alpha."""
    bg = bg_plane(rgb)
    d = np.linalg.norm(rgb - bg, axis=2)
    solid = (d > hi).astype(float)
    w = gblur(solid, sigma)
    est = np.stack([gblur(rgb[..., c] * solid, sigma) for c in range(3)], -1) / np.maximum(w, 1e-4)[..., None]
    v = est - bg
    proj = ((rgb - bg) * v).sum(-1) / np.maximum((v * v).sum(-1), 1.0)
    a = np.where(w > 0.02, np.clip(proj, 0, 1), np.clip(d / hi, 0, 1))
    a = np.where(d < lo * 0.6, 0.0, a)
    a = np.where(d > hi, 1.0, a)
    a = np.where(a < 0.03, 0.0, np.where(a > 0.97, 1.0, a))
    col = np.where((a < 0.98)[..., None] & (w > 0.02)[..., None], est, rgb)
    return np.clip(col, 0, 255), a


def glow(rgb, gain=1.1):
    """On black: alpha is the brightest channel above the measured black level (the 'black' is a dark grey with a vignette)."""
    mx = rgb.max(-1)
    bl = np.percentile(np.concatenate([mx[:8].ravel(), mx[-8:].ravel(), mx[:, :8].ravel(), mx[:, -8:].ravel()]), 95) + 6
    a = np.clip((mx - bl) / (255 - bl) * gain, 0, 1)
    return np.clip(rgb / np.maximum(a[..., None] * 0 + mx[..., None] / 255, 0.05), 0, 255), a


def biggest(a, grow=9):
    """Keep the alpha of the main body only (drops key specks): flood from the heaviest spot of the dilated silhouette."""
    m = Image.fromarray(((a > 0.3) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(grow))
    s = gblur((np.asarray(m) > 0).astype(float), 20)
    y, x = np.unravel_index(np.argmax(s), s.shape)
    m = m.copy()
    ImageDraw.floodfill(m, (int(x), int(y)), 128)
    keep = np.asarray(m) == 128
    return np.where(keep, a, 0.0)


def rgba(col, a):
    return np.dstack([col, a * 255]).clip(0, 255).astype(np.uint8)


def crop_alpha(arr, pad, thr=6):
    ys, xs = np.nonzero(arr[..., 3] > thr)
    H, W = arr.shape[:2]
    return arr[max(0, ys.min() - pad):min(H, ys.max() + 1 + pad), max(0, xs.min() - pad):min(W, xs.max() + 1 + pad)]


def resize(arr, size):
    """Premultiplied resize: no halo from the colour of transparent pixels. `size` is (w, h)."""
    p = arr.astype(float)
    p[..., :3] *= p[..., 3:] / 255
    im = Image.fromarray(p.clip(0, 255).astype(np.uint8), "RGBA").resize(size, Image.LANCZOS)
    q = np.asarray(im, float)
    q[..., :3] = q[..., :3] / np.maximum(q[..., 3:], 1) * 255
    return Image.fromarray(q.clip(0, 255).astype(np.uint8), "RGBA")


def square(arr, size, inner):
    c = crop_alpha(arr, 4)
    s = max(c.shape[:2])
    sq = np.zeros((s, s, 4), np.uint8)
    sq[(s - c.shape[0]) // 2:(s - c.shape[0]) // 2 + c.shape[0], (s - c.shape[1]) // 2:(s - c.shape[1]) // 2 + c.shape[1]] = c
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(resize(sq, (inner, inner)), ((size - inner) // 2,) * 2)
    return out


def cut_raw(key, stem):
    rgb = np.asarray(Image.open(RAW / f"{stem}.png").convert("RGB"), float)
    kind = J[key][4]
    if kind in ("glow", "lueur"):
        col, a = glow(rgb)
        if kind == "lueur":  # a glow melts out before the picture edge, and its colour never goes to white
            h, w = a.shape
            r = np.hypot(*np.meshgrid(np.arange(w) - w / 2, np.arange(h) - h / 2)[::-1][::-1]) / (min(h, w) / 2)
            a = np.clip(gblur(a, 40), 0, 1)  # the bands are broad washes: no brush edge or ring survives
            t = np.clip(1 - r / 0.85, 0, 1) ** 1.3  # strongest at the centre, zero at 0.85 of the radius
            a = a ** 1.5 * t  # a little contrast keeps the faint bands, which the raw only carries in its brightness
            col = np.minimum(col, (240, 214, 150) if key == "lueur_jour" else (242, 226, 180))
            a = np.clip(a * (1.4 if key == "lueur_jour" else 1.25), 0, 1)
        else:  # spark, ember, mote: soft rim (blur of the premultiplied colour), the ember also fades from its own radius
            ys, xs = np.nonzero(a > (0.3 if key == "ember" else 0.04))
            cy, cx, R = ys.mean(), xs.mean(), np.sqrt(len(ys) / np.pi)
            if key == "mote":  # the faint halo's own colour is vignette grey: it is amber by construction
                a = np.clip(a - 0.04, 0, 1) ** 1.3
                col = np.array((240, 168, 72)) * (1 - np.clip(a * 2.5, 0, 1))[..., None] + col * np.clip(a * 2.5, 0, 1)[..., None]
            if key in ("ember", "mote"):
                r = np.hypot(*np.meshgrid(np.arange(a.shape[1]) - cx, np.arange(a.shape[0]) - cy)[::-1][::-1]) / R
                t = np.clip(((1.12 if key == 'ember' else 1.0) - r) / (0.5 if key == 'ember' else 1.0), 0, 1)
                a = a * t * t * (3 - 2 * t)
            s = {"spark": 5, "ember": 6, "mote": 3}[key]
            pm = np.stack([gblur(col[..., c] * a, s) for c in range(3)], -1)
            a = gblur(a, s)
            col = np.clip(pm / np.maximum(a, 1e-3)[..., None], 0, 255)
            a = np.where(a < 0.02, 0.0, a)
        return col, a
    col, a = unmix(rgb)
    if J[key][2] == "grn":  # despill: on the soft rim no pixel may be greener than its red or blue
        e = (a < 0.98)[..., None]
        col = np.where(e, np.minimum(col, np.stack([col[..., 0] * 0 + 999, np.maximum(col[..., 0], col[..., 2]) + 4, col[..., 0] * 0 + 999], -1)), col)
        a = np.where(a < 0.04, 0.0, a)
    return col, a


# ------------------------------------------------------------------ export
SOFT_OPACITY = {"dust": 0.8, "steam": 0.7, "smoke": 1.0, "bouffee_jour": 0.9, "bouffee_nuit": 0.8}


def split3(a, n):
    k = gblur((a > 0.2).sum(0, keepdims=True).astype(float).repeat(3, 0), 12)[0]
    w = a.shape[1]
    cuts = [0] + [int(w * (j / n - 0.12)) + int(np.argmin(k[int(w * (j / n - 0.12)):int(w * (j / n + 0.12))])) for j in range(1, n)] + [w]
    return list(zip(cuts[:-1], cuts[1:]))


def pieces(key, stem):
    """Cut one raw into its drawings (left to right) as RGBA arrays with the per-kind finishing."""
    col, a = cut_raw(key, stem)
    base = key.split("__")[0]
    kind = J[base][4]
    n = {"dust": 2, "smoke": 2, "bouffee_jour": 3, "bouffee_nuit": 3}.get(base, 1)
    out = []
    for x0, x1 in (split3(a, n) if n > 1 else [(0, a.shape[1])]):
        aa = np.zeros_like(a)
        aa[:, x0:x1] = a[:, x0:x1]
        if kind == "soft":
            aa = biggest(aa)
            aa = np.clip(gblur(aa, 1.2 if base.startswith('bouffee') else 3), 0, 1)
            aa *= SOFT_OPACITY.get(base, 1.0)
            ys = np.nonzero(aa.max(1) > 0.03)[0]
            if base == "smoke":  # opacity falls upward
                t = np.clip((ys.max() - np.arange(aa.shape[0])) / max(1, ys.max() - ys.min()), 0, 1)
                aa = aa * (0.95 - 0.5 * t)[:, None]
        if base == "bouffee_nuit":  # dusk dust: opaque mean luminance held near 80, no channel above 125 (the glow sits near 170)
            lum = col.mean(-1)
            m = aa > 0.3
            g = 80 / max(lum[m].mean(), 1) if m.any() else 1
            col = np.minimum(col * g, 125)
        out.append(rgba(col, aa))
    return out


def export(group):
    pk = picks()
    if group == "crea":
        return export_crea(pk)
    prov = json.loads((RAW / "provenance.json").read_text())
    used = {}
    for key, stem in pk.items():
        if J[key][0] != group:
            continue
        if key == "echafaudage_3x3":
            used[key] = (stem, export_scaf(stem))
            continue
        for i, arr in enumerate(pieces(key, stem), 1):
            if group == "part":
                name = key if key not in ("dust", "smoke") else f"{key}_{i}"
                im = square(arr, 96, 88)
                im.save(MOUV / f"{name}.webp", quality=92, method=6)
                used[name] = (stem, f"assets/images/village/iso/mouvement/{name}.webp")
            else:
                U5.mkdir(parents=True, exist_ok=True)
                if key.startswith("lueur"):
                    name, im = key, square(arr, 256, 256)
                else:
                    name, im = f"bouffee_{i}_{key.split('_')[1]}", square(arr, 128, 120)
                im.save(U5 / f"{name}.webp", quality=92, method=6)
                used[name] = (stem, f"docs/designs/village/life/scratch/u5/{name}.webp")
    if group == "part":
        write_prov(ROOT / "docs/designs/village/life/provenance-mouvement.json", prov, used)
    else:
        write_prov(U5 / "provenance-moment.json", prov, used)
    print(json.dumps({k: v[1] for k, v in used.items()}, indent=1))


def export_scaf(stem):
    """Cut, scale so the sprite is 1095 px wide (2x2 is 730 in 896, +384 canvas per footprint step), stand it on the 1280x1920 canvas anchor, write json."""
    col, a = cut_raw("echafaudage_3x3", stem)
    a = biggest(a)
    c = crop_alpha(rgba(col, a), 0)
    f = 1095 / c.shape[1]
    im = resize(c, (1095, round(c.shape[0] * f)))
    cv = Image.new("RGBA", (1280, 1920), (0, 0, 0, 0))
    cv.paste(im, (640 - im.width // 2, 1852 - im.height))
    U5.mkdir(parents=True, exist_ok=True)
    cv.save(U5 / "echafaudage_3x3.webp", quality=92, method=6)
    al = np.asarray(cv.getchannel("A")) > 128
    rows = ["".join("1" if v else "0" for v in r) for r in al.reshape(240, 8, 160, 8).any((1, 3))]
    (U5 / "echafaudage_3x3.json").write_text(json.dumps({"slug": "pieces/echafaudage_3x3", "source": "flux", "size": [1280, 1920], "anchor": [640.0, 1856.0],
                                                         "canvas": "building3x3", "mask": {"step": 8, "w": 160, "h": 240, "rows": rows}}))
    print("scaffold sprite", im.size, "top y", 1852 - im.height)
    return "docs/designs/village/life/scratch/u5/echafaudage_3x3.webp"


def write_prov(path, prov, used):
    out = {}
    for name, (stem, dest) in used.items():
        e = dict(prov[f"docs/designs/village/life/scratch/final/raw/{stem}.png"])
        e["used_for"] = dest
        e["raw"] = f"docs/designs/village/life/scratch/final/raw/{stem}.png"
        out[dest] = e
    path.write_text(json.dumps(out, indent=1, ensure_ascii=False))


def export_crea(pk):
    prov = json.loads((RAW / "provenance.json").read_text())
    used = {}
    CREA.mkdir(parents=True, exist_ok=True)
    for c, (_, frames) in CR.items():
        keys = [f"{c}_{fr}" for fr, *_ in frames]
        if not all(k in pk for k in keys):
            continue
        arrs = []
        for k in keys:
            col, a = cut_raw(k, pk[k])
            a = biggest(a)
            arrs.append(crop_alpha(rgba(col, a), 0))
        f = SIZE[c] / max(max(x.shape[:2]) for x in arrs)
        small = [resize(x, (max(1, round(x.shape[1] * f)), max(1, round(x.shape[0] * f)))) for x in arrs]
        # offsets: frames 0 and 1 aligned by silhouette overlap (the head and body must not move), the rest by feet line and bottom centre
        offs = [(0, 0)]
        for j in range(1, len(small)):
            offs.append(align(small[0], small[j]) if (len(small) == 3 and j == 1) else feet(small[0], small[j]))
        x0 = min(o[0] for o in offs)
        y0 = min(o[1] for o in offs)
        W = max(o[0] + s.width for o, s in zip(offs, small)) - x0
        H = max(o[1] + s.height for o, s in zip(offs, small)) - y0
        for k, o, s in zip(keys, offs, small):
            cv = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            cv.paste(s, (o[0] - x0, o[1] - y0))
            dest = f"assets/images/village/iso/creatures/{k}.webp"
            cv.save(ROOT / dest, quality=92, method=6)
            used[k] = (pk[k], dest)
        print(c, "canvas", W, H, "offsets", offs)
    write_prov(ROOT / "docs/designs/village/life/provenance-creatures.json", prov, used)


def feet(a, b):
    """Offset of b on a's canvas: same bottom line, same centre column of the bottom 15 percent."""
    def anchor(im):
        al = np.asarray(im.getchannel("A")) > 128
        rows = al[int(al.shape[0] * 0.85):]
        return int(np.nonzero(rows.any(0))[0].mean()), al.shape[0]
    (ax, ah), (bx, bh) = anchor(a), anchor(b)
    return (ax - bx, ah - bh)


def align(a, b):
    """Shift of b that maximises the silhouette overlap with a (brute force, +-25 px)."""
    ma, mb = np.asarray(a.getchannel("A")) > 128, np.asarray(b.getchannel("A")) > 128
    H, W = max(ma.shape[0], mb.shape[0]) + 60, max(ma.shape[1], mb.shape[1]) + 60
    A = np.zeros((H, W), bool)
    A[30:30 + ma.shape[0], 30:30 + ma.shape[1]] = ma
    best = (-1, (0, 0))
    for dy in range(-25, 26):
        for dx in range(-25, 26):
            B = np.zeros((H, W), bool)
            y, x = 30 + dy, 30 + dx
            B[y:y + mb.shape[0], x:x + mb.shape[1]] = mb
            s = (A & B).sum() / (A | B).sum()
            if s > best[0]:
                best = (s, (dx, dy))
    return best[1]


# ------------------------------------------------------------------ look and sheets
def look(group, back=(194, 148, 78)):
    stems = sorted(p.stem for p in RAW.glob("*__*.png") if p.stem.split("__")[0] in J and J[p.stem.split("__")[0]][0] == group)
    cell = 300
    cols = 5
    sh = Image.new("RGB", (cols * cell, ((len(stems) + cols - 1) // cols) * (cell + 14)), (40, 40, 40))
    d = ImageDraw.Draw(sh)
    for i, s in enumerate(stems):
        im = Image.open(RAW / f"{s}.png").convert("RGB").resize((cell, cell))
        x, y = (i % cols) * cell, (i // cols) * (cell + 14)
        sh.paste(im, (x, y + 14))
        d.text((x + 3, y + 1), s, fill=(255, 255, 255))
    sh.save(FINAL / f"look_{group}.png")
    print(len(stems), "raws ->", FINAL / f"look_{group}.png")


NIGHT = (46, 53, 82)
OCHRE = (194, 148, 78)
MAGENTA = (255, 0, 255)


def tile(im, bg, scale=1.0, box=None):
    if scale != 1.0:
        im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
    w, h = box or (im.width + 16, im.height + 16)
    t = Image.new("RGBA", (w, h), bg + (255,))
    t.alpha_composite(im, ((w - im.width) // 2, (h - im.height) // 2))
    return t.convert("RGB")


def sheet(group):
    src = {"part": MOUV, "moment": U5, "crea": CREA}[group]
    items = [(p.stem, Image.open(p).convert("RGBA")) for p in sorted(src.glob("*.webp"))]
    rows = ([("ochre x1", OCHRE, 1), ("night x1", NIGHT, 1), ("ochre x2", OCHRE, 2), ("night x2", NIGHT, 2), ("magenta x3", MAGENTA, 3)]
            if group == "part" else [("ochre", OCHRE, 1), ("night", NIGHT, 1), ("magenta x2", MAGENTA, 2)])
    k = rows[-1][2]
    widths = [max(i.width * k, i.width * 1) + 12 for _, i in items]
    rh = [max(i.height for _, i in items) * s + 12 for _, _, s in rows]
    sh = Image.new("RGB", (10 + sum(widths), 20 + sum(rh) + 4 * len(rows)), (30, 30, 30))
    d = ImageDraw.Draw(sh)
    x = 5
    for (n, im), w in zip(items, widths):
        d.text((x, 4), n, fill=(255, 255, 255))
        y = 20
        for (_, bg, s), h in zip(rows, rh):
            sh.paste(tile(im, bg, s, (im.width * s + 12, h)), (x, y))
            y += h + 4
        x += w
    FINAL.mkdir(parents=True, exist_ok=True)
    name = {"part": "particules", "moment": "moment", "crea": "creatures"}[group]
    sh.save(FINAL / f"{name}.png")
    print("sheet", FINAL / f"{name}.png", sh.size)


def export_moment2():
    """Write the picked lueur_* / bouffee_* straight into assets/.../moment/ at their real size, merge their provenance."""
    pk = picks()
    prov = json.loads((RAW / "provenance.json").read_text())
    used = {}
    for key, stem in pk.items():
        if key not in ("lueur_jour", "lueur_nuit", "bouffee_jour", "bouffee_nuit"):
            continue
        for i, arr in enumerate(pieces(key, stem), 1):
            name, im = (key, square(arr, 256, 256)) if key.startswith("lueur") else (f"bouffee_{i}_{key.split('_')[1]}", square(arr, 128, 120))
            im.save(ROOT / "assets/images/village/iso/moment" / f"{name}.webp", quality=92, method=6)
            used[name] = (stem, f"assets/images/village/iso/moment/{name}.webp")
    f = ROOT / "docs/designs/village/life/provenance-moment.json"
    old = json.loads(f.read_text())
    for name, (stem, dest) in used.items():
        e = dict(prov[f"docs/designs/village/life/scratch/final/raw/{stem}.png"])
        e["used_for"] = dest
        e["raw"] = f"docs/designs/village/life/scratch/final/raw/{stem}.png"
        old[dest] = e
    f.write_text(json.dumps(old, indent=1, ensure_ascii=False))
    print(list(used))


def sheet2(old):
    """moment2.png: per piece, old then new, on ochre then night slate, real size."""
    new = ROOT / "assets/images/village/iso/moment"
    names = sorted(p.stem for p in new.glob("*.webp"))
    cell = 270
    sh = Image.new("RGB", (len(names) * (cell + 4), 4 * cell + 20), (30, 30, 30))
    d = ImageDraw.Draw(sh)
    for i, n in enumerate(names):
        d.text((i * (cell + 4) + 4, 4), n + " old/new, ochre then night", fill=(255, 255, 255))
        for r, (src, bg) in enumerate([(pathlib.Path(old), OCHRE), (new, OCHRE), (pathlib.Path(old), NIGHT), (new, NIGHT)]):
            sh.paste(tile(Image.open(src / f"{n}.webp").convert("RGBA"), bg, 1.0, (cell, cell)), (i * (cell + 4), 20 + r * cell))
    sh.save(FINAL / "moment2.png")
    print("sheet", FINAL / "moment2.png", sh.size)


if __name__ == "__main__":
    c = sys.argv[1]
    if c == "gen":
        gen(sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5:])
    elif c == "look":
        look(sys.argv[2])
    elif c == "pick":
        p = picks()
        p.update(dict(a.split("=") for a in sys.argv[2:]))
        (RAW / "picks.json").write_text(json.dumps(p, indent=1))
    elif c == "export":
        export(sys.argv[2])
    elif c == "sheet":
        sheet(sys.argv[2])
    elif c == "export2":
        export_moment2()
    elif c == "sheet2":
        sheet2(sys.argv[2])
