#!/usr/bin/env python3
"""Proof that audit (A) accepts what it should and rejects each fault by the check meant for it.

    python3 scripts/iso/test_audit.py

Written and committed before the first FLUX call, and kept green through the one recalibration:
an audit that has never been shown to reject anything is a rubber stamp. Every fault is built
from the forge_solid blockout, so the only thing that differs from the accepted case is the fault.

Prompt v5 (§6):
  blockout itself              -> passes the shape checks and the light check, FAILS detail
  tier_3 / tier_6 crops        -> pass the night palette
  armory, wizard_tower, smith  -> palette
  blockout turned warm         -> palette
  blockout tinted 10% magenta  -> palette
  sport_chest in the same box  -> silhouette
  blockout without outline     -> ink
  2 px magenta fringe          -> halo or residual
  a banner emptied by the key  -> holes
  lit and shadow tones swapped -> light
"""

import sys

from PIL import Image, ImageDraw

import iso_audit as A
import isolib as L

SLUG = "forge_solid"
OUT = L.WORK / "test_audit"
KEY = L.hex_rgb(L.ISO["background"]["key"])
SHAPE = ("residual", "halo", "holes", "silhouette", "footprint", "ink", "ink_step")


def on_key(rgba: Image.Image) -> Image.Image:
    flat = Image.new("RGB", rgba.size, KEY)
    flat.paste(rgba, (0, 0), rgba)
    return flat


def _centroid(mask: Image.Image):
    w, h = mask.size
    cols = [sum(1 for y in range(0, h, 4) if mask.getpixel((x, y))) for x in range(0, w, 4)]
    rows = [sum(1 for x in range(0, w, 4) if mask.getpixel((x, y))) for y in range(0, h, 4)]
    cx = sum(i * c for i, c in enumerate(cols)) * 4 / sum(cols)
    cy = sum(i * c for i, c in enumerate(rows)) * 4 / sum(rows)
    return cx, cy


def recolour(rgba: Image.Image, fn) -> Image.Image:
    r, g, b, a = rgba.split()
    r, g, b = fn(r, g, b)
    return Image.merge("RGBA", (r, g, b, a))


def built_cases() -> dict:
    """name -> (file, expectation): None accepts on SHAPE + light and fails detail, else the checks wanted."""
    OUT.mkdir(parents=True, exist_ok=True)
    rgba = Image.open(L.RENDERS / f"{SLUG}.rgba.png").convert("RGBA")
    mask = A.binary(rgba.getchannel("A"))
    made = {"blockout": (OUT / "blockout.png", None)}
    on_key(rgba).save(made["blockout"][0])

    chest = Image.open(L.ROOT / "assets/images/village/sport_chest.webp").convert("RGBA")
    chest = chest.crop(chest.getchannel("A").getbbox())
    box = mask.getbbox()
    chest = chest.resize((box[2] - box[0], box[3] - box[1]), Image.LANCZOS)
    canvas = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    canvas.paste(chest, box[:2], chest)
    made["sport_chest"] = (OUT / "sport_chest.png", ("silhouette",))
    on_key(canvas).save(made["sport_chest"][0])

    bare = OUT / "no_lines.png"
    L.blender(L.BLOCKOUTS / f"{SLUG}.json", bare, lines=False)
    made["no_outline"] = (OUT / "no_outline.flat.png", ("ink", "ink_step"))
    on_key(Image.open(bare).convert("RGBA")).save(made["no_outline"][0])

    swapped = OUT / "swapped.png"
    L.blender(L.BLOCKOUTS / f"{SLUG}.json", swapped, swap=True)
    made["swapped_tones"] = (OUT / "swapped.flat.png", ("light",))
    on_key(Image.open(swapped).convert("RGBA")).save(made["swapped_tones"][0])

    fringe = A.ImageChops.subtract(A.dilate(mask, 2), mask)
    flat = on_key(rgba)
    flat.paste(Image.new("RGB", rgba.size, (170, 40, 170)), (0, 0), fringe)
    made["fringe"] = (OUT / "fringe.png", ("halo", "residual"))
    flat.save(made["fringe"][0])

    cx, cy = (round(v) for v in _centroid(A.erode(mask, 40)))
    flat = on_key(rgba)
    ImageDraw.Draw(flat).rectangle((cx - 25, cy - 45, cx + 25, cy + 45), fill=KEY)
    made["banner"] = (OUT / "banner.png", ("holes",))
    flat.save(made["banner"][0])

    warm = recolour(rgba, lambda r, g, b: (r.point(lambda v: min(255, int(v * 1.35))), g, b.point(lambda v: int(v * 0.7))))
    made["warm"] = (OUT / "warm.png", ("palette",))
    on_key(warm).save(made["warm"][0])

    tinted = Image.blend(rgba, Image.new("RGBA", rgba.size, (*KEY, 255)), 0.10)
    tinted.putalpha(rgba.getchannel("A"))
    made["magenta_tint"] = (OUT / "magenta_tint.png", ("palette",))
    on_key(tinted).save(made["magenta_tint"][0])
    return made


