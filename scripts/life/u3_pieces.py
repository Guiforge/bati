#!/usr/bin/env python3
"""U3 painted pieces for the building-upgrade films: dust puffs, cream burst (two drawings), round glow.

    u3_pieces.py gen   # FLUX 3 Image only, reserved/settled through iso_loop, writes raw/ + cost.json
    u3_pieces.py cut   # clean cut (adaptive key, colour unmixing, no key fringe), writes <name>_<i>[_<j>].png + cuts.json

The scaffold is not painted: assets/images/village/iso/pieces/echafaudage_{1x1,2x2}.webp exist (3x3 = a 2x2 plus a 1x1 in the films).
FLUX 3 Image is the only model; Klein is never called. flux-3-image sits under no Klein probe cap, so probe stays None like
scripts/bld/final_elements.py; the job's own 1.50 $ cap is enforced below from budget.json.
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "iso"))
sys.path.insert(0, str(ROOT / "scripts"))
import numpy as np  # noqa: E402
from PIL import Image, ImageDraw, ImageFilter  # noqa: E402

OUT = ROOT / "docs/designs/village/life/scratch/u3/pieces"
RAW = OUT / "raw"
BUDGET = pathlib.Path.home() / ".cache/bati-art-loop/iso/budget.json"
JOB_MAX = 1.50
EACH = 0.07  # reserved per image; the settled cost is the real one
CANDIDATES = 2
MAG = "Flat magenta background (#FF00FF), one even colour, nothing else in the frame. "
TAIL = "Hand-painted matte gouache with visible brush strokes, no gloss, no fine grain. No text, no letters, no figure."
PROMPTS = {
    "puffs": ("Three separate small round puffs of dust side by side in a row with clear space between them, left one medium, "
              "middle one large, right one small. Each puff is a rounded cluster of five or six overlapping lobes in matte "
              "warm sand-beige, a paler cream on the upper left and a darker taupe on the lower right, the outer edge broken "
              "and ragged like dry brush strokes, torn into small chips. No outline, no trail, no ground, no shadow. " + MAG + TAIL),
    "burst": ("Two separate drawings side by side, a left one and a right one, each a ragged splash of pale cream paint with "
              "eight to eleven pointed rays of unequal length around a rough round middle, drawn with a heavy dark ink brush "
              "outline (#0F1518): the line is uneven, thick then thin, with small gaps and chipped edges, the points slightly "
              "bent. The fill is matte flat cream (#F2E2B4) with a second darker cream tone on the lower right. The right "
              "drawing has a different number of rays, different lengths and angles from the left one. " + MAG + TAIL),
    "glow": ("One round disc of warm light painted with broad dry brush strokes, centre pale cream (#F2E2B4), then warm amber "
             "(#F0A848), then a broken outer edge made of loose separate brush strokes, matte, flat, no ring, no rays. Flat "
             "pure black background (#000000), one even colour, nothing else in the frame. " + TAIL),
}
PIECES = {"puffs": 3, "burst": 2, "glow": 1}


def spent_job():
    b = json.loads(BUDGET.read_text())["v1"]["batches"]
    return round(sum(x["cost"] for x in b if x["label"].startswith("u3 ")), 4)


def gen():
    import concurrent.futures

    from iso_loop import FLUX3, guard_endpoint, reserve, settle
    from lib import flux
    guard_endpoint(FLUX3)
    RAW.mkdir(parents=True, exist_ok=True)
    jobs = [(RAW / f"{k}_{i}.png", p) for k, p in PROMPTS.items() for i in range(CANDIDATES) if not (RAW / f"{k}_{i}.png").exists()]
    if not jobs:
        return
    if spent_job() + len(jobs) * EACH > JOB_MAX:
        sys.exit(f"job cap {JOB_MAX}: {spent_job()} spent + {len(jobs) * EACH:.2f}")
    batch = reserve(len(jobs), EACH, "u3 pieces", None)
    logs: list = []

    def one(j):
        out, p = j
        return flux.generate(slug=f"u3_{out.stem}", prompt=p, out=out, width=1024, height=1024, attempts=1,
                             submitted_log=logs, endpoint=FLUX3)
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            ok = list(pool.map(one, jobs))
    finally:
        entry = settle(batch, logs)
    cost = {"model": "flux-3-image", "klein": False, "job_cap_usd": JOB_MAX, "batch": entry, "posts": len(logs), "ok": ok,
            "spent_job_usd": spent_job(), "scaffold": "not painted: assets/images/village/iso/pieces/echafaudage_*.webp exist"}
    (OUT / "cost.json").write_text(json.dumps(cost, indent=1))
    print(json.dumps(cost)[:500])


def key_cut(im, lo=30.0, hi=80.0, grow=10):
    """Soft alpha from the distance to the border-measured background, holes of the body filled (sand is close to the key), and the
    colour of the edge band taken from the solid pixels beside it (grown `grow` px): no key colour can survive in the edge."""
    rgb = np.asarray(im.convert("RGB"), float)
    border = np.concatenate([rgb[:8].reshape(-1, 3), rgb[-8:].reshape(-1, 3), rgb[:, :8].reshape(-1, 3), rgb[:, -8:].reshape(-1, 3)])
    bg = np.median(border, 0)
    d = np.sqrt(((rgb - bg) ** 2).sum(-1))
    soft = np.clip((d - lo) / (hi - lo), 0, 1)
    body = Image.fromarray(((soft > 0.9) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    out = body.copy()  # holes = what the flood from the corner cannot reach
    ImageDraw.floodfill(out, (0, 0), 128)
    filled = np.asarray(out) != 128
    core = np.asarray(Image.fromarray((filled * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))) > 0
    a = np.where(core & (d > 55), 1.0, soft)
    have = np.asarray(Image.fromarray(((a > 0.97) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5))) > 0
    col = rgb.copy()
    for _ in range(grow):  # grow the solid colour outward, 1 px per pass
        acc, n = np.zeros_like(col), np.zeros(a.shape)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            h = np.roll(have, (dy, dx), (0, 1))
            acc += np.roll(col, (dy, dx), (0, 1)) * h[..., None]
            n += h
        new = (~have) & (n > 0)
        col[new] = acc[new] / n[new][:, None]
        have |= new
    return col, a, bg


def glow_cut(im):
    """On black the alpha is the brightest channel; the colour is divided by it."""
    rgb = np.asarray(im.convert("RGB"), float)
    a = np.clip(rgb.max(-1) / 255 * 1.15, 0, 1)
    return np.clip(rgb / np.maximum(a[..., None], 0.05), 0, 255), a, np.zeros(3)


def split(a, n):
    """n pieces in x order: cut at the emptiest column band near each 1/n, then crop to the alpha."""
    k = np.convolve((a > 0.2).sum(0).astype(float), np.ones(25) / 25, "same")
    w = a.shape[1]
    cuts = [0] + [int(w * (j / n - 0.12)) + int(np.argmin(k[int(w * (j / n - 0.12)):int(w * (j / n + 0.12))])) for j in range(1, n)] + [w]
    return list(zip(cuts[:-1], cuts[1:]))


def fringe(col, a, bg):
    """Key-hue excess (90th percentile) in the edge band, 0..1; 0 = none. A magenta key shows as R and B over G."""
    m = np.asarray(Image.fromarray(((a > 0.02) & (a < 0.98)).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5))) > 0
    if not m.any() or bg.max() < 40:
        return 0.0
    c = col[m]
    return float(max(0.0, np.percentile(((c[:, 0] + c[:, 2]) / 2 - c[:, 1]) / 255, 90)))


def cut():
    rep = {}
    for f in sorted(RAW.glob("*.png")):
        k, i = f.stem.rsplit("_", 1)
        col, a, bg = (glow_cut if k == "glow" else key_cut)(Image.open(f))
        for j, (x0, x1) in enumerate(split(a, PIECES[k]) if PIECES[k] > 1 else [(0, a.shape[1])]):
            ys, xs = np.where(a[:, x0:x1] > 0.1)
            if not len(ys):
                continue
            box = (max(0, x0 + xs.min() - 6), max(0, ys.min() - 6), min(a.shape[1], x0 + xs.max() + 7), min(a.shape[0], ys.max() + 7))
            piece = Image.fromarray(np.dstack([col, a * 255]).astype(np.uint8)).crop(box)
            name = f"{k}_{i}_{j}.png" if PIECES[k] > 1 else f"{k}_{i}.png"
            piece.save(OUT / name)
            sl = (slice(box[1], box[3]), slice(box[0], box[2]))
            rep[name] = {"size": piece.size, "key": [round(float(v)) for v in bg], "fringe": round(fringe(col[sl], a[sl], bg), 3)}
    (OUT / "cuts.json").write_text(json.dumps(rep, indent=1))
    print(json.dumps(rep))


if __name__ == "__main__":
    {"gen": gen, "cut": cut}[sys.argv[1]]()
