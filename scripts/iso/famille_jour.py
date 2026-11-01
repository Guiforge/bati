#!/usr/bin/env python3
"""F2: the day-painted building family enters the app, and its night is made from it. No FLUX, 0 $.

    python3 -I scripts/iso/famille_jour.py              # sprites, nights, sidecars, provenance
    python3 -I scripts/iso/famille_jour.py --regen      # then the tap truth, the reference sprites, the index
    python3 -I scripts/iso/famille_jour.py --liste      # the retained file of each stage, nothing written

Rerunnable: per stage it takes the newest retained `.post*.cut.webp` of the painter's evidence (RETENUS),
so a later fix (`.post5.cut.webp`, in any F1-vague*/ folder) lands by running it again. A stage with no
retained file keeps what it has.

Per stage it writes, from the day painting alone:
- `assets/images/village/iso/<code>/<stade>.jour.webp`: the day sprite, re-encoded WebP q90 (same canvas, anchor,
  size as the family; the anchor and canvas come from the blockout's anchor.json, as iso_loop.write_sprite).
- `<stade>.nuit.webp`: the night, a grade of the same pixels (NUIT below) with the lights relit in `isoLueur`
  (#F0A848) from the blockout's emissive mask (the enriched _v2 blockout when there is one, see V2). Same alpha
  as the day: the tap mask, the shadows and the accroches are the same in both lights.
- the two sidecars (`.jour.json`, `.nuit.json`, identical) and their provenance entries.
The windmill's sails board gets the same treatment: `windmill_sails.jour.webp` and `windmill_sails.webp` (night).
"""

import json
import os
import pathlib
import re
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))
from PIL import Image, ImageChops, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parents[2]
ISO = ROOT / "assets/images/village/iso"
EVID = ROOT / "docs/designs/village-loop/evidence"
RENDERS = ROOT / "scripts/iso/blockouts/renders"
# The enriched blockouts (hall grand, forge grand, wave 3): out of the repo, made by scripts/iso/blockouts/gen_v2*.py + render_v2.py.
V2 = pathlib.Path.home() / ".cache/bati-art-loop/iso/blockouts_v2/renders"

# The retained painting of each stage (Mara, F1): (file stem, attempt or None), searched in every
# evidence/F1-vague*/ folder. The newest `<stem>[.aN].post<k>.cut.webp` wins (highest k, then the
# latest file); with an attempt, a file naming another attempt is never taken.
# Wave 1: tent_rough a1, tent_solid a2, farm_solid a2, farm_grand a2, the others a1 (post3 is cut from those).
# Wave 2: hall grand v2, forge grand v2, windmill, barn, well. Wave 3: all a1 but fountain_rough and
# observatory_rough (a2). Wave 4: Mara's post4 fixes of wave 3 (a1), fountain_solid repainted (a3),
# high_road rough a1, solid a2, grand a1.
_V1 = ["campfire_rough", "campfire_solid", "campfire_grand", "farm_rough", "farm_solid", "farm_grand",
       "heroes_hall_rough", "heroes_hall_solid", "tent_rough", "tent_solid", "tent_grand", "forge_rough",
       "forge_solid", "windmill_solid"]
_V2 = ["windmill_rough", "windmill_grand", "barn_rough", "barn_solid", "well_rough", "well_solid", "well_grand"]
_V3 = ["archery_range_rough", "archery_range_solid", "archery_range_grand", "armory_rough", "armory_solid",
       "castle_wall_rough", "castle_wall_solid", "champion_arena_rough", "champion_arena_solid",
       "champion_arena_grand", "dragon_lair_rough", "dragon_lair_solid", "dragon_lair_grand", "druid_grove_rough",
       "druid_grove_solid", "druid_grove_grand", "fountain_rough", "fountain_solid", "observatory_rough",
       "observatory_solid", "quarry_rough", "quarry_solid", "quarry_grand", "training_dummy_rough",
       "training_dummy_solid", "training_dummy_grand", "watchtower_rough", "watchtower_solid", "wizard_tower_rough",
       "wizard_tower_solid", "wizard_tower_grand"]
_ESSAI = {"fountain_rough": 2, "observatory_rough": 2, "fountain_solid": 3}
RETENUS = {
    **{k: (k, None) for k in _V1 + _V2},
    "heroes_hall_grand": ("heroes_hall_grand_v2", None),
    "forge_grand": ("forge_grand_v2", None),
    **{k: (f"{k}_v2", _ESSAI.get(k, 1)) for k in _V3},
    "high_road_rough": ("high_road_rough", 1),
    "high_road_solid": ("high_road_solid", 2),
    "high_road_grand": ("high_road_grand", 1),
}
AILES = EVID / "F1-vague2/windmill_sails.day.webp"

