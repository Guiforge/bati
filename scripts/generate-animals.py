#!/usr/bin/env python3
"""Draw the crest animals' portraits (V-02), one audited attempt at a time. Same loop as art-loop.py.

    python3 scripts/generate-animals.py candidates bear-young 1   # 4 candidates, 4 paid submissions
    python3 scripts/generate-animals.py sheet bear-young 1        # one contact sheet of the 4, free
    python3 scripts/generate-animals.py accept bear-young 1 2     # ship candidate 2, file its provenance
    python3 scripts/generate-animals.py --dry-run candidates bear-young 1   # prompts and seeds, no network

Slugs are the 57 of db/crestCoat.ts: `<animal>-<stage>[-rare|-winter]`, animal in bear, stag,
horse, salmon, ermine, boar; stage in young, adult, venerable, legendary (rare and winter from
adult; the ermine has no winter). Any other slug is refused. The French names (ours, cerf,
cheval, saumon, hermine, sanglier / jeune, adulte, venerable, legendaire) are accepted and mapped,
and the canonical slug is what seeds and files are keyed on. `--self-test` checks all 57 prompts
offline.

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

# Euros per 1 MP image, by endpoint; unknown endpoints are refused, never counted as 0. Sources, read
# 2026-10-11 (USD, read as EUR and rounded up so the estimate errs high): bfl.ai/pricing calculator
# $0.048 per image for FLUX.2 [pro]; docs.bfl.ai/quick_start/pricing "flux-3-image ... `1k`: $0.048".
COST_BY_ENDPOINT_EUR = {
    "https://api.bfl.ai/v1/flux-2-pro-preview": 0.05,
    "https://api.bfl.ai/v1/flux-3-image": 0.05,  # no seed: flux.py sends none and files "seed": null
}


def cost_per_image() -> float:
    try:
        return COST_BY_ENDPOINT_EUR[flux.ENDPOINT]
    except KeyError:
        sys.exit(f"unknown endpoint {flux.ENDPOINT!r}: no price known, refusing to submit. Add it to COST_BY_ENDPOINT_EUR.")


BUDGET_EUR = 25.0  # of 30 for the whole chantier; the last 5 are the margin.

ANIMALS = ("bear", "stag", "horse", "salmon", "ermine", "boar")
STAGES = ("young", "adult", "venerable", "legendary")
FRENCH = {
    "ours": "bear", "cerf": "stag", "cheval": "horse", "saumon": "salmon",
    "hermine": "ermine", "sanglier": "boar",
    "jeune": "young", "adulte": "adult", "venerable": "venerable", "legendaire": "legendary",
    "rare": "rare", "winter": "winter", "hiver": "winter",
}

# First sentence, and a description rather than a prohibition (docs/content/image-style-prompt.md).
BACKGROUND = (
    "The background of this picture is one unbroken flat field of very dark navy-black, as dark as "
    "a night sky, the same value from edge to edge, with no gradient, no vignette and no texture."
)

# The eyes, word for word: self-test and prompt both read this constant. FLUX paints a white
# catchlight in the eye unless told otherwise, so the second sentence says what the eye is.
EYES = (
    "The eyes are plain animal eyes, nothing glows. Each eye is a flat matte dark disc with no "
    "white catchlight."
)

# One rule per entry, joined into STYLE; the self-test checks each one is in every prompt.
STYLE_RULES = (
    "Rendered as a dark-fantasy Franco-Belgian graphic-novel illustration: thick, confident black "
    "ink outlines and flat cel-shaded colour fills with hard-edged shadows and no soft "
    "airbrushing, high contrast.",
    None,  # the pose, per animal: POSE
    "A crisp cool rim light sculpts the top of the body and the head, no brighter than the "
    "animal's lightest fur, so the animal sits in the picture like a painting and not like a "
    "sticker.",
    "Where the coat is dark, the ink outline is a clear mid slate blue, clearly lighter than the "
    "background, which keeps the silhouette readable against the night.",
    "The whole animal is in view from nose to tail, with a clear margin of empty background on "
    "all four sides of the picture.",
    "The animal is bare, a wild creature in the plain open dark, with the same empty night below "
    "it as all around it.",
    "The mood is serious and noble, a creature to be proud of. Square composition, high contrast, "
    "an illustration with no lettering, no signature and no watermark; all four corners of the "
    "picture are empty background.",
)

# The pose, the second STYLE rule. The salmon swims in profile; the others share one neutral
# three-quarter pose, and the heavier build (SEEN_BELOW) is said in STAGE for grown mammals only.
THREE_QUARTER = (
    "A single animal, alone in the picture, in a proud three-quarter pose, its head and chest "
    "turned toward the right edge of the picture, with a steady stance."
)
SALMON_POSE = (
    "A single fish, alone in the picture, in a clean side profile, head toward the right edge of "
    "the picture, its body in a strong arched swimming curve."
)
POSE = {a: THREE_QUARTER for a in ("bear", "stag", "horse", "ermine", "boar")} | {"salmon": SALMON_POSE}


def style_rules(animal: str) -> tuple[str, ...]:
    return tuple(POSE[animal] if rule is None else rule for rule in STYLE_RULES)


# The silhouette, one sentence per animal and no colour, copied word for word into all of its
# portraits (base, rare, winter, every stage): the same animal has to read as the same animal.
SILHOUETTE = {
    "bear": "A bear with a heavy rounded shoulder hump, a broad skull, small round ears, broad flat paws with long claws and a short stubby tail.",
    "stag": "A red deer stag with a thick mane at the neck, a long narrow face, large upright ears and branching antlers.",
    "horse": "A horse with a long arched neck, a deep chest, a fine head and a full flowing mane and tail.",
    "salmon": "An Atlantic salmon with a streamlined torpedo body, a pointed head with a wide jaw, a forked tail and neat fins, shown in profile as if swimming through open night.",
    "ermine": "An ermine with a long slim body, short legs, a small pointed face, small round ears and a long tail.",
    "boar": "A wild boar with a high ridge of long bristles down the spine, a heavy front and tapering hindquarters, a wedge-shaped head, a flat snout and two short curved tusks.",
}

# The colour sentence, per animal and coat: it replaces the colour, never the silhouette.
COAT = {
    "bear": {
        "base": "Its coat is deep chestnut with a paler tan muzzle and a plain chest with no white blaze.",
        "rare": "Its coat is a deep brown, the hairs of the nape and shoulders tipped in pale silver-grey, a grizzled mantle, with a paler tan muzzle and a plain chest with no white blaze.",
        "winter": "Its coat is thick and shaggy, a darker brown, with frost caught in the hairs of the shoulders and a paler tan muzzle and a plain chest with no white blaze.",
    },
    "stag": {
        "base": "Its coat is russet with a cream rump patch and a darker mane.",
        "rare": "Its coat is a creamy white from nose to rump, with dark eyes, dark hooves and antlers of pale bone.",
        "winter": "Its coat is dense and grey, the neck thickened, the antlers bare and washed pale by the cold.",
    },
    "horse": {
        "base": "Its coat is a glossy mahogany bay with a black mane, black tail, black lower legs and a single white blaze down the face.",
        "rare": "Its coat is a deep true black with a pale silver-grey mane and tail and no white marking; it has a clear mid slate-blue ink outline, clearly lighter than the background, so the black body reads against the night.",
        "winter": "Its coat is long, rough and dull, a faded bay, the mane tangled and caught with snow, the lower legs dark and a single white blaze down the face.",
    },
    "salmon": {
        "base": "Its back is steel blue, its flank silver scattered with small dark cross-shaped spots and its belly white.",
        "rare": "Its flank is a matte golden yellow, its back a deeper gold-brown, its fins amber and its belly pale cream, with the same small dark cross-shaped spots.",
        "winter": "It wears the matte silver of its sea phase: dull silver flanks, a steel-blue back, a white belly, a few small dark spots and no spawning colours.",
    },
    "ermine": {
        "base": "Its fur is the white of a winter coat, with small round white ears and a tail tipped in solid black.",
        "rare": "Its fur is almost black from nose to tail, the belly barely paler, the ears dark; it has a clear mid slate-blue ink outline, clearly lighter than the background, so the dark body reads against the night.",
    },
    "boar": {
        "base": "Its coat is coarse, bristled and dark grey, with ivory tusks.",
        "rare": "Its coat is a very pale ash grey, the colour of cold ashes, with ivory tusks and dark eyes.",
        "winter": "Its coat is a warm russet brown with long bristles and a thick undercoat, frost lying on its back, clearly brown and not grey; the tusks are ivory.",
    },
}

# Per animal, because age shows differently on each: a salmon has no leg, a white ermine no grey
# to frost. Each sentence adds age and leaves the silhouette and coat sentences alone.
SEEN_BELOW = "seen from slightly below, with broad powerful shoulders"  # grown mammals, not legendary


def legendary(kind: str, limbs: str, mane: str) -> str:
    """The bosses' `_legendary` ask: the same animal, "visibly more massive", nothing magical."""
    return (f"It is a legendary {kind} at its legendary peak, visibly larger and broader than the adult, "
            f"filling the picture up to its margin, never cropped, standing firmly on all four {limbs} in a "
            f"low three-quarter view seen slightly from below, facing right, a heavy mane of {mane} along the "
            f"shoulders catching cold moonlight from behind, old battle scars, a calm unyielding gaze with dark "
            f"non-reflective eyes, in full vigour, still a natural {kind} with no armor, no glow and no magic.")


