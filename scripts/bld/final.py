#!/usr/bin/env python3
"""Final paint of a building, from scripts/bld/final/<code>.json (format: docs/designs/village-buildings/BRIEF-final.md).

    final.py emprise <code>                              # <code>/emprise.png, the flat footprint diamond at the iso camera
    final.py paint <code> <stage> [--variants 2] [--try N]   # FLUX 3 edit on flat magenta, final/<stage>_t<N>_v<i>.png
    final.py pick <code> <stage> N [--try N]             # keys the magenta, writes final/<stage>.png, measures into measures.json
    final.py rekey <code>                                # re-keys the elements from their .raw.png, no FLUX
    final.py elements <code>                             # teasers and gags, one subject per image, keyed
    final.py repick <code>                               # seats again the picked stages on the emprise, no FLUX
    final.py strip <code>                                # final/strip.png, the five stages side by side

Run paint and elements as `flock ~/.cache/bati-flux.lock timeout 590 python3 scripts/bld/final.py ...`. Never overwrites.
Order: rough, grand, solid, legendary, mythic (each sees the stage below, see SRC); pick each before painting the next.
"""
import argparse
import json
import pathlib
import sys

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import concepts as C  # noqa: E402
from PIL import Image, ImageDraw, ImageFilter, ImageFont  # noqa: E402

ROOT, DES = C.ROOT, C.DESIGNS
STAGES = ("rough", "solid", "grand", "legendary", "mythic")
# what each stage's FLUX call sees, in order, before the emprise: a stage name is the picked painting, "concept:x" the spec's concept
SRC = {"rough": ("concept:rough",), "grand": ("concept:grand", "rough"), "solid": ("rough", "grand"),
       "legendary": ("grand", "concept:mythic"), "mythic": ("legendary", "concept:mythic", "grand")}
W, H, CELL, BOTTOM = 896, 1152, 192, 1088  # canvas, half cell width in px (the 2x2 canvas diamond is 768 wide), diamond's lowest corner
MAG = (255, 0, 255)

NOTE = {
    "rough": "Image 1 is the concept of this building. ",
    "grand": ("Image 1 is the concept of this building. Image 2 is the smaller stage of the same building: keep its scale, the size of "
              "its frame and of its ground patch exactly, so this stage is the same footprint and only grows upward. "),
    "solid": ("Image 1 is the small stage of this building and image 2 the large stage: paint the stage between them, about halfway "
              "in height, the same building growing. "),
    "legendary": ("Image 1 is the stage below of this building and image 2 the concept of its final stage: paint the stage between "
                  "them, the same building growing, keeping the frame of image 1 and the size of its ground patch. "),
    "mythic": ("Image 1 is the previous stage of this building, image 2 the concept of its final spectacle and image 3 a smaller "
               "stage. Keep exactly the structure of image 1: same A-frame, same beams, chain and cauldron, only bigger, heavier and "
               "taller. From image 2 take the spectacle of fire, sparks and air. Image 3 gives the size of the ground patch, which "
               "stays on the diamond. The spectacle comes from the building as much as from the fire: timbers blackened and "
               "banded with iron, embers lying on the ground, firelight on the wood, one towering element. "),
}
COMMON = ("The last image is a flat grey diamond on magenta: it marks the building's footprint on the ground. Keep the building and "
          "its natural ground patch inside about that size, centred on it, the lowest point of the ground touching the diamond's "
          "lowest corner; the ground patch stays on the diamond, never wider than it; never paint a diamond or a slab. Paint one finished picture of this one building on a perfectly flat, "
          "pure magenta background (#FF00FF), nothing else on the magenta, no shadow on it. ")


def spec(code):
    return json.loads((ROOT / "scripts/bld/final" / f"{code}.json").read_text())


def fdir(code):
    d = DES / code / "final"
    d.mkdir(parents=True, exist_ok=True)
    return d


