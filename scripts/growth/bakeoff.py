#!/usr/bin/env python3
"""G18 bake-off: FLUX 3 Image against GPT Image 2 on the same 3 jobs, same prompt, same input images.

    bakeoff.py prep                          build the inputs (reference sheet, ground chunk, road crop) in scratch/bakeoff/in
    bakeoff.py gpt <1|2|3> <k> <quality>     one GPT Image 2 edit (low|medium|high), 1024x1024
    bakeoff.py flux <1|2|3> <k>              one FLUX 3 Image call (flux-3-image only), reserved and settled through iso_loop
    bakeoff.py measure                       drift of the job 3 outputs against the input (outside the paths)
    bakeoff.py boards                        the three side-by-side JPEGs in docs/designs/village/growth/img

Outputs: scratch/bakeoff/<job>_<painter>_<k>.png, never overwritten. Every call is logged in scratch/bakeoff/log.json
(cost, seconds, tokens) and the provenance goes to scratch/bakeoff/provenance.json (throwaway, not the shared ledger).
Never Klein, never FLUX.2. No game, studio, film, comic or artist name in any prompt.
"""
import json
import pathlib
import sys
import time

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "iso"))
sys.path.insert(0, str(ROOT / "scripts"))
D = ROOT / "docs/designs/village/growth"
S = D / "scratch/bakeoff"
IN = S / "in"
IMG = D / "img"
ATELIER = next((S / "atelier").glob("render-t12-jour-*.png"), None)
SESSION = "growth-2"
SPRITES = ("forge", "heroes_hall", "tent")
CHUNK_BOX = (55, 900, 55 + 1024, 900 + 1024)  # x0, y0, x1, y1 in the 1079x2399 render
ROAD_BOX = (330, 2000, 690, 2360)  # the painted south road, below the chunk

HOUSE = ("Image 1 is the concept of one small house: repaint exactly this house, same shape, same roof, same chimney, same doors, same "
         "framing and same size in the picture. Image 2 is a reference sheet of three finished buildings of the same village (forge, "
         "hall, tent): copy only their ink line weight, flat colour blocks and brush texture, none of their shapes. Changes to make. "
         "The house stands alone on a flat uniform magenta #FF00FF background that fills the whole picture: no ground plate, no diamond "
         "of earth or sand, no grass, the bottom edges of the walls end cleanly on the magenta. The walls are a darker, duller grey-brown "
         "plaster. The chimney is darker stone. One tiny dim window with a faint dull glow, no vivid orange. The thatch is calm: a few "
         "long even strokes. The ink outline has the same thickness as on the reference sheet. Flat colours, matte surfaces, no gloss, "
         "no painted cast shadow, no people, no letters.")
STUMPS = ("Image 1 is a reference sheet of three finished buildings of the same village (forge, hall, tent): copy only their ink line "
          "weight, flat colour blocks, matte brush texture and low dark values, none of their shapes. Paint one small cluster sheet on "
          "a flat uniform magenta #FF00FF background that fills the whole picture: five separate cut tree stumps of different sizes, "
          "the widest about one seventh of the picture width and the smallest about one eleventh, two of them with a little green moss "
          "on the bark, and two small heaps of pale wood chips about one tenth of the picture width. Every piece stands apart with clear "
          "magenta around it. Isometric 2:1 view from above at the same angle as the buildings, light from the upper left, low dark "
          "value. Each piece is a simple solid silhouette with a thick ink outline and two or three flat colours, because the picture "
          "will be shrunk until a stump is about forty pixels wide. No ground plate, no painted cast shadow, no people, no letters.")
CHEMINS = ("Image 1 is a hand-painted village map chunk seen from above at an isometric angle. Repaint it in place: same size, same "
           "camera, same layout. Change only the flat brown path strokes: the lighter flat brown ones become hand-painted packed dirt "
           "paths with soft worn edges, a few pebbles and tufts, and the darker flat brown ones near the square become worn cobblestones "
           "painted stone by stone in muted grey-brown. Keep the exact route and the exact width of every path. Everything else stays "
           "exactly as it is, building pixels included: buildings, walls, fences, props, grass, water, trees, small figures. Image 2 "
           "is a crop of the painted dirt road at the south of the same village: match its palette and brush texture for the dirt paths. "
           "No new people, no letters, no flags.")
PROMPTS = {1: HOUSE, 2: STUMPS, 3: CHEMINS}
NAMES = {1: "maison", 2: "souches", 3: "chemins"}


def inputs(job):
    sheet, concept = IN / "sheet.png", ROOT / "docs/designs/village/growth/scratch/quartiers/A1a_v2.png"
    return {1: [concept, sheet], 2: [sheet], 3: [IN / "chunk.png", IN / "road.png"]}[job]


