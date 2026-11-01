#!/usr/bin/env python3
"""Target screens of the surroundings track (loupes PROMPT.md 13.6): FLUX paintovers of baseline captures.

    python3 scripts/iso/loupe_targets.py paint p06-jour [--try N] [--n 4] [--note "..."]
    python3 scripts/iso/loupe_targets.py check p06-jour [--try N]

`paint` goes through iso_loop's budget registry. Bati references only, never a Thronebreaker image.
`check` overlays the baseline's building edges at 50 % on each variant and measures how far each
building moved (best offset of its crop, in 1080 px screen pixels). Over MAX_SHIFT = discard.
These images are references, never shipped: they stay in loupes/targets/ and out of provenance.json.
"""

import argparse
import concurrent.futures
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
from iso_loop import FLUX3, guard_endpoint, reserve, settle
from lib import flux
from PIL import Image, ImageChops, ImageFilter, ImageStat

ROOT = pathlib.Path(__file__).resolve().parents[2]
LOUPES = ROOT / "docs/designs/village-loop/loupes"
ISO = ROOT / "assets/images/village/iso"
STYLE = (ISO / "forge/solid.jour.webp", ISO / "windmill/solid.jour.webp")
SIZE = (720, 1600)
EACH = 0.10  # reservation per image, settled at the billed cost
MAX_SHIFT = 12
# The Android status and gesture bars are not part of the world: covered before FLUX sees the capture.
BARS = (96, 60)

COMMON = """Paint over image 1, a screenshot of an isometric village game, keeping its exact camera and framing.
ABSOLUTE RULE: every building, wall, fence, villager and the river stay exactly where they are, same size, same shape, same silhouette. Do not move, add or remove any building. Do not change the camera. The walled village stays the same.
Change only the land around the village, so that it looks like a hand-painted fantasy world map: rich, inked, painted with visible brush strokes, warm late-afternoon light from the top left. The style is given by images 2 and 3: Franco-Belgian comic ink, matte, two or three values per surface.
What to paint around the village:
- Forests as overlapping clusters of mixed species (birch, oak, pine) in three sizes, smaller at the edge, every trunk rooted in undergrowth, roots and tufts, never sitting on a visible shape. Forest edges frame the view, placed in the world on the ground. No big tree in the foreground corners of the screen unless it stands on the same ground as everything else.
- Everything touches the ground: dirt rings, tufts, pebbles at the foot of every object. Nothing floats.
- Surroundings one or two value steps darker and less saturated than the village core; the village stays the brightest and most contrasted area. Open ground keeps calm rest areas, detail falls off away from paths and walls.
- Shadows fall to the bottom right, cool slate blue (#2E3552), never black.
No text, no letters, no runes, no glossy surfaces, no noise texture, no perfect symmetry, no parallax, no vignette frame.
"""
STATES = {
    "p01-jour": "This is a young village at its beginning: around it a clearing in a deep forest. The road is a dirt track with ruts, puddles and grass down its middle, reaching the village gate and leaving through the forest. One small wheat field with stooks and a scarecrow, fitted to the land with soft edges, not a rectangle.",
    "p06-jour": "This village is at mid growth: hamlets of two or three small cottages stand along the road outside the walls. The road is packed gravel with edge stones, its edges broken by tufts, reaching the village gate. Fields are hand-painted vignettes tied to the road or river with soft blended edges, not rectangles: wheat with stooks and a scarecrow, vegetable rows with a fence and a well, an orchard with a cart, a pasture with a sheep pen and hay.",
    "p12-jour": "This village is at its final level: along the road outside the walls a dense faubourg of cottages and workshops, cobbled road fading into dirt at its edges, rich patchwork of painted fields tied to the road and river, and at the very top of the world, far away and hazy, the silhouette of a distant city with towers on the horizon. It must feel like a final level: proud, abundant.",
}


def flat(path: pathlib.Path, ground=(106, 116, 66)) -> pathlib.Path:
    """A style sprite flattened on the meadow tone as PNG; FLUX gets no alpha."""
    out = flux.ORIGINALS.parent / "loupes-refs" / (path.parent.name + "_" + path.stem + ".png")
    out.parent.mkdir(parents=True, exist_ok=True)
    if not out.exists():
        im = Image.open(path).convert("RGBA")
        bg = Image.new("RGBA", im.size, ground + (255,))
        bg.alpha_composite(im)
        bg.convert("RGB").save(out)
    return out


def source(state: str) -> pathlib.Path:
    """The baseline capture without the system bars, at the generated size."""
    out = flux.ORIGINALS.parent / "loupes-refs" / f"{state}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    im = Image.open(LOUPES / "baseline" / f"{state}.png").convert("RGB")
    w, h = im.size
    top, bottom = BARS
    im.paste(im.crop((0, top, w, 2 * top)).transpose(Image.FLIP_TOP_BOTTOM), (0, 0))
    im.paste(im.crop((0, h - 2 * bottom, w, h - bottom)).transpose(Image.FLIP_TOP_BOTTOM), (0, h - bottom))
    im.resize(SIZE, Image.LANCZOS).save(out)
    return out


