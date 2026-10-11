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
to the endpoint) rather than editing flux.py, so generate()'s own retries are each counted. Only
`_json`'s internal 429/5xx retries are not, since a throttled or failed request is not billed.

Afterwards, in this order:

    python3 scripts/to-webp.py
    python3 scripts/cutout.py --family animals
    python3 scripts/fit-small-art.py
"""

import argparse
import concurrent.futures
import csv
import json
import os
import pathlib
import shutil
import subprocess
import sys
import threading
import time

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
    "three-quarter side view, with a clear margin of empty background on all four sides. A crisp "
    "cool rim light runs the whole way around the silhouette and separates it cleanly from the "
    "background. The animal wears nothing: no harness, no saddle, no collar, no armour, no "
    "jewellery. The eyes are plain animal eyes, nothing glows. There are no runes, no magical "
    "energy and no light coming off the animal. Square composition, high contrast, clean and "
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

# Written without the animal's name so one line serves all six; the stage never changes the
# identity above, only the age it shows.
STAGE = {
    "young": (
        "It is young: slim and a little long in the leg, smaller and lighter in build, soft-edged "
        "features, bright curious posture, the markings clean and not yet fully grown in."
    ),
    "adult": (
        "It is in its prime: fully grown, powerful and well muscled, standing tall and steady, "
        "the markings sharp and complete."
    ),
    "venerable": (
        "It is very old and revered: the heaviest and most imposing build, a frost of grey and "
        "white through the coat and face, a deep weathered look, slow and dignified posture, "
        "the markings worn soft with age."
    ),
}


def parse_slug(raw: str) -> str:
    animal, _, stage = raw.partition("-")
    animal, stage = FRENCH.get(animal, animal), FRENCH.get(stage, stage)
    if animal not in ANIMALS or stage not in STAGES:
        sys.exit(f"unknown slug {raw!r}: <{'|'.join(ANIMALS)}>-<{'|'.join(STAGES)}> (French names accepted)")
    return f"{animal}-{stage}"


def prompt_for(slug: str) -> str:
    animal, stage = slug.split("-")
    return " ".join((BACKGROUND, IDENTITY[animal], STAGE[stage], STYLE))


def seed_of(slug: str, attempt: int, i: int) -> int:
    return seed_for(slug) + 1000 * attempt + i


# --- money -----------------------------------------------------------------------------------

_cost_lock = threading.Lock()
_current_slug = ""


def total_spent() -> float:
    if not COSTS.is_file():
        return 0.0
    with COSTS.open(encoding="utf-8", newline="") as f:
        return sum(float(row["cout_estime_eur"]) for row in csv.DictReader(f))


def reserve(slug: str, submissions: int = 1) -> None:
    """Refuse past the budget, else write the line. Check and write share one lock, so six
    workers cannot each see room for one more."""
    cost = submissions * COST_PER_IMAGE_EUR
    with _cost_lock:
        spent = total_spent()
        if spent + cost > BUDGET_EUR:
            sys.exit(f"budget guard: {spent:.2f} EUR spent + {cost:.2f} would pass {BUDGET_EUR:.2f}. Refusing to submit.")
        COSTS.parent.mkdir(parents=True, exist_ok=True)
        new = not COSTS.is_file()
        with COSTS.open("a", encoding="utf-8", newline="") as f:
            w = csv.writer(f)
            if new:
                w.writerow(["date", "slug", "soumissions", "cout_estime_eur"])
            w.writerow([time.strftime("%Y-%m-%d %H:%M:%S"), slug, submissions, f"{cost:.4f}"])


_real_json = flux._json


def _counted_json(url, key, payload=None, attempts=6):
    # Only the POST to the model endpoint is a paid submission; polling is a GET.
    if payload is not None and url == flux.ENDPOINT:
        reserve(_current_slug)
    return _real_json(url, key, payload, attempts)


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


def sheet(slug: str, attempt: int) -> None:
    made = [str(o) for o in (OUT / slug / f"a{attempt}_c{i}.jpg" for i in range(CANDIDATES)) if o.exists()]
    if not made:
        sys.exit(f"no candidates for {slug} attempt {attempt}")
    out = OUT / slug / f"a{attempt}_sheet.jpg"
    subprocess.run(["montage", "-label", "%t", *made, "-tile", "4x", "-geometry", "400x400+6+6",
                    "-pointsize", "20", str(out)], check=True)
    print(out)


def accept(slug: str, attempt: int, i: int) -> None:
    src = OUT / slug / f"a{attempt}_c{i}.jpg"
    rel = f"assets/images/animals/{slug}.jpg"
    entry = json.loads(src.with_suffix(".json").read_text(encoding="utf-8"))
    dest = ROOT / rel
    for old in dest.parent.glob(f"{slug}.*"):
        old.unlink()
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(src, dest)
    record(rel, entry)
    print(f"accepted {src.name} -> {rel}; now run to-webp.py, cutout.py --family animals, fit-small-art.py")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="print prompts and seeds, submit nothing")
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("candidates", "sheet", "accept"):
        p = sub.add_parser(name)
        p.add_argument("slug")
        p.add_argument("attempt", type=int)
        if name == "accept":
            p.add_argument("index", type=int, choices=range(CANDIDATES))
    args = parser.parse_args()
    slug = parse_slug(args.slug)
    if args.command == "candidates":
        candidates(slug, args.attempt, args.dry_run)
    elif args.command == "sheet":
        sheet(slug, args.attempt)
    else:
        accept(slug, args.attempt, args.index)


if __name__ == "__main__":
    main()
