#!/usr/bin/env python3
"""Windmill r1 probes, round 4. Outputs in windmill/r1/sondes4/, never overwritten. The maquettes come from
sondes4_maquettes.py render (soft local light: no diagonal terminator on the shaft).

    python3 scripts/bld/sondes4.py keep       # rough and solid, kept from sondes3 (copied, 0 $)
    python3 scripts/bld/sondes4.py paint      # grand, legendary, mythic: 2 images each, a second pair only if none passes
    python3 scripts/bld/sondes4.py peak       # FLUX bbox edit of the peak on the best mythic, then hue/saturation shifts (0.55, 0.40)
    python3 scripts/bld/sondes4.py breeches   # FLUX bbox edit of the breeches on the rail, grand, legendary, mythic (2 images each)
    python3 scripts/bld/sondes4.py mesures    # tilt and speck measures, sondes3 vs sondes4, controls of the final images
    python3 scripts/bld/sondes4.py boards     # juge/, juge_cle.json, bande.png, provenance.json

All FLUX goes through iso_loop's registry (round budget 1.5 $, checked before every batch). FLUX only receives the maquettes, the
three style references and our own earlier paintings (sondes3's solid as the one stone reference, the previous stage, the
sondes3 breeches piece). No ground, no game, studio, film or artist name in any prompt.
"""
import argparse
import json
import pathlib
import random
import shutil
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import numpy as np  # noqa: E402
import sondes2 as X  # noqa: E402
import sondes4_maquettes as Q  # noqa: E402
import sondes_moulin as S  # noqa: E402
from iso_loop import BUDGET, FLUX3, guard_endpoint  # noqa: E402
from PIL import Image, ImageChops, ImageFilter  # noqa: E402
from sondes3 import _above, run_batch, tint  # noqa: E402  (importing sondes3 points S.OUT and X.MQ at round 3: reset below)

R1 = S.R1
S3 = R1 / "sondes3"
OUT = R1 / "sondes4"
MQ = OUT / "maquettes"
S.OUT = OUT
X.MQ = MQ
PASS_IOU = {"rough": 0.97, "solid": 0.97, "grand": 0.95, "legendary": 0.97, "mythic": 0.95}  # legendary must not be bitten
GREEN = (112, 140, 104)
BUDGET_ROUND = 1.6  # raised from 1.5 by the coordinator for the second breeches batches
PAINT_STAGES = ["grand", "legendary", "mythic"]
BANDS = Q.BANDS


def _best3(stage):
    return json.loads((S3 / stage / "controle.json").read_text())["best"]


def stone_ref():
    """Letter D of sondes3's juge_cle.json (solid): the one stone grain of every stage."""
    key = json.loads((S3 / "juge_cle.json").read_text())["D"]
    assert key == {"stage": "solid", "kind": "tower"}, key
    return S3 / "solid/brut" / _best3("solid")


def stone_crop():
    """A crop of D's wall, no roof in it: shown whole (try 1) it carried D's thatch onto the tiled roofs of grand, legendary
    and mythic (the 'solid' tower tells FLUX the roof is straw). 240 x 155 px of bare stone, shown at twice that."""
    f = OUT / "refs" / "stone_D_crop.png"
    if not f.exists():
        f.parent.mkdir(parents=True, exist_ok=True)
        Image.open(stone_ref()).convert("RGB").crop((320, 805, 560, 960)).resize((480, 310), Image.LANCZOS).save(f)
    return f


def maquette_mask(stage):
    return S.sil(Image.open(MQ / f"{stage}.peinture.png")).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))


S.maquette_mask = maquette_mask

STAGE_TXT = dict(X.STAGE_TXT)
STAGE_TXT["grand"] = STAGE_TXT["grand"].replace(", with a small blue-grey cloth hung over the rail at the front left", "")
STAGE_TXT["legendary"] = STAGE_TXT["legendary"].replace("the small blue-grey cloth over the rail at the front left, ", "")
STAGE_TXT["mythic"] = ("Everything of the previous stage stays: the timber gallery, the stone oven and chimney, the sacks, the drum. "
                       "No animal. On the roof tip stands ONE single tall raw shard of cold blue mineral, in one piece, jagged, "
                       "rising to a quarter of the tower's height, matte, two or three large flat planes, no stacked rings, not "
                       "stone, not slate, no highlights, no glow; it sits on a small dark iron collar. It is the only blue thing "
                       "on the building. ")
