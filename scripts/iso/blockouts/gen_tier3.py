"""Generate the 12 blockout specs of L1-T04, the tier 3 upgrades (watchtower, castle_wall, armory,
fountain, observatory, barn; rough and solid), into argv[1] (default: this folder); format the specs
with biome afterwards. Checks every vertex stays inside the footprint and every stage's top under heights.py
ESTIMATES.

Tier 3 buildings are upgrades: the rough stage is already a real building (askew, rough stone and
wood, thatch), the solid one clearly richer (dressed stone, tile, iron, ornament). Doors face +gy,
the lit side; the water of the fountain is `thatch` (no water in the palette), like the well's.
"""

import json
import math
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent.parent
sys.path.insert(0, str(REPO / "scripts/iso/exports"))
import heights as Hg  # noqa: E402

OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else HERE


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


def strut(a, b, rad, mat, **kw):
    """A pole from point a to point b (a tilted cylinder; verts=4 makes it a square beam)."""
    d = [b[i] - a[i] for i in range(3)]
    n = math.sqrt(sum(x * x for x in d))
    return cyl(a, rad, n, mat, axis=[r(x / n) for x in d], **kw)


def cbox(cx, cy, z0, sx, sy, sz, mat, **kw):
    """A box by its ground centre (rotZ turns it about that centre)."""
    return box([cx - sx / 2, cy - sy / 2, z0], [sx, sy, sz], mat, **kw)


def turned(parts, cx, cy, deg):
    """The whole group turned by deg about (cx, cy): how a rough stage sits askew in one piece."""
    out = []
    for p in parts:
        q = dict(p)
        if p["type"] in ("box", "roof"):
            (x0, y0, z0), (sx, sy, _) = p["at"], p["size"]
            nx, ny = Hg.rot(x0 + sx / 2, y0 + sy / 2, cx, cy, deg)
            q["at"] = [r(nx - sx / 2), r(ny - sy / 2), z0]
            q["rotZ"] = r(p.get("rotZ", 0.0) + deg)
        else:
            x, y, z = p["center"]
            q["center"] = [*(r(v) for v in Hg.rot(x, y, cx, cy, deg)), z]
            if "axis" in p:
                ax, ay, az = p["axis"]
                q["axis"] = [*(r(v) for v in Hg.rot(ax, ay, 0, 0, deg)), az]
            elif p.get("verts") in (4, 8):
                q["rotZ"] = r(p.get("rotZ", 0.0) + deg)
        out.append(q)
    return out


def ring(cx, cy, z0, outer, t, h, n, mat, jitter=None, tilt=None):
    """A round curb of n stone blocks, each tangent to the circle (convex parts only)."""
    rm = outer - t / 2
    chord = 2 * rm * math.sin(math.pi / n) * 1.18
    parts = []
    for k in range(n):
        th = 2 * math.pi * k / n
        hk = h + (jitter[k % len(jitter)] if jitter else 0.0)
        dz = tilt[k % len(tilt)] if tilt else 0.0
        x, y = cx + rm * math.cos(th), cy + rm * math.sin(th)
        parts.append(box([x - chord / 2, y - t / 2, z0], [chord, t, hk], mat, rotZ=r(math.degrees(th) + 90 + dz)))
    return parts


def pyramid(cx, cy, z0, half, h, mat, turn=0.0, **kw):
    """A four-sided roof: a 4-vertex cone whose corners sit on the square of half-side `half`."""
    return cone([cx, cy, z0], half * math.sqrt(2), 0.0, h, mat, verts=4, rotZ=r(45 + turn), **kw)


def dome(cx, cy, z0, rad, mat, **kw):
    """A dome from three frustums; returns the parts and its top."""
    rings = [(1.0, 0.88, 0.55), (0.88, 0.55, 0.45), (0.55, 0.0, 0.3)]
    parts, z = [], z0
    for a, b, h in rings:
        parts.append(cone([cx, cy, z], rad * a, rad * b, rad * h, mat, **kw))
        z += rad * h
    return parts, z


S = {}

# --- watchtower, 1x1 on tower1x1: plate-forme haute sur des pieux -------------------------------
# No door: the platform is reached by a ladder on the +gy side. The flag is the app's (lot 4).


def legs(z0, top, inset, lean, rad, mat, square=False):
    kw = {"verts": 4} if square else {}
    return [strut([x, y, z0], [x + lean * (0.5 - x), y + lean * (0.5 - y), top], rad, mat, **kw)
            for x in (inset, 1 - inset) for y in (inset, 1 - inset)]


