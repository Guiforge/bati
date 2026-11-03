#!/usr/bin/env python3
"""E1 target screens: the mythic painted into the real village capture (PROMPT section 9.2).

    python3 scripts/bld/cibles_e1.py prep                  # input images (capture crop, old building erased, maquette pasted), masks
    python3 scripts/bld/cibles_e1.py paint DIR [--try N]   # 2 variants of one direction through iso_loop's registry
    python3 scripts/bld/cibles_e1.py post                  # diff gate and recolle of every raw variant

DIR is windmill_A, windmill_B, windmill_C or observatory_C. Outputs go to the ignored explore/E1/cibles/ of the iso worktree and are never
overwritten. The old building is erased from the capture first (blur fill) so only the new maquette stands where it was; the diff mask is
the old and the new silhouette together, dilated by 8 px. Dev only; a target screen is never shipped.
"""
import argparse
import concurrent.futures
import json
import pathlib
import sys

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "iso"))
sys.path.insert(0, str(ROOT / "scripts" / "bld"))
sys.path.insert(0, str(ROOT / "scripts"))
import gates
import iso_audit as A
from explore_e3 import refs as e3_refs
from iso_loop import FLUX3, guard_endpoint, reserve, settle
from lib import flux
from PIL import Image, ImageChops, ImageFilter

ISO = pathlib.Path("/home/guiforge/Documents/code/bati/.claude/worktrees/iso")
VB = ISO / "docs/designs/village-buildings"
E1 = VB / "explore/E1"
OUT = E1 / "cibles"
SPR = ISO / "assets/images/village/iso"
CROP = (196, 760, 884, 1640)  # 688 x 880: both buildings' sprite rect and the sails, with margins
RECT = (305, 847, 470, 706)  # sprite rect in capture pixels, both capture jsons
DIRS = {"windmill_A": "windmill", "windmill_B": "windmill", "windmill_C": "windmill", "observatory_C": "observatory"}
EACH = 0.075

COMMON = (
    "Image 1 is a screenshot of a hand-inked illustrated village seen from above at an angle. In it, one building has been replaced by a flat "
    "dark maquette that fixes its exact shape: {shape}. Repaint only that one building, over the maquette, as a finished daytime illustration "
    "that belongs to the rest of the picture: the same silhouette, every part in the same place and at the same size, the same position to the "
    "pixel. No object added, nothing removed. Everything else in image 1 stays exactly as it is, pixel for pixel: the ground, the grass, the "
    "stream, the trees, the paths, the other buildings. {magic} The flat colours of the maquette only hint at the materials; repaint them in "
    "daylight: {materials}. "
    "Images 2, 3 and 4 are style references only, for ink line, upper-left light and painted brushwork: copy none of their shapes, objects, "
    "ground or cast shadows, and paint shaded sides in cool slate #2E3552; shape comes only from image 1. "
    "Ink line: thicker and even along the outer contour, fine inside the object, in near-black #0F1518. Daytime light from the upper left: lit "
    "faces to the left, shaded sides in cool slate. Matte painted surfaces, two or three values per surface. No gloss, no shine, no glow, no "
    "text, no letters, no numbers, no runes."
)
WIND_SHAPE = (
    "a round stone windmill tower under a roof, four long timber sail arms in an X, a door at its foot, two small lit windows, sacks and a "
    "barrel at its base, and {top}"
)
WIND_MAT = "warm grey matte slate roof, warm grey stone laid in courses, brown timber, matte ochre sacks, pale weathered timber sails"
PROMPTS = {
    "windmill_A": COMMON.format(
        shape=WIND_SHAPE.format(top="a tall rough crystal spike with two small shards, rising from the roof between the sails"),
        magic="The windmill is mythic and its magic is visible by day: the spike is raw matte cold-blue crystal with irregular facets, "
        "and a few thin pale-blue ribbons of wind curl around the sails. Only blue, never gold, never yellow, no letters.",
        materials=WIND_MAT + ", cold blue crystal"),
    "windmill_B": COMMON.format(
        shape=WIND_SHAPE.format(top="a small six-bladed wheel on a mast above the roof, between the big sails"),
        magic="The windmill is mythic and its magic is visible by day: the small six-bladed wheel is pale blue matte painted wood, and a few "
        "thin pale-blue ribbons of wind spiral from the tips of the big sails up to it. Only blue, never gold, never yellow, no letters.",
        materials=WIND_MAT + ", pale blue wheel blades"),
    "windmill_C": COMMON.format(
        shape=WIND_SHAPE.format(top="a tall open lyre-shaped frame of two curved iron arms with a crossbar and three thin strings, rising from the roof between the sails"),
        magic="The windmill is mythic and its magic is visible by day: the three strings of the frame are pale blue and a few thin pale-blue "
        "ribbons of wind pass through them and around the sails. Only blue, never gold, never yellow, no letters.",
        materials=WIND_MAT + ", matte dark iron frame"),
    "observatory_C": COMMON.format(
        shape="a round stone drum tower with a copper-grey dome and a telescope pointing up to the upper left, a door at its foot, two small "
        "windows, and behind the dome a large open ring-shaped astrolabe frame of stone and brass with a sighting arm and a few notches on its "
        "top edge",
        magic="The observatory is mythic and its magic is visible by day: the ring frame carries a soft green and blue arcane light, a few "
        "small glowing green and blue star points on its inner ring and faint green and blue sparks sliding along it. Only green and blue, "
        "never gold, never yellow, no letters, no numbers, no graduation figures.",
        materials="warm grey stone laid in courses, teal enamel and matte brass on the ring, copper-grey dome, brown timber door"),
}


