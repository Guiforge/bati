#!/usr/bin/env python3
"""G18 bake-off, round 2: gpt-image-2.5-sunburst (g25) and gpt-image-2.6-sunburst (g26), jobs maison and chemins.

    bakeoff2.py paint <maison|chemins> <g25|g26> <1|2> [mask]   one edit, 1024x1024, quality high, prompts of round 1
    bakeoff2.py measure                                         drift of chemins_g2*_*.png (round 1's measure) -> drift2.json
    bakeoff2.py boards                                          bakeoff2-maison.jpg and bakeoff2-chemins.jpg

Reuses prompts, inputs, path mask, POINTS and shift_of of bakeoff.py. Outputs in scratch/bakeoff, never overwritten.
"""
import json
import sys
import time

import numpy as np
from PIL import Image, ImageFilter

import bakeoff as B

MODELS = {"g25": "gpt-image-2.5-sunburst", "g26": "gpt-image-2.6-sunburst"}
JOBS = {"maison": 1, "chemins": 3}
QUALITY = "high"  # the guide lists low..max for both sunburst models; no complexity sent (default high)
MASK = B.IN / "mask_paths.png"
MASK_RGB = B.IN / "mask_paths_rgb.png"  # same shape, the chunk's own RGB under the alpha


def build_mask():
    """Round 1's path mask, dilated 10 px more; alpha 0 where the model may edit (docs: transparent = replace)."""
    if MASK.exists():
        return
    edit = np.asarray(Image.fromarray((B.path_mask(Image.open(B.IN / "chunk.png")) * 255).astype("uint8")).filter(ImageFilter.MaxFilter(21))) > 0
    rgba = np.zeros((*edit.shape, 4), "uint8")
    rgba[..., 3] = np.where(edit, 0, 255)
    Image.fromarray(rgba, "RGBA").save(MASK)


def build_mask_rgb():
    if MASK_RGB.exists():
        return
    build_mask()
    a = np.asarray(Image.open(MASK))[..., 3]
    rgb = np.asarray(Image.open(B.IN / "chunk.png").convert("RGB"))
    Image.fromarray(np.dstack([rgb, a]), "RGBA").save(MASK_RGB)


