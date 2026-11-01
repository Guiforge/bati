#!/usr/bin/env python3
"""F4: the painted wall, the painted fields and the regraded props enter the app. No FLUX, 0 $.

    python3 -I scripts/iso/rempart_champs.py

From the painter's retained P4 files (docs/designs/village-loop/evidence/P4, Mara's verdict):
- `assets/images/village/iso/rempart/<rough|solid>_<piece>.webp`: castle_wall's wall, one piece a cell
  (run_gx, run_gy, corner, end: arm toward +gx, end_mgx: toward -gx, end_pgy: toward +gy), canvas
  512 x 640 at S, anchor (256, 576) on the cell's bottom corner (components/village/iso/rempart.ts).
  Mara P4-12: at solid the south wall's own pieces (run_gx, end, end_mgx) are lowered by BAISSE of
  their height, the body cut and the merlons kept, so the first row does not bury the wall walk.
- `champs/<culture>.webp` (the hedge on the back edge) and `champs/<culture>_nu.webp` (none), canvas
  512 x 384, anchor (256, 328) on the cell's bottom corner (components/village/iso/champs.ts).
- `accessoires/caisses_2.webp`, `sacs_de_grain_2.webp`: the regraded day props.
- each one's night, `<name>.nuit.webp`, by nuit_alentours.cuire (the one night curve).
- `components/village/iso/rempartMasques.ts`: each wall piece's tap mask (the night has the same alpha).
"""

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
from famille_jour import LICENCE, ROOT
from iso_loop import tap_mask
from nuit_alentours import cuire
from PIL import Image

ISO = ROOT / "assets/images/village/iso"
P4 = ROOT / "docs/designs/village-loop/evidence/P4"
MASQUES = ROOT / "components/village/iso/rempartMasques.ts"

PIECES = ("run_gx", "run_gy", "corner", "end", "end_mgx", "end_pgy")
# Mara P4-12: the south wall's pieces at solid. The corner keeps its height: it stands above the U.
SUD = ("run_gx", "end", "end_mgx")
BAISSE = 64  # px at S: 20 % of the 308 px body (8 dp)
COUPE = 380  # px: below every body's top edge (231 at most) + BAISSE, above every foot (463 at least)
# Retained no-hedge tile per culture (Mara, P4), and the app's name for each culture.
CULTURES = {"ble": ("wheat", 2), "legumes": ("veg", 1), "labour": ("plough", 2)}
MODELE = "FLUX (Black Forest Labs API), P4 painting of"


def baisser(im: Image.Image) -> Image.Image:
    """The band [COUPE - BAISSE, COUPE) taken out of the body, everything above it brought down."""
    out = Image.new("RGBA", im.size)
    out.paste(im.crop((0, COUPE, im.width, im.height)), (0, COUPE))
    out.paste(im.crop((0, 0, im.width, COUPE - BAISSE)), (0, BAISSE))
    return out


def poser(jour: Image.Image, dest: pathlib.Path, derive: pathlib.Path, how: str) -> None:
    from lib import flux

    dest.parent.mkdir(parents=True, exist_ok=True)
    jour.save(dest, "WEBP", quality=90, method=6)
    cuire(dest)
    for f, h in ((dest, how), (dest.with_name(dest.name.replace(".webp", ".nuit.webp")),
                               f"{how}; its night by scripts/iso/nuit_alentours.py (no FLUX)")):
        flux._record(str(f.relative_to(ROOT)), {
            "model": f"{MODELE} {derive.name.split('.')[0]}", "derived_from": str(derive.relative_to(ROOT)),
            "how": h, "licence": LICENCE})


def hexa(m: dict) -> dict:
    """iso_loop.tap_mask's rows as the app's Masque: 4 bits a hex char, each row padded to a whole char."""
    bits = "".join(
        f"{int(r[i:i + 4].ljust(4, '0'), 2):x}" for r in m["rows"] for i in range(0, len(r), 4))
    return {"pas": m["step"], "w": m["w"], "h": m["h"], "bits": bits}


def mur() -> dict:
    masques = {}
    for stade in ("rough", "solid"):
        for p in PIECES:
            essai = 2 if (stade, p) == ("solid", "end") else 1
            src = P4 / f"wall_{stade}_{p}.a{essai}.post2.cut.webp"
            im = Image.open(src).convert("RGBA")
            assert im.size == (512, 640), f"{src.name}: {im.size}"
            how = "the retained P4 day painting, re-encoded WebP q90"
            if stade == "solid" and p in SUD:
                im = baisser(im)
                how += f", lowered {BAISSE} px (Mara P4-12)"
            poser(im, ISO / "rempart" / f"{stade}_{p}.webp", src, how)
            masques[f"{stade}_{p}"] = hexa(tap_mask(im))
    return masques


def champs() -> None:
    for nom, (culture, essai) in CULTURES.items():
        for dest, src in ((f"{nom}.webp", P4 / f"field_{culture}.a1.post2.cut.webp"),
                          (f"{nom}_nu.webp", P4 / f"field_{culture}_nh.a{essai}.post.cut.webp")):
            im = Image.open(src).convert("RGBA")
            assert im.size == (512, 384), f"{src.name}: {im.size}"
            poser(im, ISO / "champs" / dest, src, "the retained P4 day painting, re-encoded WebP q90")


def accessoires() -> None:
    for nom, src in (("caisses_2", "caisses_2.regrade2.webp"), ("sacs_de_grain_2", "sacs_de_grain_2.regrade.webp")):
        f = P4 / "accessoires" / src
        im = Image.open(f).convert("RGBA")
        assert im.size == (240, 220), f"{f.name}: {im.size}"
        # The props' family encoding (stage-5/assets.py `sauve`).
        dest = ISO / "accessoires" / f"{nom}.webp"
        im.save(dest, "WEBP", quality=82, method=6)
        cuire(dest)


def ecrire_masques(masques: dict) -> None:
    corps = "\n".join(f'  {k}: {json.dumps(v)},' for k, v in sorted(masques.items()))
    MASQUES.write_text(
        "// Generated by scripts/iso/rempart_champs.py from assets/images/village/iso/rempart/: do not edit.\n"
        "// Each painted wall piece's tap mask (iso_loop.tap_mask, one bit per 8 px); its night has the same alpha.\n\n"
        'import type { Masque } from "./masque";\n\n'
        f"export const MASQUES_PANS = {{\n{corps}\n}} as const satisfies Record<string, Masque>;\n")


if __name__ == "__main__":
    ecrire_masques(mur())
    champs()
    accessoires()
    print("ok")
