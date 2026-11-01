"""Generate the 12 blockout specs of L1-T02 (quarry, well, farm, archery_range) into argv[1] (default: this folder).
Checks every vertex stays inside the footprint and every stage's top under heights.py ESTIMATES."""

import json
import math
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent.parent
sys.path.insert(0, str(REPO / "scripts/iso/exports"))
import heights as Hg  # noqa: E402

OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else HERE  # format the specs with biome afterwards


def r(v):
    return round(v, 4) + 0.0


def box(at, size, mat, **kw):
    return {"type": "box", "at": [r(a) for a in at], "size": [r(s) for s in size], "mat": mat, **kw}


def roof(at, size, mat, ridge="x", **kw):
    return {"type": "roof", "at": [r(a) for a in at], "size": [r(s) for s in size], "ridge": ridge, "mat": mat, **kw}


def cyl(center, rad, h, mat, **kw):
    return {"type": "cyl", "center": [r(c) for c in center], "r": r(rad), "h": r(h), "mat": mat, **kw}


def cone(center, rad, r2, h, mat, **kw):
    return {"type": "cone", "center": [r(c) for c in center], "r": r(rad), "r2": r(r2), "h": r(h), "mat": mat, **kw}


def strut(a, b, rad, mat):
    """A round pole from point a to point b (a tilted cylinder)."""
    d = [b[i] - a[i] for i in range(3)]
    n = math.sqrt(sum(x * x for x in d))
    return cyl(a, rad, n, mat, axis=[r(x / n) for x in d])


def ring(cx, cy, z0, outer, t, h, n, mat, jitter=None):
    """A round curb of n stone blocks, each tangent to the circle (convex parts only)."""
    rm = outer - t / 2
    chord = 2 * rm * math.sin(math.pi / n) * 1.18
    parts = []
    for k in range(n):
        th = 2 * math.pi * k / n
        hk = h + (jitter[k % len(jitter)] if jitter else 0.0)
        x, y = cx + rm * math.cos(th), cy + rm * math.sin(th)
        parts.append(box([x - chord / 2, y - t / 2, z0], [chord, t, hk], mat, rotZ=r(math.degrees(th) + 90)))
    return parts


def field(x0, y0, z0, s, n, crooked=None):
    """A square of furrows: a soil bed and n ridges along gx."""
    parts = [box([x0, y0, z0], [s, s, 0.03], "darkwood")]
    step = s / n
    for i in range(n):
        ln = s - 0.08 - (crooked[i % len(crooked)] if crooked else 0.0)
        parts.append(box([x0 + 0.04, y0 + i * step + step / 2 - 0.04, z0 + 0.03], [ln, 0.08, 0.05], "wood"))
    return parts


def target(cx, cy, cz, rad, legs_z0):
    """A round target on an easel, facing +gy (the lit side), leaning back a little."""
    ax = [0.0, 0.98, 0.2]
    n = math.sqrt(sum(a * a for a in ax))
    ax = [a / n for a in ax]
    parts = [
        strut([cx - rad * 0.7, cy + 0.12, legs_z0], [cx - rad * 0.35, cy - 0.04, cz + rad * 0.6], 0.03, "wood"),
        strut([cx + rad * 0.7, cy + 0.12, legs_z0], [cx + rad * 0.35, cy - 0.04, cz + rad * 0.6], 0.03, "wood"),
        strut([cx, cy - rad * 1.1, legs_z0], [cx, cy - 0.06, cz + rad * 0.4], 0.03, "wood"),
    ]
    depth = 0.0
    for f, mat, h in ((1.0, "canvas", 0.07), (0.66, "banner", 0.015), (0.4, "canvas", 0.015), (0.17, "banner", 0.015)):
        c = [cx + ax[0] * depth, cy + ax[1] * depth, cz + ax[2] * depth]
        parts.append(cyl(c, rad * f, h, mat, axis=[r(a) for a in ax]))
        depth += h
    return parts


