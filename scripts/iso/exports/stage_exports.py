#!/usr/bin/env python3
"""Render blockouts and write every per-stage export of isoSpec.json `exportsParStade` (L1-T01).

    scripts/iso/team/heavy.sh python3 scripts/iso/exports/stage_exports.py [slug ...]

No slug: every spec in scripts/iso/blockouts/ and its pieces/ (slug `pieces/<name>`). Each slug goes through `iso_loop.py blockout` (the
POC's render: .rgba/.png/.dark/.green/.mask/.classes/.anchor.json in blockouts/renders/), then this
adds what the POC did not write, beside the others, and the mock-up the app shows in lot 1.

The eight exports of a stage, all readable without Blender (index: `exports` in .anchor.json):

  ancrage         .anchor.json `anchor`: canvas px of the footprint's bottom corner (or centre)
  ombre           .anchor.json `shadow`: one convex ground polygon per shadow-casting part, under
                  the moon of isoSpec.json; `grid` in grid units, `px` relative to the anchor
  flaques         .anchor.json `pools`: the windows' light pools, same two forms
  volumes         .anchor.json `volumes`: every part's vertices [gx, gy, z] with mat, emissive,
                  noShadow, roof. Shadow under any light, part by part, over the parts neither
                  emissive nor noShadow: the convex hull of each vertex's ground point
                      (gx - z * Lx / Lz,  gy + z * Ly / Lz)
                  where (Lx, Ly, Lz) = isoSpec.json moon.L, which is in Blender coordinates
                  (y = -gy, hence the + on gy). This is what test_exports.py recomputes.
  pointsAccroche  .anchor.json `pointsAccroche`: faite, porte, cheminee, avantToits, in `px`
                  (sprite pixels, origin top left) and `grid` ([gx, gy, z]); null when absent;
                  beside them `foyer` and `fenetres` (see accroches.py)
  masqueEmissif   .emissive.png: 255 where an emissive part (window, fire, ember) is seen
  masqueToit      .roof.png: 255 where an upward roof face is seen (snow lands there)
  masqueTap       .mask.png: 255 where the sprite is opaque (alpha >= 128)

The mock-up: assets/images/village/iso/blockout/<the sprite's own name> (isoSpec `nomImage`,
`forge/solid.nuit.webp`), lossless WebP of the .rgba render, same canvas and anchor as the painted
sprite, with the same sidecar .json as `iso_loop.write_sprite` writes for it.
"""

import contextlib
import io
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
import accroches  # noqa: E402
import iso_loop  # noqa: E402
import isolib as L  # noqa: E402
from heights import biome_json  # noqa: E402

MOCKUPS = L.SPRITES / "blockout"


def passes_stem(slug: str) -> pathlib.Path:
    # isolib.blender's scratch name for out = RENDERS/<slug>.rgba.png; the roof flag only lives in
    # the .cls pass's blue channel, which compose() drops from .classes.png.
    # shortcut: reads a scratch pass under WORK/passes whose name is copied from isolib.blender, so
    # a rename there or an `iso_loop blockout` of the same slug running alongside breaks or swaps
    # it; move to a file isolib.blender keeps beside .classes.png once artist next touches isolib.
    return L.WORK / "passes" / f"{pathlib.Path(slug).name}.rgba".replace(".", "_")


def mockup_path(slug: str) -> pathlib.Path:
    return MOCKUPS / iso_loop.sprite_path(slug).relative_to(L.SPRITES)


def export(slug: str) -> None:
    (L.RENDERS / slug).parent.mkdir(parents=True, exist_ok=True)  # renders/pieces/
    with contextlib.redirect_stdout(io.StringIO()):  # blockout() prints the whole anchor
        info = iso_loop.blockout(slug)
    stem = L.RENDERS / slug
    classes = L.Image.open(stem.with_suffix(".classes.png")).convert("RGB")
    emissive = classes.getchannel("G").point(lambda v: 255 if v == 200 else 0)
    emissive.save(stem.with_suffix(".emissive.png"))
    accroches.keep_seen(info, emissive, accroches.screen(info, L.ISO["canvases"][info["canvas"]], L.ISO))  # no window on a wall the camera does not see
    # Laid out as biome formats it, so the pre-commit leaves the committed anchor as rendered.
    stem.with_suffix(".anchor.json").write_text(biome_json(info) + "\n")
    cls = L.Image.open(passes_stem(slug).with_suffix(".cls.png")).convert("RGB")
    cls.getchannel("B").point(lambda v: 255 if v >= 128 else 0).save(stem.with_suffix(".roof.png"))

    rgba = L.Image.open(stem.with_suffix(".rgba.png")).convert("RGBA")
    out = mockup_path(slug)
    out.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(out, "WEBP", lossless=True, method=6)
    meta = {"slug": slug, "source": "blockout", "size": info["size"], "anchor": info["anchor"],
            "canvas": info["canvas"], "mask": iso_loop.tap_mask(rgba)}
    for key in ("pivot", "sailsScale"):
        if key in info:
            meta[key] = info[key]
    out.with_suffix(".json").write_text(json.dumps(meta) + "\n")
    print(f"{slug}: {out.relative_to(L.ROOT)} {out.stat().st_size // 1024} KB")


def all_slugs() -> list[str]:
    """Every spec: the building stages at the top, then `pieces/` (decor, water, scaffolds, villagers)."""
    return sorted(p.stem for p in L.BLOCKOUTS.glob("*.json")) + sorted(
        f"pieces/{p.stem}" for p in (L.BLOCKOUTS / "pieces").glob("*.json"))


def main() -> int:
    slugs = sys.argv[1:] or all_slugs()
    for slug in slugs:
        export(slug)
    return 0


if __name__ == "__main__":
    sys.exit(main())
