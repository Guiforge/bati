#!/usr/bin/env python3
"""Hearth, windows: the anchor points the app draws live decor on (L5-T03). Pure stdlib + Pillow.

    python3 scripts/iso/exports/accroches.py [slug ...]     # rewrite the anchors, no render

`pointsAccroche` of a stage's .anchor.json carries, beside `px`/`grid` (faite, porte, cheminee,
avantToits):

  foyer     {"px": [x, y], "grid": [gx, gy, z], "demiLargeur": px} or null. The `fire` volume, else the
            largest `ember` one: the middle of its top face, and half its width on screen. Flame base.
  fenetres  [{"px", "grid", "largeur", "hauteur", "face"}], one per lit window seen from the camera:
            the middle of its outer face, its size on screen in px, "gauche" (wall facing +gy) or
            "droite" (wall facing +gx). A window is an `amber` volume with a thin horizontal side (any angle).

px is sprite pixels, origin top left, exactly like `px` of the other points (subtract `anchor` for px
relative to the footprint's corner). Everything comes from the `volumes` export, so the points need no
render: iso_blockout.py calls extras() with the scene's own projection, this module's main() with
cellToScreen, and stage_exports.py drops the windows the emissive mask does not show (back walls).
"""

import json
import math
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent.parent
THIN = 0.1  # a window's thin side, grid units; the thickest in the specs is 0.06
HIDDEN = 0.8  # below this lit share, something stands in front of the pane: keep the lit part only
SEEN = 0.15  # share of a window's rectangle the emissive mask must light for it to count as seen


def screen(info, canvas, iso):
    """Grid [gx, gy, z] -> sprite px, by cellToScreen from the anchor's grid point (as test_exports.py)."""
    fw, fh = canvas["footprint"]
    ox, oy = {"footprintBottom": (fw, fh), "cellCenter": (0.5, 0.5)}.get(info["anchorKind"], (0, 0))
    scale = info.get("pxScale", canvas.get("pxScale", 1))
    ax, ay = info["anchor"]
    k_z = iso["pxPerUnit"] * math.sin(math.radians(60)) * scale

    def to(p):
        gx, gy = p[0] - ox, p[1] - oy
        return [ax + (gx - gy) * iso["S"] / 2 * scale, ay + (gx + gy) * iso["S"] / 4 * scale - (p[2] if len(p) > 2 else 0.0) * k_z]
    return to


def bounds(volume):
    return [(min(c), max(c)) for c in zip(*volume["vertices"])]


def foyer(volumes, to):
    fires = [v for v in volumes if v["mat"] == "fire"]
    embers = sorted((v for v in volumes if v["mat"] == "ember"),
                    key=lambda v: -(bounds(v)[0][1] - bounds(v)[0][0]) * (bounds(v)[1][1] - bounds(v)[1][0]))
    pick = (fires or embers or [None])[0]
    if pick is None:
        return None
    (x0, x1), (y0, y1), (_, z1) = bounds(pick)
    grid = [(x0 + x1) / 2, (y0 + y1) / 2, z1]
    xs = [to(v)[0] for v in pick["vertices"]]
    return {"px": [round(c, 2) for c in to(grid)], "grid": [round(c, 4) for c in grid],
            "demiLargeur": round((max(xs) - min(xs)) / 2, 2)}


def fenetres(volumes, to):
    out = []
    for v in volumes:
        if v["mat"] != "amber":
            continue
        pts = v["vertices"]
        z0, z1 = min(p[2] for p in pts), max(p[2] for p in pts)
        # The pane's thickness is its shortest horizontal edge; its direction is the wall's normal.
        edges = [(math.dist(a[:2], b[:2]), (b[0] - a[0], b[1] - a[1]))
                 for a in pts for b in pts if abs(a[2] - b[2]) < 1e-6 and a != b]
        t, (nx, ny) = min((e for e in edges if e[0] > 1e-6), default=(1.0, (1.0, 0.0)))
        nx, ny = nx / t, ny / t
        if nx + ny < 0:
            nx, ny = -nx, -ny  # the face the camera sees looks toward +gx / +gy
        px_, py_ = -ny, nx  # along the wall
        along = [p[0] * px_ + p[1] * py_ for p in pts]
        length = max(along) - min(along)
        if t > THIN or z1 - z0 < 0.07 or length < 1.5 * t:
            continue  # a lantern or a lamp, not a pane in a wall
        mid = [sum(p[i] for p in pts) / len(pts) for i in range(2)]
        c = [mid[0] + nx * t / 2, mid[1] + ny * t / 2]
        zm = (z0 + z1) / 2
        left = to([c[0] - px_ * length / 2, c[1] - py_ * length / 2, zm])
        right = to([c[0] + px_ * length / 2, c[1] + py_ * length / 2, zm])
        grid = [c[0], c[1], zm]
        out.append({"px": [round(q, 2) for q in to(grid)], "grid": [round(q, 4) for q in grid],
                    "largeur": round(abs(right[0] - left[0]), 2),
                    "hauteur": round(abs(to([c[0], c[1], z1])[1] - to([c[0], c[1], z0])[1]), 2),
                    "face": "droite" if nx >= ny else "gauche"})
    return out


