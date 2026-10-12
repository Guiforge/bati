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

Needs `cwebp` (libwebp-tools) on the PATH for the animal portraits.

Run after cutout.py, never before: the flood fill wants full resolution to work with,
and a resized emblem has soft edges the fill would stop at.
"""

import argparse
import pathlib
import shutil
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent

# (glob, longest edge, WebP quality, alpha quality, method). The last three are what every set
# but the animals has always used: q90, lossless alpha, PIL's default method 4.
#
# Emblems are 512, not the 256 their grid slot would justify: tapping a building now opens a
# detail sheet showing the same icon at ~180dp, which wants ~540px on a 3x screen. 256 was
# visibly soft there. Still a sixteenth of the 1024 they are rendered at.
#
# Avatars stay at 256: their largest slot is the 72px header portrait.
SETS = [
    ("assets/images/village/buildings/*.webp", 512, 90, 100, 4),
    ("assets/images/village/sport_*.webp", 512, 90, 100, 4),
    ("assets/avatar/*.webp", 256, 90, 100, 4),
    # Cameos: 640 clears cameoMaxHeight's 200dp ceiling on a 3x screen with a little to spare.
    # Keep this in step with HEIGHT_CAP in components/chorus/cameoAnchor.ts.
    ("assets/images/villagers/*.webp", 640, 90, 100, 4),
    # Crest animal portraits: drawn up to 192dp, sized and encoded by animal_args() below (cwebp,
    # because PIL cannot do -sharp_yuv). 53 of them, 2.28 MiB at 512 and q90, about 0.67 here.
    # ponytail: the encode starts from the 512 that to-webp.py and the first fit already wrote
    # once, so each portrait is lossy twice; re-fitting from the 1024 JPEG is the fix if an
    # artefact ever shows, at the price of keeping the originals in the repo.
    ("assets/images/animals/*.webp", 448, 0, 0, 6),
]

# The nine amber-eyed bears (bear-venerable-winter is not one: its eyes are dull from the source).
# At q70 chroma subsampling turns the iris grey-blue, so they get
# q85 with -sharp_yuv (chroma computed from full-res RGB): eye colour error 8.8 against 15.8 at
# q70 and 6.9 at the old q90, for 0.23 MiB less than q90. Everything else is q60 with -sns 100.
AMBER_EYES = {
    "bear-adult",
    "bear-adult-rare",
    "bear-adult-winter",
    "bear-legendary",
    "bear-legendary-rare",
    "bear-legendary-winter",
    "bear-venerable",
    "bear-venerable-rare",
    "bear-young",
}


def animal_args(stem: str) -> tuple[int, list[str]]:
    """(longest edge, cwebp flags) for a crest portrait."""
    # Young and venerable draw at most 192dp in a stadium festival, so 400 clears 576 px; the
    # legendary and adult portraits keep 448.
    size = 400 if "-young" in stem or "-venerable" in stem else 448
    if stem in AMBER_EYES:
        return size, ["-q", "85", "-sharp_yuv"]
    return size, ["-q", "60", "-sns", "100"]


def targets() -> list[tuple[pathlib.Path, int, int, int, int]]:
    found = []
    for pattern, size, quality, alpha_quality, method in SETS:
        for p in sorted(ROOT.glob(pattern)):
            found.append((p, size, quality, alpha_quality, method))
    return found


def fit(path: pathlib.Path, size: int, quality: int, alpha_quality: int, method: int) -> tuple[int, int] | None:
    """Downscale in place. Returns (before, after) bytes, or None if already small enough."""
    image = Image.open(path)
    animal = path.parent.name == "animals"
    if animal:
        size, flags = animal_args(path.stem)
    if max(image.size) <= size:
        return None

    before = path.stat().st_size
    # LANCZOS: these are ink-outlined emblems, and a cheaper filter frays the outline.
    image.thumbnail((size, size), Image.Resampling.LANCZOS)
    if animal:
        with tempfile.TemporaryDirectory() as tmp:
            png = pathlib.Path(tmp) / "in.png"
            image.save(png)
            subprocess.run(
                ["cwebp", "-quiet", "-m", str(method), "-alpha_q", str(alpha_quality), *flags, str(png), "-o", str(path)],
                check=True,
            )
    else:
        image.save(path, "WEBP", quality=quality, alpha_quality=alpha_quality, method=method)
    return before, path.stat().st_size


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="report only, change nothing")
    args = parser.parse_args()

    if shutil.which("cwebp") is None:
        print("cwebp not found, install libwebp-tools", file=sys.stderr)
        return 1

    found = targets()
    if not found:
        print("No small-slot art found.", file=sys.stderr)
        return 1

    if args.dry_run:
        oversized = [
            t
            for t in found
            if max(Image.open(t[0]).size)
            > (animal_args(t[0].stem)[0] if t[0].parent.name == "animals" else t[1])
        ]
        print(f"{len(found)} files, {len(oversized)} larger than their slot needs.")
        return 0

    before_total = after_total = 0
    done = 0
    for path, *settings in found:
        result = fit(path, *settings)
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
