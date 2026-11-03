#!/usr/bin/env python3
"""Windmill r1, final paint of the elements (sails, ribbons, teasers, add-on, gags, keeper, clan marks). Outputs in
windmill/r1/final/elements/<name>/, never overwritten. One command at a time (SCRIPT=final_elements.py final_run.sh <cmd> <name>).

    paint <name>     two FLUX 3 images through the registry (a second pair only if none passes), cut, controls, controle.json
    paint_all        every element of ELEMENTS not yet painted, in order, stops on the job budget
    list             the elements and what is done

A small element is cut out of its 896 x 1344 maquette canvas in a square window, shown to FLUX at 768 x 768 (2 to 4 times its
size, so it has the pixels to be a painting), and pasted back at its place, so every element keeps the canvas and the anchor of
the tower. Controls: IoU against the maquette silhouette, top y, magenta residual, footprint (the contact line inside the
diamond), overflow outside the maquette, size in dp (5 px of canvas = 1 dp). No overlay is added to any day element.
"""
import argparse
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import final_paint as P  # noqa: E402
import numpy as np  # noqa: E402
from PIL import Image, ImageChops, ImageDraw, ImageFilter  # noqa: E402

S, X, R1, OUT = P.S, P.X, P.R1, P.OUT
ELT = R1 / "elements"  # the maquettes of the card's elements (round 3)
MQ = OUT / "maquettes"
CANVAS = (896, 1344)
DIAMOND = [(448, 893), (832, 1087), (448, 1280), (64, 1087)]  # the 2 x 2 footprint on the canvas
HEAD_SMALL = ("Image 1 is a flat maquette on a flat magenta background: it fixes the exact shape, size and position of {what}, seen "
              "from the front and above in isometric view. Paint exactly this as a finished daytime illustration. Same position "
              "to the pixel, no object added, nothing cropped. ")
NOGROUND = ("Paint no ground, no grass, no slab, no tower, no building and no cast shadow on the ground: only the object. All "
            "metal is matte, nothing golden, no gloss, no glow. ")
STYLE = ("Images 2, 3 and 4 are style references only, for ink line, upper-left light and painted brushwork: copy none of their "
         "shapes, objects, ground diamond or cast shadows, and paint shaded sides in warm dark taupe, not their olive-green; "
         "shape comes only from image 1, the maquette. ")
TAIL_SMALL = NOGROUND + STYLE
HEAD_SAILS = ("Image 1 is a flat maquette on a flat magenta background: the four sail blades of a windmill in an X, seen from the "
              "front, with a small round hub at the centre. It fixes the exact shape and position of every blade. Paint exactly "
              "these four blades as a finished daytime illustration: each blade is a long timber lattice frame, a heavy spar "
              "along one edge and cross slats, covered with cloth. {cloth}The hub at the centre is a small round matte iron cap, "
              "as in the maquette. Never paint a tower, a wall, a roof, a building or a cast shadow of any kind. ")
KNIGHT_ON_BLADE = ("The maquette shows a small dark figure hanging by his belt from the outer third of the upper right blade, head "
                   "toward the hub and feet toward the tip, arms flung out: paint him as a lean old knight in a dented helmet and "
                   "worn steel armour with a faded red cloth and a brown leather belt, in full colour, never a black silhouette, "
                   "the same place and size as the maquette. ")
CLOTH = {
    "rough": ("The cloth is old, patched and mended: warm sand and grey-beige with coarse stitched patches in muted ochre and "
              "faded brown, frayed edges. On the upper left blade the maquette shows a pair of old breeches fixed as a patch: "
              "paint exactly that, a real pair of flour-white breeches with a gathered waist and two legs, two wide ochre "
              "stripes across the legs, a heavy ink outline, the same size and place as the maquette. "),
    "solid": "The cloth is whole and taut, warm sand, with a few clean seams and rope lashings along the spars; no patches. ",
    "grand": ("The cloth is whole and taut, warm sand, on a heavier darker timber frame with iron-banded joints; no patches. "),
    "legendary": ("The cloth is matte sky blue (#A8C2D2), whole and taut, with a fine weave and a few seams; the timber frame is "
                  "heavy and dark, iron-banded at the joints; no patches, no glow, no shine. "),
}
FIGURE = "in full colour (steel grey armour, a faded red cloth, brown leather, a brown horse), never a black silhouette"


