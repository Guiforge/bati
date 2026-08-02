#!/usr/bin/env python3
"""Generate the full-screen backgrounds and the exercise placeholder.

  python3 scripts/generate-backgrounds.py            # all of them
  python3 scripts/generate-backgrounds.py new_city

These are the only images the UI deliberately hides behind its own content, so they are written
to be quiet. `AppBackground` paints `new_city` at **0.18 opacity** under a `$background` wash on
every screen; anything with a bright focal point or a busy middle reads as dirt through that wash
rather than as art. Hence: low contrast, no single hotspot, detail pushed to the edges.

`placeholder` is the odd one out — it is what an exercise falls back to when its art is missing
(six call sites), so it matches the exercise family instead: square, on the void.

`assets/splash-bg1.jpg` and `assets/onboardings/splash-bg1.jpg` were byte-identical duplicates.
Only the onboarding copy is generated; the root copy is written from it, so they cannot drift.
"""

import concurrent.futures
import pathlib
import shutil
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from lib.flux import CONCURRENCY, ROOT, generate, record_derived  # noqa: E402

STYLE = (
    "Rendered as a dark-fantasy Franco-Belgian graphic-novel illustration: confident black ink "
    "outlines and flat cel-shaded colour with hard-edged shadows. The palette is anchored in deep "
    "obsidian blue (#0B0F19), overall very dark and low in contrast with no bright focal point and "
    "no light source pointed at the viewer, the composition open and quiet through the middle with "
    "its detail gathered towards the edges, falling off into darkness at every border. A wide 4:3 "
    "composition filling the frame edge to edge. No people anywhere in frame, no lettering and no "
    "watermark."
)

PLACEHOLDER = (
    "A single stylised emblem centred on a deep obsidian blue (#0B0F19) void: a plain circular "
    "stone medallion carved with a simple abstract figure at rest, lit by a soft electric-blue rim "
    "light, nothing else in frame. Rendered as a dark-fantasy Franco-Belgian graphic-novel "
    "illustration with confident black ink outlines and flat cel-shaded colour, square 1:1 "
    "composition, deliberately understated because it stands in for art that is missing. No "
    "lettering, no watermark."
)

# (slug, path relative to assets/, prompt, (width, height)). Explicit paths because this family
# spans two directories and two aspect ratios, which is more than run() can carry for one batch.
JOBS = [
    ("building", "onboardings/building.jpg",
     "A wide establishing shot from a dark cliff edge looking down over a fantasy settlement under "
     "construction at blue hour: timber scaffolding and a wooden crane rising over half-built "
     "stone cottages, a few small warm amber windows glowing far below, deep obsidian sky above "
     "with faint stars, mist pooling between the buildings. The valley is quiet and deserted.",
     (1280, 960)),
    ("new_city", "onboardings/new_city.jpg",
     "A very dark, very distant wide shot of a fantasy city skyline at night seen far off across a "
     "misty valley: faint silhouettes of towers and rooftops barely separated from the night sky, "
     "a scatter of tiny dim amber windows, heavy mist swallowing the lower half of the scene. "
     "Almost abstract, extremely subdued, quiet enough to sit behind text.",
     (1280, 960)),
    ("splash-bg1", "onboardings/splash-bg1.jpg",
     "A wide shot of an empty misty forest clearing at deep blue hour, tall dark pines ringing it "
     "and fading into fog, a soft unlit ground of moss and scattered stone, the sky a deep obsidian "
     "blue with no moon. Still, cold and completely deserted.",
     (1280, 960)),
    ("splash-bg3", "splash-bg3.jpg",
     "A wide shot of a dark mountain pass at night: two great rock walls falling away into shadow "
     "on either side, a narrow band of star-lit sky between them, drifting cloud low in the gap. "
     "Empty, vast and quiet.",
     (1280, 960)),
    ("placeholder", "placeholder.jpg", PLACEHOLDER, (1280, 1280)),
]

if __name__ == "__main__":
    only = set(sys.argv[1:])
    selected = [j for j in JOBS if not only or j[0] in only]
    if only and not selected:
        sys.exit(f"no slug matched {sorted(only)}; known: {sorted(j[0] for j in JOBS)}")

    print(f"{len(selected)} image(s), {min(CONCURRENCY, len(selected))} at a time\n")
    with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        futures = [
            pool.submit(
                generate,
                slug=slug,
                prompt=prompt if slug == "placeholder" else f"{prompt} {STYLE}",
                out=ROOT / "assets" / rel,
                width=w,
                height=h,
                quality=86,
            )
            for slug, rel, prompt, (w, h) in selected
        ]
        failed = sum(1 for f in concurrent.futures.as_completed(futures) if not f.result())

    # splash-bg1 is required from the assets root too; copying rather than regenerating is what
    # keeps the two copies identical.
    src = ROOT / "assets" / "onboardings" / "splash-bg1.jpg"
    if src.is_file() and any(s == "splash-bg1" for s, *_ in selected):
        shutil.copyfile(src, ROOT / "assets" / "splash-bg1.jpg")
        record_derived(ROOT / "assets" / "splash-bg1.jpg", src, "verbatim copy")

    print(f"\n{len(selected) - failed}/{len(selected)} generated, {failed} failed.")
    sys.exit(1 if failed else 0)
