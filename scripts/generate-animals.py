#!/usr/bin/env python3
"""Draw the crest animals' portraits (V-02), one audited attempt at a time. Same loop as art-loop.py.

    python3 scripts/generate-animals.py candidates bear-young 1   # 4 candidates, 4 paid submissions
    python3 scripts/generate-animals.py sheet bear-young 1        # one contact sheet of the 4, free
    python3 scripts/generate-animals.py accept bear-young 1 2     # ship candidate 2, file its provenance
    python3 scripts/generate-animals.py accept bear-legendary 14 1 --concept charge   # from legendary-charge/
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


BUDGET_EUR = 40.0  # Guillaume, 11/10: "40 $ max de plus" (was 25 of 30; the last 5 were the margin).

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
    "The eyes are plain animal eyes, nothing glows. The eyes are small and set deep under a heavy "
    "brow, each painted as one flat dark-brown fill in shadow, the same value as the shadow around them."
)
# The ermine is white (or black): the common eye sentence paints a dark mask on it, so its face is said instead.
_EYES_HEAD = "The eyes are plain animal eyes, nothing glows. "
ERMINE_EYES = {
    "white": _EYES_HEAD + "The face is as white as the body: white forehead, white cheeks and a white muzzle from the nose to the ears, "
    "the fur around each eye the same clean white as the brow, and each eye a small black bead edged only by the thin black ink line. "
    "Shadows on the white fur are a warm pale grey, never blue.",
    "black": _EYES_HEAD + "The face is as black as the body: the fur around each eye as black as the face, no pale mask, no pale ring, "
    "and each eye a small black bead edged only by the thin black ink line.",
}
SALMON_EYE = "The eye is plain, nothing glows: a small dark eye painted as one flat fill."

# One rule per entry, joined into STYLE; the self-test checks each one is in every prompt.
STYLE_RULES = (
    "Rendered as a dark-fantasy Franco-Belgian graphic-novel illustration: thick, confident black "
    "ink outlines and flat cel-shaded colour fills with hard-edged shadows and no soft "
    "airbrushing, high contrast.",
    None,  # the pose, per animal: POSE
    "Heavy black ink contours of varying weight, the underside of the body, the far legs and the "
    "shadowed flank filled with solid black shadow shapes with hard edges, cross-hatching in the "
    "half-tones, three flat values per colour; only the top edge of the back and head carries a "
    "thin cold rim of light, the rest of the outline is black ink.",
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
# The legendary mammal charges at us instead: the "face right" pose rule does not apply to it.
CHARGE_POSE = (
    "A single animal, alone in the picture, facing the viewer in a front three-quarter view, "
    "advancing toward us."
)
POSE = {a: THREE_QUARTER for a in ("bear", "stag", "horse", "ermine", "boar")} | {"salmon": SALMON_POSE}


def pose_of(animal: str, stage: str) -> str:
    return CHARGE_POSE if stage == "legendary" and animal != "salmon" else POSE[animal]


# The ermine's contour: models draw a pale-blue band along its white back, so its rim-light
# sentence is replaced by a plain black ink outline.
ERMINE_OUTLINE = (
    "Heavy black ink contours of varying weight all around the body, the underside of the body, "
    "the far legs and the shadowed flank filled with solid black shadow shapes with hard edges, "
    "cross-hatching in the half-tones, three flat values per colour; the whole outline is black "
    "ink, with no pale or blue band along the back."
)


def style_rules(animal: str, stage: str = "adult", pose: str | None = None) -> tuple[str, ...]:
    rules = tuple((pose or pose_of(animal, stage)) if rule is None else rule for rule in STYLE_RULES)
    return tuple(ERMINE_OUTLINE if animal == "ermine" and "thin cold rim" in r else r for r in rules)


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
        "winter": "Its coat is thick and shaggy, a darker brown, with frost caught in the hairs of the shoulders and a paler tan muzzle and a plain chest with no white blaze. No snowflakes in the air.",
    },
    "stag": {
        "base": "Its coat is russet with a cream rump patch and a darker mane.",
        "rare": "Its coat is a creamy white from nose to rump, with dark eyes, dark hooves and antlers of pale bone; its face, neck and legs the same creamy white as its body, never russet, brown or tan.",
        "winter": "Its coat is a dense shaggy uniform ash-grey pelt over the whole body, no red, chestnut or brown, the neck thickened, the antlers bare and washed pale by the cold. No snowflakes in the air.",
    },
    "horse": {
        "base": "Its coat is a glossy mahogany bay, a lean bay riding horse, not a draft horse; mane, tail and lower legs solid black; no white socks, no feathered fetlocks, no flaxen hair; the only white is the blaze down the face.",
        "rare": "Its coat is a deep true black with a pale silver-grey mane and tail and no white marking, the legs black down to the hooves. A thin cold rim of light runs along the whole back and head so the silhouette reads against the night.",
        "winter": "Its coat is a lean bay riding horse, not a draft horse; mane, tail and lower legs solid black; no white socks, no feathered fetlocks, no flaxen hair; the only white is the blaze down the face. The hair is long, coarse and a little darker than in summer, with snow caught in the black mane. No snowflakes in the air.",
    },
    "salmon": {
        "base": "Its back is steel blue, its flank silver scattered with small dark cross-shaped spots and its belly white.",
        "rare": "Its flank is a matte golden yellow, its back a deeper gold-brown, its fins amber and its belly pale cream, with the same small dark cross-shaped spots.",
        "winter": "It wears the matte silver of its sea phase: dull silver flanks, a steel-blue back, a white belly, a few small dark spots and no spawning colours. No snowflakes in the air.",
    },
    "ermine": {
        "base": "Its fur is the white of a winter coat, with small round white ears and a tail tipped in solid black: pure white fur on the whole head with no dark mask and no dark patches around the eyes; only the tail tip is black. The eyes are tiny black beads, the paws are white, and the only dark marks are the eyes, the nose and the black tail tip.",
        "rare": "Its fur is black all over, chest, belly, legs and paws as black as its back, no white bib, no white paws; the long slender body and short legs of a stoat, never the bulk of a wolverine or a badger; the ears dark. Its outline is black ink all the way round.",
    },
    "boar": {
        "base": "Its coat is coarse, bristled and dark grey, with ivory tusks.",
        "rare": "Its coat is a very pale ash grey, the colour of cold ashes, with ivory tusks and dark eyes.",
        "winter": "Its coat is a warm russet brown with long bristles and a thick undercoat, frost lying on its back, clearly brown and not grey; the tusks are ivory. No snowflakes in the air.",
    },
}

# Per animal, because age shows differently on each: a salmon has no leg, a white ermine no grey
# to frost. Each sentence adds age and leaves the silhouette and coat sentences alone.
SEEN_BELOW = "seen from slightly below, with broad powerful shoulders"  # grown mammals, not legendary


def legendary(kind: str, front: str, head: str = "", tail: str = "") -> str:
    """The legendary mammal, charging: the bosses' "visibly more massive", nothing magical.

    `head` adds to the lowered head (the stag's antlers), `tail` to the sentence (tusks, no saddle).
    """
    return (f"It is a legendary {kind} at its legendary peak, visibly larger and broader than the adult, "
            f"facing the viewer in a front three-quarter view and advancing straight toward us, never cropped. "
            f"Its massive head{head} is held low in front, close to us, its enormous shoulders rising behind it, "
            f"one {front} raised mid-stride, its gaze fixed on us from deep in the shadow under its heavy brow. "
            f"It is whole, from its head to its rump, and fills the picture right up to the margin. "
            f"The only light comes from behind it, a cold moonlight that outlines its shoulders in a thin pale "
            f"line, while its face and flank in shadow, the coat colour still clearly readable, with hard edges. "
            f"It is still a natural {kind}, no armor, no glow and no magic, with old pale scars across its "
            f"shoulder and muzzle.{tail}")


STAGE = {
    "bear": {
        "young": "It is a half-grown bear drawn at about half the size of a grown bear, standing in the lower middle of the picture with wide empty night background all around it, facing right in the same proud three-quarter view. It is a gangly two-year-old bear, all legs: thin legs that look slightly too long for its body, narrow hips, a slim waist, a narrow head with a long muzzle, ears that look large for its head, no shoulder hump yet, oversized paws, a short scruffy coat; a wary, awkward stance, drawn small in the picture with wide empty night around it. Its coat is one even colour from chin to belly, with no pale patch on the chest or belly. Its mouth is closed.",
        "adult": f"It is a bear in its prime, facing right, {SEEN_BELOW}: huge and powerful, with a thick neck, heavy shoulder muscle and a full coat.",
        "venerable": f"It is a very old bear, epic and unbowed, facing right, {SEEN_BELOW}: the coat duller than the adult's, with a muzzle frosted grey and silver-grey frost only on the top of the head, the nape and the upper shoulders, never on the rest of the body; old scars across the shoulder and muzzle, a torn ear with a notch bitten out of it, bony hips under thin fur, a sagging belly and worn blunt claws; the chest stays one plain colour.",
        "legendary": legendary("bear", "forepaw"),
    },
    "stag": {
        "young": "It is a young stag drawn at about half the size of a grown stag, standing in the lower middle of the picture with wide empty night background all around it, facing right. It is a lanky adolescent stag: thin legs that look slightly too long for its body, narrow hips, a slim waist, a narrow head with a long muzzle, ears that look large for its head, a short scruffy coat; a wary, awkward stance. Its first antlers are two short straight spikes no longer than its ears, with no branches and no tines at all, far smaller than a grown stag's antlers.",
        "adult": f"It is a stag in its prime, facing right, {SEEN_BELOW}: broad-chested and muscular, with full antlers of many tines and a proud raised head.",
        "venerable": f"It is a very old stag, epic and unbowed, facing right, {SEEN_BELOW}: the coat duller than the adult's, with a muzzle frosted grey and silver-grey frost only on the head, the neck and the upper shoulders, never on the rest of the body, the coat thin over bony hips, a sagging belly, a torn ear, worn blunt hooves and massive wide antlers thick with tines.",
        "legendary": legendary("stag", "front leg", ", crowned with immense antlers of many tines,"),
    },
    "horse": {
        "young": "It is a young horse, a gangly foal, drawn at about half the size of a grown horse, standing low in the lower middle of the picture with wide empty night background all around it, facing right. It is an awkward leggy colt, not a small adult: very long thin legs for a short, narrow body, a thin neck, a small head, a short upright brush of a mane, a short tail, oversized hooves; a wary, awkward stance; bare-backed, nothing on its back or head.",
        "adult": f"It is a horse in its prime, facing right, {SEEN_BELOW}: fully grown, deep-chested and muscular, the coat in good condition and the head carried high; bare-backed, nothing on its back or head.",
        "venerable": f"It is a very old horse, epic and unbowed, facing right, {SEEN_BELOW}: the coat duller than the adult's, with a muzzle frosted grey and silver-grey frost only on the head, the neck and the upper shoulders, never on the rest of the body, the coat thin over bony hips, a hollowed back and a sagging belly, a torn ear and worn blunt hooves, standing slow and dignified; bare-backed, nothing on its back or head.",
        "legendary": legendary("horse", "front leg", tail=" Bare-backed, nothing on its back or head, no saddle."),
    },
    "salmon": {
        "young": "It is a young salmon drawn at about half the length of a grown salmon, swimming in the lower middle of the picture with wide empty night background all around it, facing right. It is a small slender fish: svelte and narrow-bodied, with small neat fins, bright fresh scales and few crisp dark spots. ",
        "adult": "It is a salmon in its prime: thick-bodied and muscular, the scales clean and crisp, the fins strong.",
        "venerable": "It is a very old male salmon, epic and unbowed, facing right: the largest and heaviest of its kind, with the lower jaw curving up into a hooked kype, the colour turned dull, and old pale scars and nicks across its flank and fins.",
        "legendary": "It is a legendary male salmon at its legendary peak, visibly larger and broader than the adult, in the same swimming profile, facing right, with a great hooked kype and a broad powerful tail, only the top edge of its back catching a thin cold moonlight from behind, old pale scars, a calm unyielding gaze with a dark non-reflective eye, in full vigour, still a natural salmon with no armor, no glow and no magic.",
    },
    "ermine": {
        "young": "It is a young ermine drawn at about half the size of a grown ermine, standing in the lower middle of the picture with wide empty night background all around it, facing right. It is a gangly young ermine: thin legs that look slightly too long for its body, a slim waist, a narrow head, ears that look large for its head, oversized paws, a short scruffy coat and a short bold tail tip; a wary, awkward stance.",
        "adult": f"It is an ermine in its prime, facing right, {SEEN_BELOW}: sleek, lithe and muscular, alert, head raised, the coat clean and smooth and the tail tip sharp.",
        "venerable": f"It is a very old ermine, epic and unbowed, facing right, {SEEN_BELOW}: the fur is thin over bony hips, a sagging belly, fine creases around the muzzle, a muzzle frosted grey with long pale whiskers, a torn ear, worn blunt claws and a slow low-slung stance.",
        "legendary": legendary("ermine", "forepaw").replace("a cold moonlight that outlines its shoulders in a thin pale line,", "a faint cold moonlight with no pale or blue band along its back, its whole outline black ink,"),
    },
    "boar": {
        "young": "It is a young boar drawn at about half the size of a grown boar, standing in the lower middle of the picture with wide empty night background all around it, facing right. It is a lanky adolescent boar: thin legs that look slightly too long for its body, narrow hips, a slim waist, a narrow head with a long snout, ears that look large for its head, tusks just showing as small nubs, a short low scruffy ridge of bristles; a wary, awkward stance.",
        "adult": f"It is a boar in its prime, facing right, {SEEN_BELOW}: full-sized, deep-chested and thick-necked, with a tall bristle ridge and fully grown tusks.",
        "venerable": f"It is a very old boar, epic and unbowed, facing right, {SEEN_BELOW}: the coat duller than the adult's, with a snout frosted grey and silver-grey frost only on the head, the neck and the upper shoulders, never on the rest of the body, the coat thin over bony hips, a sagging belly, a torn ear and thick worn tusks.",
        "legendary": legendary("boar", "front leg", tail=" Heavy curved tusks."),
    },
}


# Legendary bear concept variants (`--concept`): each replaces the legendary stage sentence and
# the pose rule (a None pose is the neutral three-quarter one), and files into bear-legendary/legendary-<name>/. The 57 slugs and their
# catalogue are untouched. FLUX ignores camera-angle wording, so the drama is in pose and composition.
CONCEPT_TAIL = " It is still a natural bear, no armor, no glow and no magic, with old pale scars across its shoulder and muzzle."
CONCEPTS = {
    "roar": (
        "It is a legendary bear at its legendary peak, visibly larger and broader than the adult, very large in the picture "
        "and never cropped, facing right. It stands on all four paws, its head thrown up toward the upper right and its jaws "
        "wide open in a full roar, long fangs visible, a fierce and serious roar, never comical, its mane of fur bristling "
        "on its neck and shoulders. The only light comes from behind it, a cold moonlight that outlines the whole crest of "
        "its back, neck and head in a thin pale line, while its face and flank in shadow, the coat colour still clearly readable, with hard edges."
        + CONCEPT_TAIL, None),
    "charge": (STAGE["bear"]["legendary"], CHARGE_POSE),  # the default now; kept so --concept charge still files in legendary-charge/
    "upright": (
        "It is a legendary bear, a great real brown bear standing upright on its hind legs, in a three-quarter view toward "
        "the right, visibly larger and broader than the adult, its forelegs hanging along its body, the long claws of its "
        "forepaws visible, its head held high and dominating the picture. It looks natural, neither human nor monstrous, "
        "and is whole in the picture with a clear margin around it, never cropped. The only light comes from behind it, a "
        "cold moonlight that outlines its back and head in a thin pale line, while its face and flank in shadow, the coat colour still clearly readable, "
        "with hard edges." + CONCEPT_TAIL, None),
}


# Per-slug coat reinforcement, appended after the coat sentence.
COAT_EXTRA = {
    "ermine-legendary": "Its face is lit from the front as evenly as its back, a plain white ermine face with no shading around the eyes, "
    "each eye a small black bead set straight into white fur, like a stoat in winter coat, never a ferret or a polecat; "
    "its white face lit from the front, as bright as its chest.",
    "horse-venerable-rare": "All four legs are solid black from the knee down to the hoof, with no white, grey or pale hair at the fetlocks, "
    "pasterns or coronets; the face is solid black from the forelock to the nostrils with no stripe, star or pale streak, only the lips "
    "faintly greyed by age; the highlights on the black coat are warm dark grey, never blue; "
    "the pasterns and hooves as black as the legs; the face solid black from forehead to nostrils, no pale stripe, no highlight down the nose.",
    "bear-legendary-rare": "Even against the backlight, the long guard hairs over its hump, nape and shoulders are tipped in pale silver-grey, a frosted grizzled mantle clearly paler than its deep brown body.",
}


def eyes_of(animal: str, coat: str) -> str:
    if animal == "salmon":
        return SALMON_EYE
    return ERMINE_EYES["black" if coat == "rare" else "white"] if animal == "ermine" else EYES


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


def prompt_for(slug: str, concept: str | None = None) -> str:
    animal, stage, coat = parts_of(slug)
    text = STAGE[animal][stage]
    if slug == "ermine-legendary":  # the shadow on the face paints a polecat's mask on white fur
        text = text.replace(" from deep in the shadow under its heavy brow", "").replace("while its face and flank in shadow", "while its flank is in shadow")
    pose = None
    if concept:
        text, pose = CONCEPTS[concept]
        pose = pose or THREE_QUARTER
    rules = style_rules(animal, stage, pose)
    return " ".join(x for x in (BACKGROUND, SILHOUETTE[animal], COAT[animal][coat], COAT_EXTRA.get(slug, ""), eyes_of(animal, coat), text, " ".join(rules)) if x)


def self_test() -> None:
    slugs = all_slugs()
    assert len(slugs) == 57 and len(set(slugs)) == 57, len(slugs)
    for slug in slugs:
        animal, _, coat = parts_of(slug)
        p = prompt_for(slug)
        assert p.startswith(BACKGROUND) and "picture" in BACKGROUND, slug
        stage = parts_of(slug)[1]
        for rule in style_rules(animal, stage):
            assert rule in p, (slug, rule[:40])
        charging = stage == "legendary" and animal != "salmon"
        low = p.lower()
        assert "ground" not in low.replace("background", "").replace("are on the ground", ""), slug
        assert "cross-hatching" in low and "cel-shaded" in low and "slate" not in low, slug
        if animal == "salmon":
            assert SALMON_POSE in p and THREE_QUARTER not in p, slug
            assert not [w for w in ("on all fours", "shoulders", "feet") if w in low], slug
        elif charging:
            assert CHARGE_POSE in p and THREE_QUARTER not in p and SALMON_POSE not in p, slug
            assert "facing right" not in low and "right edge" not in low, slug
            assert "front three-quarter view" in low and "raised mid-stride" in low, slug
            assert "whole, from its head to its rump" in p and "right up to the margin" in p, slug
        else:
            assert THREE_QUARTER in p and SALMON_POSE not in p and CHARGE_POSE not in p, slug
        if animal == "ermine":
            assert ERMINE_OUTLINE in p and "thin cold rim" not in p and "thin pale line" not in p, slug
            if coat == "base":
                assert "pure white fur on the whole head with no dark mask and no dark patches around the eyes; only the tail tip is black" in p, slug
        if animal == "bear":
            assert "plain chest with no white blaze" in p, slug
        if stage == "legendary":
            assert not [w for w in ("towering", "colossal", "gigantic", "rearing") if w in low], slug
            assert "visibly larger and broader than the adult" in p and "no armor, no glow and no magic" in p, slug
            assert "never cropped" in p or animal == "salmon", slug
        if stage == "young":
            assert "broad powerful shoulders" not in p, slug
        if stage == "venerable" or (stage == "legendary" and not charging):
            assert "facing right" in STAGE[animal][stage], slug
        assert SILHOUETTE[animal] in p, slug
        assert "picture" in p and "frame" not in p.lower(), slug
        if animal == "salmon":
            assert SALMON_EYE in p and "painted as one flat fill" in p, slug
        else:
            assert eyes_of(animal, coat) in p and "The eyes are plain animal eyes, nothing glows." in p and "disc" not in low, slug
            assert ("flat dark-brown fill in shadow" in p) == (animal != "ermine"), slug
            if animal == "ermine":
                assert ("no pale mask, no pale ring" in p) == (coat == "rare") and ("clean white as the brow" in p) == (coat != "rare"), slug
        assert "deep black ink shadow" not in low and "ink shadow" not in low, slug
        if charging:
            assert "coat colour still clearly readable" in p, slug
        if stage == "venerable":
            assert not [w for w in ("stays brown", "stays russet", "snow white", "dark grey") if w in STAGE[animal][stage].lower()], slug
        if coat == "winter":
            assert "No snowflakes in the air." in p, slug
        if slug.startswith("stag-") and coat == "rare":
            assert "never russet, brown or tan" in p, slug
        if slug.startswith("stag-") and coat == "winter":
            assert "uniform ash-grey pelt" in p, slug
        if slug.startswith("horse-") and coat in ("base", "winter"):
            assert "a lean bay riding horse, not a draft horse; mane, tail and lower legs solid black; no white socks, no feathered fetlocks, no flaxen hair; the only white is the blaze" in p, slug
        if slug.startswith("horse-") and coat == "rare":
            assert "black down to the hooves" in p, slug
        if slug == "ermine-adult-rare":
            assert "as black as its back, no white bib, no white paws" in p and "never the bulk of a wolverine" in p, slug
        if slug == "ermine-legendary":
            assert "shadow under its heavy brow" not in p and "face and flank in shadow" not in p and "its flank is in shadow" in p, slug
            assert "its white face lit from the front, as bright as its chest" in p and "never a ferret or a polecat" in p, slug
        elif animal == "ermine" and stage == "legendary":
            assert "face and flank in shadow" in p, slug
        if slug == "horse-venerable-rare":
            assert "the pasterns and hooves as black as the legs; the face solid black from forehead to nostrils, no pale stripe, no highlight down the nose" in p and "never blue" in p, slug
        assert "cub" not in p.lower().split() and "cute" not in p.lower(), slug
        assert p.index("nothing glows") < p.index(STAGE[animal][parts_of(slug)[1]][:60]), slug
    # the silhouette sentence is the same on every portrait of an animal (10, the ermine 7)
    for animal in ANIMALS:
        mine = [s for s in slugs if s.startswith(animal + "-")]
        assert len(mine) == (7 if animal == "ermine" else 10), (animal, len(mine))
        assert all(prompt_for(s).count(SILHOUETTE[animal]) == 1 for s in mine), animal
    assert not {"bear-young-rare", "ermine-adult-winter"} & set(slugs)
    for name, (text, pose) in CONCEPTS.items():
        p = prompt_for("bear-legendary", name)
        assert BACKGROUND in p and SILHOUETTE["bear"] in p and EYES in p and "coat colour still clearly readable" in p and "plain chest with no white blaze" in p, name
        assert "no armor, no glow and no magic" in p and "never cropped" in p and text in p, name
        assert (pose or THREE_QUARTER) in p and ((CHARGE_POSE in p) == (pose == CHARGE_POSE)), name
        assert (pose is None) == (THREE_QUARTER in p), name
        assert "ground" not in p.lower().replace("background", ""), name
    stag = prompt_for("stag-legendary")
    assert "immense antlers" in stag and "front leg raised mid-stride" in stag
    assert "no saddle" in prompt_for("horse-legendary") and "tusks" in prompt_for("boar-legendary")
    assert prompt_for("bear-legendary") == prompt_for("bear-legendary", "charge")
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


def folder(slug: str, concept: str | None) -> pathlib.Path:
    return OUT / slug / f"legendary-{concept}" if concept else OUT / slug


def candidates(slug: str, attempt: int, dry_run: bool, concept: str | None = None) -> None:
    global _current_slug
    prompt = prompt_for(slug, concept)
    seed_slug = f"{slug}-{concept}" if concept else slug  # a different draw per concept
    outs = [folder(slug, concept) / f"a{attempt}_c{i}.jpg" for i in range(CANDIDATES)]
    if dry_run:
        print(f"[dry-run] nothing submitted. {CANDIDATES} x {SIZE}x{SIZE}, "
              f"~{CANDIDATES * cost_per_image():.2f} EUR, spent so far {total_spent():.2f} of {BUDGET_EUR:.2f}")
        print(f"\nPROMPT (same for the 4):\n{prompt}\n")
        for i, out in enumerate(outs):
            print(f"c{i}: seed {seed_of(seed_slug, attempt, i)} -> {out}")
        return

    spent = total_spent()
    if spent + CANDIDATES * cost_per_image() > BUDGET_EUR:
        sys.exit(f"budget guard: {spent:.2f} EUR spent, a batch of {CANDIDATES} would pass {BUDGET_EUR:.2f}.")
    _current_slug = slug
    flux._json = _counted_json
    with concurrent.futures.ThreadPoolExecutor(max_workers=CANDIDATES) as pool:
        futures = [
            pool.submit(generate, slug=slug, prompt=prompt, out=out, width=SIZE, height=SIZE,
                        seed=seed_of(seed_slug, attempt, i))
            for i, out in enumerate(outs)
        ]
        for future in futures:
            future.result()  # a guard exit or a missing key must stop the run, not vanish
    print(f"spent so far: {total_spent():.2f} of {BUDGET_EUR:.2f} EUR")


def sheet(slug: str, attempt: int, dry_run: bool, concept: str | None = None) -> None:
    made = [str(o) for o in (folder(slug, concept) / f"a{attempt}_c{i}.jpg" for i in range(CANDIDATES)) if o.exists()]
    if not made:
        sys.exit(f"no candidates for {slug} attempt {attempt}")
    out = folder(slug, concept) / f"a{attempt}_sheet.jpg"
    if dry_run:
        print(f"[dry-run] would write {out} from {len(made)} candidate(s); nothing written")
        return
    subprocess.run(["montage", "-label", "%t", *made, "-tile", "4x", "-geometry", "400x400+6+6",
                    "-pointsize", "20", str(out)], check=True)
    print(out)


def accept(slug: str, attempt: int, i: int, dry_run: bool, concept: str | None = None) -> None:
    src = folder(slug, concept) / f"a{attempt}_c{i}.jpg"
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
        p.add_argument("--concept", choices=sorted(CONCEPTS), help="bear-legendary only: a concept variant, filed in legendary-<concept>/")
        if name == "accept":
            p.add_argument("index", type=int, choices=range(CANDIDATES))
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if not args.command:
        parser.error("a command is required")
    slug = parse_slug(args.slug)
    concept = getattr(args, "concept", None)
    if concept and slug != "bear-legendary":
        sys.exit("--concept only applies to bear-legendary")
    if args.command == "candidates":
        candidates(slug, args.attempt, args.dry_run, concept)
    elif args.command == "sheet":
        sheet(slug, args.attempt, args.dry_run, concept)
    else:
        accept(slug, args.attempt, args.index, args.dry_run, concept)


if __name__ == "__main__":
    main()