def ladder(x0, x1, y_foot, y_top, z0, z1, n, mat="wood"):
    parts = [strut([x, y_foot, z0], [x, y_top, z1], 0.018, mat) for x in (x0, x1)]
    for k in range(1, n + 1):
        t = k / (n + 1)
        parts.append(box([x0, y_foot + (y_top - y_foot) * t - 0.012, z0 + (z1 - z0) * t], [x1 - x0, 0.024, 0.02], mat))
    return parts


def parapet(z0, h, t, mat, inset=0.04):
    a, b = inset, 1 - inset
    return [box([a, a, z0], [b - a, t, h], mat), box([a, b - t, z0], [b - a, t, h], mat),
            box([a, a + t, z0], [t, b - a - 2 * t, h], mat), box([b - t, a + t, z0], [t, b - a - 2 * t, h], mat)]


S["watchtower_rough"] = {"canvas": "tower1x1", "parts": [
    box([0, 0, 0], [1, 1, 0.04], "wood"),
    *legs(0.04, 1.5, 0.13, 0.06, 0.045, "wood"),
    # cross braces on the two seen faces
    strut([0.88, 0.14, 0.2], [0.86, 0.84, 1.1], 0.022, "darkwood"),
    strut([0.14, 0.88, 0.25], [0.84, 0.86, 1.05], 0.022, "darkwood"),
    box([0.06, 0.06, 1.5], [0.88, 0.88, 0.06], "darkwood"),
    *parapet(1.56, 0.26, 0.04, "wood", inset=0.07),
    *[cyl([x, y, 1.56], 0.028, 0.38, "wood") for x in (0.12, 0.88) for y in (0.12, 0.88)],
    pyramid(0.5, 0.5, 1.92, 0.43, 0.36, "thatch", turn=5),
    *ladder(0.38, 0.56, 0.975, 0.92, 0.04, 1.5, 5),
    # a stone to wedge a leg, a coil of rope
    box([0.7, 0.72, 0.04], [0.14, 0.12, 0.08], "stone", rotZ=18),
    cyl([0.24, 0.3, 0.04], 0.07, 0.05, "canvas"),
]}

S["watchtower_solid"] = {"canvas": "tower1x1", "parts": [
    box([0, 0, 0], [1, 1, 0.08], "stone"),
    # stone footings under four squared posts
    *[cbox(x, y, 0.08, 0.2, 0.2, 0.22, "stone") for x in (0.15, 0.85) for y in (0.15, 0.85)],
    *legs(0.3, 1.85, 0.15, 0.04, 0.06, "darkwood", square=True),
    # two tiers of X braces on the seen faces, a ring beam between them
    *[strut([0.87, a, z0], [0.86, b, z1], 0.02, "wood", verts=4)
      for (a, b) in ((0.15, 0.85), (0.85, 0.15)) for (z0, z1) in ((0.35, 1.05), (1.1, 1.8))],
    *[strut([a, 0.87, z0], [b, 0.86, z1], 0.02, "wood", verts=4)
      for (a, b) in ((0.15, 0.85), (0.85, 0.15)) for (z0, z1) in ((0.35, 1.05), (1.1, 1.8))],
    box([0.1, 0.1, 1.06], [0.8, 0.8, 0.05], "darkwood"),
    # platform on corbels, plank parapet with a top rail
    box([0.02, 0.02, 1.85], [0.96, 0.96, 0.08], "darkwood"),
    *[cbox(x, y, 1.75, 0.12, 0.12, 0.1, "darkwood", rotZ=45) for x in (0.2, 0.8) for y in (0.2, 0.8)],
    *parapet(1.93, 0.28, 0.05, "wood", inset=0.03),
    *parapet(2.21, 0.04, 0.07, "darkwood", inset=0.02),
    *[box([x - 0.03, y - 0.03, 2.25], [0.06, 0.06, 0.08], "darkwood") for x in (0.06, 0.94) for y in (0.06, 0.94)],
    pyramid(0.5, 0.5, 2.31, 0.47, 0.38, "tile"),
    cone([0.5, 0.5, 2.68], 0.03, 0.0, 0.1, "iron", roof=False),
    # a lantern hung on the parapet, on the lit side
    box([0.46, 0.97, 2.02], [0.08, 0.03, 0.1], "amber"),
    *ladder(0.38, 0.58, 0.975, 0.9, 0.08, 1.85, 7, "darkwood"),
    box([0.42, 0.62, 0.08], [0.22, 0.16, 0.14], "wood"),
]}