def small(what, desc):
    return HEAD_SMALL.format(what=what) + desc + " " + TAIL_SMALL + X.FIN


def sails(cloth, knight=False):
    return HEAD_SAILS.format(cloth=cloth + (KNIGHT_ON_BLADE if knight else "")) + STYLE + X.FIN


# name: kind, maquette, prompt, IoU threshold, ground contact, window padding, seed
ELEMENTS = {
    "sails_rough": dict(kind="sheet", maq=MQ / "sails_rough.peinture.png", th=0.93, prompt=sails(CLOTH["rough"])),
    "sails_solid": dict(kind="sheet", maq=ELT / "sails_solid.peinture.png", th=0.93, prompt=sails(CLOTH["solid"])),
    "sails_grand": dict(kind="sheet", maq=ELT / "sails_grand.peinture.png", th=0.93, prompt=sails(CLOTH["grand"])),
    "sails_legendary": dict(kind="sheet", maq=ELT / "sails_legendary.peinture.png", th=0.93, prompt=sails(CLOTH["legendary"])),
    "sails_grand_chevalier": dict(kind="sheet", maq=ELT / "sails_grand_chevalier.peinture.png", th=0.92,
                                  prompt=sails(CLOTH["grand"], True)),
    "sails_legendary_chevalier": dict(kind="sheet", maq=ELT / "sails_legendary_chevalier.peinture.png", th=0.92,
                                      prompt=sails(CLOTH["legendary"], True)),
    "rubans": dict(kind="canvas", maq=MQ / "rubans.peinture.png", th=0.70, ribbons=True, prompt=(
        "Image 1 is a flat maquette on a flat magenta background: it fixes the exact shape and position of two ribbons of wind "
        "that wind round a windmill tower, seen from the front and above. Paint exactly these two ribbons as a finished "
        "daytime illustration: thick pale blue cloth streamers (#BCD6E4 lit, #7FA3BC shaded), tapering to a point at both ends, "
        "matte, with a frayed fibrous edge on both sides, a soft fold line along the length, and an ink line on the lower right "
        "edge only, none on the upper left edge, no little cross bars, no double outline. Same position to the pixel, no object "
        "added. Paint no tower, no building, no ground and no cast shadow: only the two ribbons. Images 2, 3 and 4 are style "
        "references only, for ink line, upper-left light and painted brushwork: copy none of their shapes or objects; shape "
        "comes only from image 1, the maquette. " + X.FIN)),
}


def small_element(name, kind, what, desc, **kw):
    ELEMENTS[name] = dict(kind="small", maq=kw.pop("maq", ELT / f"{name}.peinture.png"), prompt=small(what, desc), **kw)


small_element("teaser_r2", "t", "a small capstan on wedges with dressed stones beside it", (
    "a round wooden capstan drum with a flat top, resting on wooden wedges, and a few roughly dressed pale stone blocks beside "
    "it, warm sandy new-cut stone"), th=0.80, ground=True)
small_element("teaser_r4", "t", "the footing of a small stone bread oven with bricks", (
    "a low stepped footing of dressed warm stone with a flat slab on top, and a few red clay bricks stacked at its side"),
    th=0.80, ground=True)
small_element("teaser_r6", "t", "a short timber mast with a rolled cloth", (
    "a straight timber mast with a short crossbar at the top, and a rolled bundle of matte pale blue-grey cloth tied around "
    "its middle"), th=0.80)
small_element("teaser_r8", "t", "a small timber lifting derrick with a crystal shard on a long pole", (
    "a small timber lifting derrick, an upright post with a leaning arm and a rope, a raw matte cold-blue mineral shard "
    "hanging from the arm tip like a sash, and a long timber pole leaning beside it; the shard is matte, two flat values, no "
    "shine, no facets"), th=0.78)
small_element("teaser_r9", "t", "a timber scaffold around a half-built spire", (
    "a three-level timber scaffold of poles, ledgers and planks around a half-built spire of raw matte cold-blue mineral: two "
    "stacked tapering segments; the mineral is matte, two flat values, no shine, no facets"), th=0.78)