STONE = ("Image 5 is a crop of the stone wall of a finished tower, the stone reference only: paint the tower stone with the same "
         "warm irregular stones, the same values, the same grain and the same ink line weight as image 5, and take nothing else "
         "from it; it says nothing about the roof, which stays clay tiles. Fewer dark specks than a rough plaster, and irregular "
         "ones; no cork-like grain; no large flat areas of one colour. ")
CONT = "Image 6 is the same building one rank lower, already painted: use it for shape only, not for colour or material. "
TAIL = X.TAIL.split(" Image 5 is the material")[0] + " "


def prompt(stage):
    return (X.HEAD + STAGE_TXT[stage] + X.ROOF.get(stage, X.TILE) + X.WALL + X.WINDOW + TAIL + STONE
            + (CONT if stage in ("legendary", "mythic") else "") + X.FIN)


def refs_for(stage, prev_best):
    r = (MQ / f"{stage}.peinture.png", *S.STYLE, stone_crop())
    return r + ((prev_best,) if stage in ("legendary", "mythic") and prev_best else ())


def control(stage, raw):
    cut, c = X.control(stage, raw)
    c["passes"] = bool(c["iou"] >= PASS_IOU[stage] and c["top_ok"] and c["magenta_residual"] < 0.005)
    return cut, c


def spent_round():
    batches = json.loads(BUDGET.read_text())["v1"]["batches"]
    return round(sum(b["cost"] for b in batches if b["label"].startswith("sondes4")), 4)


def batch(label, n, slug, prompt_text, outs, refs, seed0, size=S.SIZE):
    if spent_round() + 0.07 * n > BUDGET_ROUND:
        sys.exit(f"round budget: {spent_round()} spent + {0.07 * n:.2f} > {BUDGET_ROUND}")
    e = run_batch(label, n, slug, prompt_text, outs, refs, seed0, size)
    if spent_round() > BUDGET_ROUND:
        sys.exit(f"round budget exceeded: {spent_round()}")
    return e


def measures(path, stage):
    """Tilt of the iso-lines in each stone band and the speck density of the painted cut."""
    out = []
    for y0, y1 in BANDS[stage]:
        t = Q.iso_tilt(path, y0, y1, painted=True, stage=stage)
        sp = Q.specks(path, y0, y1)
        out.append({"band": [y0, y1], "tilt": t, "specks_per_10kpx": sp[0], "dark_share": sp[1]})
    return out


def keep():
    for stage in ("rough", "solid"):
        d = OUT / stage
        if (d / "controle.json").exists():
            continue
        c = json.loads((S3 / stage / "controle.json").read_text())
        (d / "brut").mkdir(parents=True, exist_ok=True)
        (d / "coupe").mkdir(exist_ok=True)
        for sub in ("brut", "coupe"):
            shutil.copy(S3 / stage / sub / c["best"], d / sub / c["best"])
        c["kept_from"] = "sondes3 (not repainted: round 4 only changed their maquette's light, see maquettes/diagonales.json)"
        (d / "controle.json").write_text(json.dumps(c, indent=2))


def paint():
    guard_endpoint(FLUX3)
    keep()
    prev_best = OUT / "solid" / "brut" / json.loads((OUT / "solid/controle.json").read_text())["best"]
    for stage in PAINT_STAGES:
        d = OUT / stage
        (d / "brut").mkdir(parents=True, exist_ok=True)
        (d / "coupe").mkdir(exist_ok=True)
        ctl = d / "controle.json"
        if ctl.exists():
            prev_best = d / "brut" / json.loads(ctl.read_text())["best"]
            continue
        results, attempts = {}, 0
        for attempt in (1, 2):
            outs = [d / "brut" / f"t{attempt}_v{i}.png" for i in range(2)]
            if any(o.exists() for o in outs):
                continue
            attempts += 1
            refs = refs_for(stage, prev_best)
            batch(f"sondes4 {stage} t{attempt}", 2, f"sondes4_{stage}", prompt(stage), outs, refs,
                  76000 + 1000 * S.STAGES.index(stage) + 100 * attempt)
            for o in outs:
                if o.exists():
                    cut, c = control(stage, o)
                    cut.save(d / "coupe" / o.name)
                    c["refs"] = [f"{r.parent.name}/{r.name}" for r in refs]
                    c["shaft"] = measures(d / "coupe" / o.name, stage)
                    results[o.name] = c
            if any(c["passes"] for c in results.values()):
                break
        if not results:
            print(stage, "no image")
            continue
        pool = {k: v for k, v in results.items() if v["passes"]} or results
        best = max(pool, key=lambda k: results[k]["score"])
        ctl.write_text(json.dumps({"stage": stage, "attempts": attempts, "images": results, "best": best,
                                   "failed": not results[best]["passes"], "prompt": prompt(stage)}, indent=2))
        prev_best = d / "brut" / best
        print(stage, "best", best, {k: results[best][k] for k in ("iou", "top_ok", "passes")}, flush=True)