def prep():
    IN.mkdir(parents=True, exist_ok=True)
    sprites = [Image.open(ROOT / f"assets/images/village/iso/{b}/solid.jour.webp").convert("RGBA") for b in SPRITES]
    scale = (1536 - 80) / sum(s.width for s in sprites)
    height = int(max(s.height for s in sprites) * scale) + 64
    sheet = Image.new("RGB", (1536, height), (176, 172, 162))
    x = 40 + (1456 - sum(int(s.width * scale) for s in sprites)) // 2
    for s in sprites:
        s = s.resize((int(s.width * scale), int(s.height * scale)), Image.LANCZOS)
        sheet.paste(s, (x, height - 32 - s.height), s)
        x += s.width
    sheet.save(IN / "sheet.png")
    render = Image.open(ATELIER).convert("RGB")
    render.crop(CHUNK_BOX).save(IN / "chunk.png")
    render.crop(ROAD_BOX).save(IN / "road.png")


def log(entry):
    """One file per call: calls run in parallel, a shared list would lose entries."""
    (S / "log").mkdir(exist_ok=True)
    (S / "log" / (entry["out"] + ".json")).write_text(json.dumps(entry, indent=2) + "\n")


def target(job, painter, k):
    out = S / f"{NAMES[job]}_{painter}_{k}.png"
    if out.exists():
        sys.exit(f"exists, never overwritten: {out.name}")
    return out


def gpt(job, k, quality):
    import openai_loop
    from lib import flux
    out = target(job, "gpt", k)
    flux.PROVENANCE = S / "provenance.json"
    t = time.time()
    res = openai_loop.edit(out, PROMPTS[job], inputs(job), "1024x1024", quality, SESSION)
    log({"job": NAMES[job], "painter": "gpt", "k": k, "quality": quality, "cost": res["cost"], "usage": res["usage"],
         "seconds": round(time.time() - t, 1), "out": out.name})
    print(json.dumps(entry_of(out)))


def entry_of(out):
    return json.loads((S / "log" / (out.name + ".json")).read_text())


def fluxcall(job, k):
    from iso_loop import FLUX3, guard_endpoint, reserve, settle
    from lib import flux
    out = target(job, "flux", k)
    guard_endpoint(FLUX3)
    flux.PROVENANCE = S / "provenance.json"
    batch = reserve(1, 0.10, f"bakeoff {NAMES[job]} flux {k}", None)
    responses = []
    t = time.time()
    try:
        ok = flux.generate(slug=f"bakeoff_{NAMES[job]}", prompt=PROMPTS[job], out=out, width=1024, height=1024, attempts=1,
                           references=tuple(inputs(job)), extra={"width": 1024, "height": 1024}, submitted_log=responses, endpoint=FLUX3)
    finally:
        entry = settle(batch, responses)
    log({"job": NAMES[job], "painter": "flux", "k": k, "ok": bool(ok), "cost": entry["cost"], "seconds": round(time.time() - t, 1),
         "responses": responses, "out": out.name})
    print(json.dumps(entry_of(out)))


# --- measure: drift of the job 3 outputs ------------------------------------------------------

# Fixed points (centres in chunk coordinates, read on the input): one 96 px patch each, on a building or a prop.
POINTS = {"moulin": (255, 45), "tente": (340, 190), "mine": (810, 170), "tour": (1000, 230), "atelier": (490, 250), "forge": (645, 300),
          "puits": (185, 330), "etal": (330, 315), "fontaine": (330, 395), "chaudron": (480, 350), "scierie": (710, 390),
          "veilleur": (860, 350), "rempart": (470, 530), "pont": (740, 520), "maison_g": (225, 880), "maison_d": (625, 860),
          "potager": (760, 710)}


def path_mask(im):
    """Flat brown strokes: the stroke colour, opened to drop thin look-alikes (fences, wheat), then dilated 20 px."""
    from PIL import ImageFilter
    a = np.asarray(im.convert("RGB")).astype(int)
    flat = Image.fromarray(((np.abs(a - np.array((123, 102, 71))).max(axis=2) <= 7) * 255).astype("uint8"))
    return np.asarray(flat.filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(41))) > 0