def folder(state: str, attempt: int) -> pathlib.Path:
    return LOUPES / "targets" / state / f"try{attempt}"


def paint(state: str, attempt: int, n: int, note: str) -> None:
    guard_endpoint(FLUX3)
    d = folder(state, attempt)
    d.mkdir(parents=True, exist_ok=True)
    # Generated outside the repo: flux.generate files anything under ROOT in provenance.json (what ships).
    cache = flux.ORIGINALS.parent / "loupes-targets" / state / f"try{attempt}"
    cache.mkdir(parents=True, exist_ok=True)
    outs = [cache / f"v{i}.png" for i in range(n)]
    if any(o.exists() for o in outs) or any(d.glob("v?.png")):
        sys.exit(f"{d} already holds variants: never re-rolled in place, pass --try")
    prompt = COMMON + STATES[state] + ("\n" + note if note else "")
    refs = (source(state), *[flat(p) for p in STYLE])
    batch = reserve(n, EACH, f"loupes target {state} try{attempt}", None)
    responses: list = []

    def one(i_out):
        i, out = i_out
        flux.generate(slug=f"loupes_target_{state}", prompt=prompt, out=out, width=SIZE[0], height=SIZE[1], attempts=1,
                      references=refs, extra={"width": SIZE[0], "height": SIZE[1]}, submitted_log=responses, endpoint=FLUX3)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=n) as pool:
            list(pool.map(one, enumerate(outs)))
    finally:
        entry = settle(batch, responses)
    for o in outs:
        if o.exists():
            Image.open(o).convert("RGB").save(d / o.name)
    (d / "prompt.txt").write_text(prompt, encoding="utf-8")
    print(json.dumps({"made": [o.name for o in outs if o.exists()], "cost": entry["cost"]}))


def best_offset(a: Image.Image, b: Image.Image, box, reach: int) -> tuple[int, int]:
    """Offset of box's crop of `a` that matches `b` best (mean absolute difference on edges)."""
    x0, y0, x1, y1 = box
    tpl = a.crop(box)
    best, at = None, (0, 0)
    for dy in range(-reach, reach + 1, 2):
        for dx in range(-reach, reach + 1, 2):
            cand = b.crop((x0 + dx, y0 + dy, x1 + dx, y1 + dy))
            score = ImageStat.Stat(ImageChops.difference(tpl, cand)).mean[0]
            if best is None or score < best:
                best, at = score, (dx, dy)
    return at


def check(state: str, attempt: int) -> None:
    dump = json.loads((LOUPES / "baseline" / f"{state}.json").read_text(encoding="utf-8"))
    scale = SIZE[0] / dump["camera"]["screenW"]
    base = Image.open(source(state)).convert("L")
    edges = base.filter(ImageFilter.FIND_EDGES)
    boxes = []
    for s in dump["sprites"]:
        if s.get("layer") != "building":
            continue
        x0, y0 = int(s["x"] * scale), int(s["y"] * scale)
        x1, y1 = int((s["x"] + s["w"]) * scale), int((s["y"] + s["h"]) * scale)
        if x0 > 40 and y0 > 40 and x1 < SIZE[0] - 40 and y1 < SIZE[1] - 40 and x1 - x0 > 20:
            boxes.append((s["id"], (x0, y0, x1, y1)))
    report = {}
    for f in sorted(folder(state, attempt).glob("v?.png")):
        v = Image.open(f).convert("RGB")
        if v.size != SIZE:
            v = v.resize(SIZE, Image.LANCZOS)
        b = v.convert("L").filter(ImageFilter.FIND_EDGES)
        shifts = {i: best_offset(edges, b, box, 24) for i, box in boxes}
        mags = {i: round(max(abs(dx), abs(dy)) / scale) for i, (dx, dy) in shifts.items()}
        worst = max(mags.values(), default=0)
        red = Image.merge("RGB", (edges.point(lambda p: 255 if p > 40 else 0), Image.new("L", SIZE), Image.new("L", SIZE)))
        Image.blend(v, red, 0.5).save(f.with_name(f.stem + ".overlay.png"))
        report[f.name] = {"worst_px_at_1080": worst, "keep": worst <= MAX_SHIFT, "moved": {i: m for i, m in mags.items() if m > MAX_SHIFT}}
    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=("paint", "check"))
    ap.add_argument("state", choices=tuple(STATES))
    ap.add_argument("--try", dest="attempt", type=int, default=1)
    ap.add_argument("--n", type=int, default=4)
    ap.add_argument("--note", default="")
    args = ap.parse_args()
    if args.cmd == "paint":
        paint(args.state, args.attempt, args.n, args.note)
    else:
        check(args.state, args.attempt)
