#!/usr/bin/env python3
"""Windmill r1 probes, round 3. Outputs in windmill/r1/sondes3/, never overwritten. Maquettes come from
sondes2_maquettes.py sondes3 (seam fixed, kit shapes, no breeches).

    python3 scripts/bld/sondes3.py paint      # the five stages, 2 images each (retry once if none passes), registry batches
    python3 scripts/bld/sondes3.py breeches   # the breeches piece alone on magenta, 2 tries, cut
    python3 scripts/bld/sondes3.py peak       # FLUX bbox edit of the ring and collar under the peak, then a tint under its mask
    python3 scripts/bld/sondes3.py boards     # montages, strip, juge/, juge_cle.json, provenance.json

All FLUX goes through iso_loop's registry. FLUX only receives the maquettes, the three style references and our own earlier
paintings (a stone material reference, a thatch reference, the previous stage for shape).
"""
import argparse
import colorsys
import concurrent.futures
import json
import pathlib
import random
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import sondes2 as X  # noqa: E402
import sondes_moulin as S  # noqa: E402
from iso_loop import FLUX3, guard_endpoint, reserve, settle  # noqa: E402
from lib import flux  # noqa: E402
from PIL import Image, ImageChops, ImageDraw, ImageFilter  # noqa: E402

R1 = S.R1
OUT = R1 / "sondes3"
MQ = OUT / "maquettes"
S.OUT = OUT
X.MQ = MQ
STONE_REF = R1 / "sondes2/grand/brut/t1_v0.png"  # mara kept it: the stone and the line weight to match
THATCH_REF = {"rough": R1 / "sondes2/rough/brut/t1_v1.png", "solid": R1 / "sondes2/solid/brut/t1_v1.png"}
GREEN = (112, 140, 104)
RAIL = (360, 805)  # px of the top of the cloth on the gallery rail, front left (grid 1.33, 1.79, z 1.64)
PASS_IOU = 0.97


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
STONE = ("Image 5 is the stone reference: paint the tower stone with the same warm irregular stones, the same values and the "
         "same ink line weight as image 5, but copy nothing of its shape. ")
THATCH = "Image 6 is the thatch reference only: paint the straw roof like it, and copy nothing else from it. "
CONT = "Image 6 is the same building one rank lower, already painted: use it for shape only, not for colour or material. "
TAIL = X.TAIL.split(" Image 5 is the material")[0] + " "
WALL = X.WALL


def prompt(stage):
    return (X.HEAD + STAGE_TXT[stage] + X.ROOF.get(stage, X.TILE) + WALL + X.WINDOW + TAIL + STONE
            + (THATCH if stage in THATCH_REF else CONT if stage != "rough" else "") + X.FIN)


def refs_for(stage, prev_best):
    r = (MQ / f"{stage}.peinture.png", *S.STYLE, STONE_REF)
    return r + ((THATCH_REF[stage],) if stage in THATCH_REF else (prev_best,) if prev_best else ())


def control(stage, raw):
    cut, c = X.control(stage, raw)
    c["passes"] = bool(c["iou"] >= PASS_IOU and c["top_ok"] and c["magenta_residual"] < 0.005)
    return cut, c


def run_batch(label, n, slug, prompt_text, outs, refs, seed0, size=S.SIZE):
    batch = reserve(n, 0.07, label, None)
    responses: list = []

    def one(io):
        i, o = io
        return flux.generate(slug=slug, prompt=prompt_text, out=o, width=size[0], height=size[1], attempts=1, references=refs,
                             extra={"width": size[0], "height": size[1]}, submitted_log=responses, endpoint=FLUX3, seed=seed0 + i)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(one, enumerate(outs)))
    finally:
        entry = settle(batch, responses)
    print(label, entry["cost"], "posts", entry["posts"], flush=True)
    return entry


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
            refs = refs_for(stage, prev_best)
            run_batch(f"sondes3 {stage} t{attempt}", 2, f"sondes3_{stage}", prompt(stage), outs, refs,
                      56000 + 1000 * S.STAGES.index(stage) + 100 * attempt)
            for o in outs:
                if o.exists():
                    cut, c = control(stage, o)
                    cut.save(d / "coupe" / o.name)
                    c["refs"] = [f"{r.parent.name}/{r.name}" for r in refs]
                    results[o.name] = c
            if any(c["passes"] for c in results.values()):
                break
        if not results:
            print(stage, "no image")
            continue
        best = max(results, key=lambda k: results[k]["score"])
        ctl.write_text(json.dumps({"stage": stage, "attempts": attempts, "images": results, "best": best,
                                   "failed": not results[best]["passes"], "prompt": prompt(stage)}, indent=2))
        prev_best = d / "brut" / best
        print(stage, "best", best, results[best], flush=True)