small_element("addon_ane", "a", "a donkey and a horse standing side by side", (
    "a grey donkey with a small travel pack and a brown horse standing side by side in profile, tied together by a short rope, "
    "both lean, " + FIGURE), th=0.75, ground=True)
small_element("gag_r2", "g", "a knight on a horse", (
    "a lean old knight in a dented helmet and worn armour on a lean horse, holding a long lance upright, both staring ahead, "
    + FIGURE), th=0.75, ground=True)
small_element("gag_r4", "g", "a knight charging on a horse with dust puffs", (
    "a lean old knight in a dented helmet charging on a lean galloping horse, almost in profile, the lance level, small cream "
    "dust puffs behind the hooves, " + FIGURE), th=0.72, ground=True)
small_element("gag_r6", "g", "a horse", (
    "a lean brown horse standing with a worn saddle cloth and loose reins, its head raised, looking up, no rider, " + FIGURE),
    th=0.75, ground=True)
small_element("gag_r8", "g", "a knight seated beside his helmet", (
    "a lean old knight sitting on the ground in worn armour, his dented helmet on the ground beside him, holding out a round "
    "loaf of bread in his extended hand, a friendly bare head, " + FIGURE), th=0.72, ground=True)
small_element("gag_r10", "g", "a knight and his squire sitting side by side on a rail", (
    "a lean old knight in worn armour and his round squire sitting side by side on a timber rail, legs hanging, a cloth spread "
    "under them with bread and a jug, a lance planted behind them as a mast carrying a small pale ribbon, " + FIGURE),
    th=0.72)


def mask_of(im):
    return S.sil(im)


def window(bbox, canvas, pad=0.35, side_min=240):
    x0, y0, x1, y1 = bbox
    side = max(side_min, round(max(x1 - x0, y1 - y0) * (1 + 2 * pad)))
    side = min(side, canvas[0], canvas[1])
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    wx = min(max(0, cx - side // 2), canvas[0] - side)
    wy = min(max(0, cy - side // 2), canvas[1] - side)
    return wx, wy, side


def in_diamond(x, y, tol=8):
    """Whether a canvas point is inside the 2 x 2 footprint diamond, grown by tol px."""
    cx, cy = 448, 1087
    return abs(x - cx) / 384 + abs(y - cy) / 193.5 <= 1 + tol / 193.5


def control(name, spec, raw, win, maq_canvas):
    """The cut (RGBA, canvas size) and the numbers of one raw FLUX image of an element."""
    side = win[2]
    canvas = Image.new("RGB", maq_canvas.size, (255, 0, 255))
    rgb = Image.open(raw).convert("RGB").resize((side, side), Image.LANCZOS)
    canvas.paste(rgb, (win[0], win[1]))
    wmask = Image.new("L", maq_canvas.size, 0)
    wmask.paste(255, (win[0], win[1], win[0] + side, win[1] + side))
    m = mask_of(maq_canvas)
    s = ImageChops.multiply(mask_of(canvas), wmask)
    inter = np.asarray(ImageChops.multiply(m, s)) > 0
    union = np.asarray(ImageChops.lighter(m, s)) > 0
    iou = float(inter.sum() / max(1, union.sum()))
    a = np.asarray(canvas, int)
    lean = (a[..., 0] > a[..., 1] + 40) & (a[..., 2] > a[..., 1] + 40)  # magenta-leaning pixel
    alpha = (np.asarray(s) > 0) & ~((a[..., 0] > 170) & (a[..., 2] > 170) & (a[..., 1] < 130))
    edge = alpha & ~(np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))) > 0)
    alpha &= ~(edge & lean)  # the pinkish fringe of the downscale
    alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))) > 0
    cut = canvas.convert("RGBA")
    cut.putalpha(Image.fromarray((alpha * 255).astype(np.uint8)))
    ys, xs = np.nonzero(alpha)
    my, mx = np.nonzero(np.asarray(m) > 0)
    spill = float((alpha & lean).sum() / max(1, alpha.sum()))
    near = np.asarray(Image.fromarray((np.asarray(m) > 0).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(25))) > 0
    overflow = float((alpha & ~near).sum() / max(1, alpha.sum()))
    top_delta = int(ys.min() - my.min())
    c = {"iou": round(iou, 4), "magenta_residual": round(spill, 5), "top_y": int(ys.min()), "maquette_top_y": int(my.min()),
         "top_delta_px": top_delta, "top_ok": abs(top_delta) <= 10, "overflow_share": round(overflow, 4),
         "bbox": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
         "size_dp": [round((xs.max() - xs.min() + 1) / 5, 1), round((ys.max() - ys.min() + 1) / 5, 1)],
         "maquette_size_dp": [round((mx.max() - mx.min() + 1) / 5, 1), round((my.max() - my.min() + 1) / 5, 1)]}
    foot_ok = True
    if spec.get("ground"):
        low = [(x, y) for x, y in zip(xs, ys) if y >= ys.max() - 5]
        inside = sum(in_diamond(x, y) for x, y in low) / max(1, len(low))
        c["footprint_inside_diamond"] = round(inside, 3)
        foot_ok = inside >= 0.98
    if spec.get("ribbons"):
        c.update(ribbon_ink(canvas, alpha))
    c["passes"] = bool(iou >= spec["th"] and c["top_ok"] and spill < 0.005 and foot_ok and overflow < 0.12)
    c["score"] = round(iou - 5 * spill - (0 if c["top_ok"] else 1) - (0 if foot_ok else 1) - 2 * max(0.0, overflow - 0.05), 4)
    return cut, c