def shift_of(a, b, cx, cy, r=48, reach=40):
    """Best integer shift of the patch of `b` that matches the patch of `a` (grey), with the error at 0 and at the best."""
    cx, cy = min(max(cx, r + reach), 1024 - r - reach), min(max(cy, r + reach), 1024 - r - reach)  # patches at the border move inward
    ref = a[cy - r:cy + r, cx - r:cx + r]
    best = (1e9, 0, 0)
    for dy in range(-reach, reach + 1):
        for dx in range(-reach, reach + 1):
            y0, x0 = cy - r + dy, cx - r + dx
            if y0 < 0 or x0 < 0 or y0 + 2 * r > b.shape[0] or x0 + 2 * r > b.shape[1]:
                continue
            e = np.abs(ref - b[y0:y0 + 2 * r, x0:x0 + 2 * r]).mean()
            best = min(best, (e, dx, dy))
    return float(np.abs(ref - b[cy - r:cy + r, cx - r:cx + r]).mean()), best


def measure():
    src = Image.open(IN / "chunk.png").convert("RGB")
    mask = path_mask(src)
    ga = np.asarray(src.convert("L")).astype(float)
    result = {"mask_share": round(float(mask.mean()), 3)}
    for out in sorted(S.glob("chemins_*.png")):
        im = Image.open(out).convert("RGB")
        size = im.size
        if im.size != src.size:
            im = im.resize(src.size, Image.LANCZOS)
        d = np.abs(np.asarray(im).astype(float) - np.asarray(src).astype(float)).mean(axis=2)
        gb = np.asarray(im.convert("L")).astype(float)
        moved = {}
        for name, (cx, cy) in POINTS.items():
            e0, (e1, dx, dy) = shift_of(ga, gb, cx, cy)
            moved[name] = {"mad0": round(e0, 1), "best_shift": [dx, dy], "mad_best": round(e1, 1)}
        shifted = [n for n, m in moved.items() if max(abs(m["best_shift"][0]), abs(m["best_shift"][1])) >= 2 and m["mad_best"] < 0.8 * m["mad0"]]
        result[out.name] = {"size": list(size), "mad_outside_paths": round(float(d[~mask].mean()), 2), "mad_inside_paths": round(float(d[mask].mean()), 2),
                            "mad_all": round(float(d.mean()), 2), "buildings_shifted_2px_or_more": shifted, "points": moved}
        ov = np.stack([ga, gb, gb], axis=2).clip(0, 255).astype("uint8")  # input in red, output in cyan: ghosts show a drift
        Image.fromarray(ov).save(S / f"drift_{out.stem}.png")
    (S / "drift.json").write_text(json.dumps(result, indent=2) + "\n")
    for k, v in result.items():
        if isinstance(v, dict):
            print(k, v["mad_outside_paths"], v["mad_inside_paths"], v["buildings_shifted_2px_or_more"])
    print("mask share", result["mask_share"])


# --- boards ------------------------------------------------------------------------------------

W, COL = 1080, 534
FONT = ImageFont.load_default(22)
T12 = D / "scratch/fixe/t12-jour.png"
PAINTERS = (("flux", "FLUX 3 Image"), ("gpt", "GPT Image 2 (high)"))


def cut(im):
    """Magenta key: the background colour is the median of the border, kept if connected to the border (flood by dilation)."""
    from PIL import ImageFilter
    rgb = np.asarray(im.convert("RGB")).astype(int)
    edge = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(edge, axis=0)
    cand = (np.abs(rgb - bg).max(axis=2) <= 60)
    seed = np.zeros_like(cand)
    seed[0], seed[-1], seed[:, 0], seed[:, -1] = True, True, True, True
    cur = Image.fromarray((seed & cand) * np.uint8(255))
    cand_img = Image.fromarray(cand * np.uint8(255))
    for _ in range(900):  # 3x3 dilations clipped to the candidate pixels
        nxt = np.minimum(np.asarray(cur.filter(ImageFilter.MaxFilter(3))), np.asarray(cand_img))
        if (nxt == np.asarray(cur)).all():
            break
        cur = Image.fromarray(nxt)
    back = np.asarray(cur) > 0
    alpha = Image.fromarray((~back) * np.uint8(255)).filter(ImageFilter.MinFilter(3))  # 1 px off the fringe
    out = im.convert("RGBA")
    out.putalpha(alpha)
    kept = np.asarray(alpha) > 0
    near = (np.abs(rgb - bg).max(axis=2) <= 90) & kept
    return out.crop(out.getbbox()), {"bg": [int(v) for v in bg], "background_share": round(float(back.mean()), 3),
                                    "magenta_like_pixels_left_in_cut": int(near.sum())}