# ---------------------------------------------------------------- peak

PEAK_TXT = ("Image 1 is a finished painting of a windmill on a flat magenta background. Edit image 1 inside the box only: the blue "
            "shard on the roof tip. Repaint the shard with two values only, one lit plane and one shaded plane, flat and matte, "
            "with no white strokes, no light dabs and no highlights; its left edge is broken and chipped, not a straight line; its "
            "tip is a broken point, not square; keep its size, its position and its cold blue. It sits on a small dark matte iron "
            "collar, and a few roof tiles around the collar are barely tinted blue, matte, to tie the shard to the roof. "
            "Everything else stays exactly as it is, same position to the pixel, same ink, materials, light and flat magenta "
            "background; no object is added; no text, no letters. Edits: ")


def best_brut(stage):
    return OUT / stage / "brut" / json.loads((OUT / stage / "controle.json").read_text())["best"]


def _hsv(a):
    """(hue deg, sat, value) arrays of an (h, w, 3) float image in 0..1."""
    mx, mn = a.max(-1), a.min(-1)
    d = np.maximum(mx - mn, 1e-6)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    hue = np.where(mx == r, (60 * ((g - b) / d)) % 360, np.where(mx == g, 60 * (2 + (b - r) / d), 60 * (4 + (r - g) / d)))
    return hue, np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0), mx


def shard_mask(im):
    """Blue pixels of the shard (hue 190 to 250, saturation over 0.2, above y 430), grown 1 px."""
    hue, sat, val = _hsv(np.asarray(im.convert("RGB"), float) / 255)
    m = (hue > 190) & (hue < 250) & (sat > 0.2) & (val > 0.3)
    m[430:] = False
    return Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))