# --- castle wall, 1x3 on building1x3: pan de rempart crénelé percé d'une porte -------------------
# The wall runs along gy (isoLayout: 1 x 3). Its outer side is -gx (the island's edge, behind), so
# the merlons are on the back edge, seen against the sky; the gate opens on +gx, toward the path.
# The gate is a real passage: two wall blocks, a lintel, and the doors set back in the middle.


def merlons(x0, t, y0, y1, z0, h, step, mat, jitter=None, skip=()):
    parts, k, y = [], 0, y0
    while y + step * 0.55 <= y1 + 1e-9:
        if k not in skip:
            hk = h + (jitter[k % len(jitter)] if jitter else 0.0)
            parts.append(box([x0, y, z0], [t, step * 0.55, hk], mat))
        y += step
        k += 1
    return parts


S["castle_wall_rough"] = {"canvas": "building1x3", "parts": [
    box([0, 0, 0], [1, 3, 0.04], "darkwood"),
    box([0.24, 0.06, 0.04], [0.52, 1.18, 1.0], "stone", rotZ=1.5),
    box([0.24, 1.76, 0.04], [0.52, 1.18, 1.04], "stone", rotZ=-1.5),
    box([0.25, 1.2, 0.72], [0.5, 0.6, 0.3], "stone"),
    box([0.46, 1.22, 0.04], [0.08, 0.56, 0.68], "darkwood", accroche="porte"),
    *merlons(0.25, 0.14, 0.08, 2.92, 1.02, 0.2, 0.36, "stone", jitter=[0.0, -0.04, 0.03, -0.02, 0.02], skip=(2, 6)),
    # timber props against the inner face, a rubble heap, a torch by the gate
    strut([0.97, 0.45, 0.04], [0.78, 0.45, 0.8], 0.03, "wood"),
    strut([0.97, 2.55, 0.04], [0.78, 2.55, 0.82], 0.03, "wood"),
    box([0.8, 2.0, 0.04], [0.16, 0.2, 0.1], "stone", rotZ=20),
    box([0.84, 2.18, 0.04], [0.1, 0.12, 0.07], "stone", rotZ=-15),
    box([0.77, 1.1, 0.5], [0.03, 0.05, 0.08], "amber"),
]}

S["castle_wall_solid"] = {"canvas": "building1x3", "parts": [
    box([0, 0, 0], [1, 3, 0.08], "stone"),
    # battered plinth, the corner tower at the back end (gy 0)
    box([0.16, 0.9, 0.08], [0.68, 2.06, 0.16], "stone"),
    cyl([0.5, 0.5, 0.08], 0.46, 0.2, "stone"),
    cyl([0.5, 0.5, 0.28], 0.42, 1.52, "stone"),
    cyl([0.5, 0.5, 1.8], 0.46, 0.08, "stone"),
    *ring(0.5, 0.5, 1.88, 0.46, 0.1, 0.12, 10, "stone"),
    cone([0.5, 0.5, 1.88], 0.4, 0.0, 0.38, "tile"),
    cone([0.5, 0.5, 2.25], 0.02, 0.0, 0.04, "iron", roof=False),
    box([0.9, 0.45, 0.9], [0.03, 0.08, 0.22], "darkwood"),
    box([0.45, 0.9, 1.25], [0.08, 0.03, 0.22], "amber"),
    # the wall, the gate passage at gy 1.25-1.75, the lintel over it
    box([0.22, 0.85, 0.24], [0.56, 0.4, 1.16], "stone"),
    box([0.22, 1.75, 0.24], [0.56, 1.2, 1.16], "stone"),
    box([0.22, 1.25, 0.88], [0.56, 0.5, 0.52], "stone"),
    box([0.46, 1.25, 0.08], [0.08, 0.5, 0.8], "darkwood", accroche="porte"),
    box([0.66, 1.25, 0.3], [0.03, 0.5, 0.58], "iron"),
    # gate frame: pilasters and a lintel stone proud of the inner face, a torch on each side
    box([0.78, 1.13, 0.24], [0.07, 0.12, 0.84], "stone"),
    box([0.78, 1.75, 0.24], [0.07, 0.12, 0.84], "stone"),
    box([0.78, 1.13, 1.08], [0.08, 0.74, 0.12], "stone"),
    box([0.85, 1.17, 0.6], [0.03, 0.05, 0.09], "amber"),
    box([0.85, 1.78, 0.6], [0.03, 0.05, 0.09], "amber"),
    # string course, buttress, walkway parapet in front, merlons behind
    box([0.78, 2.0, 1.0], [0.03, 0.95, 0.05], "stone"),
    box([0.78, 2.45, 0.24], [0.14, 0.18, 0.62], "stone"),
    box([0.7, 0.85, 1.4], [0.08, 2.1, 0.1], "stone"),
    *merlons(0.22, 0.14, 0.85, 2.95, 1.4, 0.24, 0.3, "stone"),
]}

