#!/usr/bin/env python3
"""Ground baker (loupe BC, PROMPT.md section 12): soft decals baked into painted ground chunks, one set per tier
band, plus the stamp manifest. No FLUX, 0 $. Dev only, stdlib + Pillow. Reaches the app only through --install.

    python3 -I scripts/iso/cuire_sol.py <out_dir> <stamps.json> [--sol assets/images/village/iso/sol] [--decals DIR]

stamps.json in:  [{"asset": "dirt_1.webp", "tile": [i, j], "flip": false, "band": "t4-6"}, ...]
  asset: a decal (RGBA, drawn at the ground's own 3 px a dp) found under --decals (default: the folder holding
  stamps.json), centred on the middle of the tile (i, j), mirrored when flip. Order in the file = paint order.
Writes in <out_dir> (never over the day files, which are only read):
  terrain_RC.<band>.webp       the day chunk (r in 0..3, c in 0..2, the tiles' own size: one size for the family)
  terrain_RC.<band>.nuit.webp  with every stamp of that band and of the earlier ones, and its night, made by the
                               same curve as scripts/iso/nuit_alentours.py (famille_jour.nuit, no lights).
  stamps.json                  the manifest, scripts/iso/loupe_checks.py format, every stamp of the input.
A chunk no stamp touches is not written: the app keeps the day tile. A chunk a band leaves as the band below had it
is not written either: the app takes the highest band at or under the tier that has the chunk. Bands only add: a
stamp of a band is present in every later band, asserted before anything is written. A stamp bigger than a chunk
(real ones are about 2000 x 3000 px, soft alpha) is cut over every chunk it overlaps, each cut composed from the same
pixels, so no seam.

    --install   after baking, copy the terrain_RC.<band> files into --sol (the app's assets, the day files keep their
                names) and rewrite components/village/iso/solBandes.ts, the static requires Metro needs. Then run
                `node scripts/iso/empreinte-sprites.js`.
"""

import argparse
import json
import pathlib
import shutil
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from famille_jour import ISO, nuit
from PIL import Image, ImageOps

BANDS = ["t1-3", "t4-6", "t7-9", "t10-12"]
PX = 3  # px a dp: the ground is painted at 3 px a dp (components/village/iso/terrain.ts)
TERRAIN_XY = (-348, -836)  # TERRAIN.x, TERRAIN.y, map dp
LARGEUR = 20 * 48  # carteDemo LARGEUR: TAILLE 20 x COTE 48, dp
COLS, ROWS = 3, 4


def centre_px(i, j):
    """Pixel of the middle of tile (i, j) on the whole terrain (ecranXY of the cell's centre)."""
    x, y = (i - j) * 24 + LARGEUR / 2, (i + j + 1) * 12
    return round((x - TERRAIN_XY[0]) * PX), round((y - TERRAIN_XY[1]) * PX)


def per_band(stamps):
    """{band: stamps present in it}, in paint order, asserting the bands only add."""
    for s in stamps:
        assert s["band"] in BANDS, f"unknown band {s['band']!r}, one of {BANDS}"
    out = {b: [s for s in stamps if BANDS.index(s["band"]) <= k] for k, b in enumerate(BANDS)}
    for early, late in zip(BANDS, BANDS[1:]):
        gone = [s for s in out[early] if s not in out[late]]
        assert not gone, f"band {late} drops {gone[0]} of {early}: bands only add"
    return out


def _paste(tile, d, dx, dy):
    """Alpha-composite d with its top-left at (dx, dy) in the tile's pixels, clipped to the tile."""
    box = (max(0, dx), max(0, dy), min(tile.width, dx + d.width), min(tile.height, dy + d.height))
    if box[0] >= box[2] or box[1] >= box[3]:
        return False
    part = d.crop((box[0] - dx, box[1] - dy, box[2] - dx, box[3] - dy))
    tile.paste(Image.alpha_composite(tile.crop(box), part), box[:2])
    return True


