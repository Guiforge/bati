#!/usr/bin/env python3
"""Windmill r1 probes, stage by stage (FLUX 3 Image, finish (b)).

    python3 scripts/bld/sondes_moulin.py paint            # rough..mythic, 2 images per stage, one registry batch per stage
    python3 scripts/bld/sondes_moulin.py boards           # planche, bande, juge/, juge_cle.json, provenance.json

Image 1 = the stage's peinture maquette, images 2-4 = the three style references, image 5 (after rough) = the previous
stage's best raw image. Best = highest IoU against the maquette silhouette minus the magenta spill, read off the control.
Every call goes through iso_loop's registry. Outputs go to the ignored sondes/ folder of the iso worktree, never overwritten.
"""
import argparse
import concurrent.futures
import json
import pathlib
import random
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "iso"))
sys.path.insert(0, str(ROOT / "scripts"))
from iso_loop import FLUX3, guard_endpoint, reserve, settle
from lib import flux
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ISO_WT = pathlib.Path("/home/guiforge/Documents/code/bati/.claude/worktrees/iso")
R1 = ISO_WT / "docs/designs/village-buildings/windmill/r1"
OUT = R1 / "sondes"
STYLE = sorted((ISO_WT / "docs/designs/village-buildings/explore/E3/refs").glob("*.png"))
SIZE = (896, 1344)
STAGES = ["rough", "solid", "grand", "legendary", "mythic"]
# pivot (grid p, z) and sail scale of the card, for the preview band only
PIVOT = {"rough": (1.4, 1.5), "solid": (1.49, 2.08), "grand": (1.54, 2.59), "legendary": (1.55, 2.88), "mythic": (1.55, 2.88)}
ERODE = 3

HEAD = ("Image 1 is a flat maquette that fixes the exact shape of one building: a round stone windmill tower under a cone roof, "
        "with a small round window on the roof, a door at its foot, a small lit window on the right side, and a long timber prop "
        "pole running from the roof down to the ground at the right. ")
STAGE_TXT = {
    "rough": "The tower is short and stout; it has the pole and its short brace, nothing else. ",
    "solid": "The tower is taller. At the left of the door stand two sacks with knotted necks; the foot of the pole rests on a "
             "round wooden drum on the ground. ",
    "grand": "The tower is taller still. A timber gallery with a railing runs in a ring around it, open where the pole passes. "
             "At the left corner is a small stone bread oven with a tall round stone chimney, and two sacks with knotted necks "
             "beside it. The foot of the pole rests on a round wooden drum. ",
    "legendary": "The tower is as tall as it gets, with the timber gallery and its railing, the stone oven with its tall round "
                 "chimney at the left corner, two sacks, and the pole resting on its round wooden drum. ",
    "mythic": "Everything of the previous stage stays: the timber gallery, the stone oven and chimney, the sacks, the drum, and in "
              "addition a small lone donkey with a travel pack beside the foot of the pole. On the roof tip stands ONE single "
              "matte crystal made of stacked stone-like segments, pale slate blue, never a gem, no facets, no shine, no glow. ",
}
TAIL = ("Paint exactly this object as a finished daytime illustration. Same position to the pixel, no object added. "
        "Never paint wings, blades, sails, a machine, a spare mast or steps, and no shadow of any wing. The colours of the maquette "
        "only hint at the materials; repaint them in daylight. The roof is warm grey matte slate, no saturated blue, no reflection, "
        "no scales. The small round window on the roof is matte wood or iron, with no mark. The tower wall is one single material: "
        "plaster, with chips grouped at the base and at the corners, no black dots and no isolated brick plates. All metal is matte, "
        "nothing golden. Paint no ground, no grass and no slab: only the building and its objects, and the low stone plinth of "
        "the maquette. Images 2, 3 and 4 are style references only, for ink line, upper-left light and painted brushwork: copy none "
        "of their shapes, objects, ground diamond or cast shadows, and paint shaded sides in cool slate #2E3552, not their "
        "olive-green; shape comes only from image 1, the maquette. ")
CONT = ("Image 5 is the same building one rank lower, already painted: keep its materials, colours and brushwork, but the shape "
        "comes only from image 1. ")
FIN = ("Ink line: thicker and even along the outer contour, fine inside the object. Daytime light from the upper left: lit faces to "
       "the left, shaded sides in cool slate #2E3552. Ink outline in #0F1518. No painted cast shadow on the ground, no gloss, no "
       "shine, no glow. No text, no letters, no numbers, no runes. The whole image has a flat, pure magenta (#FF00FF) background "
       "from edge to edge, all four corners included.")


