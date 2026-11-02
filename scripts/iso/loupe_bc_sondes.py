#!/usr/bin/env python3
"""Loupe BC round 1: four asset-family probes (decals, arbres, route, champ). Probes only, nothing wired.

    python3 scripts/iso/loupe_bc_sondes.py grey                 # greyboxes (structure reference)
    python3 scripts/iso/loupe_bc_sondes.py gen <family> [--n 3] # FLUX 3 through iso_loop's registry
    python3 scripts/iso/loupe_bc_sondes.py planche <family>     # planche.webp: variants at 2x next to the 3 refs

References per call: forge solid, windmill solid, hall grand (day), all flattened on the ground tone, then the
greybox. Never a Thronebreaker image. Generated in the cache first, copied after (provenance.json stays clean).
"""
import argparse
import concurrent.futures
import importlib.util
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(HERE.parent))
import iso_loop as I
from lib import flux
from PIL import Image, ImageDraw

ROOT = HERE.parents[1]
ISO = ROOT / "assets/images/village/iso"
OUT = ROOT / "docs/designs/village-loop/loupes/bc/r1/sondes"
CACHE = flux.ORIGINALS.parent / "loupes-bc-r1"
GROUND = (106, 116, 66)  # isoPreSec #6A7442
MAGENTA = (255, 0, 255)
W, H = 1344, 896
REFS = (ISO / "forge/solid.jour.webp", ISO / "windmill/solid.jour.webp",
        ROOT / "docs/designs/village-loop/evidence/style-refs/ancre_heroes_hall_grand_jour.webp")

LOOK = ("Franco-Belgian comic game art, three-quarter isometric view from above, the same angle as image 1, 2 and 3 "
        "(2:1 dimetric). Images 1, 2 and 3 give the mood, the ink and the brushwork only: do not copy their buildings. "
        "Image 4 is a grey structure guide for placement and angle only: do not copy its flat grey, paint it. "
        "Painted with visible brush strokes, two or three values per surface, matte, no gloss, no noise texture. "
        "Warm light from the upper left: lit sides warm (#DEC28B, #C8965E), shaded sides cool slate (#2E3552), never brown. "
        "Palette: earth #6E5941, dark earth #554232, foliage #4C7A3E, moss #435A36, dry meadow #6A7442. "
        "No cast shadow painted on the ground. No text, no letters, no runes, no symmetry. ")
FLAT = "on a flat uniform meadow-green (#6A7442) backdrop from edge to edge, nothing else around."
MAG = "on a flat uniform pure magenta (#FF00FF) backdrop from edge to edge, all four corners, nothing under it."
FAM = {
    "decals": ("Soft ground decals for baking into a painted ground: a sheet of separate small patches spread evenly with wide gaps: "
               "two dirt patches with trampled edges, three grass tufts, a handful of small pebbles, a pair of cart ruts in dry earth, "
               "one small muddy puddle. No ink outline at all, soft painted edges blending into the backdrop colour. " + FLAT),
    "arbres": ("One cluster of five trees growing together: a white birch, an oak and a pine, in three sizes, the pine and birch smaller. "
               "Every trunk rises out of a painted base: exposed roots, grass tufts, a ring of dark earth and small stones, so the trees "
               "read as growing out of the ground, not stuck on it. Bold clean black ink outline (#0F1518) about nine pixels wide around the "
               "whole cluster, thinner inner lines. The cluster alone, centred, " + MAG),
    "route": ("One segment of road, packed gravel, four tiles long, crossing the image along the iso axis from lower left to upper right, "
              "with edge stones, two cart ruts, broken ragged edges with grass and dirt spilling into the road, a few loose pebbles. "
              "Sandy ochre gravel (#C8965E, #DEC28B) with darker earth in the ruts. No ink outline at all, soft painted edges blending "
              "into the ground. Nothing else, no building, no fence. " + FLAT),
    "champ": ("One small farm field vignette: a ripe wheat field in golden furrows with irregular blended edges that dissolve into the meadow, "
              "no straight edge longer than two tiles, three hay stooks, a scarecrow with a straw hat on a wooden cross, a few wheat tufts "
              "and stones around, a faint foot path leaving one corner. No fence drawn as a perfect rectangle. Thin ink lines on the stooks and "
              "the scarecrow only; the field itself has no outline. " + FLAT),
}


