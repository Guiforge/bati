#!/usr/bin/env python3
"""Concept boards for a building (step C). Specs live in scripts/bld/concepts/<building>.json.

    concepts.py klein <building> [--dirs 1,3] [--try N]                      # 4 Klein variants per stage and direction
    concepts.py f3 <building> --pick d1.rough=2 d1.grand=4 ... [--try N]     # chosen variant repainted on FLUX 3
    concepts.py board <building>                                             # concepts/board.png + board.phone.webp

Output: docs/designs/village-buildings/<building>/concepts/ (git-ignored except board.phone.webp). Never overwrites: a
repeated run needs a new --try. Every FLUX call is reserved and settled through iso_loop; run it under
`flock ~/.cache/bati-flux.lock python3 scripts/bld/concepts.py ...` and check `iso_loop.py budget` first.
"""
import argparse
import concurrent.futures
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "iso"))
sys.path.insert(0, str(ROOT / "scripts"))
from PIL import Image, ImageDraw, ImageFont

STAGES = ("rough", "grand", "mythic")
SIZE = (896, 1152)
BG = (236, 232, 220)
STYLE = [ROOT / f"assets/images/village/iso/{p}.webp" for p in ("castle_wall/solid.jour", "druid_grove/grand.jour")]
DESIGNS = ROOT / "docs/designs/village-buildings"

HEAD = ("A single image of one isometric game building, seen three-quarters from above at the village's isometric angle, one building "
        "alone on a plain light background, hand-painted with ink outlines, warm light from the upper left. ")
TAIL = (" Tone: dark medieval fantasy, worn wood, rough stone, mist, iron, never cute and never plastic. Matte surfaces, two or three "
        "values per surface. No letters, no runes, no diamond-shaped ground, no painted cast shadow, no shiny gold, at most two figures.")
STYLE_NOTE = "Images 1 and 2 are style references only, for ink line, light and brushwork: copy none of their shapes or objects. "
F3_NOTE = ("Image 1 is the concept of this building: repaint exactly this object, same silhouette, same parts, same framing, "
           "with a cleaner and more even ink line and brushwork. Images 2 and 3 are style references only: copy none of their shapes. ")


def prompt(spec_text, f3=False):
    return (F3_NOTE if f3 else STYLE_NOTE) + HEAD + spec_text + TAIL


def free(paths):
    """Refuse to overwrite: a repeated run must pass a new --try."""
    hit = [p.name for p in paths if p.exists()]
    if hit:
        sys.exit(f"exists, pass --try: {hit[0]} ...")
    return paths


def load(building):
    return json.loads((ROOT / "scripts/bld/concepts" / f"{building}.json").read_text())


def out_dir(building):
    d = DESIGNS / building / "concepts"
    d.mkdir(parents=True, exist_ok=True)
    return d


def refs(d):
    r = d / "refs"
    r.mkdir(exist_ok=True)
    out = []
    for p in STYLE:
        f = r / (p.parent.name + "_" + p.stem + ".png")
        if not f.exists():
            im = Image.open(p).convert("RGBA")
            bg = Image.new("RGBA", im.size, BG + (255,))
            bg.alpha_composite(im)
            bg.convert("RGB").save(f)
        out.append(f)
    return tuple(out)


def run(jobs, each, label, endpoint, probe, check, refs_of):
    """jobs: (out_path, prompt_text, seed). One reserve for the batch, settled in finally."""
    from iso_loop import guard_endpoint, reserve, settle
    from lib import flux
    if check:
        guard_endpoint(endpoint)
    batch = reserve(len(jobs), each, label, probe)
    responses, ok = [], {}

    def one(j):
        o, text, seed = j
        extra = None if endpoint.endswith("klein") else {"width": SIZE[0], "height": SIZE[1]}
        ok[o.name] = flux.generate(slug=label.replace(" ", "_"), prompt=text, out=o, width=SIZE[0], height=SIZE[1], attempts=1,
                                   references=refs_of(o), extra=extra, submitted_log=responses, endpoint=endpoint, seed=seed)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(one, jobs))
    finally:
        entry = settle(batch, responses)
    print(json.dumps({"made": sum(o.exists() for o, _, _ in jobs), "failed": [k for k, v in ok.items() if not v],
                      "cost": entry["cost"], "posts": entry["posts"]}))


def klein(building, dirs, attempt, stages=STAGES):
    from iso_loop import KLEIN, klein_price
    spec, d = load(building), out_dir(building)
    jobs = []
    for dr in spec["directions"]:
        if dirs and dr["id"] not in dirs:
            continue
        for si, st in enumerate(STAGES):
            if st not in stages:
                continue
            for v in range(1, 5):
                seed = 41000 + 1000 * dr["id"] + 100 * si + 10 * attempt + v
                jobs.append((d / f"klein_d{dr['id']}_{st}_t{attempt}_v{v}.png", prompt(dr["prompts"][st]), seed))
    free([j[0] for j in jobs])
    r = refs(d)
    run(jobs, klein_price(*SIZE), f"concepts {building} klein t{attempt}", KLEIN, "klein_prod_real", False, lambda o: r)
    for dr in spec["directions"]:
        for st in STAGES:
            sheet([d / f"klein_d{dr['id']}_{st}_t{attempt}_v{v}.png" for v in range(1, 5)], d / f"sheet_d{dr['id']}_{st}_t{attempt}.png")