def stakes(x0, x1, y, z0, h, n, rad, mat, jitter=None, tip=0.12):
    parts = []
    for i in range(n):
        x = x0 + (x1 - x0) * i / (n - 1)
        hi = h + (jitter[i % len(jitter)] if jitter else 0.0)
        parts.append(cyl([x, y, z0], rad, hi, mat))
        parts.append(cone([x, y, z0 + hi], rad, 0.0, tip, mat, roof=False))
    return parts


S = {}

# --- quarry, 2x2: front de roche taillé en gradins, blocs empilés au pied -------------------------
S["quarry_rough"] = {"canvas": "building2x2", "parts": [
    box([0, 0, 0], [2, 2, 0.05], "wood"),
    box([0.08, 0.06, 0.05], [1.14, 0.42, 0.88], "stone", rotZ=2),
    box([0.1, 0.48, 0.05], [1.06, 0.34, 0.58], "stone", rotZ=-3),
    box([0.12, 0.82, 0.05], [0.96, 0.3, 0.3], "stone", rotZ=4),
    box([1.32, 1.36, 0.05], [0.3, 0.3, 0.24], "stone", rotZ=12),
    box([1.64, 1.44, 0.05], [0.26, 0.26, 0.2], "stone", rotZ=-9),
    box([1.44, 1.42, 0.29], [0.26, 0.24, 0.19], "stone", rotZ=22),
    box([0.36, 1.4, 0.05], [0.62, 0.3, 0.06], "wood", rotZ=-6),
    box([0.48, 1.43, 0.11], [0.3, 0.24, 0.2], "stone", rotZ=-4),
]}

S["quarry_solid"] = {"canvas": "building2x2", "parts": [
    box([0, 0, 0], [2, 2, 0.08], "stone"),
    box([0.05, 0.05, 0.08], [1.3, 0.4, 1.2], "stone"),
    box([0.05, 0.45, 0.08], [1.3, 0.3, 0.9], "stone"),
    box([0.05, 0.75, 0.08], [1.3, 0.3, 0.6], "stone"),
    box([0.05, 1.05, 0.08], [1.3, 0.3, 0.3], "stone"),
    box([1.38, 0.05, 0.08], [0.57, 0.42, 0.5], "stone"),
    box([1.3, 1.45, 0.08], [0.3, 0.3, 0.25], "stone"),
    box([1.62, 1.45, 0.08], [0.3, 0.3, 0.25], "stone"),
    box([1.62, 1.13, 0.08], [0.3, 0.28, 0.25], "stone"),
    box([1.46, 1.47, 0.33], [0.3, 0.28, 0.24], "stone"),
    strut([1.42, 0.62, 0.08], [1.66, 0.86, 1.44], 0.035, "wood"),
    strut([1.93, 0.68, 0.08], [1.66, 0.86, 1.44], 0.035, "wood"),
    strut([1.64, 1.08, 0.08], [1.66, 0.86, 1.44], 0.035, "wood"),
    box([1.645, 0.845, 0.98], [0.03, 0.03, 0.44], "iron"),
    box([1.55, 0.75, 0.74], [0.22, 0.22, 0.22], "stone"),
]}

