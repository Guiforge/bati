#!/usr/bin/env python3
"""Bring the art that renders small down to a size its slot can actually use.

    python3 scripts/fit-small-art.py
    python3 scripts/fit-small-art.py --dry-run

docs/architecture/performance.md rule #2 asks for WebP "sized to display resolution". to-webp.py
did the format half; this is the sizing half, and only for the art whose slot is small.

The saving that matters here is memory, not bundle. A 1024x1024 image decoded for a 48px icon
still costs about 4 MB of bitmap, and the village shows twenty of them at once. Dropping to 256
is roughly a sixteenth of that, while still leaving 4x headroom over the largest slot any of
these fills on a 3x-density screen.

Deliberately *not* applied to the tier scenes, the quest and adventure covers, the exercise art
or the onboarding backgrounds: those render full-bleed at the width of the display, where 1024 is
already slightly under a modern phone's pixel width. Shrinking them would be visible.

The villager cameos used to be excluded here too, on the grounds that a cameo is capped at 38% of
the window height (~730px on a 3x screen) and so had almost nothing to give back. That ceiling is
not the one that shipped: `components/chorus/cameoAnchor.ts` draws the figure at
`min(22% of height, 45% of width, 200dp)`, which is 600px at 3x and usually nearer 530. The
exclusion outlived the number it was reasoning about, which is exactly how a 3.1 MB bitmap ends
up decoded over the running session screen — the one place in this app where a dropped frame is
a tap the hero has to make twice.

Run after cutout.py, never before: the flood fill wants full resolution to work with,
and a resized emblem has soft edges the fill would stop at.
"""

import argparse
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent

# (glob, longest edge).
#
# Emblems are 512, not the 256 their grid slot would justify: tapping a building now opens a
# detail sheet showing the same icon at ~180dp, which wants ~540px on a 3x screen. 256 was
# visibly soft there. Still a sixteenth of the 1024 they are rendered at.
#
# Avatars stay at 256: their largest slot is the 72px header portrait.
SETS = [
    ("assets/images/village/buildings/*.webp", 512),
    ("assets/images/village/sport_*.webp", 512),
    ("assets/avatar/*.webp", 256),
    # Cameos: 640 clears cameoMaxHeight's 200dp ceiling on a 3x screen with a little to spare.
    # Keep this in step with HEIGHT_CAP in components/chorus/cameoAnchor.ts.
    ("assets/images/villagers/*.webp", 640),
]


def targets() -> list[tuple[pathlib.Path, int]]:
    found: list[tuple[pathlib.Path, int]] = []
    for pattern, size in SETS:
        found.extend((p, size) for p in sorted(ROOT.glob(pattern)))
    return found


def fit(path: pathlib.Path, size: int) -> tuple[int, int] | None:
    """Downscale in place. Returns (before, after) bytes, or None if already small enough."""
    image = Image.open(path)
    if max(image.size) <= size:
        return None

    before = path.stat().st_size
    # LANCZOS: these are ink-outlined emblems, and a cheaper filter frays the outline.
    image.thumbnail((size, size), Image.Resampling.LANCZOS)
    # `quality` is ignored for lossless, and alpha from the cutout has to survive either way.
    image.save(path, "WEBP", quality=90)
    return before, path.stat().st_size


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="report only, change nothing")
    args = parser.parse_args()

    found = targets()
    if not found:
        print("No small-slot art found.", file=sys.stderr)
        return 1

    if args.dry_run:
        oversized = [(p, s) for p, s in found if max(Image.open(p).size) > s]
        print(f"{len(found)} files, {len(oversized)} larger than their slot needs.")
        return 0

    before_total = after_total = 0
    done = 0
    for path, size in found:
        result = fit(path, size)
        if result is None:
            continue
        before, after = result
        before_total += before
        after_total += after
        done += 1

    if not done:
        print("Everything already fits.")
        return 0

    saved = before_total - after_total
    print(
        f"Resized {done} files: {before_total / 1e6:.2f} MB -> {after_total / 1e6:.2f} MB "
        f"({saved / 1e6:.2f} MB saved, {100 * saved / before_total:.0f}%)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