def paths(d):
    b = DIRS[d]
    return dict(cap=VB / f"baseline/bld-baseline/{b}-village-palier12.png", sil=E1 / d / "sil.png", col=E1 / d / "color.png",
                dir=OUT / d, base=b)


def old_alpha(base, size):
    """The old building's mask in capture pixels (sprite, plus the sail sheet for the windmill)."""
    x, y, w, h = RECT
    m = Image.new("L", size, 0)
    stage = "grand" if base == "windmill" else "solid"
    m.paste(Image.open(SPR / base / f"{stage}.jour.webp").convert("RGBA").resize((w, h), Image.LANCZOS).getchannel("A"), (x, y))
    if base == "windmill":
        t = Image.new("L", size, 0)
        t.paste(Image.open(SPR / "windmill_sails.jour.webp").convert("RGBA").resize((464, 464), Image.LANCZOS).getchannel("A"), (308, 921))
        m = ImageChops.lighter(m, t)
    return m.point(lambda v: 255 if v >= 128 else 0)


def new_mask(d, size):
    x, y, w, h = RECT
    s = gates.mask_of(paths(d)["col"]).resize((w, h), Image.LANCZOS)  # building and slab: color.png against its flat background
    full = Image.new("L", size, 0)
    full.paste(s.point(lambda v: 255 if v >= 128 else 0), (x, y))
    return full


def fill(img, hole, steps=(64, 32, 16, 8, 4)):
    """Blur fill: the pixels in `hole` rebuilt from the valid ones around, large radius first."""
    out = np.asarray(img.convert("RGB"), dtype=np.float32).copy()
    cur = (np.asarray(hole) < 128).astype(np.float32)
    for r in steps:
        blur = lambda a: np.asarray(Image.fromarray(np.uint8(np.clip(a, 0, 255)), "L").filter(ImageFilter.GaussianBlur(r)), dtype=np.float32)
        den = blur(cur * 255) / 255
        take = (cur < 0.5) & (den > 0.02)
        for c in range(3):
            out[..., c] = np.where(take, blur(out[..., c] * cur) / np.maximum(den, 1e-3), out[..., c])
        cur = np.where(take, 1.0, cur)
    return Image.fromarray(np.uint8(np.clip(out, 0, 255)))