def emprise(code):
    a, b = json.loads((ROOT / "constants/isoSpec.json").read_text())["batiments"][code]["emprise"]
    out = DES / code / "emprise.png"
    if out.exists():
        sys.exit(f"exists: {out}")
    x0, y0 = W // 2 - (a - b) * CELL // 1, BOTTOM - (a + b) * CELL // 2
    pts = [(x0 + (gx - gy) * CELL, y0 + (gx + gy) * CELL // 2) for gx, gy in ((0, 0), (a, 0), (a, b), (0, b))]
    im = Image.new("RGB", (W, H), MAG)
    ImageDraw.Draw(im).polygon(pts, fill=(140, 140, 140))
    im.save(out)


def on_magenta(path):
    im = Image.open(path).convert("RGBA")
    bg = Image.new("RGBA", im.size, MAG + (255,))
    bg.alpha_composite(im)
    return bg.convert("RGB")


def key(im, lo=70, hi=150):
    """RGBA from a flat-magenta painting. The background is the median of the border ring; alpha ramps with the distance to it, loses
    its specks (keep) and is smoothed and feathered. The colour of every partial pixel is borrowed from the solid pixels next to it,
    never unmixed from the magenta (unmixing is what greened the edge), then magenta is subtracted from what is left."""
    a = np.asarray(im.convert("RGB"), dtype=float)
    ring = np.concatenate([a[:16].reshape(-1, 3), a[-16:].reshape(-1, 3), a[:, :16].reshape(-1, 3), a[:, -16:].reshape(-1, 3)])
    bg = np.median(ring, axis=0)  # the border's median: a corner alone can carry an artefact
    al = np.clip((np.sqrt(((a - bg) ** 2).sum(-1)) - lo) / (hi - lo), 0, 1)
    al = al * keep(al > 0.5)
    core = np.asarray(Image.fromarray((al > 0.999).astype(np.uint8) * 255).filter(ImageFilter.MinFilter(3))) > 0
    soft = np.asarray(Image.fromarray((al * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))) / 255
    al = np.clip((soft - 0.15) / 0.7, 0, 1)
    rgb, have = a * core[..., None], core.astype(float)
    for _ in range(12):  # spread the solid colours outward, one pixel per pass
        n = sum(np.roll(have, sh, ax) for sh, ax in ((1, 0), (-1, 0), (1, 1), (-1, 1)))
        c = sum(np.roll(rgb, sh, ax) for sh, ax in ((1, 0), (-1, 0), (1, 1), (-1, 1)))
        new = (have == 0) & (n > 0)
        rgb[new] = c[new] / n[new][:, None]
        have[new] = 1
    rgb = np.where(have[..., None] > 0, rgb, a)
    rgb -= np.clip(np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1], 0, None)[..., None] * np.array([1, 0, 1])  # magenta left over
    return Image.fromarray(np.dstack([np.clip(rgb, 0, 255), al * 255]).astype(np.uint8), "RGBA")


def green_edge(rgba, reach=6):
    """Saturated green pixels on the edge (partial alpha) with no saturated green in the solid pixels within `reach` px: a key
    artefact, not the building's own grass. Returns their count."""
    a = np.asarray(rgba).astype(int)
    r, g, b, al = (a[..., i] for i in range(4))
    green = (g > r + 25) & (g > b + 25) & (g > 90)
    near = np.asarray(Image.fromarray((green & (al > 250)).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(2 * reach + 1))) > 0
    return int((green & (al > 0) & (al <= 250) & ~near).sum())


def keep(m, k=4, grow=3, share=0.03):
    """Mask of the connected pieces of m (found on a k-times smaller, dilated copy, so sparks stay with their flame) that hold at
    least `share` of the biggest one: drops the stray specks and the border artefacts a generated background carries."""
    small = Image.fromarray((m * 255).astype(np.uint8)).resize((m.shape[1] // k, m.shape[0] // k), Image.BOX)
    g = np.asarray(Image.fromarray((np.asarray(small) > 60).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(2 * grow + 1))) > 0
    lab, sizes = np.zeros(g.shape, int), [0]
    for y, x in zip(*np.nonzero(g)):
        if lab[y, x]:
            continue
        sizes.append(0)
        lab[y, x], todo = len(sizes) - 1, [(y, x)]
        while todo:
            cy, cx = todo.pop()
            sizes[-1] += 1
            for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                if 0 <= ny < g.shape[0] and 0 <= nx < g.shape[1] and g[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = len(sizes) - 1
        sizes[-1] += 0
    ok = np.array([False] + [n >= share * max(sizes) for n in sizes[1:]])
    return np.asarray(Image.fromarray((ok[lab] * 255).astype(np.uint8)).resize((m.shape[1], m.shape[0]), Image.NEAREST)) > 0


def measure(rgba, diamond_bottom=BOTTOM):
    """Top of the silhouette, ground contact (its lowest row and the x of its middle there) against the emprise's lowest corner."""
    m = np.asarray(rgba)[..., 3] > 128
    ys, xs = np.nonzero(m)
    low = xs[ys >= ys.max() - 6]
    return {"top_y": int(ys.min()), "bottom_y": int(ys.max()), "height": int(ys.max() - ys.min()), "area": int(m.sum()),
            "left": int(xs.min()), "right": int(xs.max()), "contact_x": int(low.mean()),
            "contact_dy": int(ys.max() - diamond_bottom), "contact_dx": int(low.mean() - W // 2)}


FOUR = ("dragon_lair", "heroes_hall", "champion_arena")  # the deeds: four stages
FRAC = {"rough": 0.38, "solid": 0.52, "grand": 0.68, "legendary": 0.84, "mythic": 1.0}
FRAC4 = {"rough": 0.40, "solid": 0.58, "grand": 0.78, "mythic": 1.0}
USEFUL = BOTTOM - 12  # the canvas's useful height while the mythic is not picked yet


def target_h(code, stage, ms):
    """FLUX fills the frame whatever the prompt says, so the height of a stage is set here: a share of the picked mythic's height."""
    ref = ms["mythic"]["height"] if "mythic" in ms else USEFUL
    return (FRAC4 if code in FOUR else FRAC)[stage] * ref


def shrink(rgba, target):
    """Scale the painting down (never up) to `target` px of silhouette height, in premultiplied alpha, with a light sharpening so
    the ink line keeps its weight. Returns (image on a canvas of the same size, factor)."""
    h = measure(rgba)["height"]
    if target >= h:
        return rgba, 1.0
    f = target / h
    box = rgba.getbbox()
    part = rgba.crop(box)
    nw, nh = max(1, round(part.width * f)), max(1, round(part.height * f))
    small = part.convert("RGBa").resize((nw, nh), Image.LANCZOS).convert("RGBA")
    rgb = small.convert("RGB").filter(ImageFilter.UnsharpMask(1.0, 70, 2))
    rgb.putalpha(small.getchannel("A"))
    out = Image.new("RGBA", rgba.size)
    out.paste(rgb, ((box[0] + box[2] - nw) // 2, box[3] - nh))  # same centre, same lowest row: seat moves it afterwards
    return out, f


def seat(rgba, margin=12):
    """Translate the painting, pixel for pixel, so its ground contact sits on the emprise's lowest corner (W/2, BOTTOM). If the top
    of the silhouette then comes within `margin` px of the canvas top, the canvas grows upward by the missing rows (the anchor, the
    distance to the canvas bottom, does not move). Returns (image, rows added on top)."""
    m = measure(rgba)
    dy, dx = BOTTOM - m["bottom_y"], W // 2 - m["contact_x"]
    pad = max(0, margin - (m["top_y"] + dy))
    if m["left"] + dx < 0 or m["right"] + dx >= W:
        sys.exit(f"the painting does not fit the width once seated ({m['left']}+{dx}, {m['right']}+{dx})")
    src, out = np.asarray(rgba), np.zeros((H + pad, W, 4), np.uint8)
    y0, y1 = max(0, -(dy + pad)), min(H, H + pad - (dy + pad))  # source rows that land inside the new canvas
    out[y0 + dy + pad:y1 + dy + pad, max(0, dx):W + min(0, dx)] = src[y0:y1, max(0, -dx):W - max(0, dx)]
    return Image.fromarray(out, "RGBA"), pad


def paint(code, stage, variants, attempt):
    from iso_loop import FLUX3
    s, d = spec(code), fdir(code)
    emp = DES / code / "emprise.png"
    if not emp.exists():
        sys.exit("no emprise.png: run emprise first")
    srcs = []
    for name in SRC[stage]:
        if name.startswith("concept:"):
            srcs.append(Image.open(ROOT / s["concept"][name[8:]]).convert("RGB"))
        elif (d / f"{name}.png").exists():
            srcs.append(on_magenta(d / f"{name}.png"))
        else:
            sys.exit(f"pick {name} first")
    tmp = d / "refs"
    tmp.mkdir(exist_ok=True)
    refs = []
    for i, im in enumerate(srcs):
        f = tmp / f"{stage}_{i}.png"
        im.save(f)
        refs.append(f)
    refs.append(emp)
    text = NOTE[stage] + COMMON + s["stages"][stage]
    si = STAGES.index(stage)
    jobs = [(d / f"{stage}_t{attempt}_v{v}.png", text, 61000 + 100 * si + 10 * attempt + v) for v in range(1, variants + 1)]
    C.free([j[0] for j in jobs])
    C.run(jobs, 0.10, f"final {code} {stage} t{attempt}", FLUX3, None, True, lambda o: refs)


def pick(code, stage, n, attempt):
    d = fdir(code)
    src = d / f"{stage}_t{attempt}_v{n}.png"
    if not src.exists():
        sys.exit(f"no {src.name}")
    rgba = key(Image.open(src))
    if (n_bad := green_edge(rgba)) > 20:  # a few stray pixels are noise
        sys.exit(f"{stage}: {n_bad} green edge pixels, refused")
    mf = d / "measures.json"
    m = json.loads(mf.read_text()) if mf.exists() else {}
    factor = 1.0
    if stage != "mythic":  # the mythic is never scaled: it sets the height of the others (repick after picking a new one)
        rgba, factor = shrink(rgba, target_h(code, stage, m))
    rgba, pad = seat(rgba)
    rgba.save(d / f"{stage}.png")
    m[stage] = {**measure(rgba, BOTTOM + pad), "from": src.name, "pad_top": pad, "scale": round(factor, 4)}
    mf.write_text(json.dumps(m, indent=1))
    print(stage, m[stage])


def repick(code):
    """Seats again every stage already picked, from its raw painting: no FLUX call."""
    ms = json.loads((fdir(code) / "measures.json").read_text())
    for st in ("mythic", *STAGES[:-1]):  # the mythic first: the others take their height from it
        if st in ms:
            stem = pathlib.Path(ms[st]["from"]).stem  # <stage>_t<N>_v<n>
            pick(code, st, int(stem.split("_v")[1]), int(stem.split("_t")[1].split("_")[0]))


def elements(code, rekey=False):
    from iso_loop import FLUX3
    s, d = spec(code), fdir(code)
    e = d / "elements"
    e.mkdir(exist_ok=True)
    items = [(f"teaser_{t['id']}", t["prompt"], t["stage_after"]) for t in s["teasers"]]
    items += [(f"gag_{g['rank']}", g["prompt"], "rough") for g in s["gag"]]
    jobs, refs = [], {}
    for i, (name, prompt, st) in enumerate(items):
        o = e / f"{name}.raw.png"
        jobs.append((o, "Image 1 is a style reference only, for ink line, light and brushwork: copy none of its objects. Paint exactly "
                        "this: " + prompt + " No ground, no shadow, no person.", 62000 + i))
        refs[o] = []
        if (d / f"{st}.png").exists() and not rekey:
            refs[o] = [e / f"ref_{st}.png"]
            on_magenta(d / f"{st}.png").save(refs[o][0])
    if not rekey:
        C.free([j[0] for j in jobs])
        C.SIZE = (768, 768)
        C.run(jobs, 0.10, f"final {code} elements", FLUX3, None, True, lambda o: refs[o])
    bad = []
    for o, _, _ in jobs:
        if o.exists():
            rgba = key(Image.open(o))
            rgba.crop(rgba.getbbox()).save(o.with_name(o.name.replace(".raw", "")))
            if (n := green_edge(rgba)) > 20:
                bad.append(f"{o.name.split('.')[0]}: {n} green edge pixels")
    if bad:
        sys.exit("refused: " + "; ".join(bad))


def strip(code):
    d = fdir(code)
    got = [st for st in STAGES if (d / f"{st}.png").exists()]
    k = 0.5
    ms = json.loads((d / "measures.json").read_text())
    grow = max([ms[st].get("pad_top", 0) for st in got] + [0])  # the family canvas: every stage as tall as the tallest
    w, h = int(W * k), int((H + grow) * k)
    band = Image.new("RGB", (w * len(got), h), (112, 140, 104))
    for i, st in enumerate(got):
        full = Image.new("RGBA", (W, H + grow))
        full.paste(Image.open(d / f"{st}.png"), (0, grow - ms[st].get("pad_top", 0)))
        ms[st]["canvas_h"] = H + grow
        t = full.resize((w, h), Image.LANCZOS)
        band.paste(t.convert("RGB"), (i * w, 0), t.getchannel("A"))
        ImageDraw.Draw(band).text((i * w + 6, 6), st, fill=(255, 255, 255), font=ImageFont.load_default(20))
    band.save(d / "strip.png")
    if grow:
        print(f"CANVAS ENLARGED: {grow} px on top, family canvas {W} x {H + grow}, anchor unchanged (emprise bottom {BOTTOM} px above the canvas bottom)")
    (d / "measures.json").write_text(json.dumps(ms, indent=1))
    ea, eb = json.loads((ROOT / "constants/isoSpec.json").read_text())["batiments"][code]["emprise"]
    if "mythic" in ms and ms["mythic"]["right"] - ms["mythic"]["left"] > 2 * (ea + eb) * CELL:
        print(f"WARNING: the mythic is {ms['mythic']['right'] - ms['mythic']['left']} px wide, more than twice the emprise ({(ea + eb) * CELL} px)")
    bad = []
    for st in got:
        if abs(ms[st]["contact_dy"]) > 20 or abs(ms[st]["contact_dx"]) > 20:
            bad.append(f"{st}: ground contact {ms[st]['contact_dx']},{ms[st]['contact_dy']} px off the emprise (max 20)")
    for lo, hi in zip(got, got[1:]):
        grew = ms[hi]["area"] >= 1.15 * ms[lo]["area"] or ms[hi]["height"] >= 1.10 * ms[lo]["height"]
        if not grew:
            bad.append(f"{hi}: not bigger than {lo} (area x{ms[hi]['area'] / ms[lo]['area']:.2f}, height x{ms[hi]['height'] / ms[lo]['height']:.2f}, need 1.15 or 1.10)")
        if ms[hi]["height"] > 2 * ms[lo]["height"]:
            bad.append(f"{hi}: height {ms[hi]['height']} is more than twice {lo}'s {ms[lo]['height']}")
    print(d / "strip.png")
    if bad:
        sys.exit("STRIP CHECK FAILED\n" + "\n".join(bad))
    print("strip check ok")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["emprise", "paint", "pick", "elements", "rekey", "repick", "strip"])
    ap.add_argument("code")
    ap.add_argument("rest", nargs="*")
    ap.add_argument("--variants", type=int, default=2)
    ap.add_argument("--try", dest="attempt", type=int, default=1)
    a = ap.parse_args()
    {"emprise": lambda: emprise(a.code), "paint": lambda: paint(a.code, a.rest[0], a.variants, a.attempt),
     "pick": lambda: pick(a.code, a.rest[0], int(a.rest[1]), a.attempt), "elements": lambda: elements(a.code), "rekey": lambda: elements(a.code, True), "repick": lambda: repick(a.code),
     "strip": lambda: strip(a.code)}[a.cmd]()
