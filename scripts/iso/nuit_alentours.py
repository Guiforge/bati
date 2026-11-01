#!/usr/bin/env python3
"""A6 (iter 4): one night curve for everything. No FLUX, 0 $.

    python3 -I scripts/iso/nuit_alentours.py

The buildings' night is `famille_jour.nuit` (a grade of the day pixels, FROID/CHAUD, a lift toward #2E3552).
The painted ground, the forest, the props, the mice and the foreground used to get a flat 35 % #2E3552 on top
of the day (stage-5/assets.py), which left them barely darker than noon (H3-04, H3-05, anim-22). Here each
gets the same `nuit` with no lights, from its own day file:
- sol/terrain_RC.webp          -> terrain_RC.nuit.webp (same 1656 x 1614 px: one view size for the family)
- foret/<mass>.webp            -> <mass>.nuit.webp (the forest was graded live by a veil; now baked)
- foret/plan_*.webp (day)      -> plan_*.nuit.webp (rewritten)
- accessoires/<nom>.webp       -> <nom>.nuit.webp (rewritten)
- animaux/souris_*.webp        -> souris_*.nuit.webp (rewritten)
- rempart/<piece>.webp, champs/<tile>.webp (F4, scripts/iso/rempart_champs.py) -> <name>.nuit.webp
The day files are never touched. AmbianceCarte drops its flat night veil under the painted layers.
"""

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from famille_jour import ISO, nuit
from PIL import Image


def cuire(jour: pathlib.Path) -> None:
    im = Image.open(jour)
    opaque = im.mode == "RGB"
    n = nuit(im.convert("RGBA"), None)
    out = n.convert("RGB") if opaque else n
    dest = jour.with_name(jour.name.replace(".webp", ".nuit.webp"))
    out.save(dest, "WEBP", quality=80, method=6)
    print(f"{dest.relative_to(ISO)} {dest.stat().st_size // 1024} Ko")


if __name__ == "__main__":
    fichiers = [
        *sorted((ISO / "sol").glob("terrain_??.webp")),
        *sorted(f for f in (ISO / "foret").glob("*.webp") if ".nuit" not in f.name),
        *sorted(f for f in (ISO / "accessoires").glob("*.webp") if ".nuit" not in f.name),
        *sorted(f for f in (ISO / "animaux").glob("souris_*.webp") if ".nuit" not in f.name),
        *sorted(f for d in ("rempart", "champs") for f in (ISO / d).glob("*.webp") if ".nuit" not in f.name),
    ]
    for f in fichiers:
        cuire(f)