def save_mask(m, path):
    r = Image.new("RGBA", m.size, (255, 255, 255, 0))
    r.putalpha(m)
    r.crop(CROP).save(path)


def prep():
    OUT.mkdir(exist_ok=True)
    for d in DIRS:
        p = paths(d)
        p["dir"].mkdir(exist_ok=True)
        if (p["dir"] / "input.png").exists():
            continue
        cap = Image.open(p["cap"]).convert("RGB")
        old, new = old_alpha(p["base"], cap.size), new_mask(d, cap.size)
        erased = fill(cap, old.filter(ImageFilter.MaxFilter(5)))
        x, y, w, h = RECT
        comp = erased.copy()
        comp.paste(Image.open(p["col"]).convert("RGB").resize((w, h), Image.LANCZOS), (x, y), new.crop((x, y, x + w, y + h)))
        comp.crop(CROP).save(p["dir"] / "input.png")
        erased.crop(CROP).save(p["dir"] / "erased.png")
        cap.crop(CROP).save(p["dir"] / "capture.png")
        save_mask(old, p["dir"] / "old_mask.png")
        save_mask(new, p["dir"] / "new_mask.png")
        print("prep", d)


def paint(d, attempt):
    guard_endpoint(FLUX3)
    p = paths(d)
    outs = [p["dir"] / f"brut_try{attempt}_v{i}.png" for i in range(2)]
    if any(o.exists() for o in outs):
        sys.exit("exists: pass --try")
    batch = reserve(2, EACH, f"explore E1 cible {d} try{attempt}", None)
    w, h = Image.open(p["dir"] / "input.png").size
    refs = (p["dir"] / "input.png", *e3_refs()[1:])
    responses: list = []
    ok: dict = {}

    def one(io):
        i, o = io
        ok[o.name] = flux.generate(slug=f"explore_e1_cible_{d}", prompt=PROMPTS[d], out=o, width=w, height=h, attempts=1,
                                   references=refs, extra={"width": w, "height": h}, submitted_log=responses, endpoint=FLUX3,
                                   seed=41000 + 100 * attempt + i)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(one, enumerate(outs)))
    finally:
        entry = settle(batch, responses)
    print(json.dumps({"dir": d, "made": [o.name for o in outs if o.exists()], "failed": [k for k, v in ok.items() if not v],
                      "cost": entry["cost"], "posts": entry["posts"]}))


def post(d):
    dd = paths(d)["dir"]
    res = []
    for raw in sorted(q for q in dd.glob("brut_try*_v?.png")):
        if (dd / f"{raw.stem}.diff.json").exists():
            continue
        inp = Image.open(dd / "input.png")
        im = Image.open(raw).convert("RGB")
        if im.size != inp.size:
            im = im.resize(inp.size, Image.LANCZOS)
        fit = dd / f"{raw.stem}.fit.png"
        im.save(fit)
        part, ok = gates.corner(dd / "input.png", fit, dd / "old_mask.png", dd / "new_mask.png", dilate_px=8, limit=0.02, thr=8,
                                out=dd / f"{raw.stem}.outside.png")
        m = A.dilate(ImageChops.lighter(gates.mask_of(dd / "old_mask.png"), gates.mask_of(dd / "new_mask.png")), 8)
        rec = Image.composite(im, Image.open(dd / "erased.png").convert("RGB"), m.filter(ImageFilter.GaussianBlur(1.5)))
        rec.save(dd / f"{raw.stem}.recolle.png")
        (dd / f"{raw.stem}.diff.json").write_text(json.dumps(
            {"outside_changed_part": round(part, 5), "limit": 0.02, "kept_raw": ok,
             "status": "kept" if ok else "rejected_raw_use_recolle"}, indent=1))
        res.append((raw.stem, round(part, 4), ok))
    return res


