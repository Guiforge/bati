#!/usr/bin/env python3
"""M6 painted particle sprites for the shared motion system (replace GRAIN_PLACEHOLDER).

    m6_mouvement.py gen [key...]  # flux-3-image only (iso_loop reserve/settle), raw/; provenance goes to
                                  # docs/designs/village/life/provenance-mouvement.json, not scripts/provenance.json
    m6_mouvement.py cut           # cut (u3_pieces cutters), 96 px WebP with alpha -> assets/images/village/iso/mouvement/
    m6_mouvement.py sheet         # planche.png: 1x on day/night ground crops, and x4
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "life"))
import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402
from u3_pieces import BUDGET, fringe, glow_cut, key_cut, split  # noqa: E402

OUT = ROOT / "docs/designs/village/life/scratch/m6"
RAW = OUT / "raw"
DEST = ROOT / "assets/images/village/iso/mouvement"
PROV = ROOT / "docs/designs/village/life/provenance-mouvement.json"
EACH, LABEL, JOB_MAX = 0.07, "m6 mouvement", 0.60
MAG = "Flat magenta background (#FF00FF), one even colour, nothing else in the frame. "
BLK = "Flat pure black background (#000000), nothing else in the frame. "
TAIL = " Hand-painted matte gouache, visible dry-brush strokes, broken ragged edges, no outline, no gloss, no fine grain, no text."
NOSHAPE = " No circle, no disc, no ring, no star, no sparkle points, no coin, no gem."
PROMPTS = {  # key: (prompt, pieces, cutter)
    "smoke": (MAG + "Two separate drawings side by side with clear space between, a left one and a right one, of a rising wisp of "
              "smoke. Each is a lopsided drift of a few wide dry-brush strokes in matte mid grey, two close values only, "
              "stretched upward and frayed at the ends, the two drawings with different shapes." + NOSHAPE + TAIL, 2, "key"),
    "steam": (MAG + "One thin curling wisp of vapour made of three or four long light dry-brush strokes in pale cool white, "
              "drifting upward in a slow lopsided curve, the strokes fading and frayed at both ends." + NOSHAPE + TAIL, 1, "key"),
    "dust": (MAG + "Two separate small puffs of dust side by side with clear space between, a left one and a right one. Each is an "
             "irregular cluster of soft overlapping dry-brush strokes in matte neutral warm grey-beige, two close values only, "
             "no shading, the edge chipped and ragged, the two drawings with different shapes." + NOSHAPE + TAIL, 2, "key"),
    "spark": (BLK + "One short glowing streak of warm orange-yellow light, painted as three or four thin dry-brush strokes "
              "that cross slightly, bright at one end and fading into the dark at the other, a little crooked, small in the "
              "middle of the frame." + NOSHAPE + TAIL, 1, "glow"),
    "ember": (BLK + "One small glowing coal fleck, painted as a few short dry-brush dabs of deep orange and dull red that "
              "overlap into a small irregular lopsided speck with a ragged edge, small in the middle of the frame."
              + NOSHAPE + TAIL, 1, "glow"),
    "mote": (BLK + "One soft mote of pale violet-blue magical light, painted as a few loose translucent dry-brush strokes "
             "gathered unevenly, brighter in the middle and fading to nothing, ragged and lopsided, small in the middle of the "
             "frame." + NOSHAPE + TAIL, 1, "glow"),
}


def spent_job():
    b = json.loads(BUDGET.read_text())["v1"]["batches"]
    return round(sum(x["cost"] for x in b if x["label"].startswith(LABEL)), 4)


def gen(only=None):
    import concurrent.futures
    sys.path.insert(0, str(ROOT / "scripts" / "iso"))
    sys.path.insert(0, str(ROOT / "scripts"))
    from iso_loop import FLUX3, guard_endpoint, reserve, settle
    from lib import flux
    flux.PROVENANCE = PROV  # scripts/provenance.json belongs to another track
    guard_endpoint(FLUX3)
    RAW.mkdir(parents=True, exist_ok=True)
    jobs = [(RAW / f"{k}.png", k) for k in (only or PROMPTS) if only or not (RAW / f"{k}.png").exists()]
    if not jobs:
        return
    if spent_job() + len(jobs) * EACH > JOB_MAX:
        sys.exit(f"job cap {JOB_MAX}: {spent_job()} spent + {len(jobs) * EACH:.2f}")
    batch = reserve(len(jobs), EACH, LABEL, None)
    logs: list = []

    def one(j):
        out, k = j
        return flux.generate(slug=f"m6_{k}", prompt=PROMPTS[k][0], out=out, width=1024, height=1024, attempts=1,
                             submitted_log=logs, endpoint=FLUX3)
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            ok = list(pool.map(one, jobs))
    finally:
        entry = settle(batch, logs)
    print(json.dumps({"model": "flux-3-image", "batch": entry, "ok": ok, "spent_job": spent_job()})[:600])


def cut():
    DEST.mkdir(parents=True, exist_ok=True)
    rep = {}
    for k, (_, n, mode) in PROMPTS.items():
        f = RAW / f"{k}.png"
        if not f.exists():
            continue
        col, a, bg = (glow_cut if mode == "glow" else key_cut)(Image.open(f))
        for j, (x0, x1) in enumerate(split(a, n) if n > 1 else [(0, a.shape[1])]):
            ys, xs = np.where(a[:, x0:x1] > 0.1)
            box = (max(0, x0 + xs.min() - 4), max(0, ys.min() - 4), x0 + xs.max() + 5, ys.max() + 5)
            im = Image.fromarray(np.dstack([col, a * 255]).astype(np.uint8)).crop(box)
            s = max(im.size)
            sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
            sq.paste(im, ((s - im.width) // 2, (s - im.height) // 2))
            p = np.asarray(sq, float)  # premultiplied resize: no fringe from transparent pixels' colour
            p[..., :3] *= p[..., 3:] / 255
            q = np.asarray(Image.fromarray(p.astype(np.uint8), "RGBA").resize((88, 88), Image.LANCZOS), float)
            q[..., :3] = q[..., :3] / np.maximum(q[..., 3:], 1) * 255
            res = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
            res.paste(Image.fromarray(np.clip(q, 0, 255).astype(np.uint8), "RGBA"), (4, 4))
            name = f"{k}_{j + 1}" if n > 1 else k
            res.save(DEST / f"{name}.webp", quality=90, method=6)
            rep[name] = {"kb": round((DEST / f"{name}.webp").stat().st_size / 1024, 1), "fringe": round(fringe(col, a, bg), 3)}
    (OUT / "cuts.json").write_text(json.dumps(rep, indent=1))
    print(json.dumps(rep))


def sheet():
    grounds = [Image.open(ROOT / f"assets/images/village/iso/sol/terrain_00{s}.webp").convert("RGB") for s in ("", ".nuit")]
    names = sorted(p.stem for p in DEST.glob("*.webp"))
    cw = 215
    sh = Image.new("RGB", (30 + len(names) * cw, 20 + 4 * 215), (40, 40, 40))
    d = ImageDraw.Draw(sh)
    for i, nm in enumerate(names):
        sp = Image.open(DEST / f"{nm}.webp")
        x = 15 + i * cw
        d.text((x, 4), nm, fill=(255, 255, 255))
        for r, g in enumerate(grounds * 2):
            big = r > 1  # rows 0-1: 1x (48 px on a 96 px crop), rows 2-3: x4 (192 px on a 192 px crop)
            box, px = (192, 192) if big else (96, 96)
            crop = g.crop((g.width // 2 - box // 2, g.height // 2 - box // 2, g.width // 2 + box // 2, g.height // 2 + box // 2))
            tile = crop.convert("RGBA")
            tile.alpha_composite(sp.resize((px // (1 if big else 2),) * 2, Image.LANCZOS), ((box - px // (1 if big else 2)) // 2,) * 2)
            sh.paste(tile.convert("RGB"), (x, 20 + r * 215))
    sh.save(OUT / "planche.png")


if __name__ == "__main__":
    {"gen": lambda: gen(sys.argv[2:] or None), "cut": cut, "sheet": sheet}[sys.argv[1]]()
