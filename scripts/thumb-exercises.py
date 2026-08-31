#!/usr/bin/env python3
"""Derive list-sized thumbnails from the full exercise and quest art.

    python3 scripts/thumb-exercises.py
    python3 scripts/thumb-exercises.py --dry-run

fit-small-art.py resizes in place, and it deliberately skips the exercise art because the session
hero renders it full-bleed — `sessionArtHeight` gives it ~1100px of width on a modern phone, so
1280 is right there. That reasoning holds for the hero and nowhere else: the picker sheet, the
editor, the journal and the rewards screen all show the same art at 36-56px.

So this derives a second copy instead of shrinking the original. The cost being paid is memory,
not bundle: a 1280x1280 decode is ~6.5 MB of bitmap, the picker sheet shows about ten at once,
and `dumpsys gfxinfo` reported slow bitmap uploads on 100% of frames while scrolling it — 400ms
median on a release build. At 128 the same ten cost ~0.65 MB in total.

128 leaves 2x headroom over the largest slot these fill (56px in the picker) on a 3x screen.

Run after generate-exercises.py and to-webp.py, whenever the source art changes.
"""

import argparse
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Longest edge. The biggest slot a thumbnail fills is the picker sheet's 56px tile; 128 covers it
# on a 3x screen with room to spare, and the whole set still weighs well under 100 KB.
SIZE = 128

# Where the subject actually is, for the art that is a landscape rather than a figure.
#
# Every other movement in the catalogue is drawn as one person filling the frame, so shrinking
# the whole square to 128 still reads as a person doing a thing. The three expeditions are wide
# shots on purpose — the distance is the subject at full size — and at 48 pt in the picker that
# same composition is a grey smudge with an orange dot beside sixty legible neighbours, which
# reads as a broken image rather than a different one.
#
# So the thumbnail is a different crop of the same painting, not a different painting. Boxes are
# fractions of the source, square, and named per image because there is no rule that finds a
# lantern in the dark. Anything absent here is thumbnailed whole, which is right for a figure.
CROPS: dict[str, tuple[float, float, float, float]] = {
    "wardens_walk": (0.30, 0.55, 0.75, 1.00),
    "messengers_run": (0.18, 0.40, 0.63, 0.85),
    "outriders_ride": (0.20, 0.28, 0.80, 0.88),
}


# Two families now, and the second arrived for the same reason as the first: the journal's history
# rows draw a quest's cover in a 50px tile, and a quest cover is 1024x768 -> ~3 MB of bitmap per
# row, a hundred rows deep. The exercise art learned this lesson first; nothing about it was
# specific to exercises.
FAMILIES: tuple[tuple[str, str], ...] = (
    ("assets/images/exercises/*.webp", "assets/images/exercises/thumbs"),
    ("assets/images/quests/*.webp", "assets/images/quests/thumbs"),
)


def sources(glob: str, out_dir: pathlib.Path) -> list[pathlib.Path]:
    return sorted(p for p in ROOT.glob(glob) if p.parent != out_dir)


def thumbnail(path: pathlib.Path, out_dir: pathlib.Path) -> int:
    """Write the derived thumbnail. Returns its size in bytes."""
    image = Image.open(path)
    box = CROPS.get(path.stem)
    if box is not None:
        width, height = image.size
        left, top, right, bottom = box
        image = image.crop(
            (round(left * width), round(top * height), round(right * width), round(bottom * height))
        )
    # LANCZOS: the art is ink-outlined like the emblems, and a cheaper filter frays the outline.
    image.thumbnail((SIZE, SIZE), Image.Resampling.LANCZOS)
    out = out_dir / path.name
    image.save(out, "WEBP", quality=82)
    return out.stat().st_size


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="report only, change nothing")
    args = parser.parse_args()

    total_before = 0
    total_after = 0
    total_count = 0

    for glob, out_name in FAMILIES:
        out_dir = ROOT / out_name
        found = sources(glob, out_dir)
        if not found:
            print(f"No art at {glob}.", file=sys.stderr)
            return 1

        if args.dry_run:
            print(f"{len(found)} files would be thumbnailed to {SIZE}px into {out_dir}.")
            continue

        out_dir.mkdir(parents=True, exist_ok=True)
        total_before += sum(p.stat().st_size for p in found)
        total_after += sum(thumbnail(p, out_dir) for p in found)
        total_count += len(found)

    if args.dry_run:
        return 0

    print(
        f"Wrote {total_count} thumbnails: {total_before / 1e6:.2f} MB of source art -> "
        f"{total_after / 1e3:.0f} KB of thumbnails."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