def colle(src_name, out_name):
    """Painted image pasted on the source chunk through the path mask, feathered 4 px (blur radius 2 on a binary mask)."""
    src = Image.open(B.IN / "chunk.png").convert("RGB")
    m = Image.fromarray((B.path_mask(src) * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(2))
    out = B.S / out_name
    if out.exists():
        sys.exit(f"exists: {out.name}")
    Image.composite(Image.open(B.S / src_name).convert("RGB").resize(src.size, Image.LANCZOS), src, m).save(out)


def paint(job, short, k, use_mask, rgb=False):
    import openai_loop
    from lib import flux
    out = B.S / f"{job}_{short}_{k}.png"
    if out.exists():
        sys.exit(f"exists, never overwritten: {out.name}")
    mask = None
    if use_mask:
        build_mask()
        mask = MASK
        if rgb:
            build_mask_rgb()
            mask = MASK_RGB
    flux.PROVENANCE = B.ROOT / "scripts" / "provenance.json"
    t = time.time()
    res = openai_loop.edit(out, B.PROMPTS[JOBS[job]], B.inputs(JOBS[job]), "1024x1024", QUALITY, B.SESSION, MODELS[short], mask)
    B.log({"job": job, "painter": MODELS[short], "k": k, "quality": QUALITY, "mask": str(mask) if mask else False, "cost": res["cost"], "usage": res["usage"],
           "seconds": round(time.time() - t, 1), "out": out.name})
    print(json.dumps(B.entry_of(out)))


def measure():
    src = Image.open(B.IN / "chunk.png").convert("RGB")
    mask = B.path_mask(src)
    build_mask()
    medit = np.asarray(Image.open(MASK))[..., 3] == 0
    ga = np.asarray(src.convert("L")).astype(float)
    result = {"mask_share": round(float(mask.mean()), 3), "edit_mask_share": round(float(medit.mean()), 3)}
    for out in sorted(B.S.glob("chemins_g2*_*.png")) + [B.S / "chemins_flux_1_colle.png"]:
        im = Image.open(out).convert("RGB")
        size = im.size
        if im.size != src.size:
            im = im.resize(src.size, Image.LANCZOS)
        d = np.abs(np.asarray(im).astype(float) - np.asarray(src).astype(float)).mean(axis=2)
        gb = np.asarray(im.convert("L")).astype(float)
        moved = {}
        for name, (cx, cy) in B.POINTS.items():
            e0, (e1, dx, dy) = B.shift_of(ga, gb, cx, cy)
            moved[name] = {"mad0": round(e0, 1), "best_shift": [dx, dy], "mad_best": round(e1, 1)}
        shifted = [n for n, m in moved.items() if max(abs(m["best_shift"][0]), abs(m["best_shift"][1])) >= 2 and m["mad_best"] < 0.8 * m["mad0"]]
        result[out.name] = {"size": list(size), "mad_outside_paths": round(float(d[~mask].mean()), 2), "mad_inside_paths": round(float(d[mask].mean()), 2),
                            "mad_all": round(float(d.mean()), 2), "mad_outside_edit_mask": round(float(d[~medit].mean()), 2),
                            "buildings_shifted_2px_or_more": shifted, "largest_shift_px": max(max(abs(m["best_shift"][0]), abs(m["best_shift"][1])) for m in moved.values()),
                            "points": moved}
        Image.fromarray(np.stack([ga, gb, gb], axis=2).clip(0, 255).astype("uint8")).save(B.S / f"drift2_{out.stem}.png")
    (B.S / "drift2.json").write_text(json.dumps(result, indent=2) + "\n")
    for k, v in result.items():
        if isinstance(v, dict):
            print(k, {a: v[a] for a in ("mad_outside_paths", "mad_inside_paths", "mad_all", "mad_outside_edit_mask", "largest_shift_px")}, v["buildings_shifted_2px_or_more"])
    print("mask share", result["mask_share"], result["edit_mask_share"])


def row(pairs, job, phone):
    """pairs: [(title, path)]: a full row of two columns, or the phone-size row."""
    cells = []
    for title, f in pairs:
        im = Image.open(f).convert("RGB")
        if not phone:
            a = B.fit(im, B.COL)
        elif job == "chemins":
            b = B.fit(im, 360)
            a = Image.new("RGB", (B.COL, b.height), (30, 30, 30))
            a.paste(b, ((B.COL - 360) // 2, 0))
        else:
            cutout, _ = B.cut(im)
            box = (170, 1560, 170 + B.COL, 1560 + 420)
            a = B.phone_panel(cutout, 150, (box[0] + 330, box[1] + 330), box)
        B.label(a, (6, 6), title)
        cells.append(a)
    r = Image.new("RGB", (B.W, max(c.height for c in cells) + 4), (255, 255, 255))
    for i, c in enumerate(cells):
        r.paste(c, (i * (B.COL + 12), 0))
    return r


def boards_chemins():
    f = lambda n: B.S / n
    rows = [[("FLUX 3 Image, essai 1, sans masque", f("chemins_flux_1.png")), ("gpt-image-2 (high), essai 1, sans masque", f("chemins_gpt_1.png"))],
            [("gpt-image-2.5-sunburst, essai 1, sans masque", f("chemins_g25_1.png")), ("gpt-image-2.6-sunburst, essai 1, sans masque", f("chemins_g26_1.png"))],
            [("g25 essai 1, colle sur la source", f("chemins_g25_1_colle.png")), ("g26 essai 1, colle sur la source", f("chemins_g26_1_colle.png"))],
            [("FLUX essai 1, colle sur la source", f("chemins_flux_1_colle.png"))]]
    stack = [row(r, "chemins", False) for r in rows] + [row(r, "chemins", True) for r in rows]
    w = (B.W - 3 * 8) // 4
    small = Image.new("RGB", (B.W, round(w * 1.0) + 4), (255, 255, 255))
    for i, (t, n) in enumerate([("g25 masque noir RVB", "chemins_g25_2.png"), ("g26 masque noir RVB", "chemins_g26_2.png"),
                                ("g25 masque RVB source", "chemins_g25_3.png"), ("g26 masque RVB source", "chemins_g26_3.png")]):
        c = B.fit(Image.open(f(n)), w)
        B.label(c, (4, 4), t)
        small.paste(c, (i * (w + 8), 0))
    head = Image.new("RGB", (B.W, 40), (20, 20, 20))
    B.label(head, (6, 4), "masque noir, format a revoir (4 essais avec masque, tous noirs)")
    stack += [head, small]
    board = Image.new("RGB", (B.W, sum(r.height for r in stack) + 8), (255, 255, 255))
    y = 0
    for r in stack:
        board.paste(r, (0, y))
        y += r.height
    board.save(B.IMG / "bakeoff2-chemins.jpg", quality=88)


def boards():
    boards_chemins()
    for job in ("maison",):
        rows = [[("FLUX 3 Image, essai 1, sans masque", B.S / f"{job}_flux_1.png"), ("gpt-image-2 (high), essai 1, sans masque", B.S / f"{job}_gpt_1.png")]]
        for short, name in MODELS.items():
            masked = job == "chemins" and (B.S / f"{job}_{short}_2.png").exists()
            rows.append([(f"{name}, essai 1, sans masque", B.S / f"{job}_{short}_1.png"),
                         (f"{name}, essai 2, " + ("AVEC masque" if masked else "sans masque"), B.S / f"{job}_{short}_2.png")])
        rows = [[(t, f) for t, f in r if f.exists()] for r in rows]
        stack = [row(r, job, False) for r in rows if r] + [row(r, job, True) for r in rows if r]
        board = Image.new("RGB", (B.W, sum(r.height for r in stack) + 8), (255, 255, 255))
        y = 0
        for r in stack:
            board.paste(r, (0, y))
            y += r.height
        board.save(B.IMG / f"bakeoff2-{job}.jpg", quality=88)


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["paint"]:
        paint(a[1], a[2], int(a[3]), a[4:] in (["mask"], ["maskrgb"]), a[4:] == ["maskrgb"])
    elif a[:1] == ["colle"]:
        colle(a[1], a[2])
    elif a[:1] == ["measure"]:
        measure()
    elif a[:1] == ["boards"]:
        boards()
    else:
        sys.exit(__doc__)