BREECHES = ("One single pair of old breeches hung to dry, seen from the front, centred: flour-white matte cloth with one ochre "
            "stripe across it, two legs hanging down, a gathered waist at the top, hanging from two small wooden pegs, no blue, "
            "no other colour. Small simple object, hand-inked outline in near-black #0F1518 of even weight, matte painted "
            "brushwork, daytime light from the upper left, shaded sides in warm dark taupe. No text, no letters, no ground, no "
            "shadow, no gloss. The whole image has a flat, pure magenta (#FF00FF) background from edge to edge.")


def breeches():
    guard_endpoint(FLUX3)
    d = OUT / "culotte"
    (d / "brut").mkdir(parents=True, exist_ok=True)
    (d / "coupe").mkdir(exist_ok=True)
    outs = [d / "brut" / f"t1_v{i}.png" for i in range(2)]
    if any(o.exists() for o in outs):
        sys.exit("exists")
    entry = run_batch("sondes3 breeches t1", 2, "sondes3_culotte", BREECHES, outs, (), 57100, size=(1024, 1024))
    info = {"prompt": BREECHES, "cost": entry["cost"], "images": {}}
    for o in outs:
        if o.exists():
            im = X.S.key(Image.open(o).convert("RGB"))
            a = im.getchannel("A").filter(ImageFilter.MinFilter(3))
            im.putalpha(a)
            im = im.crop(im.getchannel("A").getbbox())
            im.save(d / "coupe" / o.name)
            info["images"][o.name] = {"size": list(im.size), "hue_sat": X.hue_sat(im.convert("RGB"), im.getchannel("A"))}
    (d / "culotte.json").write_text(json.dumps(info, indent=2))
    print(json.dumps({k: v for k, v in info.items() if k != "prompt"}, indent=1))


def place_breeches(cut, piece):
    """The cut cloth, 76 px wide, hung from RAIL on a copy of a cut stage."""
    p = piece.resize((76, round(76 * piece.height / piece.width)), Image.LANCZOS)
    out = cut.copy()
    out.alpha_composite(p, (RAIL[0] - 38, RAIL[1]))
    return out