grand_steps = [box([0.05, 0.05 + 0.27 * i, 0.14], [1.25, 0.27, 1.5 - 0.3 * i], "stone") for i in range(5)]
S["quarry_grand"] = {"canvas": "building2x2", "parts": [
    box([0, 0, 0], [2, 2, 0.14], "stone"),
    *grand_steps,
    box([1.33, 0.05, 0.14], [0.62, 0.3, 0.8], "stone"),
    box([1.33, 0.05, 0.94], [0.62, 0.3, 0.04], "iron"),
    # the shed: tool store, lit window, door
    box([0.08, 1.44, 0.14], [0.66, 0.48, 0.45], "wood"),
    roof([0.05, 1.4, 0.59], [0.72, 0.56, 0.26], "tile"),
    box([0.16, 1.92, 0.14], [0.2, 0.03, 0.34], "darkwood", accroche="porte"),
    box([0.48, 1.92, 0.3], [0.15, 0.03, 0.13], "amber"),
    # blocks squared and stacked on a pallet
    box([1.22, 1.3, 0.14], [0.7, 0.64, 0.06], "wood"),
    box([1.25, 1.33, 0.2], [0.32, 0.29, 0.26], "stone"),
    box([1.59, 1.33, 0.2], [0.32, 0.29, 0.26], "stone"),
    box([1.25, 1.63, 0.2], [0.32, 0.29, 0.26], "stone"),
    box([1.59, 1.63, 0.2], [0.32, 0.29, 0.26], "stone"),
    box([1.42, 1.48, 0.46], [0.32, 0.29, 0.26], "stone"),
    # the lifting frame and its winch
    strut([1.4, 0.45, 0.14], [1.64, 0.72, 1.82], 0.04, "darkwood"),
    strut([1.95, 0.52, 0.14], [1.64, 0.72, 1.82], 0.04, "darkwood"),
    strut([1.6, 1.06, 0.14], [1.64, 0.72, 1.82], 0.04, "darkwood"),
    cyl([1.47, 0.95, 0.42], 0.06, 0.32, "iron", axis=[1, 0, 0]),
    box([1.625, 0.705, 1.1], [0.03, 0.03, 0.7], "iron"),
    box([1.53, 0.61, 0.86], [0.22, 0.22, 0.22], "stone"),
]}

# --- well, 1x1: margelle ronde en pierre sous un petit toit à treuil -----------------------------
# L1-T03 round 2: growth reads in size. Rough: a low narrow curb, two leaning poles, a small thatch
# lid. Solid: a wider curb with a coping, square posts, a winch, a plank roof. Grand: a stone step,
# a high curb, stone pillars, an iron crank wheel, a tile roof with a finial and a lantern.
S["well_rough"] = {"canvas": "decor1x1", "parts": [
    box([0, 0, 0], [1, 1, 0.04], "wood"),
    cyl([0.5, 0.5, 0.04], 0.17, 0.1, "thatch", roof=False),
    *ring(0.5, 0.5, 0.04, 0.28, 0.12, 0.3, 10, "stone", jitter=[0.0, 0.03, -0.02, 0.02, -0.03, 0.01]),
    strut([0.18, 0.5, 0.04], [0.21, 0.5, 0.6], 0.032, "wood"),
    strut([0.82, 0.5, 0.04], [0.79, 0.52, 0.58], 0.032, "wood"),
    cyl([0.17, 0.5, 0.53], 0.03, 0.66, "wood", axis=[1, 0.03, 0]),
    box([0.49, 0.49, 0.18], [0.02, 0.02, 0.35], "iron", noShadow=True),
    roof([0.13, 0.34, 0.58], [0.74, 0.32, 0.16], "thatch", rotZ=4),
    cyl([0.8, 0.82, 0.04], 0.06, 0.1, "darkwood"),
]}

S["well_solid"] = {"canvas": "decor1x1", "parts": [
    box([0, 0, 0], [1, 1, 0.06], "stone"),
    cyl([0.5, 0.5, 0.06], 0.26, 0.14, "thatch", roof=False),
    *ring(0.5, 0.5, 0.06, 0.37, 0.1, 0.3, 16, "stone"),
    *ring(0.5, 0.5, 0.36, 0.385, 0.13, 0.04, 16, "stone"),
    box([0.04, 0.46, 0.06], [0.08, 0.08, 0.76], "wood"),
    box([0.88, 0.46, 0.06], [0.08, 0.08, 0.76], "wood"),
    cyl([0.12, 0.5, 0.64], 0.055, 0.76, "wood", axis=[1, 0, 0]),
    box([0.96, 0.48, 0.54], [0.03, 0.04, 0.12], "iron"),
    box([0.49, 0.49, 0.42], [0.02, 0.02, 0.22], "iron", noShadow=True),
    cyl([0.5, 0.5, 0.3], 0.065, 0.12, "darkwood"),
    roof([0.0, 0.22, 0.82], [1.0, 0.56, 0.32], "wood", roof=True),
    cyl([0.84, 0.85, 0.06], 0.065, 0.13, "darkwood"),
]}

