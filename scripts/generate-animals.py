#!/usr/bin/env python3
"""Draw the crest animals' portraits (V-02), one audited attempt at a time. Same loop as art-loop.py.

    python3 scripts/generate-animals.py candidates bear-young 1   # 4 candidates, 4 paid submissions
    python3 scripts/generate-animals.py sheet bear-young 1        # one contact sheet of the 4, free
    python3 scripts/generate-animals.py accept bear-young 1 2     # ship candidate 2, file its provenance
    python3 scripts/generate-animals.py --dry-run candidates bear-young 1   # prompts and seeds, no network

Slugs are `<animal>-<stage>` with the app's own codes (db/crestRules.ts): animal in bear, stag,
horse, salmon, ermine, boar; stage in young, adult, venerable. The French names (ours, cerf,
cheval, saumon, hermine, sanglier / jeune, adulte, venerable) are accepted and mapped, and the
canonical slug is what seeds and files are keyed on.

Not `run()` from lib/flux.py: its seed is fixed per slug, so it would redraw the same image. This
calls `generate()` with `seed_for(slug) + 1000 * attempt + i`, like art-loop. No image is ever
passed as a reference (see `generate()`'s docstring: provenance stays one level deep).

Candidates live outside the repo in ~/.cache/bati-art-loop/animals/<slug>/ (ART_LOOP_DIR moves it).
Only `accept` writes into the repo and into provenance.json. The signed originals stay in
flux.ORIGINALS.

Size: 1024x1024 (1 megapixel, the cheapest billing step). The portrait ships at 512 px, so 1024
leaves 2x headroom for the cutout flood fill, which wants full resolution (cutout.py runs before
fit-small-art.py). Square, whole animal, margin on all four sides: the slot is a square crest
portrait and a cutout needs the margin to find its corners.

Money. Every submission is counted in couts.csv BEFORE it is sent, and refused once the total plus
the next submission would pass BUDGET_EUR. Counting hooks `flux._json` (the one function that POSTs
to the endpoint) rather than editing flux.py. flux._json retries 5xx and network errors inside
itself, and a 502 sent after the task was created is billed, so for a POST the hook runs that retry
loop itself, one attempt at a time, and reserves before each. A 429 is the exception: the endpoint
refuses it for concurrency before creating a task, so its retry reuses the line already written.
A bad value in couts.csv (nan, inf, negative, not a number) stops the script.
--dry-run applies to every subcommand and writes nothing. ART_LOOP_DIR must be outside the repo,
or generate() would file each candidate into provenance.json.

Afterwards, in this order:

    python3 scripts/to-webp.py
    python3 scripts/cutout.py --family animals
    python3 scripts/fit-small-art.py
"""

import argparse
import concurrent.futures
import csv
import json
import math
import os
import pathlib
import random
import shutil
import subprocess
import sys
import threading
import time
import urllib.error

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import lib.flux as flux  # noqa: E402
from lib.flux import ROOT, generate, record, seed_for  # noqa: E402

WORK = pathlib.Path(os.environ.get("ART_LOOP_DIR", pathlib.Path.home() / ".cache" / "bati-art-loop"))
OUT = WORK / "animals"
COSTS = WORK / "couts.csv"
CANDIDATES = 4
SIZE = 1024

# bfl.ai/pricing (2026-10-11): FLUX.2 [pro] "from $0.03 per megapixel", first megapixel; the page's
# own calculator shows $0.048 per image. A 1024x1024 is 1 MP. Rounded up to the calculator figure
# and read as euros, so the estimate errs high. Edit this constant when the tariff moves.
COST_PER_IMAGE_EUR = 0.05
BUDGET_EUR = 25.0  # of 30 for the whole chantier; the last 5 are the margin.

ANIMALS = ("bear", "stag", "horse", "salmon", "ermine", "boar")
STAGES = ("young", "adult", "venerable")
FRENCH = {
    "ours": "bear", "cerf": "stag", "cheval": "horse", "saumon": "salmon",
    "hermine": "ermine", "sanglier": "boar",
    "jeune": "young", "adulte": "adult", "venerable": "venerable",
}

# First sentence, and a description rather than a prohibition (docs/content/image-style-prompt.md).
BACKGROUND = (
    "The background is one unbroken flat field of very dark navy-black, as dark as a night sky, "
    "the same value from edge to edge, with no gradient, no vignette and no texture."
)