def diamond(d, i, j, t=150, ox=672, oy=250, fill=(150, 150, 150)):
    x, y = ox + (i - j) * t, oy + (i + j) * t // 2
    d.polygon([(x, y), (x + t, y + t // 2), (x, y + t), (x - t, y + t // 2)], fill=fill)


def box(d, cx, cy, w, h, fill, top=(190, 190, 190)):
    d.rectangle((cx - w // 2, cy - h, cx + w // 2, cy), fill=fill)
    d.polygon([(cx - w // 2, cy - h), (cx, cy - h - w // 4), (cx + w // 2, cy - h), (cx, cy - h + w // 4)], fill=top)


def grey():
    d0 = CACHE / "grey"
    d0.mkdir(parents=True, exist_ok=True)
    g = (128, 128, 128)
    im = Image.new("RGB", (W, H), GROUND)
    d = ImageDraw.Draw(im)  # decals: blobs to fill
    for x, y, r in ((300, 250, 90), (700, 200, 70), (1050, 280, 80), (450, 600, 100), (950, 650, 90)):
        d.ellipse((x - r, y - r // 2, x + r, y + r // 2), fill=g)
    im.save(d0 / "decals.png")
    im = Image.new("RGB", (W, H), MAGENTA)
    d = ImageDraw.Draw(im)  # trees: trunks + crowns, three sizes
    for cx, base, tw, ch, cw in ((450, 640, 50, 330, 330), (760, 700, 60, 400, 400), (1010, 620, 36, 300, 230),
                                 (600, 560, 30, 240, 200), (880, 560, 28, 220, 170)):
        d.rectangle((cx - tw // 2, base - 130, cx + tw // 2, base), fill=g)
        d.ellipse((cx - cw // 2, base - 130 - ch, cx + cw // 2, base - 80), fill=(165, 165, 165))
    im.save(d0 / "arbres.png")
    im = Image.new("RGB", (W, H), GROUND)
    d = ImageDraw.Draw(im)  # road: a 4-tile strip, one tile wide
    for j in range(4):
        diamond(d, 0, j, t=130, ox=950, oy=250)
    im.save(d0 / "route.png")
    im = Image.new("RGB", (W, H), GROUND)
    d = ImageDraw.Draw(im)  # field slot: 4x3 tiles, stooks, scarecrow
    for i in range(4):
        for j in range(3):
            diamond(d, i + 1, j + 1, t=120, ox=520, oy=260)
    for cx, cy in ((560, 560), (700, 480), (840, 560)):
        box(d, cx, cy, 70, 60, (110, 110, 110))
    box(d, 680, 640, 22, 150, (100, 100, 100))
    im.save(d0 / "champ.png")


def flat(p):
    out = CACHE / "refs" / (p.parent.name + "_" + p.stem + ".png")
    out.parent.mkdir(parents=True, exist_ok=True)
    if not out.exists():
        a = Image.open(p).convert("RGBA")
        bg = Image.new("RGBA", a.size, GROUND + (255,))
        bg.alpha_composite(a)
        bg.convert("RGB").save(out)
    return out


def gen(fam, n):
    I.guard_endpoint(I.FLUX3)
    d = OUT / fam
    d.mkdir(parents=True, exist_ok=True)
    cache = CACHE / fam
    cache.mkdir(parents=True, exist_ok=True)
    outs = [cache / f"v{i}.png" for i in range(n)]
    if any(o.exists() for o in outs) or any(d.glob("v?.png")):
        sys.exit(f"{d} already holds variants: never re-rolled in place")
    grey()
    prompt = LOOK + FAM[fam]
    refs = (*[flat(p) for p in REFS], CACHE / "grey" / f"{fam}.png")
    batch = I.reserve(n, 0.10, f"loupe bc r1 sondes {fam}", None)
    resp = []

    def one(o):
        flux.generate(slug=f"loupe_bc_{fam}", prompt=prompt, out=o, width=W, height=H, attempts=1, references=refs,
                      extra={"width": W, "height": H}, submitted_log=resp, endpoint=I.FLUX3)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=n) as pool:
            list(pool.map(one, outs))
    finally:
        entry = I.settle(batch, resp)
    for o in outs:
        if o.exists():
            Image.open(o).convert("RGB").save(d / o.name)
    (d / "prompt.txt").write_text(prompt, encoding="utf-8")
    Image.open(CACHE / "grey" / f"{fam}.png").save(d / "greybox.png")
    print(json.dumps({"family": fam, "made": [o.name for o in outs if o.exists()], "cost": entry["cost"]}))


def key(fam):
    """arbres only: magenta key, soft alpha, fringe cleaned, by the stage-0 cutter."""
    spec = importlib.util.spec_from_file_location(
        "planches", ROOT / "docs/designs/village-surroundings/stage-0/loop-2/planches.py")
    pl = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(pl)
    for f in sorted((OUT / fam).glob("v?.png")):
        cut, _ = pl.detoure(Image.open(f))
        cut.save(f.with_name(f.stem + ".cut.webp"), quality=92)


def planche(fam):
    d = OUT / fam
    if fam == "arbres":
        key(fam)
    vs = [Image.open(f).convert("RGBA") for f in sorted(d.glob("v?.cut.webp" if fam == "arbres" else "v?.png"))]
    refs = [Image.open(p).convert("RGBA") for p in REFS]
    cell, rh = 672, 300  # variants at 672 px wide: 2x of the 336 px they take on the phone
    refs = [r.resize((round(r.width * rh / r.height), rh), Image.LANCZOS) for r in refs]
    vs = [v.resize((cell, round(cell * v.height / v.width)), Image.LANCZOS) for v in vs]
    wd = max(sum(r.width for r in refs) + 40, len(vs) * (cell + 10) + 10)
    sheet = Image.new("RGBA", (wd, rh + 40 + max(v.height for v in vs) + 20), GROUND + (255,))
    x = 10
    for r in refs:
        sheet.alpha_composite(r, (x, 10))
        x += r.width + 10
    x = 10
    for v in vs:
        sheet.alpha_composite(v, (x, rh + 30))
        x += cell + 10
    sheet.convert("RGB").save(d / "planche.webp", quality=90)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=("grey", "gen", "planche"))
    ap.add_argument("fam", nargs="?", choices=tuple(FAM))
    ap.add_argument("--n", type=int, default=3)
    a = ap.parse_args()
    {"grey": grey, "gen": lambda: gen(a.fam, a.n), "planche": lambda: planche(a.fam)}[a.cmd]()