# --- armory, 2x2: bâtisse trapue en pierre, râtelier d'armes contre le mur -----------------------
# A brazier by the door (heights.py ESTIMATES: "foyer à la porte"): its coals are `ember`, the
# flame is the app's sheet.


def rack(x0, x1, y, z0, h, n, spear=True):
    parts = [box([x0, y, z0], [0.05, 0.05, h], "darkwood"), box([x1 - 0.05, y, z0], [0.05, 0.05, h], "darkwood"),
             box([x0, y, z0 + h - 0.05], [x1 - x0, 0.05, 0.05], "darkwood"),
             box([x0, y, z0 + 0.22], [x1 - x0, 0.05, 0.04], "darkwood")]
    step = (x1 - x0 - 0.1) / n
    for k in range(n):
        x = x0 + 0.05 + step * (k + 0.5)
        parts.append(box([x - 0.0125, y + 0.05, z0 + 0.02], [0.025, 0.025, h + 0.1], "wood"))
        if spear:
            parts.append(cone([x, y + 0.0625, z0 + h + 0.12], 0.03, 0.0, 0.1, "iron", roof=False))
    return parts


S["armory_rough"] = {"canvas": "building2x2", "parts": [
    box([0, 0, 0], [2, 2, 0.05], "wood"),
    *turned([
        box([0.2, 0.25, 0.05], [1.25, 1.3, 0.62], "stone"),
        roof([0.12, 0.17, 0.67], [1.41, 1.46, 0.46], "thatch", ridge="y"),
        box([0.5, 1.55, 0.05], [0.3, 0.03, 0.44], "darkwood", accroche="porte"),
        box([1.45, 0.65, 0.3], [0.03, 0.14, 0.14], "amber"),
        cyl([0.825, 1.64, 0.84], 0.14, 0.03, "banner", axis=[0, 1, 0]),
        cyl([0.825, 1.67, 0.84], 0.045, 0.02, "iron", axis=[0, 1, 0]),
    ], 0.825, 0.9, 3),
    # L1-T05 follow-up (art review of L1-T04): the repere at 30 %, a full-size rack of five spears
    # standing out in front of the lit wall and an armour stand beside it
    *rack(0.55, 1.65, 1.74, 0.05, 0.75, 7),
    cyl([1.84, 1.62, 0.05], 0.03, 0.62, "darkwood"),
    cone([1.84, 1.62, 0.36], 0.09, 0.13, 0.26, "iron"),
    box([1.7, 1.6, 0.58], [0.28, 0.05, 0.04], "darkwood"),
    cone([1.84, 1.62, 0.66], 0.07, 0.03, 0.1, "iron"),
    # brazier at the door, a chopping block, a shield leaning on the flank
    cyl([0.3, 1.82, 0.05], 0.1, 0.16, "iron"),
    box([0.24, 1.76, 0.21], [0.12, 0.12, 0.02], "ember"),
    cyl([1.62, 1.6, 0.05], 0.11, 0.18, "darkwood"),
    cyl([1.5, 1.05, 0.2], 0.15, 0.03, "wood", axis=[1, 0, 0.35]),
]}

