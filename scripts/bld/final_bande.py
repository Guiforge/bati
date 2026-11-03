#!/usr/bin/env python3
"""Windmill r1 final: the preview strips (0 $, no FLUX). Outputs in windmill/r1/final/.

    python3 scripts/bld/final_bande.py bande    # bande.png: the 5 stages in order, painted sails at the real pivot, mythic with its
                                                # painted ribbons (behind the tower, and the front half between tower and sails)

The pivot and the sail scale are read from each stage's spec (windmill_<stage>.json, `pivot` and `sailsScale`) and checked against
the card's table; the grid-to-canvas formula is the card's: px = 448 + 192 (x - y), py = 1280 - 96.67 (4 - x - y) - 235 z.
"""
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import final_elements as E  # noqa: E402
import final_paint as P  # noqa: E402
import numpy as np  # noqa: E402
from PIL import Image, ImageChops, ImageFilter  # noqa: E402

Q, S, OUT, R1 = P.Q, P.S, P.OUT, P.R1
SPECS = pathlib.Path(__file__).resolve().parent.parent / "iso" / "blockouts" / "bld"
CARD = {"rough": ((1.4, 1.4, 1.5), 0.85), "solid": ((1.49, 1.49, 2.08), 0.95), "grand": ((1.54, 1.54, 2.59), 1.05),
        "legendary": ((1.55, 1.55, 2.88), 1.10), "mythic": ((1.55, 1.55, 2.88), 1.18)}
SHEET = {"rough": "sails_rough", "solid": "sails_solid", "grand": "sails_grand", "legendary": "sails_legendary", "mythic": "sails_legendary"}
GROUND = (120, 132, 112)


def pivot_px(stage):
    """(px, py, scale) of the sails' hub on the canvas, from the stage's spec, checked against the card."""
    spec = json.loads((SPECS / "pilote" / f"windmill_{stage}.json").read_text())
    (x, y, z), scale = spec["pivot"], spec["sailsScale"]
    assert tuple(round(v, 2) for v in (x, y, z)) == CARD[stage][0] and abs(scale - CARD[stage][1]) < 1e-6, (stage, spec["pivot"], scale)
    return round(448 + 192 * (x - y)), round(1280 - 96.67 * (4 - x - y) - 235 * z), scale


def best_cut(name):
    d = OUT / "elements" / name
    return Image.open(d / "coupe" / json.loads((d / "controle.json").read_text())["best"]).convert("RGBA")


def ribbon_layers():
    """(behind, front) RGBA of the painted ribbons, split with the maquette's layer masks."""
    r = best_cut("rubans")
    front_m = Image.open(OUT / "maquettes/rubans.front.mask.png").convert("L").filter(ImageFilter.MaxFilter(11))
    a = r.getchannel("A")
    front_a = ImageChops.multiply(a, front_m)
    behind_a = ImageChops.subtract(a, front_a)
    front, behind = r.copy(), r.copy()
    front.putalpha(front_a)
    behind.putalpha(behind_a)
    return behind, front


def stage_sprite(stage, with_ribbons=None):
    """RGBA canvas of the stage's tower, ribbons and sails (what the card's `jour` plus its layers look like at rest, 45 degrees)."""
    tower, ctl = Q.cut_of(stage, P.final_raw(stage))
    cv = Image.new("RGBA", S.SIZE, (0, 0, 0, 0))
    if with_ribbons:
        cv.alpha_composite(with_ribbons[0])
    cv.alpha_composite(tower)
    if with_ribbons:
        cv.alpha_composite(with_ribbons[1])
    px, py, scale = pivot_px(stage)
    sheet = best_cut(SHEET[stage])
    k = round(sheet.width * scale)
    sheet = sheet.resize((k, k), Image.LANCZOS)
    cv.alpha_composite(sheet, (px - k // 2, py - k // 2)) if py - k // 2 >= 0 else cv.alpha_composite(
        sheet.crop((0, k // 2 - py, k, k)), (px - k // 2, 0))
    return cv, ctl


def strip(sprites, out, k=2 / 5, bg=GROUND):
    bw, bh = round(S.SIZE[0] * k), round(S.SIZE[1] * k)
    band = Image.new("RGB", (len(sprites) * bw, bh), bg)
    for i, sp in enumerate(sprites):
        tile = Image.new("RGBA", S.SIZE, bg + (255,))
        tile.alpha_composite(sp)
        band.paste(tile.convert("RGB").resize((bw, bh), Image.LANCZOS), (i * bw, 0))
    band.save(out)


def bande():
    rib = ribbon_layers() if (OUT / "elements/rubans/controle.json").exists() else None
    sprites, ctls = [], {}
    for s in S.STAGES:
        sp, c = stage_sprite(s, rib if s == "mythic" else None)
        sprites.append(sp)
        low = np.nonzero(np.asarray(sp.getchannel("A")) > 127)
        tw, _ = Q.cut_of(s, P.final_raw(s))
        ys, xs = np.nonzero(np.asarray(tw.getchannel("A")) > 127)
        pts = [(x, y) for x, y in zip(xs, ys) if y >= ys.max() - 5]
        c["footprint_inside_diamond"] = round(sum(E.in_diamond(x, y) for x, y in pts) / max(1, len(pts)), 3)
        ctls[s] = {k: c[k] for k in ("iou", "top_y", "card_top_y", "top_delta_px", "top_ok", "magenta_residual", "passes",
                                       "footprint_inside_diamond")}
        ctls[s]["pivot_px_scale"] = pivot_px(s)
    strip(sprites, OUT / "bande.png")
    (OUT / "bande.json").write_text(json.dumps(ctls, indent=2))
    print(json.dumps(ctls, indent=1))


if __name__ == "__main__":
    globals()[sys.argv[1]]()