def components(alpha, step=4):
    """Bounding boxes of the separate pieces, on a 1/step grid (4-connected)."""
    small = np.asarray(Image.fromarray(alpha).resize((alpha.shape[1] // step, alpha.shape[0] // step), Image.BOX)) > 0
    seen, boxes = np.zeros_like(small), []
    for y, x in zip(*np.nonzero(small)):
        if seen[y, x]:
            continue
        stack, xs, ys = [(y, x)], [], []
        seen[y, x] = True
        while stack:
            cy, cx = stack.pop()
            xs.append(cx), ys.append(cy)
            for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                if 0 <= ny < small.shape[0] and 0 <= nx < small.shape[1] and small[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        if len(xs) > 6:
            boxes.append((min(xs) * step, min(ys) * step, (max(xs) + 1) * step, (max(ys) + 1) * step))
    return boxes


def label(canvas, xy, text):
    d = ImageDraw.Draw(canvas)
    d.rectangle((xy[0], xy[1], xy[0] + 12 + 11 * len(text), xy[1] + 30), fill=(20, 20, 20))
    d.text((xy[0] + 6, xy[1] + 3), text, fill=(255, 255, 255), font=FONT)


def fit(im, w):
    return im.convert("RGB").resize((w, round(im.height * w / im.width)), Image.LANCZOS)


def phone_panel(cutout, scale_to, where, box):
    """The cut piece pasted at its game size on a 1:1 crop of the village capture."""
    base = Image.open(T12).convert("RGBA")
    w = scale_to
    piece = cutout.resize((w, round(cutout.height * w / cutout.width)), Image.LANCZOS)
    base.alpha_composite(piece, (where[0] - piece.width // 2, where[1] - piece.height))
    return base.crop(box).convert("RGB")


def boards():
    IMG.mkdir(parents=True, exist_ok=True)
    notes = {}
    box = (170, 1560, 170 + COL, 1560 + 420)
    for job, name, game_w in ((1, "maison", 150), (2, "souches", 40), (3, "chemins", 0)):
        full, low = [], []
        for k in (1, 2):
            for p, title in PAINTERS:
                f = S / f"{name}_{p}_{k}.png"
                if not f.exists():
                    full.append(Image.new("RGB", (COL, COL), (60, 60, 60)))
                    low.append(Image.new("RGB", (COL, 400), (60, 60, 60)))
                    continue
                im = Image.open(f).convert("RGB")
                a = fit(im, COL)
                label(a, (6, 6), f"{title}, essai {k}")
                full.append(a)
                if job == 3:
                    b = fit(im, 360)
                    canvas = Image.new("RGB", (COL, b.height), (30, 30, 30))
                    canvas.paste(b, ((COL - 360) // 2, 0))
                    label(canvas, (6, 6), f"{title}, essai {k}")
                    low.append(canvas)
                else:
                    cutout, info = cut(im)
                    if job == 1:
                        w = game_w
                    else:
                        arr = np.asarray(cutout.split()[3])
                        widths = sorted(int(b[2] - b[0]) for b in components(arr))
                        w = round(cutout.width * game_w / widths[len(widths) // 2])  # median piece = about 40 px
                        info["pieces"] = len(widths)
                        info["median_piece_px_in_1024"] = int(widths[len(widths) // 2])
                    where = (box[0] + 330, box[1] + 330) if job == 1 else (box[0] + 20 + w // 2, box[1] + 405)
                    pan = phone_panel(cutout, w, where, box)
                    label(pan, (6, 6), f"{title}, essai {k}")
                    low.append(pan)
                    notes[f"{name}_{p}_{k}"] = info
        rows = [Image.new("RGB", (W, a.height + 4), (255, 255, 255)) for a in full[::2]]
        for i, r in enumerate(rows):
            r.paste(full[2 * i], (0, 0))
            r.paste(full[2 * i + 1], (COL + 12, 0))
        lows = [Image.new("RGB", (W, a.height + 4), (255, 255, 255)) for a in low[::2]]
        for i, r in enumerate(lows):
            r.paste(low[2 * i], (0, 0))
            r.paste(low[2 * i + 1], (COL + 12, 0))
        board = Image.new("RGB", (W, sum(r.height for r in rows + lows) + 8), (255, 255, 255))
        y = 0
        for r in rows + lows:
            board.paste(r, (0, y))
            y += r.height
        board.save(IMG / f"bakeoff-{name}.jpg", quality=88)
    (S / "cuts.json").write_text(json.dumps(notes, indent=2) + "\n")
    print(json.dumps(notes, indent=1))


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["prep"]:
        prep()
    elif a[:1] == ["gpt"]:
        gpt(int(a[1]), int(a[2]), a[3])
    elif a[:1] == ["flux"]:
        fluxcall(int(a[1]), int(a[2]))
    elif a[:1] == ["measure"]:
        measure()
    elif a[:1] == ["boards"]:
        boards()
    else:
        sys.exit(__doc__)