S["well_grand"] = {"canvas": "decor1x1", "parts": [
    box([0, 0, 0], [1, 1, 0.1], "stone"),
    cyl([0.5, 0.5, 0.1], 0.47, 0.06, "stone"),
    cyl([0.5, 0.5, 0.16], 0.27, 0.16, "thatch", roof=False),
    *ring(0.5, 0.5, 0.16, 0.4, 0.12, 0.38, 16, "stone"),
    *ring(0.5, 0.5, 0.54, 0.42, 0.16, 0.05, 16, "stone"),
    box([0.02, 0.44, 0.16], [0.12, 0.12, 0.86], "stone"),
    box([0.86, 0.44, 0.16], [0.12, 0.12, 0.86], "stone"),
    box([0.0, 0.42, 1.02], [0.16, 0.16, 0.04], "stone"),
    box([0.84, 0.42, 1.02], [0.16, 0.16, 0.04], "stone"),
    cyl([0.14, 0.5, 0.82], 0.06, 0.72, "darkwood", axis=[1, 0, 0]),
    cyl([0.83, 0.5, 0.82], 0.16, 0.025, "iron", axis=[1, 0, 0]),
    box([0.84, 0.47, 0.62], [0.02, 0.06, 0.2], "iron"),
    box([0.49, 0.49, 0.5], [0.02, 0.02, 0.3], "iron", noShadow=True),
    cyl([0.5, 0.5, 0.38], 0.07, 0.13, "darkwood"),
    roof([0.0, 0.14, 1.06], [1.0, 0.72, 0.36], "tile"),
    cone([0.5, 0.5, 1.41], 0.05, 0.0, 0.09, "iron", roof=False),
    # a lantern hung under the roof, on the lit side
    box([0.47, 0.84, 0.88], [0.06, 0.03, 0.1], "amber"),
    cyl([0.86, 0.86, 0.16], 0.07, 0.15, "darkwood"),
]}

# --- farm, 2x3: maison basse au bord de carrés de sillons ----------------------------------------
S["farm_rough"] = {"canvas": "building2x3", "parts": [
    box([0, 0, 0], [2, 3, 0.04], "wood"),
    box([0.15, 0.15, 0.04], [0.95, 0.68, 0.4], "wood"),
    roof([0.1, 0.1, 0.44], [1.05, 0.78, 0.3], "thatch", rotZ=3),
    box([0.38, 0.83, 0.04], [0.24, 0.03, 0.3], "darkwood", accroche="porte"),
    box([0.78, 0.83, 0.2], [0.12, 0.03, 0.1], "amber"),
    *field(0.15, 1.2, 0.04, 0.9, 3, crooked=[0.0, 0.08, 0.02, 0.14]),
    box([1.18, 1.3, 0.04], [0.7, 0.7, 0.03], "darkwood"),
    cone([1.6, 0.5, 0.04], 0.24, 0.0, 0.32, "thatch", roof=False),
    box([1.25, 2.3, 0.04], [0.06, 0.06, 0.3], "wood", rotZ=8),
    box([1.75, 2.35, 0.04], [0.06, 0.06, 0.26], "wood", rotZ=-6),
    box([1.25, 2.32, 0.22], [0.56, 0.04, 0.05], "wood", rotZ=4),
]}

S["farm_solid"] = {"canvas": "building2x3", "parts": [
    box([0, 0, 0], [2, 3, 0.06], "stone"),
    box([0.1, 0.1, 0.06], [1.3, 0.8, 0.48], "plaster"),
    roof([0.05, 0.05, 0.54], [1.4, 0.9, 0.4], "thatch"),
    box([0.3, 0.9, 0.06], [0.24, 0.03, 0.36], "darkwood", accroche="porte"),
    box([0.8, 0.9, 0.24], [0.17, 0.03, 0.14], "amber"),
    box([1.4, 0.38, 0.24], [0.03, 0.17, 0.14], "amber"),
    box([1.55, 0.15, 0.06], [0.38, 0.55, 0.28], "wood"),
    *field(0.1, 1.08, 0.06, 0.86, 3),
    *field(1.06, 1.08, 0.06, 0.86, 3),
    *field(0.1, 2.0, 0.06, 0.86, 3),
    cone([1.5, 2.45, 0.06], 0.28, 0.0, 0.4, "thatch", roof=False),
    *[box([x, 2.9, 0.06], [0.06, 0.06, 0.26], "wood") for x in (0.04, 0.98, 1.9)],
    box([0.04, 2.91, 0.22], [1.92, 0.04, 0.05], "wood"),
]}