def peak():
    """FLUX bbox edit of the ring at the base of the peak and its collar, on the best mythic, then a tint under the peak mask."""
    guard_endpoint(FLUX3)
    best = OUT / "mythic" / "brut" / json.loads((OUT / "mythic/controle.json").read_text())["best"]
    d = OUT / "peak"
    (d / "brut").mkdir(parents=True, exist_ok=True)
    outs = [d / "brut" / f"t1_v{i}.png" for i in range(2)]
    if any(o.exists() for o in outs):
        sys.exit("exists")
    new = S.sil(Image.open(MQ / "mythic.peinture.png"))
    shard = ImageChops.multiply(new, _above(330))
    edit = ImageChops.lighter(shard, ImageChops.multiply(S.sil(Image.open(best).convert("RGB").resize(S.SIZE)), _above(330)))
    edit = edit.filter(ImageFilter.MaxFilter(13))
    sl, _, sr, _ = shard.getbbox()
    ring = Image.new("L", new.size, 0)
    ring.paste(255, (sl - 30, 330, sr + 30, 372))  # the ring and the roof tip right under the shard
    edit = ImageChops.lighter(edit, ImageChops.multiply(new, ring))
    l, t, r, b = edit.getbbox()
    w, h = S.SIZE
    box = [round(1000 * t / h), round(1000 * l / w), round(1000 * min(b + 12, h) / h), round(1000 * r / w)]
    p = ("Image 1 is a finished painting of a windmill on a flat magenta background. Edit image 1: remove the round stone ring "
         "and the seam at the base of the blue shard on the roof tip, and set the shard, in one piece, on a small dark matte iron "
         "collar that sits on the terracotta roof tip. Keep the shard's shape, its cold blue and its brushwork. Everything else "
         "stays exactly as it is, same position to the pixel, same ink, materials, light and flat magenta background; no object "
         "is added except the collar; no text, no letters. Edits: "
         + json.dumps([{"id": "peak_base", "desc": "the blue shard seated on a small dark matte iron collar, no stone ring, no "
                        "seam, the roof tip tile under it unchanged", "from": "ref_image_0", "src_bbox": box, "tgt_bbox": box}]))
    entry = run_batch("sondes3 peak t1", 2, "sondes3_peak", p, outs, (best,), 58100)
    body = Image.open(best).convert("RGB").resize(S.SIZE, Image.LANCZOS)
    soft = edit.filter(ImageFilter.GaussianBlur(2))
    res = {"prompt": p, "bbox": box, "cost": entry["cost"], "base": best.name, "images": {}}
    for o in outs:
        if not o.exists():
            continue
        gen = Image.open(o).convert("RGB").resize(S.SIZE, Image.LANCZOS)
        comp = Image.composite(gen, body, soft)
        m = shard.filter(ImageFilter.MinFilter(5))
        before = X.hue_sat(comp, m)
        tinted = tint(comp, m, 212, 0.55)
        after = X.hue_sat(tinted, m)
        comp.save(d / f"edit_{o.stem}.png")
        tinted.save(d / f"tint_{o.stem}.png")
        top = ImageChops.multiply(S.sil(tinted), Image.new("L", S.SIZE, 255)).getbbox()[1]
        res["images"][o.name] = {"before": before, "after": after, "top_y": top}
    (d / "peak.json").write_text(json.dumps(res, indent=2))
    print(json.dumps({k: v for k, v in res.items() if k != "prompt"}, indent=1))


def _above(y, size=S.SIZE):
    m = Image.new("L", size, 0)
    m.paste(255, (0, 0, size[0], y))
    return m


def _band(y0, y1, size):
    m = Image.new("L", size, 0)
    m.paste(255, (0, y0, size[0], y1))
    return m


def tint(im, mask, hue_deg, sat):
    """Hue to hue_deg and saturation scaled so the mean under the mask reaches sat; value and brush strokes kept."""
    cur = X.hue_sat(im, mask)["mean_saturation"]
    k = sat / cur
    out = im.copy()
    px, mp = out.load(), mask.load()
    for y in range(im.height):
        for x in range(im.width):
            if mp[x, y] and px[x, y] != (255, 0, 255):
                hh, ss, vv = colorsys.rgb_to_hsv(*(c / 255 for c in px[x, y]))
                if vv > 0.3:
                    px[x, y] = tuple(round(255 * v) for v in colorsys.hsv_to_rgb(hue_deg / 360, min(1.0, ss * k), vv))
    return out


def kept(stage):
    c = json.loads((OUT / stage / "controle.json").read_text())
    return Image.open(OUT / stage / "coupe" / c["best"]).convert("RGBA")