def prompt(stage):
    return HEAD + STAGE_TXT[stage] + TAIL + (CONT if stage != "rough" else "") + FIN


def is_mag(px):
    r, g, b = px[:3]
    return r > 170 and b > 170 and g < 130 and abs(r - b) < 90


def sil(im):
    """Non-magenta silhouette of an RGB image, as an L mask."""
    mag = Image.new("RGB", im.size, (255, 0, 255))
    d = ImageChops.difference(im.convert("RGB"), mag).convert("L")
    return d.point(lambda v: 255 if v > 60 else 0)


def maquette_mask(stage):
    return sil(Image.open(R1 / f"stades/{stage}.peinture.png")).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))


def cut_and_control(stage, raw):
    """The cut (maquette mask eroded, magenta removed from the edges) and the control numbers of one raw image."""
    rgb = Image.open(raw).convert("RGB").resize(SIZE, Image.LANCZOS)
    m = maquette_mask(stage)
    s = sil(rgb)
    inter = ImageChops.multiply(m, s).point(lambda v: 1 if v else 0).getdata()
    union = ImageChops.lighter(m, s).point(lambda v: 1 if v else 0).getdata()
    iou = sum(inter) / max(1, sum(union))
    er = m.filter(ImageFilter.MinFilter(2 * ERODE + 1))
    px, ep = rgb.load(), er.load()
    w, h = SIZE
    alpha = er.copy()
    ap = alpha.load()
    spill = inside = 0
    for y in range(h):
        for x in range(w):
            if ep[x, y]:
                inside += 1
                if is_mag(px[x, y]):
                    spill += 1
                    ap[x, y] = 0
    # fringe: pixels of the cut that touch the removed ones and lean magenta
    edge = alpha.filter(ImageFilter.MinFilter(3))
    eg = edge.load()
    for y in range(h):
        for x in range(w):
            if ap[x, y] and not eg[x, y]:
                r, g, b = px[x, y]
                if b > g + 40 and r > g + 40:
                    ap[x, y] = 0
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    return out, {"iou": round(iou, 4), "magenta_residual": round(spill / max(1, inside), 5),
                 "score": round(iou - 5 * spill / max(1, inside), 4)}


def paint():
    guard_endpoint(FLUX3)
    prev_best = None
    for stage in STAGES:
        d = OUT / stage
        (d / "brut").mkdir(parents=True, exist_ok=True)
        (d / "coupe").mkdir(exist_ok=True)
        ctl = d / "controle.json"
        if ctl.exists():
            print(stage, "already done")
            prev_best = d / "brut" / json.loads(ctl.read_text())["best"]
            continue
        results, attempts = {}, 0
        for attempt in (1, 2):
            outs = [d / "brut" / f"t{attempt}_v{i}.png" for i in range(2)]
            if any(o.exists() for o in outs):
                continue
            attempts += 1
            refs = (R1 / f"stades/{stage}.peinture.png", *STYLE) + ((prev_best,) if prev_best else ())
            batch = reserve(2, 0.07, f"sondes moulin r1 {stage} t{attempt}", None)
            responses: list = []

            def one(io, attempt=attempt, refs=refs, stage=stage, responses=responses):
                i, o = io
                return flux.generate(slug=f"sondes_moulin_{stage}", prompt=prompt(stage), out=o, width=SIZE[0], height=SIZE[1],
                                     attempts=1, references=refs, extra={"width": SIZE[0], "height": SIZE[1]},
                                     submitted_log=responses, endpoint=FLUX3, seed=52000 + 1000 * STAGES.index(stage) + 100 * attempt + i)

            try:
                with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                    list(pool.map(one, enumerate(outs)))
            finally:
                entry = settle(batch, responses)
            print(stage, attempt, entry["cost"], "posts", entry["posts"], flush=True)
            for o in outs:
                if o.exists():
                    cut, c = cut_and_control(stage, o)
                    cut.save(d / "coupe" / o.name)
                    c["refs"] = [r.name for r in refs]
                    results[o.name] = c
            good = [c for c in results.values() if c["iou"] >= 0.85]
            if good:
                break
        if not results:
            print(stage, "no image"); continue
        best = max(results, key=lambda k: results[k]["score"])
        ctl.write_text(json.dumps({"stage": stage, "attempts": attempts, "images": results, "best": best,
                                   "failed": results[best]["iou"] < 0.85, "prompt": prompt(stage)}, indent=2))
        prev_best = d / "brut" / best
        print(stage, "best", best, results[best], flush=True)


