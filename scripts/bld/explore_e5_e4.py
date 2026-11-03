#!/usr/bin/env python3
"""E5 (finish) and E4 (method) of the buildings exploration, FLUX 3 Image only (E3's winner).

    python3 scripts/bld/explore_e5_e4.py e5 paint {a|b|c}
    python3 scripts/bld/explore_e5_e4.py e5 post
    python3 scripts/bld/explore_e5_e4.py e4 paint {chain|fresh} --solid <solid painting on magenta>
    python3 scripts/bld/explore_e5_e4.py e4 post

Every call goes through iso_loop's registry (reserve, settle), one batch of 2 images per command. Only the painter's maquettes
(maquette_peinture.py), the approved style references and the solid painting leave the machine. Output folders are never
overwritten; the locked corner (loupes/bc/r6) is only read, a copy goes into explore/E5. Dev only.
"""
import argparse
import json
import pathlib
import random
import shutil
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import bldtools as T
import explore_e3 as E3
from iso_loop import FLUX3, guard_endpoint, reserve, settle
from lib import flux
from PIL import Image, ImageChops, ImageDraw

A = E3.A
EXP = E3.ISO_WT / "docs/designs/village-buildings/explore"
E5, E4 = EXP / "E5", EXP / "E4"
CORNER = E3.ISO_WT / "docs/designs/village-loop/loupes/bc/r6/bc-porte.png"
SIZE = E3.SIZE
SC = 0.53  # sprite scale in a 1080 px wide capture: the windmill's slab is about 408 px there, 775 px on its canvas
FOOT = (448, 1270)  # the slab's front corner on the canvas
MEADOW = (0x6A, 0x74, 0x42)
STYLE = list(E3.refs()[1:])

COMMON = (
    "Same position to the pixel, no object added. Never paint wings, blades, a machine, a spare mast or steps. "
    "The colours of the maquette only hint at the materials; repaint them in daylight. The roof is warm grey matte slate, no saturated "
    "blue, no reflection, no scales. The small round window on the roof is matte wood or iron, with no mark. The tower wall is one "
    "single material: plaster, with chips grouped at the base and at the corners, no black dots and no isolated brick plates. All "
    "metal is matte, nothing golden. The flag is rippled cloth. "
    "The ground is a patch of olive and earth mixed (#6A7442 and #7A5A38) with a frayed edge, never orange, with no slab side and no "
    "diamond edge, dissolving into the magenta all around. "
)
STYLE_SENTENCE = (
    "Images {n} are style references only, for ink line, upper-left light and painted brushwork: copy none of their shapes, "
    "objects, ground diamond or cast shadows, and paint shaded sides in cool slate #2E3552, not their olive-green; shape comes only "
    "from image 1, the maquette. "
)
TAIL = (
    "Daytime light from the upper left: lit faces to the left, shaded sides in cool slate #2E3552. Ink outline in #0F1518. No painted "
    "cast shadow on the ground, no gloss, no shine, no glow. No text, no letters, no numbers, no runes. The whole image has a flat, "
    "pure magenta (#FF00FF) background from edge to edge, all four corners included."
)
FINISH = {
    "a": "Ink line: fine and lively, varying in weight. Rich, deep painted surfaces. ",
    "b": "Ink line: thicker and even along the outer contour, fine inside the object. ",
    "c": "Colour: saturation a little lower, closer to the olive of the village ground. ",
}
SOLID_DESC = ("Image 1 is a flat maquette that fixes the exact shape of one building: a round stone windmill tower under a cone roof, "
              "a flagpole with a rippled cloth pennant on the roof tip, a door at its foot, a small lit window on the right side, "
              "two sacks with knotted necks at the left of the base, and a long timber sail arm rising to the right. "
              "Paint exactly this object as a finished daytime illustration. ")