def montage(stage, tower, ribbons=False):
    """Tower, the ribbons (mythic, if their image exists) and the stage's existing sail sheet at 45 degrees, on the village green."""
    base = Image.new("RGBA", S.SIZE, GREEN + (255,))
    base.alpha_composite(tower)
    if ribbons:
        base.alpha_composite(S.key(Image.open(R1 / "elements/rubans.peinture.png")))
    sails = S.key(Image.open(R1 / f"elements/sails_{'legendary' if stage == 'mythic' else stage}.peinture.png"))
    cx, cy = S.px_pivot(stage)
    base.alpha_composite(sails, (cx - 384, cy - 384)) if cy - 384 >= 0 else base.alpha_composite(
        sails.crop((0, 384 - cy, 768, 768)), (cx - 384, 0))
    return base


def boards():
    ctls = {s: json.loads((OUT / s / "controle.json").read_text()) for s in S.STAGES}
    piece = None
    cl = OUT / "culotte" / "culotte.json"
    if (OUT / "culotte/choix.txt").exists():
        piece = Image.open(OUT / "culotte/coupe" / (OUT / "culotte/choix.txt").read_text().strip()).convert("RGBA")
    towers = {}
    for s in S.STAGES:
        t = kept(s)
        if s == "mythic" and (OUT / "peak/choix.txt").exists():  # the tinted, edited peak replaces the body's own
            raw = Image.open(OUT / "peak" / (OUT / "peak/choix.txt").read_text().strip()).convert("RGB")
            full, _ = X.S.cut_and_control("mythic", OUT / "peak" / (OUT / "peak/choix.txt").read_text().strip())
            t = full
        towers[s] = place_breeches(t, piece) if piece is not None and s in ("grand", "legendary", "mythic") else t
    mont = {s: montage(s, towers[s], ribbons=(s == "mythic")) for s in S.STAGES}
    (OUT / "juge").mkdir(exist_ok=True)
    key = {}
    order = list(S.STAGES)
    random.Random(303).shuffle(order)
    for letter, s in zip("ABCDE", order):
        tile = Image.new("RGBA", S.SIZE, GREEN + (255,))
        tile.alpha_composite(towers[s])
        f = OUT / "juge" / f"{letter}.png"
        if not f.exists():
            tile.convert("RGB").resize((448, 672), Image.LANCZOS).save(f)
        key[letter] = {"stage": s, "kind": "tower"}
    for letter, s in zip("FGHIJ", order):
        f = OUT / "juge" / f"{letter}.png"
        if not f.exists():
            mont[s].convert("RGB").resize((448, 672), Image.LANCZOS).save(f)
        key[letter] = {"stage": s, "kind": "montage sails 45deg" + (" + ribbons" if s == "mythic" else "")}
    # strip of the five stages, tower with its sails at game scale (2 px per dp)
    k = 2 / 5
    bw, bh = round(S.SIZE[0] * k), round(S.SIZE[1] * k)
    strip = Image.new("RGB", (5 * bw, bh), GREEN)
    for i, s in enumerate(S.STAGES):
        strip.paste(mont[s].convert("RGB").resize((bw, bh), Image.LANCZOS), (i * bw, 0))
    if not (OUT / "bande.png").exists():
        strip.save(OUT / "bande.png")
    if not (OUT / "juge_cle.json").exists():
        (OUT / "juge_cle.json").write_text(json.dumps(key, indent=2))
    batches = json.loads((pathlib.Path.home() / ".cache/bati-art-loop/iso/budget.json").read_text())["v1"]["batches"]
    mine = [b for b in batches if b["label"].startswith("sondes3")]
    if not (OUT / "provenance.json").exists():
        (OUT / "provenance.json").write_text(json.dumps({
            "date": time.strftime("%Y-%m-%d"), "model": "FLUX 3 Image", "endpoint": FLUX3, "prompts": {s: c["prompt"] for s, c in ctls.items()},
            "breeches_prompt": BREECHES, "batches": mine, "cost_total": round(sum(b["cost"] for b in mine), 4),
            "best": {s: c["best"] for s, c in ctls.items()}, "ribbons": "elements/rubans.peinture.png of r1 (maquette flat, exists)"},
            indent=2, ensure_ascii=False))
    print(json.dumps(key))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["paint", "breeches", "peak", "boards"])
    globals()[ap.parse_args().cmd]()