S["armory_solid"] = {"canvas": "building2x2", "parts": [
    box([0, 0, 0], [2, 2, 0.08], "stone"),
    box([0.1, 0.12, 0.08], [1.5, 1.5, 0.16], "stone"),
    box([0.15, 0.17, 0.24], [1.4, 1.4, 0.72], "stone"),
    # corner buttresses on the seen corners
    *[box([x, y, 0.24], [0.13, 0.13, 0.5], "stone") for x, y in ((1.5, 1.52), (1.5, 0.12), (0.1, 1.52))],
    box([0.15, 0.17, 0.92], [1.4, 1.4, 0.06], "stone"),
    roof([0.05, 0.07, 0.98], [1.6, 1.6, 0.58], "tile", ridge="y"),
    box([0.3, 0.32, 0.98], [0.24, 0.24, 0.66], "stone", accroche="cheminee"),
    box([0.28, 0.3, 1.64], [0.28, 0.28, 0.05], "iron", accroche="cheminee"),
    # L1-T05 round 2, the repere first: the door goes round to the shaded flank and the whole lit
    # gable gets the weapons: a tall rack of eight spears standing out in front of it, a great
    # shield on crossed axes on the gable above.
    box([1.55, 0.78, 0.24], [0.03, 0.4, 0.52], "darkwood", accroche="porte"),
    *[box([1.58, 0.78, z], [0.015, 0.4, 0.03], "iron") for z in (0.36, 0.62)],
    box([1.55, 0.73, 0.76], [0.06, 0.5, 0.09], "stone"),
    *rack(0.3, 1.5, 1.72, 0.08, 0.9, 8),
    strut([0.6, 1.685, 0.86], [1.1, 1.685, 1.36], 0.022, "iron", verts=4),
    strut([1.1, 1.685, 0.86], [0.6, 1.685, 1.36], 0.022, "iron", verts=4),
    cyl([0.85, 1.68, 1.11], 0.2, 0.03, "banner", axis=[0, 1, 0]),
    cyl([0.85, 1.71, 1.11], 0.06, 0.02, "iron", axis=[0, 1, 0]),
    # a barred window on the shaded flank
    box([1.55, 0.3, 0.4], [0.03, 0.16, 0.22], "amber"),
    *[box([1.58, y, 0.4], [0.015, 0.02, 0.22], "iron") for y in (0.34, 0.4)],
    # brazier on a stone foot by the rack, arrows in a barrel
    box([0.05, 1.72, 0.08], [0.18, 0.18, 0.14], "stone"),
    cyl([0.14, 1.81, 0.22], 0.09, 0.1, "iron"),
    box([0.09, 1.76, 0.32], [0.1, 0.1, 0.02], "ember"),
    cyl([1.78, 1.75, 0.08], 0.11, 0.3, "darkwood"),
    *[box([1.74 + dx, 1.71 + dy, 0.3], [0.02, 0.02, 0.2], "wood") for dx, dy in ((0, 0), (0.06, 0.03), (0.03, 0.07))],
]}

# --- fountain, 2x2: bassin rond autour d'une colonne -----------------------------------------------
# Water is `thatch` marked not a roof (the well's choice); the running water is the app's (lot 4).

S["fountain_rough"] = {"canvas": "building2x2", "parts": [
    box([0, 0, 0], [2, 2, 0.04], "darkwood"),
    cyl([1.0, 1.0, 0.04], 0.62, 0.14, "thatch", roof=False),
    *ring(1.0, 1.0, 0.04, 0.78, 0.18, 0.24, 12, "stone", jitter=[0.0, 0.03, -0.03, 0.02, 0.05, -0.02],
          tilt=[6, -8, 4, -5, 9, -3]),
    cyl([1.0, 1.0, 0.04], 0.13, 0.52, "stone", rotZ=7),
    cbox(1.0, 1.0, 0.56, 0.26, 0.24, 0.12, "stone", rotZ=14),
    cone([1.0, 1.0, 0.68], 0.06, 0.13, 0.05, "stone"),
    # a bucket and loose stones outside the curb
    cyl([1.78, 1.55, 0.04], 0.08, 0.14, "wood"),
    box([0.22, 1.66, 0.04], [0.16, 0.12, 0.09], "stone", rotZ=25),
    box([1.62, 0.22, 0.04], [0.12, 0.14, 0.07], "stone", rotZ=-10),
]}