STAGE = {
    "bear": {
        "young": "It is a half-grown bear drawn at about half the size of a grown bear, standing in the lower middle of the picture with wide empty night background all around it, facing right in the same proud three-quarter view. Its eyes are flat matte dark-brown discs with no white catchlight, no reflection and no highlight of any kind. It is a lanky adolescent bear: long legs, a lean body, a muzzle already long, only a faint shoulder hump. Its coat is one even colour from chin to belly, with no pale patch on the chest or belly. Its mouth is closed.",
        "adult": f"It is a bear in its prime, facing right, {SEEN_BELOW}: huge and powerful, with a thick neck, heavy shoulder muscle and a full coat.",
        "venerable": f"It is a very old bear, epic and unbowed, facing right, {SEEN_BELOW}: massive and heavy-bellied, with grey-tipped fur along the muzzle and shoulders, a shaggy worn coat, blunted claws, a notched ear and old scars across the shoulder.",
        "legendary": legendary("bear", "paws", "thick dark fur"),
    },
    "stag": {
        "young": "It is a young stag drawn at about half the size of a grown stag, standing in the lower middle of the picture with wide empty night background all around it, facing right. It is a lanky adolescent stag: long thin legs, a narrow chest, a lean neck and its first small antlers, short with only two or three tines each. Its eyes are flat matte dark discs.",
        "adult": f"It is a stag in its prime, facing right, {SEEN_BELOW}: broad-chested and muscular, with full antlers of many tines and a proud raised head.",
        "venerable": f"It is a very old stag, epic and unbowed, facing right, {SEEN_BELOW}: heavy-necked and deep-chested, with massive wide antlers thick with tines, a grizzled grey muzzle and old scars on the flank.",
        "legendary": legendary("stag", "hooves", "thick neck hair beneath a vast crown of antlers of many tines"),
    },
    "horse": {
        "young": "It is a young horse drawn at about half the size of a grown horse, standing in the lower middle of the picture with wide empty night background all around it, facing right. It is a lanky yearling: long thin legs, a lean body, a fine short mane and a short tail, a long fine head; bare-backed, nothing on its back or head. Its eyes are flat matte dark discs.",
        "adult": f"It is a horse in its prime, facing right, {SEEN_BELOW}: fully grown, deep-chested and muscular, the coat in good condition and the head carried high; bare-backed, nothing on its back or head.",
        "venerable": f"It is a very old horse, epic and unbowed, facing right, {SEEN_BELOW}: a slightly hollowed back, prominent hip bones, a grey muzzle, heavy calm eyelids and old scars on the shoulder, standing slow and dignified; bare-backed, nothing on its back or head.",
        "legendary": legendary("horse", "hooves", "long flowing hair") + " Bare-backed, nothing on its back or head.",
    },
    "salmon": {
        "young": "It is a young salmon drawn at about half the length of a grown salmon, swimming in the lower middle of the picture with wide empty night background all around it, facing right. It is a small slender fish: svelte and narrow-bodied, with small neat fins, bright fresh scales and few crisp dark spots. Its eye is a flat matte dark disc.",
        "adult": "It is a salmon in its prime: thick-bodied and muscular, the scales clean and crisp, the fins strong.",
        "venerable": "It is a very old male salmon, epic and unbowed, facing right: the largest and heaviest of its kind, with the lower jaw curving up into a hooked kype, the colour turned dull, and old pale scars and nicks across its flank and fins.",
        "legendary": "It is a legendary male salmon at its legendary peak, visibly larger and broader than the adult, in the same swimming profile, facing right, with a great hooked kype and a broad powerful tail, its back catching cold moonlight from behind, old pale scars, a calm unyielding gaze with a dark non-reflective eye, in full vigour, still a natural salmon with no armor, no glow and no magic.",
    },
    "ermine": {
        "young": "It is a young ermine drawn at about half the size of a grown ermine, standing in the lower middle of the picture with wide empty night background all around it, facing right. It has a lean small body, a short coat, a short bold tail tip. Its eyes are flat matte dark discs.",
        "adult": f"It is an ermine in its prime, facing right, {SEEN_BELOW}: sleek, lithe and muscular, alert, head raised, the coat clean and smooth and the tail tip sharp.",
        "venerable": f"It is a very old ermine, epic and unbowed, facing right, {SEEN_BELOW}: a heavier, weathered build, fine creases around the muzzle, long pale whiskers, a nick in one ear and a slow low-slung stance.",
        "legendary": legendary("ermine", "paws", "dense fur"),
    },
    "boar": {
        "young": "It is a young boar drawn at about half the size of a grown boar, standing in the lower middle of the picture with wide empty night background all around it, facing right. It is a lanky adolescent boar: long legs, a lean body, a snout already long, tusks just showing as small nubs and a short low ridge of bristles. Its eyes are flat matte dark discs.",
        "adult": f"It is a boar in its prime, facing right, {SEEN_BELOW}: full-sized, deep-chested and thick-necked, with a tall bristle ridge and fully grown tusks.",
        "venerable": f"It is a very old boar, epic and unbowed, facing right, {SEEN_BELOW}: the heaviest build, grizzled grey bristles frosting the ridge and snout, thick worn tusks, sagging jowls and a scarred hide.",
        "legendary": legendary("boar", "trotters", "long bristles") + " Heavy curved tusks.",
    },
}