def finish():
    """v0/v1 per direction (the raw image if it passed the gate, else its recolle), the board, the blind lot and provenance.json."""
    import random
    import time
    from PIL import ImageDraw
    sets, items = {}, []
    for d in DIRS:
        dd = paths(d)["dir"]
        for i, raw in enumerate(sorted(dd.glob("brut_try1_v?.png"))):
            diff = json.loads((raw.with_suffix(".diff.json")).read_text())
            src = raw if diff["kept_raw"] else dd / f"{raw.stem}.recolle.png"
            dst = dd / f"v{i}.png"
            if not dst.exists():
                Image.open(src).convert("RGB").resize(Image.open(dd / "input.png").size, Image.LANCZOS).save(dst)
            sets.setdefault(d, []).append({"file": f"{d}/v{i}.png", "raw": raw.name, "source": "raw" if diff["kept_raw"] else "recolle",
                                           **diff})
            items.append((f"{d}/v{i}", dst))
    cols = [("capture", "capture.png"), ("input", "input.png"), ("v0", "v0.png"), ("v1", "v1.png")]
    w, h = Image.open(OUT / "windmill_A" / "input.png").size
    board = Image.new("RGB", (len(cols) * w, len(DIRS) * (h + 20)), (40, 40, 40))
    dr = ImageDraw.Draw(board)
    for r, d in enumerate(DIRS):
        for c, (lab, f) in enumerate(cols):
            if (OUT / d / f).exists():
                board.paste(Image.open(OUT / d / f).convert("RGB"), (c * w, r * (h + 20) + 20))
            dr.text((c * w + 6, r * (h + 20) + 5), f"{d} {lab}", fill=(255, 255, 255))
    if not (OUT / "planche.png").exists():
        board.save(OUT / "planche.png")
    lot = OUT / "juge"
    if not lot.exists():
        lot.mkdir()
        random.Random(7).shuffle(items)
        key = {}
        for letter, (name, f) in zip("ABCDEFGH", items):
            Image.open(f).save(lot / f"{letter}.png")
            key[letter] = name
        (OUT / "juge_cle.json").write_text(json.dumps(key, indent=2))
    budget = json.loads((pathlib.Path.home() / ".cache/bati-art-loop/iso/budget.json").read_text())["v1"]["batches"]
    mine = [b for b in budget if b["label"].startswith("explore E1 cible")]
    if not (OUT / "provenance.json").exists():
        (OUT / "provenance.json").write_text(json.dumps({
            "date": time.strftime("%Y-%m-%d"), "model": "FLUX 3 Image", "endpoint": FLUX3, "crop_of_capture": CROP,
            "references": "input.png (capture crop, old building erased by blur fill, maquette color.png pasted at the sprite rect "
                          "470x706 at (305,847)) then the three Bati style refs of decisions.md",
            "gate": "gates.corner, mask = old and new silhouette (color.png against its background, slab included), dilated 8 px, "
                    "threshold 8, limit 2 percent of the pixels outside the mask, measured against input.png",
            "recolle": "a variant over the limit is kept on disk as brut_*.png, marked rejected_raw_use_recolle in its diff json; its "
                       "recolle (result under the dilated mask on erased.png, the real capture elsewhere) stands in as vN.png",
            "prompts": PROMPTS, "variants": sets, "batches": mine, "cost_total": round(sum(b["cost"] for b in mine), 4)},
            indent=2, ensure_ascii=False))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["prep", "paint", "post", "finish"])
    ap.add_argument("dir", nargs="?", choices=list(DIRS))
    ap.add_argument("--try", dest="attempt", type=int, default=1)
    a = ap.parse_args()
    if a.cmd == "prep":
        prep()
    elif a.cmd == "paint":
        paint(a.dir, a.attempt)
    elif a.cmd == "finish":
        finish()
    else:
        for k in DIRS:
            print(k, post(k))
