#!/usr/bin/env python3
"""E3, model test: the windmill's solid stage repainted from its maquette by each FLUX model.

    python3 scripts/bld/explore_e3.py paint {klein|f3|flux2} [--try N]   # 2 images, one model, one registry batch
    python3 scripts/bld/explore_e3.py cut                                # key every raw image, board, blind judge lot
    python3 scripts/bld/explore_e3.py rebuild                            # provenance.json from what exists

Every call goes through iso_loop's registry (reserve, settle). Only the maquette and the three style references leave the
machine. Images go to the ignored explore/E3/ folder of the iso worktree and are never overwritten. Dev only.
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
import iso_audit as A
from iso_loop import FLUX3, KLEIN, guard_endpoint, klein_price, reserve, settle
from lib import flux
from PIL import Image, ImageChops, ImageDraw

ISO_WT = pathlib.Path("/home/guiforge/Documents/code/bati/.claude/worktrees/iso")
OUT = ISO_WT / "docs/designs/village-buildings/explore/E3"
MAQUETTE = ISO_WT / "docs/designs/village-buildings/maquettes/r3/windmill_solid.png"
STYLE = [ISO_WT / f"assets/images/village/iso/{p}.webp" for p in ("castle_wall/solid.jour", "druid_grove/grand.jour", "high_road/solid.jour")]
TODAY = ISO_WT / "assets/images/village/iso/windmill/solid.jour.webp"
SIZE = (896, 1344)  # the maquette's size
MAGENTA = (255, 0, 255)
FLUX2 = flux.ENDPOINT  # flux-2-pro-preview

PROMPT = (
    "Image 1 is a flat-shaded maquette that fixes the exact shape of one building: a round stone windmill tower under a cone roof, "
    "a flagpole with a small red pennant on the roof tip, a door with a round red mat at its foot, a small lit window on the right "
    "side, barrels and sacks around the base, and a long timber sail arm rising to the right. Paint exactly this object as a finished "
    "daytime illustration: the same silhouette, the same camera angle, the same framing, every part in the same place and at the same "
    "size as in image 1. The dark colours of image 1 only hint at the materials; repaint them in daylight: blue-grey roof tiles, warm "
    "grey stone laid in courses, brown timber, matte ochre sacks. "
    "Images 2, 3 and 4 are style references only, for ink line, upper-left light and painted brushwork: copy none of their shapes, "
    "objects, ground diamond or cast shadows, and paint shaded sides in cool slate #2E3552, not their olive-green; shape comes only "
    "from image 1, the maquette. "
    "It is a daytime scene, with the light coming from the upper left: the faces turned to the left are lit, the faces turned to the "
    "right are in cool slate shade. Bold hand-inked outlines in near-black #0F1518 of even weight, matte painted brushwork, two or "
    "three values per surface, small stones and grass tufts at the base. No painted cast shadow on the ground, no gloss, no shine, "
    "no glow, no text, no letters, no numbers, no runes. "
    "The whole image has a flat, pure magenta (#FF00FF) background that fills it from edge to edge, all four corners included. The "
    "building stands on a small irregular patch of grass and bare earth with no straight edge and no diamond shape: the patch "
    "dissolves softly into the magenta all around it. The diamond slab of image 1 is only a footprint guide and is not painted."
)
MODELS = {
    "klein": dict(endpoint=KLEIN, name="FLUX 3 Image Klein", each=max(0.02, klein_price(*SIZE)), probe="klein_prod_real"),
    "f3": dict(endpoint=FLUX3, name="FLUX 3 Image", each=0.10, probe=None),
    "flux2": dict(endpoint=FLUX2, name="FLUX.2 pro", each=0.20, probe=None),
}


def refs():
    d = OUT / "refs"
    d.mkdir(parents=True, exist_ok=True)
    out = [MAQUETTE]
    for p in STYLE:
        f = d / (p.parent.name + "_" + p.stem + ".png")
        if not f.exists():
            im = Image.open(p).convert("RGBA")
            bg = Image.new("RGBA", im.size, MAGENTA + (255,))
            bg.alpha_composite(im)
            bg.convert("RGB").save(f)
        out.append(f)
    return tuple(out)


def paint(model, attempt):
    m = MODELS[model]
    if model != "klein":
        guard_endpoint(m["endpoint"])
    d = OUT / "brut"
    d.mkdir(parents=True, exist_ok=True)
    outs = [d / f"{model}_try{attempt}_v{i}.png" for i in range(2)]
    if any(o.exists() for o in outs):
        sys.exit("exists: pass --try")
    batch = reserve(2, m["each"], f"explore E3 {model} try{attempt}", m["probe"])
    if model == "klein":
        batch["expected"] = klein_price(*SIZE)
    responses: list = []
    ok: dict = {}

    def one(io):
        i, o = io
        extra = None if model == "klein" else {"width": SIZE[0], "height": SIZE[1]}
        if model == "flux2":
            extra["disable_pup"] = True
        ok[o.name] = flux.generate(slug=f"explore_e3_{model}", prompt=PROMPT, out=o, width=SIZE[0], height=SIZE[1], attempts=1,
                                   references=refs(), extra=extra, submitted_log=responses, endpoint=m["endpoint"],
                                   seed=31000 + 100 * attempt + i)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(one, enumerate(outs)))
    finally:
        entry = settle(batch, responses)
    print(json.dumps({"made": [o.name for o in outs if o.exists()], "failed": [k for k, v in ok.items() if not v],
                      "cost": entry["cost"], "posts": entry["posts"]}))


def cut():
    (OUT / "coupe2").mkdir(exist_ok=True)
    for raw in sorted((OUT / "brut").glob("*.png")):
        dst = OUT / "coupe2" / raw.name
        if dst.exists():
            continue
        side = json.loads(raw.with_suffix(".json").read_text())
        bg = A.measure_background(flux.ORIGINALS / side["signed_original"]["file"])
        rgb = Image.open(raw).convert("RGB").resize(SIZE, Image.LANCZOS)
        # two passes: the painted backdrop, then pure magenta (FLUX 3 kept the maquette's grey outside and left magenta in the gaps)
        k = A.key(rgb, bg)
        k2 = A.key(k.convert("RGB"), "#FF00FF")
        k.putalpha(ImageChops.multiply(k.getchannel("A"), k2.getchannel("A")))
        k = Image.merge("RGBA", (*k2.convert("RGB").split(), k.getchannel("A")))
        k.save(dst)
        print(raw.name, "background", bg)
    items = [(p.stem, Image.open(p)) for p in sorted((OUT / "coupe2").glob("*.png"))]
    items.append(("today", Image.open(TODAY).convert("RGBA")))
    items.append(("maquette", Image.open(MAQUETTE).convert("RGBA")))
    # control board: checker ground, cut sprites at half scale, labelled
    w, h = SIZE[0] // 2, SIZE[1] // 2
    cols = min(4, len(items))
    rows = -(-len(items) // cols)
    board = Image.new("RGB", (cols * w, rows * (h + 24)), (60, 60, 60))
    dr = ImageDraw.Draw(board)
    for k, (name, im) in enumerate(items):
        x, y = (k % cols) * w, (k // cols) * (h + 24)
        tile = Image.new("RGBA", (w, h), (120, 150, 110, 255))
        tile.alpha_composite(im.convert("RGBA").resize((w, h), Image.LANCZOS))
        board.paste(tile.convert("RGB"), (x, y + 24))
        dr.text((x + 6, y + 6), name, fill=(255, 255, 255))
    if not (OUT / "planche2.png").exists():
        board.save(OUT / "planche2.png")
    # blind lot for the judge: letters only, shuffled; the key stays outside the folder
    lot = OUT / "juge2"
    if not lot.exists():
        lot.mkdir()
        cut_items = [(n, im) for n, im in items if n != "maquette"]
        random.Random(31).shuffle(cut_items)
        key_map = {}
        for letter, (name, im) in zip("ABCDEFGHIJKLMNOP", cut_items):
            im.convert("RGBA").resize(SIZE, Image.LANCZOS).save(lot / f"{letter}.png")
            key_map[letter] = name
        (OUT / "juge_cle2.json").write_text(json.dumps(key_map, indent=2))


def rebuild():
    batches = json.loads((pathlib.Path.home() / ".cache/bati-art-loop/iso/budget.json").read_text())["v1"]["batches"]
    mine = [b for b in batches if b["label"].startswith("explore E3")]
    images = {}
    for raw in sorted((OUT / "brut").glob("*.json")):
        s = json.loads(raw.read_text())
        images[raw.stem] = {"model": s["model"], "seed": s["seed"], "references": s.get("references"), "signed_original": s["signed_original"]}
    prov = {"date": time.strftime("%Y-%m-%d"), "building": "windmill", "stage": "solid", "prompt": PROMPT,
            "models": {k: {"name": v["name"], "endpoint": v["endpoint"]} for k, v in MODELS.items()},
            "batches": mine, "cost_total": round(sum(b["cost"] for b in mine), 4), "images": images}
    if (OUT / "provenance.json").exists():
        sys.exit("provenance.json exists")
    (OUT / "provenance.json").write_text(json.dumps(prov, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["paint", "cut", "rebuild"])
    ap.add_argument("model", nargs="?", choices=list(MODELS))
    ap.add_argument("--try", dest="attempt", type=int, default=1)
    a = ap.parse_args()
    paint(a.model, a.attempt) if a.cmd == "paint" else cut() if a.cmd == "cut" else rebuild()