def all_slugs() -> list[str]:
    """The 57 portraits of db/crestCoat.ts: 4 stages per animal, 3 rare, 3 winter (not the ermine)."""
    slugs = []
    for animal in ANIMALS:
        slugs += [f"{animal}-{stage}" for stage in STAGES]
        slugs += [f"{animal}-{stage}-rare" for stage in STAGES[1:]]
        if animal != "ermine":
            slugs += [f"{animal}-{stage}-winter" for stage in STAGES[1:]]
    return slugs


def parse_slug(raw: str) -> str:
    parts = raw.split("-")
    slug = "-".join(FRENCH.get(p, p) for p in parts)
    if slug not in all_slugs():
        sys.exit(f"unknown slug {raw!r}: <animal>-<stage>[-rare|-winter], the 57 of db/crestCoat.ts (French names accepted)")
    return slug


def parts_of(slug: str) -> tuple[str, str, str]:
    animal, stage, *coat = slug.split("-")
    return animal, stage, coat[0] if coat else "base"


def prompt_for(slug: str) -> str:
    animal, stage, coat = parts_of(slug)
    return " ".join((BACKGROUND, SILHOUETTE[animal], COAT[animal][coat], EYES, STAGE[animal][stage], " ".join(style_rules(animal))))


def self_test() -> None:
    slugs = all_slugs()
    assert len(slugs) == 57 and len(set(slugs)) == 57, len(slugs)
    for slug in slugs:
        animal, _, _ = parts_of(slug)
        p = prompt_for(slug)
        assert p.startswith(BACKGROUND) and "picture" in BACKGROUND, slug
        for rule in style_rules(animal):
            assert rule in p, (slug, rule[:40])
        stage = parts_of(slug)[1]
        low = p.lower()
        assert "ground" not in low.replace("background", ""), slug
        assert "hatching" not in low and "cel-shaded" in low, slug
        if animal == "salmon":
            assert SALMON_POSE in p and THREE_QUARTER not in p, slug
            assert not [w for w in ("on all fours", "shoulders", "feet") if w in low], slug
        else:
            assert THREE_QUARTER in p and SALMON_POSE not in p, slug
        if animal == "bear":
            assert "plain chest with no white blaze" in p, slug
        if stage == "legendary":
            assert not [w for w in ("towering", "colossal", "gigantic", "rearing") if w in low], slug
            assert "visibly larger and broader than the adult" in p and "no armor, no glow and no magic" in p, slug
            assert "never cropped" in p or animal == "salmon", slug
        if stage == "young":
            assert "broad powerful shoulders" not in p, slug
        if stage in ("venerable", "legendary"):
            assert "facing right" in STAGE[animal][stage], slug
        assert SILHOUETTE[animal] in p, slug
        assert "picture" in p and "frame" not in p.lower(), slug
        assert "The eyes are plain animal eyes, nothing glows." in p, slug
        assert "no white catchlight" in p, slug
        assert "cub" not in p.lower().split() and "cute" not in p.lower(), slug
        assert p.index("The eyes") < p.index(STAGE[animal][parts_of(slug)[1]]), slug
    # the silhouette sentence is the same on every portrait of an animal (10, the ermine 7)
    for animal in ANIMALS:
        mine = [s for s in slugs if s.startswith(animal + "-")]
        assert len(mine) == (7 if animal == "ermine" else 10), (animal, len(mine))
        assert all(prompt_for(s).count(SILHOUETTE[animal]) == 1 for s in mine), animal
    assert not {"bear-young-rare", "ermine-adult-winter"} & set(slugs)
    print(f"self-test ok: {len(slugs)} slugs, style rules x{len(STYLE_RULES)}, poses per animal, no ground word, silhouette identical per animal, eyes verbatim")


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
    cost = submissions * cost_per_image()
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
              f"~{CANDIDATES * cost_per_image():.2f} EUR, spent so far {total_spent():.2f} of {BUDGET_EUR:.2f}")
        print(f"\nPROMPT (same for the 4):\n{prompt}\n")
        for i, out in enumerate(outs):
            print(f"c{i}: seed {seed_of(slug, attempt, i)} -> {out}")
        return

    spent = total_spent()
    if spent + CANDIDATES * cost_per_image() > BUDGET_EUR:
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
    parser.add_argument("--self-test", action="store_true", help="check the 57 prompts offline and exit")
    sub = parser.add_subparsers(dest="command")
    for name in ("candidates", "sheet", "accept"):
        p = sub.add_parser(name)
        p.add_argument("slug")
        p.add_argument("attempt", type=positive)
        if name == "accept":
            p.add_argument("index", type=int, choices=range(CANDIDATES))
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if not args.command:
        parser.error("a command is required")
    slug = parse_slug(args.slug)
    if args.command == "candidates":
        candidates(slug, args.attempt, args.dry_run)
    elif args.command == "sheet":
        sheet(slug, args.attempt, args.dry_run)
    else:
        accept(slug, args.attempt, args.index, args.dry_run)


if __name__ == "__main__":
    main()