STYLE = (
    "Rendered as a dark-fantasy Franco-Belgian graphic-novel illustration: thick, confident black "
    "ink outlines and flat cel-shaded colour fills with hard-edged shadows and no soft "
    "airbrushing. A single animal, alone in the picture, shown whole from nose to tail in a calm "
    "three-quarter side view, with a clear margin of empty background on all four sides. A thin "
    "cool rim light traces the outer edge of the silhouette all the way round, lighting the "
    "contour only, and separates it cleanly from the background. The animal wears nothing: no "
    "harness, no saddle, no collar, no armour, no jewellery. The eyes are plain animal eyes, "
    "nothing glows. There are no runes and no magical energy, and no light is cast off the "
    "animal into the air around it. Square composition, high contrast, clean and "
    "graphic, an illustration with no lettering, no signature and no watermark; all four corners "
    "of the picture are empty background."
)

# One identity sentence per animal, copied word for word into its three stage prompts: the same
# animal has to read as the same animal at 3 ages. Coat, marks, silhouette; nothing about age.
IDENTITY = {
    "bear": (
        "A brown bear with a deep chestnut coat, a paler tan muzzle, a heavy rounded shoulder hump, "
        "small round ears, broad flat paws with pale claws and a short stubby tail."
    ),
    "stag": (
        "A red deer stag with a russet coat, a cream rump patch, a thick darker mane at the neck, "
        "a long narrow face, large upright ears and branching antlers of pale bone."
    ),
    "horse": (
        "A bay horse with a glossy mahogany coat, a black mane, black tail and black lower legs, "
        "a single white blaze down the face and a long arched neck."
    ),
    "salmon": (
        "An Atlantic salmon with a steel-blue back, a silver flank scattered with small dark "
        "cross-shaped spots, a white belly, a forked tail and a pointed head with a wide jaw."
    ),
    "ermine": (
        "An ermine in white winter coat with a long slim body, short legs, a small pointed face, "
        "round pale-pink ears and a tail tipped in solid black."
    ),
    "boar": (
        "A wild boar with a coarse bristled dark-grey coat, a high ridge of long bristles down the "
        "spine, a wedge-shaped head, a flat snout and two short curved ivory tusks."
    ),
}

# Per animal, because age shows differently on each: a salmon has no leg, a white ermine no grey
# to frost. Each sentence adds age and leaves the identity sentence's coat, marks and parts alone.
STAGE = {
    "bear": {
        "young": "It is a yearling bear facing right in the same calm three-quarter view, the same deep chestnut coat, tawny muzzle and pale claws as a grown bear, but rangy and narrow: long legs and oversized paws for its thin body, only a low hint of a shoulder hump, a short muzzle, small ears, small dark matte eyes with no catchlight, a closed mouth with no smile, a uniform coat with no chest patch, no shadow on the ground, and the rim light along its edge faint and cool, never a pale halo or border.",
        "adult": "It is a bear in its prime: huge and powerful, with a thick neck, heavy shoulder muscle and a full glossy coat.",
        "venerable": "It is a very old bear: massive and heavy-bellied, with grey-tipped fur along the muzzle and shoulders, a shaggy worn coat, blunted claws and a notched ear.",
    },
    "stag": {
        "young": "It is a young stag: slim and lightly built, with its first small antlers, short with only two or three tines each.",
        "adult": "It is a stag in its prime: broad-chested and muscular, with full antlers of many tines and a proud raised head.",
        "venerable": "It is a very old stag: heavy-necked and deep-chested, with massive wide antlers thick with tines and a grizzled grey muzzle.",
    },
    "horse": {
        "young": "It is a young horse: slender and long-legged with a small light body, a fine short mane and a bright curious look; bare-backed, nothing on its back or head.",
        "adult": "It is a horse in its prime: fully grown, deep-chested and muscular, the coat gleaming and the head carried high; bare-backed, nothing on its back or head.",
        "venerable": "It is a very old horse: a slightly hollowed back, prominent hip bones, a grey muzzle and heavy calm eyelids, standing slow and dignified; bare-backed, nothing on its back or head.",
    },
    "salmon": {
        "young": "It is a young salmon: small and slim, the scales bright and fresh, the dark spots few and crisp and the fins small and neat.",
        "adult": "It is a salmon in its prime: thick-bodied and muscular, every scale gleaming with a bright metallic sheen and the fins strong and clean.",
        "venerable": "It is a very old male salmon: the largest and heaviest of its kind, with the lower jaw curving up into a hooked kype, the silver turned dull and coppery, and old pale scars and nicks across its flank and fins.",
    },
    "ermine": {
        "young": "It is a young ermine: a small thin body, a soft fluffy coat, a slightly rounder head and a short bold black tail tip.",
        "adult": "It is an ermine in its prime: sleek, lithe and muscular, alert and upright, the coat clean and smooth and the black tail tip sharp.",
        "venerable": "It is a very old ermine: a heavier, weathered build, fine creases around the muzzle, long pale whiskers and a slow low-slung stance.",
    },
    "boar": {
        "young": "It is a young boar: small and stocky, with a shorter snout, tusks just showing as small nubs and a short low ridge of bristles.",
        "adult": "It is a boar in its prime: full-sized, deep-chested and thick-necked, with a tall bristle ridge and fully grown tusks.",
        "venerable": "It is a very old boar: the heaviest build, grizzled grey bristles frosting the ridge and snout, thick worn ivory tusks, sagging jowls and a scarred hide.",
    },
}


