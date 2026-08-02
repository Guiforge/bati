#!/usr/bin/env python3
"""Generate the app icon, and derive the adaptive icon and favicon from it.

  python3 scripts/generate-icon.py

One render, three files. `adaptive-icon.png` and `favicon.png` are produced from `icon.png` by
ImageMagick rather than generated separately, because three independent renders of "the Bati
emblem" would be three subtly different emblems — and the launcher, the task switcher and the
browser tab would each show a different one.

The mark itself is unchanged in concept: a shield carrying a castle tower over crossed muscular
arms, electric blue on obsidian. Tower for the village you build, arms for the training that
builds it. Only its provenance changed — see scripts/lib/flux.py.

**Android masks the adaptive foreground.** The launcher may crop it to a circle, a squircle or a
rounded square, and only the centre 66% is guaranteed to survive. The emblem is therefore scaled
into that safe zone on a transparent field, with `app.json` supplying `#0B0F19` behind it.

The shipped mark is `FLUX_SEED_SALT=9`, chosen from three candidates: it has the boldest
silhouette at 48 px and keeps the whole crest in the blue palette, where another draw gave the
arms skin tones that broke it. Reproduce it with:

    FLUX_SEED_SALT=9 python3 scripts/generate-icon.py
"""

import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from lib.flux import ROOT, generate  # noqa: E402

ICON = (
    "A bold esports-style app icon crest, centred and symmetrical on a flat deep obsidian blue "
    "(#0B0F19) background: a heraldic shield carrying a crenellated stone castle tower across its "
    "upper half, and across its lower half two heavily muscled human arms crossed over one "
    "another, each ending in a tightly clenched fist. The arms are thick, powerful and clearly "
    "anatomical, with defined biceps and forearms. "
    "Drawn as a modern dark-fantasy game crest: very thick black ink outlines, bold flat "
    "cel-shaded fills in deep blue with brilliant electric-cyan highlights, and a strong glowing "
    "cyan rim light around the whole crest. High contrast and graphic, few large shapes, so that "
    "it still reads as one confident silhouette at 48 pixels. Generous empty margin on all four "
    "sides with nothing touching any edge. Square 1:1, flat straight-on symmetrical view, no "
    "perspective, no scenery, no text, no lettering, no watermark."
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
    # Favicon: 48x48 is what the previous one was, and what app.json points the web build at.
    subprocess.run(
        ["magick", str(icon), "-resize", "48x48", str(ROOT / "assets" / "favicon.png")],
        check=True,
    )
    print("  ✓ adaptive-icon.png and favicon.png derived from icon.png")
