#!/usr/bin/env python3
"""Give the village emblems an alpha channel, by removing the void they were painted on.

    python3 scripts/cutout-emblems.py            # cut out every emblem still opaque
    python3 scripts/cutout-emblems.py --dry-run

`EMBLEM_STYLE` in generate-village.py asks for "one object, isolated and centered on a deep
obsidian blue (#0B0F19) void background". FLUX delivers exactly that — an *opaque* square. Two
things in the village screen assume otherwise, and both were visibly broken on device:

  * The "to build" grid tints unbuilt icons with `tintColor` to get "same shape, no detail".
    `tintColor` replaces every non-transparent pixel, so an opaque background means the whole
    1024² square is repainted: eleven identical navy blocks instead of eleven silhouettes.
  * Built tiles sit on `$surface` (#101322), which is not the painted void, and the emblems do
    not even agree with each other — corners measured (11,20,64), (28,32,49) and (8,11,33). So
    some icons showed a visible square patch and others did not.

The fix is on the art, not the screen: flood the connected background from the four corners and
make it transparent.

30 is the default because of the watchtower: its frame has dark gaps the flood escapes through,
and at 60 it leaks inside and hollows the tower out. Eighteen emblems are clean at 30.

The exceptions below are not tuning-by-taste. Most emblems sit on a flat void, but a few came
back on a *radial* background that brightens toward the object, so a flood seeded in the dark
corners stops partway and leaves a disc hugging the subject. Extra seeds do not help (they land
in already-cleared pixels); the barrier is the gradient itself. Each was raised to the lowest
value that clears its disc with the subject still whole: checked at 30/60/90/120.

Only the emblems. The tier scenes, covers and exercise art are full-bleed illustrations whose
background *is* the picture.
"""

import argparse
import json
import pathlib
import sys

from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
VILLAGE = ROOT / "assets" / "images" / "village"
PROVENANCE = ROOT / "scripts" / "provenance.json"

# See the module docstring: bounded above by the watchtower, which leaks at 60.
THRESHOLD = 30

# The emblems painted on a radial background rather than a flat void. Measured, not guessed.
THRESHOLD_OVERRIDES = {"sport_legs": 60, "sport_shoulder": 120, "dragon_lair": 60}


def threshold_for(stem: str) -> int:
    """The override follows a building across its three states.

    Keyed on the base name, because the stage suffix is not part of the identity: `sport_legs`
    and `sport_legs_rough` are the same subject painted on the same radial background, and looking
    the stem up directly meant every `_rough` and `_grand` silently fell back to the default. That
    is exactly how three of the sixty shipped with a disc of background still hugging them.
    """
    base = stem.removesuffix("_rough").removesuffix("_grand")
    return THRESHOLD_OVERRIDES.get(stem, THRESHOLD_OVERRIDES.get(base, THRESHOLD))


def emblems() -> list[pathlib.Path]:
    """The 14 building icons and the 6 sport sprites — never the tier scenes beside them."""
    return sorted(
        [*(VILLAGE / "buildings").glob("*.webp"), *VILLAGE.glob("sport_*.webp")]
    )


def cut_out(path: pathlib.Path) -> float | None:
    """Make the connected border background transparent. Returns the % cleared, None if already."""
    image = Image.open(path)
    if image.mode == "RGBA" and image.getchannel("A").getextrema()[0] == 0:
        return None  # already cut out; re-running must not re-flood a transparent edge

    image = image.convert("RGBA")
    width, height = image.size
    threshold = threshold_for(path.stem)
    for corner in ((0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)):
        if image.getpixel(corner)[3] == 0:
            continue
        ImageDraw.floodfill(image, corner, (0, 0, 0, 0), thresh=threshold)

    alpha = image.getchannel("A")
    cleared = sum(1 for pixel in alpha.get_flattened_data() if pixel == 0)
    share = 100 * cleared / (width * height)

    # An emblem is one centred object on a void: clearing almost nothing means the flood never
    # took, and clearing almost everything means it ate the subject. Either way, do not ship it.
    if not 30 <= share <= 92:
        print(f"  !! {path.name}: cleared {share:.0f}% — refusing, check this one by hand")
        return None

    image.save(path, "WEBP", quality=90)
    return share


def note_in_ledger(paths: list[pathlib.Path]) -> None:
    """Record the cut on each entry, beside the re-encode note to-webp.py already left.

    The render itself is unchanged — same model, same prompt, same seed — so the entry stays
    where it is rather than becoming a derivative of a file that no longer exists.
    """
    ledger = json.loads(PROVENANCE.read_text(encoding="utf-8"))
    for path in paths:
        key = str(path.relative_to(ROOT))
        if key not in ledger:
            print(f"  !! no provenance for {key}", file=sys.stderr)
            continue
        threshold = threshold_for(path.stem)
        ledger[key]["cutout"] = f"background flood-filled to alpha, threshold {threshold}"
    PROVENANCE.write_text(
        json.dumps(dict(sorted(ledger.items())), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="report only, change nothing")
    args = parser.parse_args()

    targets = emblems()
    if not targets:
        print("No emblems found — has the art been generated?", file=sys.stderr)
        return 1

    if args.dry_run:
        opaque = [p for p in targets if Image.open(p).mode != "RGBA"]
        print(f"{len(targets)} emblems, {len(opaque)} still opaque.")
        return 0

    done = []
    for path in targets:
        share = cut_out(path)
        if share is not None:
            done.append(path)
            print(f"  {path.name:28s} {share:5.1f}% cleared")

    if done:
        note_in_ledger(done)
    print(f"Cut out {len(done)} of {len(targets)} emblems.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