def px_pivot(stage):
    p, z = PIVOT[stage]
    return 448, round(1280 - 235 * z - 193.3 * (2 - p))


def key(im):
    im = im.convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            if is_mag(px[x, y]):
                px[x, y] = (0, 0, 0, 0)
    return im


def boards(prefix="sondes moulin r1"):
    ctls = {s: json.loads((OUT / s / "controle.json").read_text()) for s in STAGES if (OUT / s / "controle.json").exists()}
    font_h = 22
    # planche: every cut, per stage a row
    w, h = 336, 504
    names = [(s, n) for s, c in ctls.items() for n in sorted(c["images"])]
    board = Image.new("RGB", (len(STAGES) * w, 2 * (h + font_h)), (60, 60, 60))
    dr = ImageDraw.Draw(board)
    for s, n in names:
        col, row = STAGES.index(s), int(n.split("_v")[1][0]) if False else (0 if n.endswith("v0.png") else 1)
        tile = Image.new("RGBA", (w, h), (112, 140, 104, 255))
        c = Image.open(OUT / s / "coupe" / n).resize((w, h), Image.LANCZOS)
        tile.alpha_composite(c)
        board.paste(tile.convert("RGB"), (col * w, row * (h + font_h) + font_h))
        dr.text((col * w + 4, row * (h + font_h) + 4), f"{s} {n} iou {ctls[s]['images'][n]['iou']}", fill=(255, 255, 255))
    if not (OUT / "planche.png").exists():
        board.save(OUT / "planche.png")
    # bande: best per stage at game scale (1 dp = 5 px canvas, drawn at 2 px per dp) with the maquette's sails at 45 degrees
    k = 2 / 5
    bw, bh = round(SIZE[0] * k), round(SIZE[1] * k)
    band = Image.new("RGB", (len(STAGES) * bw, bh), (112, 140, 104))
    for i, s in enumerate(STAGES):
        if s not in ctls:
            continue
        sp = Image.open(OUT / s / "coupe" / ctls[s]["best"]).convert("RGBA")
        sails = key(Image.open(R1 / f"elements/sails_{'legendary' if s == 'mythic' else s}.peinture.png"))  # mythic has no sheet yet: legendary's
        cx, cy = px_pivot(s)
        sp.alpha_composite(sails, (cx - 384, cy - 384)) if cx - 384 >= 0 and cy - 384 >= 0 else sp.alpha_composite(
            sails.crop((0, max(0, 384 - cy), 768, 768)), (cx - 384, max(0, cy - 384)))
        tile = Image.new("RGBA", SIZE, (112, 140, 104, 255))
        tile.alpha_composite(sp)
        band.paste(tile.convert("RGB").resize((bw, bh), Image.LANCZOS), (i * bw, 0))
    if not (OUT / "bande.png").exists():
        band.save(OUT / "bande.png")
    # blind lot: A..J
    if not (OUT / "juge_cle.json").exists():
        (OUT / "juge").mkdir(exist_ok=True)
        order = list(names)
        random.Random(77).shuffle(order)
        cle = {}
        for letter, (s, n) in zip("ABCDEFGHIJ", order):
            tile = Image.new("RGBA", SIZE, (112, 140, 104, 255))
            tile.alpha_composite(Image.open(OUT / s / "coupe" / n))
            tile.convert("RGB").resize((448, 672), Image.LANCZOS).save(OUT / "juge" / f"{letter}.png")
            cle[letter] = f"{s}/{n}"
        (OUT / "juge_cle.json").write_text(json.dumps(cle, indent=2))
    # provenance
    batches = json.loads((pathlib.Path.home() / ".cache/bati-art-loop/iso/budget.json").read_text())["v1"]["batches"]
    mine = [b for b in batches if b["label"].startswith(prefix)]
    if not (OUT / "provenance.json").exists():
        (OUT / "provenance.json").write_text(json.dumps({
            "date": time.strftime("%Y-%m-%d"), "model": "FLUX 3 Image", "endpoint": FLUX3, "finish": "b",
            "erode_px": ERODE, "prompts": {s: c["prompt"] for s, c in ctls.items()}, "batches": mine,
            "cost_total": round(sum(b["cost"] for b in mine), 4),
            "best": {s: c["best"] for s, c in ctls.items()}}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["paint", "boards"])
    paint() if ap.parse_args().cmd == "paint" else boards()