def bake(out_dir, stamps, sol=ISO / "sol", decals="."):
    out_dir, sol = pathlib.Path(out_dir), pathlib.Path(sol)
    assert out_dir.resolve() != sol.resolve(), "day files are never modified in place"
    out_dir.mkdir(parents=True, exist_ok=True)
    bands = per_band(stamps)
    base = {(r, c): Image.open(sol / f"terrain_{r}{c}.webp").convert("RGBA") for r in range(ROWS) for c in range(COLS)}
    cw, ch = base[(0, 0)].size
    assert all(im.size == (cw, ch) for im in base.values()), "the 12 tiles share one size"
    written, derniere = [], {}
    for b in BANDS:
        chunks, signature = {}, {}
        for s in bands[b]:
            d = Image.open(pathlib.Path(decals) / s["asset"]).convert("RGBA")
            d = ImageOps.mirror(d) if s["flip"] else d
            cx, cy = centre_px(*s["tile"])
            x0, y0 = cx - d.width // 2, cy - d.height // 2
            for (r, c), im in base.items():
                if x0 >= (c + 1) * cw or x0 + d.width <= c * cw or y0 >= (r + 1) * ch or y0 + d.height <= r * ch:
                    continue
                tile = chunks.setdefault((r, c), im.copy())
                _paste(tile, d, x0 - c * cw, y0 - r * ch)
                signature.setdefault((r, c), []).append((s["asset"], tuple(s["tile"]), bool(s["flip"])))
        for (r, c), im in sorted(chunks.items()):
            # A band that adds nothing to a chunk is not written: the app falls back to the band below (alentours.ts `bandesJusqua`).
            if derniere.get((r, c)) == signature[(r, c)]:
                continue
            derniere[(r, c)] = signature[(r, c)]
            name = f"terrain_{r}{c}.{b}"
            im.save(out_dir / f"{name}.webp", "WEBP", quality=90, method=6)
            nuit(im, None).save(out_dir / f"{name}.nuit.webp", "WEBP", quality=80, method=6)
            written.append(name)
    manifest = [{"asset": s["asset"], "tile": list(s["tile"]), "flip": bool(s["flip"]), "band": s["band"]} for s in stamps]
    (out_dir / "stamps.json").write_text(json.dumps(manifest, indent=1))
    return written


SOL_BANDES_TS = pathlib.Path(__file__).resolve().parents[2] / "components/village/iso/solBandes.ts"


def install(out_dir, sol=ISO / "sol", ts=SOL_BANDES_TS):
    """Copy the baked band variants into the app's sol folder and write the table of their static requires."""
    out_dir, sol = pathlib.Path(out_dir), pathlib.Path(sol)
    for f in sorted(out_dir.glob("terrain_??.t*.webp")):
        shutil.copy2(f, sol / f.name)
    jours = sorted(p.name[:-5] for p in sol.glob("terrain_??.t*.webp") if not p.name.endswith(".nuit.webp"))
    assert all((sol / f"{n}.nuit.webp").exists() for n in jours), "every band variant has its night"
    rows = "".join(
        f'  "{n[8:]}": {{\n    jour: require("@/assets/images/village/iso/sol/{n}.webp"),\n'
        f'    nuit: require("@/assets/images/village/iso/sol/{n}.nuit.webp"),\n  }},\n'
        for n in jours
    )
    pathlib.Path(ts).write_text(
        "// Generated by scripts/iso/cuire_sol.py --install, do not edit: the baked terrain chunks of each tier band\n"
        '// (key "RC.band"), one static require each, as Metro needs. Empty until a stamp is baked.\n'
        "export const BANDES_TERRAIN: Readonly<Record<string, { jour: number; nuit: number }>> = " + ("{\n" + rows + "}" if rows else "{}") + ";\n"
    )
    return jours


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("out_dir")
    ap.add_argument("stamps")
    ap.add_argument("--sol", default=str(ISO / "sol"))
    ap.add_argument("--decals")
    ap.add_argument("--install", action="store_true")
    a = ap.parse_args()
    st = json.load(open(a.stamps))
    names = bake(a.out_dir, st, a.sol, a.decals or pathlib.Path(a.stamps).parent)
    if a.install:
        print(f"{len(install(a.out_dir, a.sol))} band variants installed in {a.sol}, solBandes.ts rewritten")
    print(f"{len(names)} chunks baked (day + night) in {a.out_dir}, {len(st)} stamps in the manifest")
    sys.exit(0)