def ribbon_ink(canvas, alpha):
    """Ink on the lower right side only: ink pixels in the 6 px band beside the ribbon, lower right against upper left."""
    a = np.asarray(canvas, float) / 255
    ink = a.max(-1) < 0.2
    m = Image.fromarray((alpha * 255).astype(np.uint8))
    ring = alpha & ~(np.asarray(m.filter(ImageFilter.MinFilter(9))) > 0)  # the 4 px along the edge
    lower = np.zeros_like(alpha)  # edge pixels whose lower right side is outside the ribbon
    upper = np.zeros_like(alpha)  # edge pixels whose upper left side is outside the ribbon
    for k in range(3, 7):
        lower[:-k, :-k] |= ~alpha[k:, k:]
        upper[k:, k:] |= ~alpha[:-k, :-k]
    ll, uu = int((ring & lower & ~upper & ink).sum()), int((ring & upper & ~lower & ink).sum())
    return {"ink_lower_right_px": ll, "ink_upper_left_px": uu, "ink_one_side_ratio": round(ll / max(1, ll + uu), 3)}


def paint(name):
    P.guard_endpoint(P.FLUX3)
    spec = ELEMENTS[name]
    d = OUT / "elements" / name
    (d / "brut").mkdir(parents=True, exist_ok=True)
    (d / "coupe").mkdir(exist_ok=True)
    ctl = d / "controle.json"
    if ctl.exists():
        print(name, "already done")
        return
    maq = Image.open(spec["maq"]).convert("RGB")
    if spec["kind"] == "small":
        win = window(mask_of(maq).getbbox(), maq.size, spec.get("pad", 0.35))
        size = (768, 768)
        crop = maq.crop((win[0], win[1], win[0] + win[2], win[1] + win[2])).resize(size, Image.LANCZOS)
    else:  # a sheet or a whole canvas: FLUX sees it as it is
        win, size, crop = (0, 0, maq.width), maq.size, maq
    inp = d / "in.png"
    crop.save(inp)
    results, attempts = {}, 0
    for attempt in (1, 2):
        outs = [d / "brut" / f"t{attempt}_v{i}.png" for i in range(2)]
        if any(o.exists() for o in outs):
            continue
        attempts += 1
        refs = (inp, *S.STYLE)
        P.batch(f"{name} t{attempt}", 2, f"final_{name}", spec["prompt"], outs, refs, 92000 + 37 * len(name) + 100 * attempt, size)
        for o in outs:
            if not o.exists():
                continue
            if spec["kind"] == "canvas":
                cut, c = control_canvas(name, spec, o, maq)
            else:
                cut, c = control(name, spec, o, win, maq)
            cut.save(d / "coupe" / o.name)
            results[o.name] = c
        if any(c["passes"] for c in results.values()):
            break
    if not results:
        print(name, "no image")
        return
    pool = {k: v for k, v in results.items() if v["passes"]} or results
    best = max(pool, key=lambda k: results[k]["score"])
    ctl.write_text(json.dumps({"element": name, "window": list(win), "attempts": attempts, "images": results, "best": best,
                               "failed": not results[best]["passes"], "prompt": spec["prompt"]}, indent=2))
    print(name, "best", best, {k: results[best][k] for k in ("iou", "top_ok", "passes", "size_dp")}, flush=True)