S["fountain_solid"] = {"canvas": "building2x2", "parts": [
    box([0, 0, 0], [2, 2, 0.08], "stone"),
    cyl([1.0, 1.0, 0.08], 0.96, 0.06, "stone"),
    cyl([1.0, 1.0, 0.14], 0.7, 0.18, "thatch", roof=False),
    *ring(1.0, 1.0, 0.14, 0.84, 0.14, 0.26, 16, "stone"),
    *ring(1.0, 1.0, 0.4, 0.87, 0.2, 0.04, 16, "stone"),
    # column: pedestal, shaft, lower basin, upper shaft, upper basin, finial
    cyl([1.0, 1.0, 0.14], 0.2, 0.2, "stone"),
    cyl([1.0, 1.0, 0.34], 0.1, 0.42, "stone"),
    cone([1.0, 1.0, 0.68], 0.1, 0.32, 0.12, "stone"),
    cyl([1.0, 1.0, 0.79], 0.28, 0.02, "thatch", roof=False),
    cyl([1.0, 1.0, 0.8], 0.06, 0.2, "stone"),
    cone([1.0, 1.0, 0.94], 0.06, 0.17, 0.08, "stone"),
    cyl([1.0, 1.0, 1.01], 0.14, 0.015, "thatch", roof=False),
    cyl([1.0, 1.0, 1.02], 0.035, 0.1, "stone"),
    cone([1.0, 1.0, 1.12], 0.05, 0.0, 0.1, "iron", roof=False),
    # benches at the side corners, a lantern post at the back corner
    cbox(0.24, 1.76, 0.08, 0.5, 0.14, 0.04, "wood", rotZ=45),
    *[cbox(0.24 + d, 1.76 + d, 0.08, 0.08, 0.08, 0.14, "stone") for d in (-0.13, 0.13)],
    cbox(1.76, 0.24, 0.08, 0.5, 0.14, 0.04, "wood", rotZ=45),
    *[cbox(1.76 + d, 0.24 + d, 0.08, 0.08, 0.08, 0.14, "stone") for d in (-0.13, 0.13)],
    cyl([0.2, 0.2, 0.08], 0.025, 0.95, "iron"),
    box([0.15, 0.15, 0.9], [0.1, 0.1, 0.12], "amber"),
    box([0.14, 0.14, 1.02], [0.12, 0.12, 0.03], "iron"),
]}

# --- observatory, 2x2: dôme fendu sur une tour basse ---------------------------------------------
# The slit faces +gy (the lit side) a little toward the viewer; the telescope leans out of it.

D = (0.3, 0.954)  # the slit's horizontal direction


def slit(cx, cy, z0, rad, top, mat, half=0.09):
    """A band following the dome's three frustums (dome() profile), its middle on the surface."""
    profile = [(1.0, 0.0), (0.88, 0.55), (0.55, 1.0), (0.12, (top - z0) / rad - 0.08)]
    pts = [(cx + D[0] * rad * a, cy + D[1] * rad * a, z0 + rad * h) for a, h in profile]
    return [strut(a, b, half, mat, verts=4) for a, b in zip(pts, pts[1:])]


def telescope(cx, cy, z, out, up, rad):
    return strut([cx, cy, z], [cx + D[0] * out, cy + D[1] * out, z + up], rad, "iron")


ORX, ORY = 0.95, 0.9  # tower centre: leaves the front corner free
rough_dome, rough_top = dome(ORX, ORY, 1.32, 0.6, "canvas", roof=True)
S["observatory_rough"] = {"canvas": "building2x2", "parts": [
    box([0, 0, 0], [2, 2, 0.05], "wood"),
    cyl([ORX, ORY, 0.05], 0.6, 0.86, "stone", rotZ=5),
    cyl([ORX, ORY, 0.91], 0.57, 0.41, "wood", rotZ=-4),
    *rough_dome,
    *slit(ORX, ORY, 1.32, 0.6, rough_top, "darkwood"),
    telescope(ORX, ORY, 1.6, 0.95, 0.6, 0.06),
    box([ORX - 0.13, ORY + 0.57, 0.05], [0.26, 0.04, 0.44], "darkwood", accroche="porte"),
    box([ORX + 0.57, ORY - 0.06, 1.0], [0.04, 0.1, 0.14], "amber"),
    # crates and a ladder against the tower
    box([1.6, 1.45, 0.05], [0.26, 0.24, 0.2], "wood", rotZ=10),
    box([1.64, 1.48, 0.25], [0.18, 0.18, 0.14], "wood", rotZ=-6),
    strut([1.62, 0.55, 0.05], [1.47, 0.62, 0.9], 0.02, "wood"),
    strut([1.62, 0.8, 0.05], [1.47, 0.84, 0.9], 0.02, "wood"),
]}