def sheet(files, dst):
    """Variants side by side, numbered from 1, for the human eye."""
    files = [f for f in files if f.exists()]
    if not files or dst.exists():
        return
    w, h = SIZE[0] // 2, SIZE[1] // 2
    s = Image.new("RGB", (w * len(files), h), BG)
    for i, f in enumerate(files):
        s.paste(Image.open(f).convert("RGB").resize((w, h), Image.LANCZOS), (i * w, 0))
        ImageDraw.Draw(s).text((i * w + 8, 8), str(i + 1), fill=(0, 0, 0), font=ImageFont.load_default(28))
    s.save(dst)


def f3(building, picks, attempt):
    from iso_loop import FLUX3
    spec, d = load(building), out_dir(building)
    byid = {str(x["id"]): x for x in spec["directions"]}
    chosen, jobs, src = {}, [], {}
    for pk in picks:
        key, v = pk.split("=")
        di, st = key.lstrip("d").split(".")
        kfile = d / f"klein_d{di}_{st}_t{attempt}_v{v}.png"
        if not kfile.exists():
            sys.exit(f"no such variant {kfile.name} (is --try the one of the Klein run?)")
        chosen[key] = kfile.name
        out = d / f"f3_d{di}_{st}_t{attempt}.png"
        src[out] = kfile
        jobs.append((out, prompt(byid[di]["prompts"][st], f3=True), 52000 + 100 * int(di) + attempt))
    free([j[0] for j in jobs])
    r = refs(d)
    run(jobs, 0.10, f"concepts {building} f3 t{attempt}", FLUX3, None, True, lambda o: (src[o], *r))
    log = d / "picks.json"
    old = json.loads(log.read_text()) if log.exists() else {}
    old.setdefault(f"t{attempt}", {}).update(chosen)  # a rerun of one failed image keeps the others
    log.write_text(json.dumps(old, indent=2))


def fit(im, box):
    im = im.convert("RGBA")
    im.thumbnail(box, Image.LANCZOS)
    t = Image.new("RGB", box, BG)
    t.paste(im, ((box[0] - im.width) // 2, box[1] - im.height), im)
    return t


def board(building):
    spec, d = load(building), out_dir(building)
    big, small, lab, pad = (380, 490), (92, 118), 150, 6
    colw = big[0] + 2 * pad
    W = lab + 3 * colw
    today = ROOT / "assets/images/village/iso" / building
    font = ImageFont.load_default(22)
    canvas = Image.new("RGB", (W, 6000), BG)
    dr_ = ImageDraw.Draw(canvas)
    y = 0

    def row_end(top, label):
        nonlocal y
        dr_.multiline_text((8, top + 8), "\n".join(label.split()), fill=(20, 20, 20), font=font)
        dr_.line([(0, y), (W, y)], fill=(160, 155, 140))

    top = y
    for i, s in enumerate(STAGES[:2]):
        f = today / f"{s}.jour.webp"
        if f.exists():
            canvas.paste(fit(Image.open(f), big), (lab + i * colw + pad, y + pad))
    y += big[1] + 2 * pad
    row_end(top, "aujourd'hui")
    if spec.get("comparison_strip"):
        top = y
        s = Image.open(ROOT / spec["comparison_strip"]).convert("RGBA")
        s = s.resize((W - lab - 2 * pad, int(s.height * (W - lab - 2 * pad) / s.width)), Image.LANCZOS)
        t = Image.new("RGB", s.size, BG)
        t.paste(s, (0, 0), s)
        canvas.paste(t, (lab + pad, y + pad))
        y += s.height + 2 * pad
        row_end(top, "v2 bande")
    for dr in spec["directions"]:
        top = y
        for i, st in enumerate(STAGES):
            x = lab + i * colw + pad
            bigs = sorted(d.glob(f"f3_d{dr['id']}_{st}_t*.png"))
            if bigs:
                canvas.paste(fit(Image.open(bigs[-1]), big), (x, y + pad))
            for k, f in enumerate(sorted(d.glob(f"klein_d{dr['id']}_{st}_t*_v*.png"))[-4:]):
                canvas.paste(fit(Image.open(f), small), (x + k * (small[0] + 4), y + big[1] + 2 * pad))
        y += big[1] + small[1] + 3 * pad
        row_end(top, dr["name"])
    canvas = canvas.crop((0, 0, W, y))
    canvas.save(d / "board.png")
    phone = canvas.resize((1200, int(canvas.height * 1200 / W)), Image.LANCZOS)
    q = 85
    while True:
        phone.save(d / "board.phone.webp", quality=q)
        if (d / "board.phone.webp").stat().st_size <= 400_000 or q <= 30:
            break
        q -= 10
    print(canvas.size, (d / "board.phone.webp").stat().st_size)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["klein", "f3", "board"])
    ap.add_argument("building")
    ap.add_argument("--dirs", default="")
    ap.add_argument("--pick", nargs="*", default=[])
    ap.add_argument("--stages", default="rough,grand,mythic")
    ap.add_argument("--try", dest="attempt", type=int, default=1)
    a = ap.parse_args()
    if a.cmd == "klein":
        klein(a.building, {int(x) for x in a.dirs.split(",") if x}, a.attempt, a.stages.split(","))
    elif a.cmd == "f3":
        f3(a.building, a.pick, a.attempt)
    else:
        board(a.building)