GRAND_DESC = ("Image 1 is a flat maquette that fixes the exact shape of one building: a tall round stone windmill tower under a "
              "tall cone roof, a flagpole with a rippled cloth pennant on the roof tip, a wooden balcony ring with a plank railing "
              "around the upper tower under the roof, a door at its foot, a small lit window on the right side, a red cloth banner "
              "hanging on the wall at the left, a stone chimney stack rising from a low stone annex with a small lit window at the "
              "left of the base, two sacks with knotted necks, and a long timber sail arm rising to the right. "
              "Paint exactly this object as a finished daytime illustration. ")

# bounding boxes of the grand's new parts, [top, left, bottom, right] on 0-1000, read on explore/E4/maquette_grand.png
EDITS = [
    {"id": "tower", "desc": "the same round stone tower and its grey slate cone roof, taller, same materials and brushwork",
     "from": "ref_image_0", "src_bbox": [398, 259, 880, 746], "tgt_bbox": [301, 243, 880, 759]},
    {"id": "flag", "desc": "the flagpole and its cloth pennant, same painting, moved up to the new roof tip",
     "from": "ref_image_0", "src_bbox": [316, 485, 410, 580], "tgt_bbox": [227, 485, 305, 580]},
    {"id": "balcony", "desc": "a wooden balcony ring with a plank railing around the upper tower, under the roof",
     "from": None, "src_bbox": None, "tgt_bbox": [476, 251, 647, 748]},
    {"id": "chimney", "desc": "a tall round stone chimney stack, same stone as the tower", "from": None, "src_bbox": None,
     "tgt_bbox": [554, 173, 744, 262]},
    {"id": "annex", "desc": "a low stone annex with a small warm lit window, touching the base of the chimney",
     "from": None, "src_bbox": None, "tgt_bbox": [699, 156, 789, 307]},
    {"id": "banner", "desc": "a red cloth banner hanging flat on the tower wall", "from": None, "src_bbox": None,
     "tgt_bbox": [573, 248, 673, 301]},
]
CHAIN_PROMPT = (
    "Image 1 is a finished painting of a windmill. Edit it into its next rank: everything not listed below stays exactly as it "
    "is, same position to the pixel, same ink, materials, light and flat magenta background; no object is added except the listed "
    "ones; never paint wings, blades, a machine, a spare mast or steps. No text, no letters, no numbers. Edits: "
)


def sha(p):
    import hashlib
    return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()


def run_f3(label, prompt, refs, outs):
    guard_endpoint(FLUX3)
    if any(o.exists() for o in outs):
        sys.exit("exists")
    batch = reserve(len(outs), 0.10, label, None)
    responses: list = []
    try:
        for i, o in enumerate(outs):  # one at a time: a refusal on one image must not hide the other
            flux.generate(slug=label.replace(" ", "_"), prompt=prompt, out=o, width=SIZE[0], height=SIZE[1], attempts=1,
                          references=tuple(refs), extra={"width": SIZE[0], "height": SIZE[1]}, submitted_log=responses, endpoint=FLUX3,
                          seed=i)
    finally:
        entry = settle(batch, responses)
    made = [o.name for o in outs if o.exists()]
    print(json.dumps({"made": made, "failed": [o.name for o in outs if not o.exists()], "cost": entry["cost"]}))
    return entry


def cut_all(folder):
    (folder / "coupe").mkdir(exist_ok=True)
    spill = {}
    for raw in sorted((folder / "brut").glob("*.png")):
        dst = folder / "coupe" / raw.name
        if not dst.exists():
            side = json.loads(raw.with_suffix(".json").read_text())
            bg = A.measure_background(flux.ORIGINALS / side["signed_original"]["file"])
            rgb = Image.open(raw).convert("RGB").resize(SIZE, Image.LANCZOS)
            k = A.key(rgb, bg)
            k2 = A.key(k.convert("RGB"), "#FF00FF")
            alpha = ImageChops.multiply(k.getchannel("A"), k2.getchannel("A"))
            Image.merge("RGBA", (*k2.convert("RGB").split(), alpha)).save(dst)
        im = Image.open(dst)
        px = [p for p in im.getdata() if p[3] > 128]
        spill[dst.stem] = sum(1 for r, g, b, a in px if r > 150 and b > 150 and g < 110) / max(1, len(px))
    return spill


