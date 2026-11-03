#!/usr/bin/env python3
"""Windmill r1 probes, round 2 (mara rejected round 1). Outputs in windmill/r1/sondes2/, never overwritten.

    python3 scripts/bld/sondes2.py peak     # step B: the peak alone, 2 tries, on the kept body of round 1's best mythic
    python3 scripts/bld/sondes2.py paint    # step C: the full probe, rough..mythic, 2 images per stage
    python3 scripts/bld/sondes2.py boards   # planche, bande, juge/, juge_cle.json, provenance.json

Everything goes through iso_loop's registry. FLUX only receives the maquettes, the three style references, and our own
earlier paintings (round 1's solid as material reference, the previous stage for shape only).
"""
import argparse
import colorsys
import concurrent.futures
import json
import math
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import sondes_moulin as S  # noqa: E402
from iso_loop import FLUX3, guard_endpoint, reserve, settle  # noqa: E402
from lib import flux  # noqa: E402
from PIL import Image, ImageChops, ImageFilter  # noqa: E402

OUT = S.R1 / "sondes2"
MQ = OUT / "maquettes"
S.OUT = OUT  # boards() and the cut helpers read it
CARD_TOP_Y = {"rough": 688, "solid": 542, "grand": 410, "legendary": 342, "mythic": 67}  # 1087 - 235 * card z, see sondes2_maquettes
TOP_TOL = 15
H_RAW = S.R1 / "sondes/solid/brut/t1_v1.png"  # round 1's H.png, the material reference
M_RAW = lambda: S.R1 / "sondes/mythic" / "brut" / json.loads((S.R1 / "sondes/mythic/controle.json").read_text())["best"]  # noqa: E731


def maquette_mask(stage):
    return S.sil(Image.open(MQ / f"{stage}.peinture.png")).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))


S.maquette_mask = maquette_mask  # cut_and_control reads the round 2 maquettes

WALL = ("The tower is round: the light turns gradually around the curve with no vertical line, built of visible irregular warm "
        "sandy stones, no white dabs, no black dots. ")
WINDOW = "One single small lit window on the right side of the tower, a warm pale yellow pane in a dark wood frame, no glow. "
HEAD = ("Image 1 is a flat maquette that fixes the exact shape of one building: a round stone windmill tower under a cone roof, "
        "with a small round window on the roof, a door at its foot, and a long timber prop pole running from the roof down to the "
        "ground at the right. ")
ROOF = {
    "rough": "The roof is warm straw thatch, matte, dense and fine, no reflection. ",
    "solid": "The roof is warm straw thatch, matte, dense and fine, no reflection. ",
}
TILE = "The roof is clay tiles in a muted terracotta, matte, no reflection, no saturated red. "
STAGE_TXT = {
    "rough": "The tower is short and stout; it has the pole and its short brace, nothing else. ",
    "solid": "The tower is taller. At the left of the door stand two sacks with knotted necks; the foot of the pole rests on a "
             "round wooden drum on the ground. ",
    "grand": "The tower is taller still. A timber gallery with a railing runs in a ring around it, open where the pole passes, "
             "with a small blue-grey cloth hung over the rail at the front left. At the left corner is a small stone bread oven "
             "with a tall round stone chimney, and two sacks with knotted necks beside it. The foot of the pole rests on a round "
             "wooden drum. ",
    "legendary": "The tower is as tall as it gets, with the timber gallery and its railing, the small blue-grey cloth over the "
                 "rail at the front left, the stone oven with its tall round chimney at the left corner, two sacks, and the pole "
                 "resting on its round wooden drum. ",
    "mythic": "Everything of the previous stage stays: the timber gallery with its cloth, the stone oven and chimney, the sacks, "
              "the drum. No animal. On the roof tip stands ONE single raw shard of cold blue mineral, matte, jagged, in one piece, "
              "no stacked rings, not stone, not slate, no highlights, no facets shine, no glow: the only blue thing on the "
              "building. ",
}
TAIL = ("Paint exactly this object as a finished daytime illustration. Same position to the pixel, no object added. "
        "Never paint wings, blades, sails, a machine, a spare mast or steps, and no shadow of any wing. The colours of the maquette "
        "only hint at the materials; repaint them in daylight. The small round window on the roof is matte wood or iron, with no "
        "mark. All metal is matte, nothing golden. Paint no ground, no grass and no slab: only the building and its objects, and "
        "the low stone plinth of the maquette. Images 2, 3 and 4 are style references only, for ink line, upper-left light and "
        "painted brushwork: copy none of their shapes, objects, ground diamond or cast shadows, and paint shaded sides in warm "
        "dark taupe, not their olive-green; shape comes only from image 1, the maquette. Image 5 is the material reference only: "
        "paint the tower stone like the stone of image 5, its warmth and its irregular stones, but copy nothing of its shape. ")