# The night (Guillaume, F2: one world, painted by day, the night is a grade). The pale, grey matter
# (stone, plaster, dust) turns moonlit blue-grey from its own value (FROID); the saturated one (roof
# tiles, timber, ochre) keeps its hue, darkened and cooled (CHAUD), weighted by the day pixel's
# saturation; then a lift toward the night floor #2E3552 (AmbianceCarte's `isoNuitSol`), so the ink
# stays blue-black and no wall reads green. Tuned so the solid stages' mean S and V stay near the
# painted nights' (constants/isoSpritesReference.json was s 0.44 v 0.29), which the night lawn is
# measured against (__tests__/iso-sol-encre.test.ts).
FROID = (0.40, 0.46, 0.70)  # H3-06: the stone was blue-violet and saturated, now a greyer moonlight
CHAUD = (0.56, 0.45, 0.56)
SAT = (60, 200)  # day saturation (0-255) from all cold to all warm
NUIT_SOL = (0x2E, 0x35, 0x52)
LEVEE = 0.07
LUEUR = (0xF0, 0xA8, 0x48)  # rawColors.isoLueur, the style bible's warm light
HALO_PX, HALO = 7, 0.30


def source(cle: str) -> pathlib.Path | None:
    stem, essai = RETENUS[cle]
    motif = re.compile(rf"^{re.escape(stem)}(?:\.a(\d+))?\.post(\d*)\.cut\.webp$")
    trouves = []
    for f in EVID.glob(f"F1-vague*/{stem}.*cut.webp"):
        m = motif.match(f.name)
        if m and (essai is None or m.group(1) in (None, str(essai))):
            trouves.append((int(m.group(2) or 1), f.stat().st_mtime, f))
    return max(trouves)[2] if trouves else None


def emissif(slug: str, taille) -> Image.Image:
    # The enriched blockout the stage was painted from (high_road's keeps its plain name), else the repo's.
    f = next(p for p in (V2 / f"{slug}_v2.emissive.png", V2 / f"{slug}.emissive.png", RENDERS / f"{slug}.emissive.png")
             if p.exists())
    m = Image.open(f).convert("L")
    return m if m.size == taille else m.resize(taille, Image.NEAREST)


def vitres(jour: Image.Image) -> Image.Image:
    """The panes the painting put where the blockout had none (H3-06): pale, warm pixels framed by ink, in blobs
    too small to be a lit wall (the opening drops the rims and the speckle)."""
    rgb = jour.convert("RGB")
    r, _, b = rgb.split()
    lum = rgb.convert("L")
    clair = lum.point(lambda v: 255 if v > 185 else 0)
    chaud = ImageChops.subtract(r, b).point(lambda v: 255 if v > 30 else 0)
    plein = jour.getchannel("A").point(lambda v: 255 if v > 200 else 0)
    cadre = lum.point(lambda v: 255 if v < 90 else 0).filter(ImageFilter.GaussianBlur(5)).point(
        lambda v: 255 if v > 75 else 0)
    m = ImageChops.darker(ImageChops.darker(clair, chaud), ImageChops.darker(plein, cadre))
    return m.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))


def nuit(jour: Image.Image, lumieres: Image.Image | None) -> Image.Image:
    """The night of a day sprite: same alpha, graded RGB, the lights relit where `lumieres` (L, 0-255) says."""
    rgb, alpha = jour.convert("RGB"), jour.getchannel("A")
    fois = lambda bandes, ks: Image.merge(  # noqa: E731
        "RGB", [b.point(lambda v, k=k: min(255, round(v * k))) for b, k in zip(bandes, ks)])
    froid = fois([rgb.convert("L")] * 3, FROID)
    chaud = fois(rgb.split(), CHAUD)
    a, b = SAT
    poids = rgb.convert("HSV").getchannel("S").point(lambda s: round(255 * min(1, max(0, (s - a) / (b - a)))))
    c = Image.composite(chaud, froid, poids)
    n = Image.blend(c, Image.new("RGB", c.size, NUIT_SOL), LEVEE)
    if lumieres is not None:
        lumieres = ImageChops.lighter(lumieres, vitres(jour))
    if lumieres is not None and lumieres.getbbox():
        m = lumieres.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
        # The painted detail (mullions, coals) stays: the glow follows the day pixel's value.
        valeur = rgb.convert("L").point(lambda v: 150 + v * 105 // 255)
        lueur = ImageChops.multiply(Image.new("RGB", c.size, LUEUR), Image.merge("RGB", [valeur] * 3))
        lueur = ImageChops.screen(lueur, Image.new("RGB", c.size, (40, 28, 8)))
        n = Image.composite(lueur, n, m)
        halo = lumieres.filter(ImageFilter.GaussianBlur(HALO_PX)).point(lambda v: round(v * HALO))
        n = Image.composite(ImageChops.screen(n, Image.new("RGB", c.size, LUEUR)), n, halo)
    out = n.convert("RGBA")
    out.putalpha(alpha)
    return out


LICENCE = "BFL Developer Terms §3.b (EU §4.b): the API account holder owns the output, personal or commercial use"


def ecrire(jour: Image.Image, dest_jour: pathlib.Path, dest_nuit: pathlib.Path, nuit_: Image.Image, meta: dict,
           derive: pathlib.Path, modele: str) -> None:
    from lib import flux

    for img, dest, how in (
        (jour, dest_jour, "the retained day painting of F1, re-encoded WebP q90"),
        (nuit_, dest_nuit, "its night, graded and relit offline by scripts/iso/famille_jour.py (no FLUX)"),
    ):
        dest.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest, "WEBP", quality=90, method=6)
        dest.with_suffix(".json").write_text(json.dumps(meta) + "\n")
        flux._record(str(dest.relative_to(ROOT)), {
            "model": modele, "derived_from": str(derive.relative_to(ROOT)), "how": how, "licence": LICENCE})