S["farm_grand"] = {"canvas": "building2x3", "parts": [
    box([0, 0, 0], [2, 3, 0.08], "stone"),
    box([0.08, 0.08, 0.08], [1.4, 0.85, 0.2], "stone"),
    box([0.08, 0.08, 0.28], [1.4, 0.85, 0.38], "plaster"),
    roof([0.03, 0.03, 0.66], [1.5, 0.95, 0.44], "tile"),
    box([1.1, 0.2, 0.6], [0.18, 0.18, 0.62], "stone", accroche="cheminee"),
    box([1.08, 0.18, 1.22], [0.22, 0.22, 0.05], "iron", accroche="cheminee"),
    box([0.3, 0.93, 0.08], [0.26, 0.03, 0.42], "darkwood", accroche="porte"),
    box([0.75, 0.93, 0.34], [0.17, 0.03, 0.15], "amber"),
    box([1.08, 0.93, 0.34], [0.17, 0.03, 0.15], "amber"),
    box([1.48, 0.4, 0.34], [0.03, 0.17, 0.15], "amber"),
    box([1.6, 0.1, 0.08], [0.34, 0.8, 0.4], "wood"),
    roof([1.58, 0.08, 0.48], [0.38, 0.84, 0.18], "wood", ridge="y", roof=True),
    *field(0.1, 1.1, 0.08, 0.82, 3),
    *field(1.08, 1.1, 0.08, 0.82, 3),
    *field(0.1, 2.02, 0.08, 0.82, 3),
    *field(1.08, 2.02, 0.08, 0.82, 3),
    *[box([x, 2.9, 0.08], [0.06, 0.06, 0.28], "wood") for x in (0.04, 0.67, 1.3, 1.9)],
    box([0.04, 2.91, 0.26], [1.92, 0.04, 0.05], "wood"),
]}

# --- archery range, 2x3: cible ronde sur un chevalet devant une palissade basse --------------------
S["archery_range_rough"] = {"canvas": "building2x3", "parts": [
    box([0, 0, 0], [2, 3, 0.04], "wood"),
    *[box([0.1 + 0.29 * i, 0.08, 0.04], [0.12, 0.12, 0.55 + [0.08, 0.0, 0.12, 0.04, 0.1, 0.0, 0.06][i]], "wood",
          rotZ=[6, -4, 9, -7, 3, -10, 5][i]) for i in range(7)],
    box([0.06, 0.22, 0.3], [1.88, 0.04, 0.06], "wood"),
    *target(1.0, 0.66, 0.5, 0.31, 0.04),
    cyl([0.35, 2.45, 0.12], 0.08, 0.7, "darkwood", axis=[1, 0, 0]),
    box([1.35, 2.35, 0.04], [0.06, 0.06, 0.5], "wood", rotZ=6),
    box([1.75, 2.38, 0.04], [0.06, 0.06, 0.46], "wood", rotZ=-5),
    box([1.33, 2.37, 0.42], [0.5, 0.05, 0.05], "wood", rotZ=3),
]}