def control_canvas(name, spec, raw, maq):
    """A full-canvas element (the ribbons): FLUX returns the canvas size, no window."""
    canvas = Image.open(raw).convert("RGB").resize(maq.size, Image.LANCZOS)
    m = mask_of(maq)
    s = mask_of(canvas)
    inter = np.asarray(ImageChops.multiply(m, s)) > 0
    union = np.asarray(ImageChops.lighter(m, s)) > 0
    a = np.asarray(canvas, int)
    lean = (a[..., 0] > a[..., 1] + 40) & (a[..., 2] > a[..., 1] + 40)
    alpha = (np.asarray(s) > 0) & ~((a[..., 0] > 170) & (a[..., 2] > 170) & (a[..., 1] < 130))
    edge = alpha & ~(np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))) > 0)
    alpha &= ~(edge & lean)
    cut = canvas.convert("RGBA")
    cut.putalpha(Image.fromarray((alpha * 255).astype(np.uint8)))
    ys, xs = np.nonzero(alpha)
    my, mx = np.nonzero(np.asarray(m) > 0)
    near = np.asarray(Image.fromarray((np.asarray(m) > 0).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(25))) > 0
    spill = float((alpha & lean).sum() / max(1, alpha.sum()))
    iou = float(inter.sum() / max(1, union.sum()))
    overflow = float((alpha & ~near).sum() / max(1, alpha.sum()))
    c = {"iou": round(iou, 4), "magenta_residual": round(spill, 5), "top_y": int(ys.min()), "maquette_top_y": int(my.min()),
         "top_delta_px": int(ys.min() - my.min()), "top_ok": abs(int(ys.min() - my.min())) <= 12,
         "overflow_share": round(overflow, 4), "bbox": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
         "size_dp": [round((xs.max() - xs.min() + 1) / 5, 1), round((ys.max() - ys.min() + 1) / 5, 1)]}
    c.update(ribbon_ink(canvas, alpha))
    c["passes"] = bool(iou >= spec["th"] and c["top_ok"] and spill < 0.005 and overflow < 0.15 and c["ink_one_side_ratio"] >= 0.7)
    c["score"] = round(iou - 5 * spill - (0 if c["top_ok"] else 1) - 2 * max(0.0, overflow - 0.05)
                       - max(0.0, 0.7 - c["ink_one_side_ratio"]), 4)
    return cut, c


def recontrol(name):
    """0 $: the controls of the images already paid for, recomputed with the current measures (after a fix of a measure)."""
    spec = ELEMENTS[name]
    d = OUT / "elements" / name
    ctl = json.loads((d / "controle.json").read_text())
    maq = Image.open(spec["maq"]).convert("RGB")
    win = tuple(ctl["window"])
    results = {}
    for o in sorted((d / "brut").glob("t*_v*.png")):
        cut, c = control_canvas(name, spec, o, maq) if spec["kind"] == "canvas" else control(name, spec, o, win, maq)
        cut.save(d / "coupe" / o.name)
        results[o.name] = c
    pool = {k: v for k, v in results.items() if v["passes"]} or results
    best = max(pool, key=lambda k: results[k]["score"])
    ctl.update(images=results, best=best, failed=not results[best]["passes"])
    (d / "controle.json").write_text(json.dumps(ctl, indent=2))
    print(name, "best", best, results[best]["passes"], results[best].get("ink_one_side_ratio"))


def listing():
    for n in ELEMENTS:
        c = OUT / "elements" / n / "controle.json"
        print(n, "done" if c.exists() else "-")


def paint_all():
    for n in ELEMENTS:
        if not (OUT / "elements" / n / "controle.json").exists():
            paint(n)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd")
    ap.add_argument("arg", nargs="?")
    a = ap.parse_args()
    f = {"paint": paint, "paint_all": paint_all, "list": listing, "recontrol": recontrol}[a.cmd]
    f(a.arg) if a.arg else f()