def importer() -> list[str]:
    from iso_loop import tap_mask

    faits = []
    for cle in sorted(RETENUS):
        src = source(cle)
        if src is None:
            print(f"{cle:24} keeps its sprites (no retained painting yet)")
            continue
        code, stade = cle.rsplit("_", 1)
        info = json.loads((RENDERS / f"{cle}.anchor.json").read_text(encoding="utf-8"))
        jour = Image.open(src).convert("RGBA")
        assert list(jour.size) == info["size"], f"{src.name}: {jour.size} is not the family's {info['size']}"
        meta = {"slug": cle, "source": "flux", "size": info["size"], "anchor": info["anchor"],
                "canvas": info["canvas"], "mask": tap_mask(jour)}
        for k in ("pivot", "sailsScale"):
            if k in info:
                meta[k] = info[k]
        ecrire(jour, ISO / code / f"{stade}.jour.webp", ISO / code / f"{stade}.nuit.webp",
               nuit(jour, emissif(cle, jour.size)), meta, src,
               f"FLUX (Black Forest Labs API), the F1 day repaint of the blockout {cle}")
        faits.append(f"{cle:24} {src.relative_to(EVID)}")
    # The sails: no tap mask, their own sidecar; the night board keeps its name, windmill_sails.webp.
    ailes = Image.open(AILES).convert("RGBA")
    meta = json.loads((ISO / "windmill_sails.json").read_text(encoding="utf-8"))
    ecrire(ailes, ISO / "windmill_sails.jour.webp", ISO / "windmill_sails.webp", nuit(ailes, None), meta, AILES,
           "FLUX (Black Forest Labs API), the painted sails regraded to day in F1 (F1-vague2/post3.py)")
    faits.append(f"{'windmill_sails':24} {AILES.relative_to(EVID)}")
    return faits


def regenerer() -> None:
    """What reads the sprites: the tap truth, the reference sprites, the index (jest, through heavy.sh)."""
    run = lambda *c, **kw: subprocess.run(list(c), cwd=ROOT, check=True, **kw)  # noqa: E731
    run("python3", "-I", "__tests__/data/iso-tap-alpha.py")
    run("python3", "-I", "scripts/iso/reference_sprites.py")
    # Only the writing test: the others would read the index loaded before it was rewritten.
    run("scripts/iso/team/heavy.sh", "node", "node_modules/.bin/jest", "iso-maquettes", "-t", "every image file is indexed",
        "--testPathIgnorePatterns=/node_modules/", "--coverage=false", env={**os.environ, "UPDATE_ISO_MAQUETTES": "1"})
    run("scripts/iso/team/heavy.sh", "node", "node_modules/.bin/jest", "iso-accroches", "-t", "is what the blockouts",
        "--testPathIgnorePatterns=/node_modules/", "--coverage=false", env={**os.environ, "UPDATE_ACCROCHES": "1"})
    run("npx", "biome", "check", "--write", *[f"components/village/iso/maquettes{n}.ts" for n in ("", 1, 2, 3, 4, 5, 6)])


if __name__ == "__main__":
    if "--liste" in sys.argv:
        for cle in sorted(RETENUS):
            s = source(cle)
            print(f"{cle:24} {s.relative_to(EVID) if s else '(keeps its sprites)'}")
        sys.exit(0)
    print("\n".join(importer()))
    if "--regen" in sys.argv:
        regenerer()