# L1-T05 follow-up (art review of L1-T04): 8 facets, one face toward the viewer, flat tones
solid_dome, solid_top = dome(ORX, ORY, 1.62, 0.64, "iron", roof=True, verts=8, rotZ=22.5)
S["observatory_solid"] = {"canvas": "building2x2", "parts": [
    box([0, 0, 0], [2, 2, 0.08], "stone"),
    cyl([ORX, ORY, 0.08], 0.74, 0.1, "stone"),
    cyl([ORX, ORY, 0.18], 0.62, 1.36, "stone"),
    # gallery on corbels with an iron rail, cornice under the dome
    cyl([ORX, ORY, 1.18], 0.76, 0.05, "darkwood"),
    cyl([ORX, ORY, 1.4], 0.76, 0.015, "iron"),
    *[cyl([ORX + 0.74 * math.cos(t), ORY + 0.74 * math.sin(t), 1.23], 0.012, 0.17, "iron")
      for t in (math.radians(a) for a in range(0, 360, 30))],
    cyl([ORX, ORY, 1.54], 0.68, 0.08, "stone"),
    *solid_dome,
    cone([ORX, ORY, solid_top], 0.03, 0.0, 0.1, "iron", roof=False),
    *slit(ORX, ORY, 1.62, 0.64 * 0.93, solid_top, "amber", half=0.06),  # on the facet, not the circle
    telescope(ORX, ORY, 1.9, 1.0, 0.68, 0.075),
    # door under a stone frame, windows
    box([ORX - 0.16, ORY + 0.6, 0.18], [0.32, 0.05, 0.52], "stone"),
    box([ORX - 0.13, ORY + 0.62, 0.18], [0.26, 0.04, 0.46], "darkwood", accroche="porte"),
    box([ORX + 0.6, ORY - 0.06, 0.7], [0.04, 0.1, 0.18], "amber"),
    box([ORX + 0.42, ORY + 0.44, 0.85], [0.08, 0.08, 0.18], "amber", rotZ=45),
    # an armillary sphere on a pedestal in the front corner: two iron hoops crossed
    cyl([1.7, 1.7, 0.08], 0.08, 0.32, "stone"),
    cyl([1.7, 1.7, 0.53], 0.14, 0.015, "iron", axis=[1, -1, 0]),
    cyl([1.7, 1.7, 0.53], 0.14, 0.015, "iron", axis=[1, 1, 0.6]),
    cyl([1.7, 1.7, 0.53], 0.035, 0.02, "iron"),
]}

# --- barn, 2x3 on building2x3: grand toit à deux pans au-dessus d'une porte double ---------------
# Ridge along gy; the gable and its double door face +gy (lit). A wooden gable slab sits a hair in
# front of the tile gable so the gable reads as boards under the roof's rim.


def open_doors(x0, w, y, z0, h, mat, swing):
    """A carriage door thrown open: the dark doorway, and its two leaves swung out toward +gy by
    `swing` degrees on hinges at the doorway's sides (L1-T05 follow-up: the barn's repere)."""
    leaf = w / 2
    c, s_ = math.cos(math.radians(swing)), math.sin(math.radians(swing))
    return [box([x0, y, z0], [w, 0.03, h], "darkwood", accroche="porte"),
            cbox(x0 + leaf / 2 * c, y + 0.03 + leaf / 2 * s_, z0, leaf, 0.03, h, mat, rotZ=swing),
            cbox(x0 + w - leaf / 2 * c, y + 0.03 + leaf / 2 * s_, z0, leaf, 0.03, h, mat, rotZ=-swing)]


def bales(x0, x1, y0, z0, n_rows, length=0.4):
    parts = []
    for row in range(n_rows):
        y = y0 + row * 0.03
        n = 3 - row
        for k in range(n):
            parts.append(box([x0, y + k * (length + 0.02) + row * 0.2, z0 + row * 0.2], [x1 - x0, length, 0.2], "thatch",
                             roof=False))
    return parts