def socle_case(report) -> None:
    """L2-T03: compose(socle_shadow=False) leaves a base top (cls B = 64) unshadowed with B = 0 in
    the classes map; True (the default) is today's output. Synthetic passes, 2 pixels: A is a base
    top, B an ordinary face, both lit by n.L and occluded."""
    import tempfile
    import pathlib
    with tempfile.TemporaryDirectory() as tmp:
        stem = pathlib.Path(tmp) / "s"
        for name, colour in ((".tone.png", (200, 200, 200, 255)), (".shadowtone.png", (20, 20, 20, 255))):
            Image.new("RGBA", (2, 1), colour).save(stem.with_suffix(name))
        for name, v in ((".direct.png", 100), (".ndotl.png", 60000)):
            Image.new("I;16", (2, 1), v).save(stem.with_suffix(name))
        cls = Image.new("RGB", (2, 1))
        cls.putpixel((0, 0), (16, 140, 64))
        cls.putpixel((1, 0), (16, 140, 255))
        cls.save(stem.with_suffix(".cls.png"))
        out_true, out_default, out_false = (pathlib.Path(tmp) / n for n in ("t.png", "d.png", "f.png"))
        L.compose(stem, out_true, True)
        L.compose(stem, out_default)
        L.compose(stem, out_false, socle_shadow=False)
        px = lambda path: list(Image.open(path).convert("RGBA").get_flattened_data())
        flag = lambda path: [p[2] for p in Image.open(path.with_suffix(".classes.png")).get_flattened_data()]
        ok = (out_true.read_bytes() == out_default.read_bytes()
              and px(out_true) == [(20, 20, 20, 255)] * 2 and flag(out_true) == [255, 255]
              and px(out_false) == [(200, 200, 200, 255), (20, 20, 20, 255)] and flag(out_false) == [0, 255])
        report("socle_shadow", ok, f"True {px(out_true)} B {flag(out_true)}; False {px(out_false)} B {flag(out_false)}")


def main() -> int:
    failures = []

    def report(name, ok, detail):
        print(f"{'ok  ' if ok else 'FAIL'} {name:16s} {detail}")
        if not ok:
            failures.append(name)

    for name, (path, expected) in built_cases().items():
        result = A.audit(path, SLUG, registered_out=path.with_suffix(".registered.png"))
        failed = sorted(k for k, c in result["checks"].items() if not c["pass"])
        if expected is None:
            ok = not (set(failed) & set(SHAPE + ("light",))) and "detail" in failed
            detail = f"expected shape + light pass and detail fail, failed {failed}"
        else:
            ok = not result["pass"] and any(w in failed for w in expected)
            detail = f"expected {expected}, failed {failed}"
        values = {k: result["checks"][k]["value"] for k in ("silhouette", "ink", "palette", "detail", "light") if k in result["checks"]}
        report(name, ok, f"{detail}  {values}")

    # The palette alone, on what the prompt names.
    for i, crop in enumerate(A.reference_crops()):
        tier = A.T["palette_refs"][i]["tier"]
        if tier in (3, 6):
            pal = A.palette(crop)
            report(f"tier_{tier} crop {i}", pal["pass"], f"palette must pass  {pal['values']['means']} warm {pal['values']['warm']}")
    for rel in ("village/buildings/armory.webp", "village/buildings/wizard_tower.webp", "villagers/smith_talk.webp"):
        pal = A.palette(Image.open(L.ROOT / "assets/images" / rel).convert("RGBA"))
        report(rel.rsplit("/", 1)[-1], not pal["pass"], f"palette must fail  {pal['values']['means']} warm {pal['values']['warm']} violet {pal['values']['violet']}")

    socle_case(report)

    print(f"\ntest_audit: {'PASS' if not failures else 'FAIL ' + ', '.join(failures)}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