CONT = "Image 6 is the same building one rank lower, already painted: use it for shape only, not for colour or material. "
FIN = ("Ink line: thicker and even along the outer contour, fine inside the object. Daytime light from the upper left: lit faces to "
       "the left, shaded sides in warm dark taupe. Ink outline in #0F1518. No painted cast shadow on the ground, no gloss, no "
       "shine, no glow. No text, no letters, no numbers, no runes. The whole image has a flat, pure magenta (#FF00FF) background "
       "from edge to edge, all four corners included.")


def prompt(stage):
    return (HEAD + STAGE_TXT[stage] + ROOF.get(stage, TILE) + WALL + WINDOW + TAIL + (CONT if stage != "rough" else "") + FIN)


def hue_sat(im, box_mask=None):
    """Circular mean hue (deg) and mean saturation of the non-ink pixels (value > 0.3), inside the mask when given."""
    im = im.convert("RGB")
    px = im.getdata()
    sel = box_mask.getdata() if box_mask else [255] * len(px)
    hs = [colorsys.rgb_to_hsv(*(c / 255 for c in p)) for p, m in zip(px, sel) if m and p != (255, 0, 255)]
    hs = [h for h in hs if h[2] > 0.3]
    if not hs:
        return None
    x = sum(math.cos(2 * math.pi * h) for h, _, _ in hs)
    y = sum(math.sin(2 * math.pi * h) for h, _, _ in hs)
    return {"pixels": len(hs), "mean_hue_deg": round(math.degrees(math.atan2(y, x)) % 360, 1),
            "mean_saturation": round(sum(s for _, s, _ in hs) / len(hs), 3)}


def peak_masks():
    """(new shard mask, edit mask): the shard of the round 2 maquette above the roof tip, and it grown with round 1's stacked peak."""
    new = S.sil(Image.open(MQ / "mythic.peinture.png"))
    cut = Image.new("L", new.size, 0)
    cut.paste(255, (0, 0, new.width, 330))
    new_peak = ImageChops.multiply(new, cut)
    old = S.sil(Image.open(M_RAW()).convert("RGB").resize(S.SIZE))
    old_peak = ImageChops.multiply(old, cut)
    edit = ImageChops.lighter(new_peak, old_peak).filter(ImageFilter.MaxFilter(13))
    return new_peak, edit


