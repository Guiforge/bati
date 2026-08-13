#!/usr/bin/env python3
"""Generate the app icon, and derive the adaptive icon and favicon from it.

  python3 scripts/generate-icon.py

One render, three files. `adaptive-icon.png` and `favicon.png` are produced from `icon.png` by
ImageMagick rather than generated separately, because three independent renders of "the Bati
emblem" would be three subtly different emblems — and the launcher, the task switcher and the
browser tab would each show a different one.

The mark (2026-08 redesign) is a monogram: a capital B built from castle stone, its left stem
a crenellated tower with a hearth-lit amber doorway at its base. B signs the app's name without
writing a word; the tower and the lit hearth carry the build-your-village half of the loop. It
replaced a shield-and-crossed-arms crest that read as generic esports at launcher size — and a
kettlebell concept killed by the fact that the app has no equipment exercises. Chosen across
three rounds (six concepts, then seeds, then refinements), judged each time at 48 px.

**Android masks the adaptive foreground.** The launcher may crop it to a circle, a squircle or a
rounded square, and only the centre 66% is guaranteed to survive. The emblem is therefore scaled
into that safe zone on a transparent field, with `app.json` supplying `#0B0F19` behind it.

**The shipped file was not produced by running this script**: the endpoint is not
byte-deterministic, so re-running even with the winning draw's exact seed (551128749, salt
below) renders a sibling, not a copy. The approved render — made on `flux-2-max`, not the
default endpoint — was copied in and its true prompt and seed recorded in provenance.json; this
script is for the *next* redesign. A close relative of the shipped mark:

    FLUX_ENDPOINT=https://api.bfl.ai/v1/flux-2-max \
    FLUX_SEED_SALT=-3268358439 python3 scripts/generate-icon.py
"""

import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from lib.flux import ROOT, generate, record_derived  # noqa: E402

ICON = (
    "A dual-image app icon emblem: a heavy kettlebell whose body is drawn as a round stone castle "
    "keep — the thick handle is a great stone archway, the bell is the tower with battlements "
    "ringing its shoulder, and one warm amber glowing arched door sits at its base. "
    "Dark-fantasy game emblem style: very thick black ink outlines, flat "
    "cel-shaded night blues; warm amber ember light spills from the doorway onto the stones "
    "around it, and two tiny amber windows glow near the battlements. A faint cyan edge "
    "highlight on the handle only. "
    "The emblem floats centred on a flat, uniform, solid deep obsidian blue (#0B0F19) background "
    "that fills the entire square edge to edge — absolutely no rounded-rectangle tile, no frame, "
    "no border, no drop shadow, no ground surface, no vignette. Large simple stone blocks only, "
    "no fine cracks or micro texture. One confident silhouette readable at 48 pixels. Generous "
    "empty margin on all sides, nothing touching any edge. Square 1:1, flat straight-on view, no "
    "perspective, no scenery, no people, no text, no lettering, no watermark."
)

if __name__ == "__main__":
    icon = ROOT / "assets" / "icon.png"
    if not generate(slug="app-icon", prompt=ICON, out=icon, width=1024, height=1024):
        sys.exit(1)

    # Adaptive foreground: the emblem inside the 66% safe zone, transparent around it so the
    # launcher's own mask and app.json's backgroundColor do the framing.
    subprocess.run(
        ["magick", str(icon), "-resize", "676x676", "-background", "none",
         "-gravity", "center", "-extent", "1024x1024",
         str(ROOT / "assets" / "adaptive-icon.png")],
        check=True,
    )
    record_derived(ROOT / "assets" / "adaptive-icon.png", icon, "resized to the 66% safe zone")
    # Favicon: 48x48 is what the previous one was, and what app.json points the web build at.
    subprocess.run(
        ["magick", str(icon), "-resize", "48x48", str(ROOT / "assets" / "favicon.png")],
        check=True,
    )
    record_derived(ROOT / "assets" / "favicon.png", icon, "resized to 48x48")
    # Store listing icons (Play wants 512x512; F-Droid and IzzyOnDroid read the same file). Both
    # locales get the same image — the mark carries no text to localise.
    for locale in ("en-US", "fr-FR"):
        store = ROOT / "fastlane" / "metadata" / "android" / locale / "images" / "icon.png"
        subprocess.run(["magick", str(icon), "-resize", "512x512", str(store)], check=True)
        record_derived(store, icon, "resized to 512x512 for the store listing")
    print("  ✓ adaptive-icon.png, favicon.png and store icons derived from icon.png")