def shard_stats(im):
    """Size and shape numbers of the blue shard of an RGB image."""
    m = shard_mask(im)
    arr = np.asarray(m) > 0
    ys, xs = np.nonzero(arr)
    a = np.asarray(im.convert("RGB"), float)
    lum = (a @ [0.299, 0.587, 0.114])[arr]
    white = int(((a.min(-1) > 200)[arr]).sum())
    c = np.percentile(lum, [25, 75])  # two values: share of the shard within 14 levels of its two 1-D k-means centres
    for _ in range(12):
        lab = np.abs(lum[:, None] - c[None]).argmin(1)
        c = np.array([lum[lab == k].mean() if (lab == k).any() else c[k] for k in (0, 1)])
    two = float((np.abs(lum[:, None] - c[None]).min(1) < 14).mean())
    rows = {}
    for y, x in zip(ys, xs):
        lo, hi = rows.get(y, (x, x))
        rows[y] = (min(lo, x), max(hi, x))
    yy = sorted(rows)
    mid = yy[len(yy) // 5: -(len(yy) // 5)]
    lf = np.array([rows[y][0] for y in mid], float)
    fit = np.polyfit(mid, lf, 1)
    resid = float(np.sqrt(((lf - np.polyval(fit, mid)) ** 2).mean()))
    top_w = [rows[y][1] - rows[y][0] + 1 for y in yy[:6]]
    st = X.hue_sat(im, m)
    h = int(ys.max() - ys.min() + 1)
    return {"height_px": h, "tower_ratio": round(h / 745, 3), "top_y": int(ys.min()), "top_row_widths": [int(v) for v in top_w],
            "left_edge_resid_px": round(resid, 2), "white_px": white, "two_value_share": round(two, 3),
            "pixels": int(arr.sum()), "hue_deg": st["mean_hue_deg"], "sat": st["mean_saturation"]}


def peak():
    guard_endpoint(FLUX3)
    best = best_brut("mythic")
    d = OUT / "peak"
    (d / "brut").mkdir(parents=True, exist_ok=True)
    outs = [d / "brut" / f"t1_v{i}.png" for i in range(2)]
    done = all(o.exists() for o in outs)  # a rerun after a crash in the measures reads the images already paid for
    body = Image.open(best).convert("RGB").resize(S.SIZE, Image.LANCZOS)
    new = S.sil(Image.open(MQ / "mythic.peinture.png"))
    shard = ImageChops.multiply(new, _above(330))
    edit = ImageChops.lighter(shard, ImageChops.multiply(S.sil(body), _above(330))).filter(ImageFilter.MaxFilter(13))
    sl, _, sr, _ = shard.getbbox()
    ring = Image.new("L", new.size, 0)
    ring.paste(255, (sl - 60, 330, sr + 60, 430))  # the collar and the roof tiles around it
    edit = ImageChops.lighter(edit, ImageChops.multiply(new, ring))
    l, t, r, b = edit.getbbox()
    w, h = S.SIZE
    box = [round(1000 * t / h), round(1000 * l / w), round(1000 * min(b + 12, h) / h), round(1000 * r / w)]
    p = PEAK_TXT + json.dumps([{"id": "peak", "desc": "the blue shard in two flat values, broken left edge, broken point, on a small "
                                "dark matte iron collar, a few roof tiles around the collar barely tinted blue",
                                "from": "ref_image_0", "src_bbox": box, "tgt_bbox": box}])
    entry = ({"cost": 0.14} if done else batch("sondes4 peak t1", 2, "sondes4_peak", p, outs, (best,), 68100))
    soft = edit.filter(ImageFilter.GaussianBlur(2))
    res = {"prompt": p, "bbox": box, "cost": entry["cost"], "base": best.name, "before": shard_stats(body), "images": {}}
    for o in outs:
        if not o.exists():
            continue
        gen = Image.open(o).convert("RGB").resize(S.SIZE, Image.LANCZOS)
        comp = Image.composite(gen, body, soft)
        comp.save(d / f"edit_{o.stem}.png")
        res["images"][o.name] = {"edit": shard_stats(comp)}
    ok = {k: v for k, v in res["images"].items() if v["edit"]["tower_ratio"] >= 0.25} or res["images"]
    choice = min(ok, key=lambda k: (ok[k]["edit"]["white_px"], -ok[k]["edit"]["two_value_share"]))
    res["choice"] = choice
    (d / "choix.txt").write_text(choice)
    (d / "peak.json").write_text(json.dumps(res, indent=2))
    shifts()


def shifts():
    """Hue 212 and saturation 0.55 (Guillaume's target) and 0.40 (variant), under the shard's own blue mask, 0 $."""
    d = OUT / "peak"
    res = json.loads((d / "peak.json").read_text())
    comp = Image.open(d / f"edit_{res['choice'].replace('.png', '')}.png").convert("RGB")
    m = shard_mask(comp).filter(ImageFilter.MinFilter(3))
    res["shift_mask_pixels"] = int((np.asarray(m) > 0).sum())
    for tag, sat in (("055", 0.55), ("040", 0.40)):
        out = tint(comp, m, 212, sat)
        out.save(d / f"peak_{tag}.png")
        res[f"shift_{tag}"] = shard_stats(out)
    (d / "peak.json").write_text(json.dumps(res, indent=2))
    print(json.dumps({k: v for k, v in res.items() if k != "prompt"}, indent=1))


# ---------------------------------------------------------------- breeches

BREECHES_BOX = (312, 795, 408, 915)  # x0, y0, x1, y1 px: 96 x 120, the cloth (76 px wide) hangs inside it, left of the rail's middle
BREECHES_TXT = ("Image 1 is a finished painting of a windmill on a flat magenta background. Image 2 is a small painting of the pair "
                "of breeches to hang, at the exact size they must have. Edit image 1 inside the box only, on the front left of the "
                "timber gallery rail: hang there one pair of old flour-white breeches, about 76 pixels wide and 100 pixels tall, no "
                "bigger, so that they fit inside the box and leave the rail on their left untouched: two legs hanging down, a "
                "gathered waist, hung from two small wooden pegs on the rail's top bar. TWO wide ochre stripes cross the legs, each "
                "at least 18 pixels thick, so they read from far away. Under it, a small soft contact shadow of the cloth on the "
                "rail and on the stone behind. The ink outline of the breeches is as heavy and dark (near-black #0F1518) as the "
                "ink outline of the tower in the same image, even, not thinner. No blue anywhere on the cloth. Matte painted "
                "brushwork, daylight from the upper left. Everything else stays exactly as it is, same position to the pixel, same "
                "ink, materials, light and flat magenta background; no object is added; no text, no letters. Edits: ")


def _norm_box(b):
    x0, y0, x1, y1 = b
    w, h = S.SIZE
    return [round(1000 * y0 / h), round(1000 * x0 / w), round(1000 * y1 / h), round(1000 * x1 / w)]


def cloth_stats(im, box=BREECHES_BOX):
    """The cloth in the rail box: its width, its ochre stripes (thickness of each run of rows, px at 896), the ink weight of its
    outline and of the tower's contour in the same image (mean ink run in px, rows of the cloth / rows 900-1100), blue px left."""
    a = np.asarray(im.convert("RGB"), float)[box[1]:box[3], box[0]:box[2]] / 255
    hue, sat, val = _hsv(a)
    white = (a.min(-1) > 0.55) & (sat < 0.32)
    bluegrey = (hue > 190) & (hue < 250) & (sat > 0.08) & (sat < 0.6) & (val > 0.3) & (val < 0.85)
    cols = np.where(white.sum(0) > 15)[0]
    rows = np.where(white.sum(1) > 8)[0]
    if not len(cols):
        return {"cloth": None, "bluegrey_px": int(bluegrey.sum())}
    cx0, cx1, cy0, cy1 = int(cols.min()), int(cols.max()), int(rows.min()), int(rows.max())
    core = slice(cx0 + (cx1 - cx0) // 4, cx1 - (cx1 - cx0) // 4 + 1)
    ochre = (hue > 25) & (hue < 52) & (sat > 0.35) & (val > 0.45)
    hit = ochre[:, core].mean(1) > 0.3
    runs, n = [], 0
    for v in list(hit) + [False]:
        if v:
            n += 1
        elif n:
            runs.append(n)
            n = 0
    ink = val < 0.2
    edge = []
    for y in range(cy0, cy1 + 1):
        xs = np.where(white[y])[0]
        if len(xs) > 3:
            edge += [int(ink[y, max(0, xs[0] - 8):xs[0]].sum()), int(ink[y, xs[-1] + 1:xs[-1] + 9].sum())]
    return {"cloth_w_px": cx1 - cx0 + 1, "cloth_h_px": cy1 - cy0 + 1, "stripe_thickness_px": runs,
            "cloth_ink_px": round(float(np.mean(edge)), 2) if edge else 0, "tower_ink_px": tower_ink_run(im),
            "bluegrey_px": int(bluegrey.sum())}


def tower_ink_run(im):
    """Mean ink run (px, within 8 px of the silhouette edge) at the tower's left and right contour, rows 900-1100."""
    a = np.asarray(im.convert("RGB"), float) / 255
    ink = a.max(-1) < 0.2
    mag = (a[..., 0] > 0.78) & (a[..., 2] > 0.78) & (a[..., 1] < 0.35)
    runs = []
    for y in range(900, 1100, 4):
        xs = np.nonzero(~mag[y])[0]
        if len(xs) < 50:
            continue
        runs += [int(ink[y, xs[0]:xs[0] + 8].sum()), int(ink[y, xs[-1] - 7:xs[-1] + 1].sum())]
    return round(float(np.mean(runs)), 2)


def breeches():
    guard_endpoint(FLUX3)
    piece = Image.open(S3 / "culotte/coupe" / (S3 / "culotte/choix.txt").read_text().strip()).convert("RGBA")
    ref = Image.new("RGB", (512, 512), (255, 0, 255))
    k = 76 / piece.width  # the size it must have in image 1
    p = piece.resize((76, round(piece.height * k)), Image.LANCZOS)
    ref.paste(p, ((512 - p.width) // 2, (512 - p.height) // 2), p)
    d = OUT / "culotte"
    (d / "brut").mkdir(parents=True, exist_ok=True)
    ref_path = d / "piece_ref.png"
    ref.save(ref_path)
    box = _norm_box(BREECHES_BOX)
    mask = Image.new("L", S.SIZE, 0)
    mask.paste(255, BREECHES_BOX)
    soft = mask.filter(ImageFilter.GaussianBlur(3))
    cj = d / "culotte.json"
    info = json.loads(cj.read_text()) if cj.exists() else {"bbox": box, "bbox_px": list(BREECHES_BOX), "prompt": BREECHES_TXT, "stages": {}}
    for stage in PAINT_STAGES:
        base = (OUT / "peak/peak_055.png") if stage == "mythic" else best_brut(stage)
        body = Image.open(base).convert("RGB").resize(S.SIZE, Image.LANCZOS)
        outs = [d / "brut" / f"{stage}_v{i}.png" for i in range(2)]
        if any(o.exists() for o in outs):
            continue
        pr = BREECHES_TXT + json.dumps([{"id": "breeches", "desc": "76 px wide flour-white breeches on two pegs, two ochre stripes of 18 px or more, "
                                        "small contact shadow, heavy ink outline", "from": None, "src_bbox": None, "tgt_bbox": box}])
        entry = batch(f"sondes4 breeches {stage}", 2, f"sondes4_culotte_{stage}", pr, outs, (base, ref_path),
                      69000 + 100 * PAINT_STAGES.index(stage))
        row = {"base": str(base.relative_to(OUT)), "cost": entry["cost"], "before": cloth_stats(body), "images": {}}
        for o in outs:
            if not o.exists():
                continue
            gen = Image.open(o).convert("RGB").resize(S.SIZE, Image.LANCZOS)
            comp = Image.composite(gen, body, soft)
            comp.save(d / f"{stage}_edit_{o.stem.split('_')[-1]}.png")
            row["images"][o.name] = cloth_stats(comp)
        if not row["images"]:
            sys.exit("no image for " + stage)
        row["choice"] = max(row["images"], key=lambda k: (sum(1 for v in row["images"][k].get("stripe_thickness_px", []) if v >= 18),
                                                          -(row["images"][k].get("cloth_w_px") or 999) // 10))
        info["stages"][stage] = row
        cj.write_text(json.dumps(info, indent=2))
    cj.write_text(json.dumps(info, indent=2))
    print(json.dumps({k: v for k, v in info.items() if k != "prompt"}, indent=1))


def final_raw(stage):
    """The finished raw image of a stage (RGB 896 x 1344): the breeches edit if it exists, else the best paint."""
    cj = OUT / "culotte/culotte.json"
    if stage in PAINT_STAGES and cj.exists():
        row = json.loads(cj.read_text())["stages"].get(stage)
        if row:
            return OUT / "culotte" / f"{stage}_edit_{row['choice'].split('_')[-1]}"
    return OUT / "peak/peak_055.png" if stage == "mythic" else best_brut(stage)


def mythic_040():
    """The 0.40 peak variant with the same breeches: the 0.55 stage's breeches box pasted into the 0.40 image."""
    a = Image.open(final_raw("mythic")).convert("RGB")
    b = Image.open(OUT / "peak/peak_040.png").convert("RGB")
    mask = Image.new("L", S.SIZE, 0)
    mask.paste(255, BREECHES_BOX)
    return Image.composite(a, b, mask.filter(ImageFilter.GaussianBlur(3)))


def cut_of(stage, raw):
    """Cut and control numbers of a finished raw image (a path or an RGB image) against the stage's maquette."""
    if isinstance(raw, Image.Image):
        tmp = OUT / "_tmp_final.png"
        raw.save(tmp)
        raw = tmp
    return control(stage, raw)


# ---------------------------------------------------------------- measures and boards

def mesures():
    rep = {"before": {}, "after": {}, "final_controls": {}}
    for s in S.STAGES:
        rep["before"][s] = measures(S3 / s / "coupe" / _best3(s), s)
        rep["after"][s] = measures(OUT / s / "coupe" / json.loads((OUT / s / "controle.json").read_text())["best"], s)
        raw = final_raw(s)
        _, ctl = cut_of(s, raw)
        rep["final_controls"][s] = {k: ctl[k] for k in ("iou", "top_y", "card_top_y", "top_delta_px", "top_ok", "magenta_residual")}
        rep["final_controls"][s]["image"] = str(pathlib.Path(raw).relative_to(OUT))
    ref = stone_ref()
    rep["stone_ref_specks"] = measures(ref.parent.parent / "coupe" / ref.name, "solid")
    (OUT / "mesures.json").write_text(json.dumps(rep, indent=2))
    print(json.dumps(rep, indent=1))


def tower(stage):
    """RGBA cut of the stage's finished image (breeches and, for the mythic, the 0.55 peak included)."""
    return cut_of(stage, final_raw(stage))[0]


def montage(stage, tower_img, ribbons=False):
    base = Image.new("RGBA", S.SIZE, GREEN + (255,))
    base.alpha_composite(tower_img)
    if ribbons:
        base.alpha_composite(S.key(Image.open(MQ / "rubans.peinture.png")))
    sheet = MQ / "sails_rough.peinture.png" if stage == "rough" else R1 / f"elements/sails_{'legendary' if stage == 'mythic' else stage}.peinture.png"
    sails = S.key(Image.open(sheet))
    cx, cy = S.px_pivot(stage)
    base.alpha_composite(sails, (cx - 384, cy - 384)) if cy - 384 >= 0 else base.alpha_composite(
        sails.crop((0, 384 - cy, 768, 768)), (cx - 384, 0))
    return base


def boards():
    towers = {s: tower(s) for s in S.STAGES}
    mont = {s: montage(s, towers[s], ribbons=(s == "mythic")) for s in S.STAGES}
    (OUT / "juge").mkdir(exist_ok=True)
    key = {}
    order = list(S.STAGES)
    random.Random(404).shuffle(order)

    def save(letter, im):
        f = OUT / "juge" / f"{letter}.png"
        if not f.exists():
            tile = Image.new("RGBA", S.SIZE, GREEN + (255,))
            tile.alpha_composite(im)
            tile.convert("RGB").resize((448, 672), Image.LANCZOS).save(f)

    for letter, s in zip("ABCDE", order):
        save(letter, towers[s])
        key[letter] = {"stage": s, "kind": "tower"}
    for letter, s in zip("FGHIJ", order):
        save(letter, mont[s])
        key[letter] = {"stage": s, "kind": "montage sails 45deg" + (" + new ribbons" if s == "mythic" else "")
                       + (" (patch moved to blade 1)" if s == "rough" else "")}
    cut40, _ = cut_of("mythic", mythic_040())
    save("K", cut40)
    key["K"] = {"stage": "mythic", "kind": "tower, peak at saturation 0.40 (the other mythic carries 0.55)"}
    k = 2 / 5
    bw, bh = round(S.SIZE[0] * k), round(S.SIZE[1] * k)
    strip = Image.new("RGB", (5 * bw, bh), GREEN)
    for i, s in enumerate(S.STAGES):
        strip.paste(mont[s].convert("RGB").resize((bw, bh), Image.LANCZOS), (i * bw, 0))
    if not (OUT / "bande.png").exists():
        strip.save(OUT / "bande.png")
    if not (OUT / "juge_cle.json").exists():
        (OUT / "juge_cle.json").write_text(json.dumps(key, indent=2))
    ctls = {s: json.loads((OUT / s / "controle.json").read_text()) for s in S.STAGES}
    batches = [b for b in json.loads(BUDGET.read_text())["v1"]["batches"] if b["label"].startswith("sondes4")]
    pk = json.loads((OUT / "peak/peak.json").read_text())
    cu = json.loads((OUT / "culotte/culotte.json").read_text())
    if not (OUT / "provenance.json").exists():
        (OUT / "provenance.json").write_text(json.dumps({
            "date": time.strftime("%Y-%m-%d"), "model": "FLUX 3 Image", "endpoint": FLUX3,
            "prompts": {s: c["prompt"] for s, c in ctls.items() if s in PAINT_STAGES}, "peak_prompt": pk["prompt"],
            "breeches_prompt": cu["prompt"], "batches": batches, "cost_total": round(sum(b["cost"] for b in batches), 4),
            "best": {s: c["best"] for s, c in ctls.items()}, "stone_reference": str(stone_ref().relative_to(R1)) + " cropped to refs/stone_D_crop.png",
            "kept_from_sondes3": ["rough", "solid"],
            "maquettes": "sondes4_maquettes.py (LOCAL_LIGHT), ribbons and sails_rough re-rendered"}, indent=2, ensure_ascii=False))
    print(json.dumps(key))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["keep", "paint", "peak", "shifts", "breeches", "mesures", "boards"])
    globals()[ap.parse_args().cmd]()