def peak():
    guard_endpoint(FLUX3)
    d = OUT / "peak"
    (d / "brut").mkdir(parents=True, exist_ok=True)
    outs = [d / "brut" / f"t1_v{i}.png" for i in range(2)]
    if any(o.exists() for o in outs):
        sys.exit("exists")
    body = M_RAW()
    new_peak, edit = peak_masks()
    l, t, r, b = edit.getbbox()
    w, h = S.SIZE
    box = [round(1000 * t / h), round(1000 * l / w), round(1000 * min(b + 20, h) / h), round(1000 * r / w)]
    desc = ("one single raw shard of cold blue mineral, matte, jagged, one piece, no stacked rings, not stone, not slate, no "
            "highlights, the only blue thing on the building, standing on the roof tip and leaning slightly right, shaped like "
            "image 2's blue peak")
    p = ("Image 1 is a finished painting of a windmill on a flat magenta background. Image 2 is a maquette: only the shape of its "
         "blue peak matters. Edit image 1: the grey stacked stone peak on the roof tip is replaced by the shard below. Everything "
         "else stays exactly as it is, same position to the pixel, same ink, materials, light and flat magenta background; no "
         "object is added except the shard; no text, no letters. Edits: "
         + json.dumps([{"id": "peak", "desc": desc, "from": None, "src_bbox": None, "tgt_bbox": box}]))
    refs = (body, MQ / "mythic.peinture.png")
    batch = reserve(2, 0.07, "sondes2 peak t1", None)
    responses: list = []

    def one(io):
        i, o = io
        return flux.generate(slug="sondes2_peak", prompt=p, out=o, width=w, height=h, attempts=1, references=refs,
                             extra={"width": w, "height": h}, submitted_log=responses, endpoint=FLUX3, seed=54100 + i)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(one, enumerate(outs)))
    finally:
        entry = settle(batch, responses)
    res = {"prompt": p, "bbox": box, "cost": entry["cost"], "posts": entry["posts"], "images": {}}
    body_im = Image.open(body).convert("RGB").resize(S.SIZE, Image.LANCZOS)
    soft = edit.filter(ImageFilter.GaussianBlur(2))
    for o in outs:
        if not o.exists():
            continue
        gen = Image.open(o).convert("RGB").resize(S.SIZE, Image.LANCZOS)
        comp = Image.composite(gen, body_im, soft)  # the body is kept, only the peak area comes from the paint
        c = d / f"compose_{o.stem}.png"
        comp.save(c)
        m = hue_sat(comp, new_peak.filter(ImageFilter.MinFilter(5)))
        row = {"compose": c.name, "peak_mask_hue_sat": m, "blue": bool(m and 190 <= m["mean_hue_deg"] <= 250 and m["mean_saturation"] >= 0.25)}
        if not row["blue"] and m:  # tint by script under the mask, at 0 $: hue 212, saturation at least 0.45, value kept
            tint = comp.copy()
            px, mp = tint.load(), new_peak.filter(ImageFilter.MinFilter(3)).load()
            for y in range(h):
                for x in range(w):
                    if mp[x, y] and px[x, y] != (255, 0, 255):
                        rr, gg, bb = (v / 255 for v in px[x, y])
                        hh, ss, vv = colorsys.rgb_to_hsv(rr, gg, bb)
                        if vv > 0.3:
                            px[x, y] = tuple(round(255 * v) for v in colorsys.hsv_to_rgb(212 / 360, max(ss, 0.45), vv))
            tc = d / f"tint_{o.stem}.png"
            tint.save(tc)
            row["tinted"] = tc.name
            row["tinted_hue_sat"] = hue_sat(tint, new_peak.filter(ImageFilter.MinFilter(5)))
        res["images"][o.name] = row
    (d / "peak.json").write_text(json.dumps(res, indent=2))
    print(json.dumps({k: v for k, v in res.items() if k != "prompt"}, indent=1))


def control(stage, raw):
    cut, c = S.cut_and_control(stage, raw)
    top = cut.getchannel("A").point(lambda v: 255 if v >= 128 else 0).getbbox()[1]
    c.update({"top_y": top, "card_top_y": CARD_TOP_Y[stage], "top_delta_px": top - CARD_TOP_Y[stage],
              "top_ok": abs(top - CARD_TOP_Y[stage]) <= TOP_TOL})
    c["score"] = round(c["score"] - (0 if c["top_ok"] else 1.0), 4)
    return cut, c


def paint():
    guard_endpoint(FLUX3)
    prev_best = None
    for stage in S.STAGES:
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
            refs = (MQ / f"{stage}.peinture.png", *S.STYLE, H_RAW) + ((prev_best,) if prev_best else ())
            batch = reserve(2, 0.07, f"sondes2 {stage} t{attempt}", None)
            responses: list = []

            def one(io, attempt=attempt, refs=refs, stage=stage, responses=responses):
                i, o = io
                return flux.generate(slug=f"sondes2_{stage}", prompt=prompt(stage), out=o, width=S.SIZE[0], height=S.SIZE[1],
                                     attempts=1, references=refs, extra={"width": S.SIZE[0], "height": S.SIZE[1]},
                                     submitted_log=responses, endpoint=FLUX3, seed=55000 + 1000 * S.STAGES.index(stage) + 100 * attempt + i)

            try:
                with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
                    list(pool.map(one, enumerate(outs)))
            finally:
                entry = settle(batch, responses)
            print(stage, attempt, entry["cost"], "posts", entry["posts"], flush=True)
            for o in outs:
                if o.exists():
                    cut, c = control(stage, o)
                    cut.save(d / "coupe" / o.name)
                    c["refs"] = [r.name for r in refs]
                    results[o.name] = c
            if any(c["iou"] >= 0.85 and c["top_ok"] for c in results.values()):
                break
        if not results:
            print(stage, "no image")
            continue
        best = max(results, key=lambda k: results[k]["score"])
        ctl.write_text(json.dumps({"stage": stage, "attempts": attempts, "images": results, "best": best,
                                   "failed": not (results[best]["iou"] >= 0.85 and results[best]["top_ok"]),
                                   "prompt": prompt(stage)}, indent=2))
        prev_best = d / "brut" / best
        print(stage, "best", best, results[best], flush=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["peak", "paint", "boards"])
    c = ap.parse_args().cmd
    peak() if c == "peak" else paint() if c == "paint" else S.boards("sondes2")