S["archery_range_solid"] = {"canvas": "building2x3", "parts": [
    box([0, 0, 0], [2, 3, 0.08], "stone"),
    *stakes(0.1, 1.9, 0.14, 0.08, 0.72, 9, 0.065, "wood"),
    box([0.05, 0.22, 0.4], [1.9, 0.04, 0.07], "wood"),
    *target(0.6, 0.62, 0.58, 0.27, 0.08),
    *target(1.4, 0.62, 0.58, 0.27, 0.08),
    # shooters' shelter, front left
    *[box([x, y, 0.08], [0.07, 0.07, 0.92], "wood") for x in (0.08, 0.72) for y in (2.24, 2.86)],
    roof([0.04, 2.18, 1.0], [0.8, 0.8, 0.24], "thatch"),
    box([0.2, 2.5, 0.08], [0.4, 0.12, 0.4], "darkwood"),
    box([0.95, 2.15, 0.08], [0.06, 0.06, 0.3], "wood"),
    box([1.9, 2.15, 0.08], [0.06, 0.06, 0.3], "wood"),
    box([0.95, 2.16, 0.3], [1.01, 0.04, 0.05], "wood"),
]}

S["archery_range_grand"] = {"canvas": "building2x3", "parts": [
    box([0, 0, 0], [2, 3, 0.12], "stone"),
    *[box([x, 0.07, 0.12], [0.14, 0.14, 0.95], "stone") for x in (0.04, 0.93, 1.82)],
    *[cone([x + 0.07, 0.14, 1.07], 0.1, 0.0, 0.1, "iron", verts=4, rotZ=45, roof=False) for x in (0.04, 0.93)],
    *stakes(0.3, 0.75, 0.14, 0.12, 0.72, 3, 0.065, "wood"),
    *stakes(1.19, 1.64, 0.14, 0.12, 0.72, 3, 0.065, "wood"),
    box([0.05, 0.22, 0.45], [1.9, 0.04, 0.07], "darkwood"),
    *target(0.45, 0.66, 0.62, 0.23, 0.12),
    *target(1.0, 0.66, 0.62, 0.23, 0.12),
    *target(1.55, 0.66, 0.62, 0.23, 0.12),
    # banner pole on the right pillar: the cloth is the app's (lot 4)
    cyl([1.89, 0.14, 1.07], 0.03, 0.5, "darkwood"),
    cone([1.89, 0.14, 1.57], 0.045, 0.0, 0.08, "iron", roof=False),
    # shooters' shelter, tiled, with its bow rack and bench
    *[box([x, y, 0.12], [0.08, 0.08, 1.0], "darkwood") for x in (0.08, 0.74) for y in (2.2, 2.86)],
    roof([0.03, 2.14, 1.12], [0.84, 0.84, 0.3], "tile"),
    box([0.18, 2.5, 0.12], [0.46, 0.12, 0.46], "darkwood"),
    box([0.2, 2.47, 0.36], [0.42, 0.03, 0.04], "iron"),
    cyl([0.35, 2.75, 0.12], 0.06, 0.24, "darkwood"),
    *[box([x, 2.12, 0.12], [0.07, 0.07, 0.32], "stone") for x in (0.95, 1.43, 1.89)],
    box([0.95, 2.13, 0.38], [1.01, 0.05, 0.05], "darkwood"),
]}

FOOT = {"quarry": (2, 2), "well": (1, 1), "farm": (2, 3), "archery_range": (2, 3)}
bad = 0
for slug, spec in S.items():
    code, _, stage = slug.rpartition("_")
    w, d = FOOT[code]
    zmax, worst = 0.0, 0.0
    for p in spec["parts"]:
        for x, y, z in Hg.part_vertices(p):
            worst = max(worst, -x, -y, x - w, y - d, -z)
            if p["mat"] not in Hg.EMISSIVE and not p.get("noShadow"):
                zmax = max(zmax, z)
    est = Hg.ESTIMATES[code][2][stage]
    ok = worst <= 1e-6 and zmax <= est + 1e-6
    bad += not ok
    flag = "" if ok else "  <-- FIX"
    print(f"{slug:22s} parts {len(spec['parts']):3d}  top {zmax:.3f} / est {est}  outside {worst:.4f}{flag}")
if bad:
    sys.exit(1)  # nothing written: a failing stage never reaches the specs
OUT.mkdir(parents=True, exist_ok=True)  # after the check: a failing run leaves no empty folder
for slug, spec in S.items():
    (OUT / f"{slug}.json").write_text(json.dumps(spec) + "\n")