def label_board(items, out, k=0.5, cols=3):
    w, h = round(SIZE[0] * k), round(SIZE[1] * k)
    rows = -(-len(items) // cols)
    board = Image.new("RGB", (cols * w, rows * (h + 22)), (50, 50, 50))
    d = ImageDraw.Draw(board)
    for n, (name, im) in enumerate(items):
        x, y = (n % cols) * w, (n // cols) * (h + 22)
        tile = Image.new("RGBA", (w, h), MEADOW + (255,))
        tile.alpha_composite(im.convert("RGBA").resize((w, h), Image.LANCZOS))
        board.paste(tile.convert("RGB"), (x, y + 22))
        d.text((x + 5, y + 5), name, fill=(255, 255, 255))
    board.save(out)


def blind(folder, items, seed):
    """items: [(name, image)] saved as letters in juge/, key kept outside the folder."""
    lot = folder / "juge"
    if lot.exists():
        return
    lot.mkdir()
    items = list(items)
    random.Random(seed).shuffle(items)
    key = {}
    for letter, (name, im) in zip("ABCDEFGHIJ", items):
        im.save(lot / f"{letter}.png")
        key[letter] = name
    (folder / "juge_cle.json").write_text(json.dumps(key, indent=2))


def provenance(folder, prompts, labels, note):
    out = folder / "provenance.json"
    if out.exists():
        sys.exit("provenance.json exists")
    batches = json.loads((pathlib.Path.home() / ".cache/bati-art-loop/iso/budget.json").read_text())["v1"]["batches"]
    mine = [b for b in batches if any(b["label"].startswith(x) for x in labels)]
    images = {}
    for j in sorted((folder / "brut").glob("*.json")):
        s = json.loads(j.read_text())
        images[j.stem] = {"model": s["model"], "seed": s["seed"], "references": s.get("references"), "signed_original": s["signed_original"]}
    out.write_text(json.dumps({"date": time.strftime("%Y-%m-%d"), "model": "FLUX 3 Image", "endpoint": FLUX3, "note": note,
                               "prompts": prompts, "batches": mine, "cost_total": round(sum(b["cost"] for b in mine), 4),
                               "images": images}, indent=2, ensure_ascii=False))


def e5_prompt(f):
    return SOLID_DESC + COMMON + STYLE_SENTENCE.format(n="2, 3 and 4") + FINISH[f] + TAIL


def e5(a):
    E5.mkdir(exist_ok=True)
    (E5 / "brut").mkdir(exist_ok=True)
    if a.cmd2 == "paint":
        outs = [E5 / "brut" / f"{a.arg}_v{i}.png" for i in range(2)]
        run_f3(f"explore E5 {a.arg}", e5_prompt(a.arg), [E5 / "maquette_solid.png", *STYLE], outs)
        return
    spill = cut_all(E5)
    corner = E5 / "coin_copie.png"
    if not corner.exists():
        shutil.copy(CORNER, corner)  # a copy: the locked file is only read
    base = Image.open(corner).convert("RGB")
    items, lot, rows = [], [], []
    (E5 / "incrustations").mkdir(exist_ok=True)
    for f in "abc":
        names = sorted(spill_k for spill_k in spill if spill_k.startswith(f + "_"))
        if not names:
            continue
        best = min(names, key=lambda n: spill[n])
        spr = Image.open(E5 / "coupe" / f"{best}.png")
        small = spr.resize((round(SIZE[0] * SC), round(SIZE[1] * SC)), Image.LANCZOS)
        comp = base.convert("RGBA")
        comp.alpha_composite(small, (round(560 - FOOT[0] * SC), round(440 - FOOT[1] * SC)))
        dst = E5 / "incrustations" / f"{f}_{best}.png"
        if not dst.exists():
            comp.convert("RGB").save(dst)
        lot.append((f"{f}:{best}", comp.convert("RGB")))
        rows.append(best)
    for n in sorted(spill):
        items.append((f"{n} spill {spill[n]:.4f}", Image.open(E5 / "coupe" / f"{n}.png")))
    if not (E5 / "planche.png").exists():
        label_board(items, E5 / "planche.png", cols=3)
    blind(E5, lot, 5)
    provenance(E5, {f: e5_prompt(f) for f in "abc"}, ["explore E5"], "incrustation at scale %.2f, front corner of the slab at (560,440) of the copy of bc-porte.png (free meadow, no windmill in the corner); best cut per finish = lowest magenta spill: %s" % (SC, rows))


def e4(a):
    E4.mkdir(exist_ok=True)
    (E4 / "brut").mkdir(exist_ok=True)
    grand = E4 / "maquette_grand.png"
    if a.cmd2 == "paint":
        outs = [E4 / "brut" / f"{a.arg}_v{i}.png" for i in range(2)]
        if a.arg == "chain":
            prompt = CHAIN_PROMPT + json.dumps(EDITS)
            refs = [pathlib.Path(a.solid)]
        else:
            prompt = (GRAND_DESC + "Image 2 is the painting of the same building at its previous rank: keep its materials, colours, brushwork "
                      "and ink. " + COMMON + STYLE_SENTENCE.format(n="3, 4 and 5") + FINISH["a"] + TAIL)
            refs = [grand, pathlib.Path(a.solid), *STYLE]
        (E4 / f"prompt_{a.arg}.txt").write_text(prompt)
        run_f3(f"explore E4 {a.arg}", prompt, refs, outs)
        return
    spill = cut_all(E4)
    solid = Image.open(pathlib.Path(a.solid_cut)).convert("RGBA")
    (E4 / "bandes").mkdir(exist_ok=True)
    (E4 / "contact").mkdir(exist_ok=True)
    k = round(SIZE[0] * SC), round(SIZE[1] * SC)
    lot, items, report = [], [], {}
    for n in sorted(spill):
        im = Image.open(E4 / "coupe" / f"{n}.png").convert("RGBA")
        band = Image.new("RGBA", (k[0] * 2, k[1]), MEADOW + (255,))
        band.alpha_composite(solid.resize(k, Image.LANCZOS), (0, 0))
        band.alpha_composite(im.resize(k, Image.LANCZOS), (k[0], 0))
        band = band.convert("RGB")
        dst = E4 / "bandes" / f"{n}.png"
        if not dst.exists():
            band.save(dst)
        mask, anchor = T.contact(E4 / "coupe" / f"{n}.png")
        if not (E4 / "contact" / f"{n}.png").exists():
            mask.save(E4 / "contact" / f"{n}.png")
        sol_mask, sol_anchor = T.contact(pathlib.Path(a.solid_cut))
        report[n] = {"spill": round(spill[n], 4), "contact_iou_vs_solid": round(A.iou(mask, sol_mask), 3), "anchor": anchor,
                     "anchor_solid": sol_anchor, "footprint_problems": T.footprint([pathlib.Path(a.solid_cut), E4 / "coupe" / f"{n}.png"])}
        lot.append((n, band))
        items.append((n, im))
    if not (E4 / "planche.png").exists():
        label_board(items, E4 / "planche.png", cols=2)
    if not (E4 / "controle.json").exists():
        (E4 / "controle.json").write_text(json.dumps(report, indent=2))
    blind(E4, lot, 4)
    provenance(E4, {"chain": (E4 / "prompt_chain.txt").read_text(), "fresh": (E4 / "prompt_fresh.txt").read_text()}, ["explore E4"],
               "chain input: " + a.solid + "; the solid used in the bands: " + a.solid_cut)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("stage", choices=["e5", "e4"])
    ap.add_argument("cmd2", choices=["paint", "post"])
    ap.add_argument("arg", nargs="?")
    ap.add_argument("--solid")
    ap.add_argument("--solid-cut", dest="solid_cut")
    a = ap.parse_args()
    e5(a) if a.stage == "e5" else e4(a)