def parse_slug(raw: str) -> str:
    animal, _, stage = raw.partition("-")
    animal, stage = FRENCH.get(animal, animal), FRENCH.get(stage, stage)
    if animal not in ANIMALS or stage not in STAGES:
        sys.exit(f"unknown slug {raw!r}: <{'|'.join(ANIMALS)}>-<{'|'.join(STAGES)}> (French names accepted)")
    return f"{animal}-{stage}"


def prompt_for(slug: str) -> str:
    animal, stage = slug.split("-")
    return " ".join((BACKGROUND, IDENTITY[animal], STAGE[animal][stage], STYLE))


def seed_of(slug: str, attempt: int, i: int) -> int:
    return seed_for(slug) + 1000 * attempt + i


# --- money -----------------------------------------------------------------------------------

_cost_lock = threading.Lock()
_current_slug = ""


def total_spent() -> float:
    if not COSTS.is_file():
        return 0.0
    total = 0.0
    with COSTS.open(encoding="utf-8", newline="") as f:
        for n, row in enumerate(csv.DictReader(f), start=2):
            try:
                value = float(row["cout_estime_eur"])
            except (TypeError, ValueError, KeyError):
                sys.exit(f"{COSTS} line {n}: unreadable cost {row.get('cout_estime_eur')!r}. Fix the file.")
            # nan and inf compare False against everything: they would switch the guard off.
            if not math.isfinite(value) or value < 0:
                sys.exit(f"{COSTS} line {n}: cost {value!r} is not a finite number >= 0. Fix the file.")
            total += value
    return total