S["barn_rough"] = {"canvas": "building2x3", "parts": [
    box([0, 0, 0], [2, 3, 0.04], "wood"),
    *turned([
        box([0.25, 0.3, 0.04], [1.3, 2.2, 0.62], "wood"),
        roof([0.13, 0.22, 0.66], [1.54, 2.36, 0.74], "thatch", ridge="y"),
        roof([0.2, 2.5, 0.66], [1.4, 0.03, 0.68], "wood", ridge="y", roof=False),
        # L1-T05 follow-up (art review of L1-T04): the barn's repere, a carriage door nearly as wide
        # as the gable and as high as the eaves, an open hayloft above it with hay, a hoist beam
        *open_doors(0.42, 0.96, 2.5, 0.04, 0.6, "wood", 50),
        box([0.72, 2.53, 0.8], [0.36, 0.02, 0.3], "darkwood"),
        box([0.76, 2.54, 0.8], [0.28, 0.04, 0.08], "thatch", roof=False),
        box([0.86, 2.3, 1.18], [0.08, 0.5, 0.07], "darkwood"),
        box([1.55, 1.2, 0.3], [0.03, 0.14, 0.14], "amber"),
    ], 0.9, 1.4, 2),
    *bales(1.66, 1.95, 0.5, 0.04, 2),
    cyl([0.25, 2.78, 0.04], 0.1, 0.16, "darkwood"),
]}

S["barn_solid"] = {"canvas": "building2x3", "parts": [
    box([0, 0, 0], [2, 3, 0.08], "stone"),
    box([0.18, 0.22, 0.08], [1.42, 2.4, 0.26], "stone"),
    box([0.2, 0.24, 0.34], [1.38, 2.36, 0.5], "wood"),
    *[box([x, y, 0.34], [0.07, 0.07, 0.5], "darkwood") for x in (0.19, 1.52) for y in (0.23, 2.57)],
    box([1.57, 0.23, 0.6], [0.03, 2.4, 0.05], "darkwood"),
    roof([0.05, 0.12, 0.84], [1.68, 2.62, 0.92], "tile", ridge="y"),
    roof([0.16, 2.62, 0.84], [1.46, 0.03, 0.84], "wood", ridge="y", roof=False),
    # the open hayloft in the gable, hay spilling out, a hoist beam with its pulley above it
    box([0.68, 2.65, 1.0], [0.42, 0.03, 0.4], "darkwood"),
    box([0.72, 2.66, 1.0], [0.34, 0.06, 0.1], "thatch", roof=False),
    box([0.86, 2.4, 1.48], [0.06, 0.5, 0.08], "darkwood"),
    cyl([0.89, 2.84, 1.36], 0.05, 0.04, "iron", axis=[1, 0, 0]),
    # the carriage door, nearly gable-wide and as high as the eaves, under a heavy lintel
    *open_doors(0.39, 1.0, 2.6, 0.08, 0.74, "wood", 40),
    box([0.34, 2.6, 0.82], [1.1, 0.06, 0.07], "darkwood"),
    # hay spilled on the threshold
    box([0.62, 2.66, 0.08], [0.5, 0.18, 0.05], "thatch", rotZ=-6, roof=False),
    # ridge vent with its own little roof
    box([0.77, 0.95, 1.56], [0.24, 0.24, 0.16], "wood"),
    pyramid(0.89, 1.07, 1.72, 0.16, 0.12, "tile"),
    # warm windows on the shaded flank, bales stacked against it
    box([1.6, 0.5, 0.46], [0.03, 0.14, 0.15], "amber"),
    box([1.6, 2.0, 0.46], [0.03, 0.14, 0.15], "amber"),
    *bales(1.66, 1.96, 0.75, 0.08, 3),
    # a fence stub on each side of the yard, a trough
    *[box([x, 2.9, 0.08], [0.06, 0.06, 0.28], "wood") for x in (0.05, 0.3, 1.62, 1.9)],
    box([0.05, 2.91, 0.28], [0.31, 0.04, 0.05], "wood"),
    box([1.62, 2.91, 0.28], [0.34, 0.04, 0.05], "wood"),
    box([1.62, 2.55, 0.08], [0.34, 0.16, 0.14], "darkwood"),
]}

FOOT = {"watchtower": (1, 1), "castle_wall": (1, 3), "armory": (2, 2), "fountain": (2, 2), "observatory": (2, 2),
        "barn": (2, 3)}
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
    print(f"{slug:22s} parts {len(spec['parts']):3d}  top {zmax:.3f} / est {est}  outside {worst:.4f}{'' if ok else '  <-- FIX'}")
if bad:
    sys.exit(1)  # nothing written: a failing stage never reaches the specs
OUT.mkdir(parents=True, exist_ok=True)  # after the check: a failing run leaves no empty folder
for slug, spec in S.items():
    (OUT / f"{slug}.json").write_text(json.dumps(spec) + "\n")