def extras(volumes, to):
    """What `pointsAccroche` gains beside px and grid; `to` is grid [gx, gy, z] -> sprite px."""
    return {"foyer": foyer(volumes, to), "fenetres": fenetres(volumes, to)}


def seen(window, mask):
    """True when the emissive mask (a PIL 'L' image, sprite size) lights SEEN of the window's rectangle."""
    (cx, cy), w, h = window["px"], window["largeur"], window["hauteur"]
    box = tuple(int(round(v)) for v in (cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2))
    crop = mask.crop(box)
    return crop.histogram()[255] >= SEEN * max(1, (box[2] - box[0]) * (box[3] - box[1]))


def visible(window, mask, to):
    """A pane something stands in front of (forge_grand's anvil) gets the largest box, centred on its lit
    pixels' centroid, that is lit: the glow lands on the pane the painting shows, not on the object
    hiding it. A pane lit over HIDDEN of its rectangle is kept whole."""
    (cx, cy), w, h = window["px"], window["largeur"], window["hauteur"]
    x0, y0 = int(round(cx - w / 2)), int(round(cy - h / 2))
    crop = mask.crop((x0, y0, int(round(cx + w / 2)), int(round(cy + h / 2)))).point(lambda v: 255 if v == 255 else 0)
    if crop.histogram()[255] >= HIDDEN * crop.width * crop.height:
        return window
    lit = [(x, y) for y in range(crop.height) for x in range(crop.width) if crop.getpixel((x, y))]
    mx, my = sum(x for x, _ in lit) / len(lit), sum(y for _, y in lit) / len(lit)
    best = (0, 0)
    for hw in range(1, crop.width // 2 + 1):
        for hh in range(1, crop.height // 2 + 1):
            box = tuple(int(round(v)) for v in (mx - hw, my - hh, mx + hw, my + hh))
            c = crop.crop(box)
            if hw * hh > best[0] * best[1] and c.histogram()[255] >= 0.95 * c.width * c.height:
                best = (hw, hh)
    px = [round(x0 + mx, 2), round(y0 + my, 2)]
    # Keep grid and px one point: slide the pane's centre along its wall and up, solving px = to(grid).
    g = window["grid"]
    u = (0, 1, 0) if window["face"] == "droite" else (1, 0, 0)  # along the wall
    o, a, z = to(g), to([g[i] + u[i] for i in range(3)]), to([g[0], g[1], g[2] + 1])
    ax_, ay_, zx, zy = a[0] - o[0], a[1] - o[1], z[0] - o[0], z[1] - o[1]
    det = ax_ * zy - zx * ay_
    dx, dy = px[0] - o[0], px[1] - o[1]
    t, h = (dx * zy - zx * dy) / det, (ax_ * dy - ay_ * dx) / det
    grid = [round(g[i] + u[i] * t + (h if i == 2 else 0), 4) for i in range(3)]
    return {**window, "px": px, "grid": grid, "largeur": 2.0 * best[0], "hauteur": 2.0 * best[1]}


def keep_seen(info, mask, to):
    """Drop the windows on a wall the camera does not see (they stay in `volumes` and `pools`)."""
    pa = info["pointsAccroche"]
    pa["fenetres"] = [visible(w, mask, to) for w in pa["fenetres"] if seen(w, mask)]


def main(argv):
    from PIL import Image

    sys.path.insert(0, str(HERE))
    from heights import biome_json

    iso = json.loads((ROOT / "constants" / "isoSpec.json").read_text(encoding="utf-8"))
    renders = ROOT / "scripts" / "iso" / "blockouts" / "renders"
    paths = [renders / f"{s}.anchor.json" for s in argv] or sorted(renders.rglob("*.anchor.json"))
    for path in paths:
        info = json.loads(path.read_text(encoding="utf-8"))
        if "pointsAccroche" not in info:
            continue  # the sails: no part, no point
        to = screen(info, iso["canvases"][info["canvas"]], iso)
        pa = info["pointsAccroche"]
        pa.pop("foyer", None), pa.pop("fenetres", None)
        pa.update(extras(info["volumes"], to))
        keep_seen(info, Image.open(path.with_suffix("").with_suffix(".emissive.png")).convert("L"), to)
        path.write_text(biome_json(info) + "\n", encoding="utf-8")
        print(f"{path.name[:-12]:24} foyer={pa['foyer'] is not None} fenetres={len(pa['fenetres'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