def reserve(slug: str, submissions: int = 1) -> None:
    """Refuse past the budget, else write the line. Check and write share one lock, so six
    workers cannot each see room for one more."""
    cost = submissions * COST_PER_IMAGE_EUR
    with _cost_lock:
        # ponytail: re-reads the whole couts.csv on every submission. Fine while it stays under a
        # few hundred lines; keep a running total in memory if it ever grows past that.
        spent = total_spent()
        if spent + cost > BUDGET_EUR:
            sys.exit(f"budget guard: {spent:.2f} EUR spent + {cost:.2f} would pass {BUDGET_EUR:.2f}. Refusing to submit.")
        COSTS.parent.mkdir(parents=True, exist_ok=True)
        new = not COSTS.exists() or COSTS.stat().st_size == 0  # a 0-byte file still needs its header
        with COSTS.open("a", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            if new:
                w.writerow(["date", "slug", "soumissions", "cout_estime_eur"])
            w.writerow([time.strftime("%Y-%m-%d %H:%M:%S"), slug, submissions, f"{cost:.4f}"])


_real_json = flux._json


def _counted_json(url, key, payload=None, attempts=6):
    # Only the POST to the model endpoint is a paid submission; polling is a GET.
    if payload is None or url != flux.ENDPOINT:
        return _real_json(url, key, payload, attempts)
    # flux._json would retry 5xx inside one reserve(), and a 502 after task creation is billed, so
    # the loop is ours: one reserve() per attempt, same waits as flux._json.
    reserved = False
    for attempt in range(attempts):
        if not reserved:
            reserve(_current_slug)
        reserved = False
        try:
            return _real_json(url, key, payload, attempts=1)
        except urllib.error.HTTPError as error:
            if error.code != 429 and error.code < 500:
                raise
            if attempt == attempts - 1:
                raise
            after = error.headers.get("Retry-After") if error.headers else None
            wait = float(after) if after and after.isdigit() else min(2**attempt, 30)
            # 429 is refused for concurrency before a task exists, so it is not billed: the retry
            # reuses this attempt's line instead of writing a new one.
            reserved = error.code == 429
        except urllib.error.URLError:
            if attempt == attempts - 1:
                raise
            wait = min(2**attempt, 30)
        time.sleep(wait + random.uniform(0, 1.0))
    raise RuntimeError(f"gave up on {url} after {attempts} attempts")


# --- commands --------------------------------------------------------------------------------


def candidates(slug: str, attempt: int, dry_run: bool) -> None:
    global _current_slug
    prompt = prompt_for(slug)
    outs = [OUT / slug / f"a{attempt}_c{i}.jpg" for i in range(CANDIDATES)]
    if dry_run:
        print(f"[dry-run] nothing submitted. {CANDIDATES} x {SIZE}x{SIZE}, "
              f"~{CANDIDATES * COST_PER_IMAGE_EUR:.2f} EUR, spent so far {total_spent():.2f} of {BUDGET_EUR:.2f}")
        print(f"\nPROMPT (same for the 4):\n{prompt}\n")
        for i, out in enumerate(outs):
            print(f"c{i}: seed {seed_of(slug, attempt, i)} -> {out}")
        return

    spent = total_spent()
    if spent + CANDIDATES * COST_PER_IMAGE_EUR > BUDGET_EUR:
        sys.exit(f"budget guard: {spent:.2f} EUR spent, a batch of {CANDIDATES} would pass {BUDGET_EUR:.2f}.")
    _current_slug = slug
    flux._json = _counted_json
    with concurrent.futures.ThreadPoolExecutor(max_workers=CANDIDATES) as pool:
        futures = [
            pool.submit(generate, slug=slug, prompt=prompt, out=out, width=SIZE, height=SIZE,
                        seed=seed_of(slug, attempt, i))
            for i, out in enumerate(outs)
        ]
        for future in futures:
            future.result()  # a guard exit or a missing key must stop the run, not vanish
    print(f"spent so far: {total_spent():.2f} of {BUDGET_EUR:.2f} EUR")


def sheet(slug: str, attempt: int, dry_run: bool) -> None:
    made = [str(o) for o in (OUT / slug / f"a{attempt}_c{i}.jpg" for i in range(CANDIDATES)) if o.exists()]
    if not made:
        sys.exit(f"no candidates for {slug} attempt {attempt}")
    out = OUT / slug / f"a{attempt}_sheet.jpg"
    if dry_run:
        print(f"[dry-run] would write {out} from {len(made)} candidate(s); nothing written")
        return
    subprocess.run(["montage", "-label", "%t", *made, "-tile", "4x", "-geometry", "400x400+6+6",
                    "-pointsize", "20", str(out)], check=True)
    print(out)


def accept(slug: str, attempt: int, i: int, dry_run: bool) -> None:
    src = OUT / slug / f"a{attempt}_c{i}.jpg"
    rel = f"assets/images/animals/{slug}.jpg"
    if dry_run:
        print(f"[dry-run] would delete {slug}.* in {(ROOT / rel).parent}, copy {src} -> {rel} "
              f"and file its provenance entry from {src.with_suffix('.json')}; nothing written")
        return
    entry = json.loads(src.with_suffix(".json").read_text(encoding="utf-8"))
    dest = ROOT / rel
    for old in dest.parent.glob(f"{slug}.*"):
        old.unlink()
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(src, dest)
    record(rel, entry)
    print(f"accepted {src.name} -> {rel}; now run to-webp.py, cutout.py --family animals, fit-small-art.py")


def positive(raw: str) -> int:
    value = int(raw)
    if value < 1:
        raise argparse.ArgumentTypeError("attempt must be 1 or more")
    return value


def main() -> None:
    if WORK.resolve().is_relative_to(ROOT):
        sys.exit(f"ART_LOOP_DIR {WORK} is inside the repo: generate() would file every candidate into provenance.json.")
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="print prompts and seeds, submit nothing")
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("candidates", "sheet", "accept"):
        p = sub.add_parser(name)
        p.add_argument("slug")
        p.add_argument("attempt", type=positive)
        if name == "accept":
            p.add_argument("index", type=int, choices=range(CANDIDATES))
    args = parser.parse_args()
    slug = parse_slug(args.slug)
    if args.command == "candidates":
        candidates(slug, args.attempt, args.dry_run)
    elif args.command == "sheet":
        sheet(slug, args.attempt, args.dry_run)
    else:
        accept(slug, args.attempt, args.index, args.dry_run)


if __name__ == "__main__":
    main()
