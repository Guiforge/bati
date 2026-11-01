"""Generate the 12 blockout specs of L1-T05, the tier 4 feats and the road (dragon_lair, heroes_hall,
champion_arena on building3x3, high_road on building1x2; rough, solid, grand), into argv[1] (default:
this folder); format the specs with biome afterwards. Checks every vertex stays inside the footprint and every
stage's top under heights.py ESTIMATES.

Tier 4 buildings are the village's rare monuments: each stage clearly richer than the last, the grand
one the landmark of the whole village. What moves stays out (heights.py ESTIMATES keeps it): the
lair's and the arena's flames sit on `ember` coals, the hall's two banners hang from bare poles, the
road's lantern from a bare arm. The lair is a rock knoll with a cave mouth, never a castle; the road
is a stretch of road (gate, paving, milestones), not a tall building, and runs along gy as
isoLayout.json lays it (1 x 2), its local gy 0 end joining the village path.
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


def rock(cx, cy, z0, rad, r2, h, turn, mat="stone", **kw):
    """A faceted rock: a square frustum (4-vertex cone), corners at rad from its axis."""
    return cone([cx, cy, z0], rad, r2, h, mat, verts=4, rotZ=r(turn), **kw)


def ring(cx, cy, z0, outer, t, h, n, mat, gate=None, jitter=None, **kw):
    """A round course of n blocks tangent to the circle; `gate` (deg, half-width deg) leaves a gap."""
    rm = outer - t / 2
    chord = 2 * rm * math.sin(math.pi / n) * 1.18
    parts = []
    for k in range(n):
        deg = 360 * k / n
        if gate and abs((deg - gate[0] + 180) % 360 - 180) < gate[1]:
            continue
        th = math.radians(deg)
        hk = h + (jitter[k % len(jitter)] if jitter else 0.0)
        x, y = cx + rm * math.cos(th), cy + rm * math.sin(th)
        parts.append(box([x - chord / 2, y - t / 2, z0], [chord, t, hk], mat, rotZ=r(deg + 90), **kw))
    return parts


def around(cx, cy, rad, degs):
    return [(cx + rad * math.cos(math.radians(d)), cy + rad * math.sin(math.radians(d))) for d in degs]


def brazier(x, y, z0, post, mat="stone", bowl=0.09):
    """A fire bowl on a post: the coals are `ember`, the flame is the app's sheet."""
    return [cbox(x, y, z0, 0.1, 0.1, post, mat), cone([x, y, z0 + post], bowl * 0.55, bowl, 0.07, "iron"),
            cbox(x, y, z0 + post + 0.07, bowl * 1.3, bowl * 1.3, 0.02, "ember")]


def bone(a, b, rad=0.022):
    return strut(a, b, rad, "canvas", roof=False)


def skull(x, y, z0, s, turn=0.0):
    """A big horned skull lying on the ground, snout toward +gy."""
    return [cbox(x, y, z0, 0.26 * s, 0.2 * s, 0.16 * s, "canvas", rotZ=turn, roof=False),
            cbox(x, y + 0.15 * s, z0, 0.16 * s, 0.14 * s, 0.09 * s, "canvas", rotZ=turn, roof=False),
            strut([x - 0.1 * s, y - 0.04 * s, z0 + 0.13 * s], [x - 0.22 * s, y - 0.12 * s, z0 + 0.3 * s], 0.025 * s,
                  "canvas", roof=False),
            strut([x + 0.1 * s, y - 0.04 * s, z0 + 0.13 * s], [x + 0.22 * s, y - 0.12 * s, z0 + 0.3 * s], 0.025 * s,
                  "canvas", roof=False)]


def ribs(x0, x1, y, z_top, n, spread, rad=0.022):
    """A ribcage half buried: n pairs of ribs leaning together over the line gy = y."""
    parts = []
    for k in range(n):
        x = x0 + (x1 - x0) * k / max(n - 1, 1)
        for side in (-1, 1):
            elbow = [x + 0.01, y + side * spread * 1.1, z_top * 0.6]
            parts += [bone([x, y + side * spread, 0.04], elbow, rad),
                      bone(elbow, [x + 0.02, y + side * 0.03, z_top], rad)]
    return parts


def maw(y, h, rc, half_open, span, slab, fangs, turn=3):
    """The cave mouth at gx 1.5: two cheek rocks, a squat slab of rock across them (its flat underside
    the mouth's top at h), and fangs hanging from that slab's front edge: the dragon's own jaw."""
    parts = [rock(1.5 - half_open - rc * 0.6, y, 0.04, rc, rc * 0.55, h + 0.02, 45 + turn),
             rock(1.5 + half_open + rc * 0.6, y, 0.04, rc, rc * 0.55, h, 45 - turn),
             rock(1.5, y, h, span, span * 0.5, slab, 45 + turn, roof=True)]
    front = y + span / math.sqrt(2) - 0.08
    for k in range(fangs):
        x = 1.5 + (k - (fangs - 1) / 2) * 2 * half_open / fangs
        parts.append(cone([x, front, h], 0.06, 0.0, 0.18 + 0.05 * fangs * (1 - abs(x - 1.5)), "canvas",
                          axis=[0, 0, -1], roof=False))
    return parts


S = {}

# --- dragon lair, 3x3: un tertre de roche, sa gueule de grotte, des ossements devant -------------
# The mouth opens on +gy (the lit side) at gx 1.5: two cheek rocks, a lintel rock above, the knoll's
# own face at the back. The lintel throws the cave into shadow; the coals inside are its only warmth.

S["dragon_lair_rough"] = {"canvas": "building3x3", "parts": [
    box([0, 0, 0], [3, 3, 0.04], "darkwood"),
    rock(1.45, 1.0, 0.04, 0.98, 0.42, 1.0, 12, roof=True),
    rock(1.35, 0.85, 0.95, 0.55, 0.12, 0.52, 33, roof=True),
    rock(2.3, 1.25, 0.04, 0.62, 0.22, 0.74, -8, roof=True),
    rock(0.6, 1.25, 0.04, 0.55, 0.2, 0.62, 24, roof=True),
    # the mouth: cheeks, lintel, the trodden floor and the coals deep inside
    *maw(1.85, 0.6, 0.36, 0.3, 0.8, 0.32, 2, turn=5),
    box([1.18, 1.55, 0.04], [0.64, 0.75, 0.015], "darkwood", accroche="porte"),
    box([1.36, 1.6, 0.055], [0.26, 0.18, 0.035], "ember"),
    # bones strewn in front, a skull, a loose boulder
    *skull(0.62, 2.45, 0.04, 0.9, turn=-15),
    bone([1.75, 2.5, 0.06], [2.25, 2.7, 0.06], 0.025),
    bone([1.4, 2.75, 0.06], [1.75, 2.55, 0.06]),
    bone([2.3, 2.3, 0.06], [2.6, 2.45, 0.08]),
    rock(2.55, 2.55, 0.04, 0.22, 0.1, 0.22, 17),
]}

S["dragon_lair_solid"] = {"canvas": "building3x3", "parts": [
    box([0, 0, 0], [3, 3, 0.04], "darkwood"),
    rock(1.45, 1.0, 0.04, 1.0, 0.5, 1.2, 10, roof=True),
    rock(1.3, 0.8, 1.15, 0.62, 0.15, 0.72, 35, roof=True),
    rock(2.35, 1.2, 0.04, 0.62, 0.25, 1.0, -12, roof=True),
    rock(2.3, 0.75, 0.9, 0.3, 0.06, 0.45, 20, roof=True),
    rock(0.6, 1.2, 0.04, 0.58, 0.22, 0.85, 26, roof=True),
    rock(0.5, 0.45, 0.04, 0.42, 0.15, 0.55, 5),
    # the mouth: two standing cheek stones, a great lintel, the floor and the coals
    *maw(1.95, 0.78, 0.4, 0.32, 0.88, 0.36, 3),
    box([1.18, 1.62, 0.04], [0.64, 0.8, 0.015], "darkwood", accroche="porte"),
    box([1.32, 1.68, 0.055], [0.36, 0.22, 0.04], "ember"),
    # flat stones leading to the mouth
    *[cbox(1.5 + dx, y, 0.04, 0.34, 0.2, 0.03, "stone", rotZ=t) for dx, y, t in
      ((0.04, 2.4, 4), (-0.05, 2.62, -6), (0.06, 2.84, 9))],
    # torches on iron posts flanking the mouth
    *[part for x in (0.62, 2.38) for part in (cyl([x, 2.4, 0.04], 0.025, 0.7, "iron"),
                                               box([x - 0.035, 2.365, 0.74], [0.07, 0.07, 0.09], "amber"))],
    # a horned skull, a ribcage, scattered bones
    *skull(0.5, 2.6, 0.04, 1.15, turn=-20),
    *ribs(1.95, 2.55, 2.55, 0.42, 4, 0.22),
    bone([0.95, 2.75, 0.06], [1.25, 2.55, 0.06], 0.025),
    bone([2.65, 1.95, 0.06], [2.85, 2.3, 0.06], 0.025),
]}

S["dragon_lair_grand"] = {"canvas": "building3x3", "parts": [
    box([0, 0, 0], [3, 3, 0.04], "darkwood"),
    rock(1.45, 1.0, 0.04, 1.0, 0.55, 1.4, 8, roof=True),
    rock(1.25, 0.75, 1.35, 0.6, 0.12, 1.2, 37, roof=True),
    rock(1.9, 0.85, 1.2, 0.36, 0.06, 0.95, 14, roof=True),
    rock(2.38, 1.2, 0.04, 0.6, 0.28, 1.25, -12, roof=True),
    rock(2.45, 0.7, 1.1, 0.32, 0.05, 0.75, 22, roof=True),
    rock(0.6, 1.15, 0.04, 0.58, 0.24, 1.05, 26, roof=True),
    rock(0.52, 0.85, 0.95, 0.3, 0.05, 0.6, 3, roof=True),
    # the maw: cheeks, a heavy lintel, fangs down from it and up from the floor
    *maw(2.0, 0.98, 0.44, 0.34, 0.92, 0.42, 5, turn=2),
    *[cone([x, 2.3, 0.04], 0.06, 0.0, 0.3, "canvas", roof=False) for x in (1.38, 1.62)],
    box([1.16, 1.64, 0.04], [0.68, 0.98, 0.015], "darkwood", accroche="porte"),
    box([1.3, 1.7, 0.055], [0.4, 0.26, 0.045], "ember"),
    # standing stones chained on each side of the approach
    *[part for x, t in ((0.42, 8), (2.58, -10)) for part in (
        cbox(x, 2.45, 0.04, 0.24, 0.2, 0.95, "stone", rotZ=t),
        rock(x, 2.45, 0.99, 0.15, 0.0, 0.16, t + 45),
        cyl([x, 2.56, 0.6], 0.06, 0.02, "iron", axis=[0, 1, 0]))],
    strut([0.42, 2.57, 0.6], [0.95, 2.45, 0.3], 0.018, "iron"),
    strut([2.58, 2.57, 0.6], [2.05, 2.45, 0.3], 0.018, "iron"),
    # torches on the cheeks, the dragon's skull and a heap of old bones
    *[box([x - 0.035, 2.34, 0.62], [0.07, 0.03, 0.1], "amber") for x in (0.86, 2.14)],
    *skull(0.55, 1.95, 0.04, 1.3, turn=-25),
    *ribs(2.25, 2.75, 1.85, 0.4, 3, 0.18),
    bone([0.15, 2.75, 0.06], [0.55, 2.9, 0.06], 0.025),
    bone([2.35, 2.95, 0.06], [2.8, 2.7, 0.06], 0.025),
    rock(0.3, 0.3, 0.04, 0.26, 0.1, 0.4, 30),
    rock(2.75, 2.25, 0.04, 0.2, 0.08, 0.3, 11),
]}

# --- heroes hall, 3x3: arche de pierre entre deux bannières, trophée au fond ---------------------
# The hall stands at the back (low gy), its long wall facing +gy (lit); the arch stands in front of
# it at gx 1.5, framing the trophy (a round shield on crossed swords) on that wall. The two banner
# poles flank the arch at the front edge: the cloth is the app's (heights.py ESTIMATES `bannieres`).


def trophy(x, y, z, s, shield="banner"):
    """A round shield on two crossed swords, hung on a wall facing +gy."""
    return [strut([x - 0.22 * s, y + 0.02, z - 0.22 * s], [x + 0.22 * s, y + 0.02, z + 0.22 * s], 0.018 * s, "iron",
                  verts=4),
            strut([x + 0.22 * s, y + 0.02, z - 0.22 * s], [x - 0.22 * s, y + 0.02, z + 0.22 * s], 0.018 * s, "iron",
                  verts=4),
            cyl([x, y + 0.03, z], 0.15 * s, 0.03, shield, axis=[0, 1, 0]),
            cyl([x, y + 0.06, z], 0.05 * s, 0.025, "iron", axis=[0, 1, 0])]


def poles(xs, y, z0, h, mat, rad=0.055):
    """Medieval banner masts: a thick shaft, an iron collar where the cloth ties on, a round pommel
    and a short spike. No crossbar (round 2: a T-bar read as a telegraph pole); the cloth is the app's."""
    parts = []
    for x in xs:
        top = z0 + h
        parts += [cyl([x, y, z0], rad, h, mat),
                  cyl([x, y, top - 0.3], rad * 1.35, 0.05, "iron"),
                  cone([x, y, top], rad * 0.9, rad * 1.7, 0.06, "iron", roof=False),
                  cone([x, y, top + 0.06], rad * 1.7, rad * 0.9, 0.06, "iron", roof=False),
                  cone([x, y, top + 0.12], rad * 0.6, 0.0, 0.1, "iron", roof=False)]
    return parts


S["heroes_hall_rough"] = {"canvas": "building3x3", "parts": [
    box([0, 0, 0], [3, 3, 0.04], "darkwood"),
    # round 2: a small, low longhouse (the solid's hall is twice its bulk), a squat arch
    *turned([
        box([0.6, 0.5, 0.04], [1.8, 0.95, 0.48], "wood"),
        *[box([x, 1.43, 0.04], [0.07, 0.04, 0.48], "darkwood") for x in (0.6, 1.15, 1.85, 2.33)],
        roof([0.5, 0.4, 0.52], [2.0, 1.15, 0.55], "thatch"),
        box([0.78, 1.45, 0.04], [0.28, 0.03, 0.38], "darkwood", accroche="porte"),
        box([2.0, 1.45, 0.22], [0.14, 0.03, 0.12], "amber"),
        *trophy(1.5, 1.45, 0.3, 0.6, shield="wood"),
    ], 1.5, 0.95, 2.5),
    # the arch: two piles of rough stone and a slab across
    cbox(1.14, 2.32, 0.04, 0.26, 0.3, 0.7, "stone", rotZ=4),
    cbox(1.86, 2.32, 0.04, 0.26, 0.3, 0.67, "stone", rotZ=-3),
    cbox(1.5, 2.32, 0.68, 1.04, 0.34, 0.16, "stone", rotZ=2),
    *poles((0.42, 2.58), 2.72, 0.04, 1.05, "wood", rad=0.05),
    # a stone at each pole's foot, a bench
    *[rock(x, 2.72, 0.04, 0.12, 0.06, 0.1, 20) for x in (0.42, 2.58)],
    box([2.2, 1.75, 0.04], [0.5, 0.14, 0.14], "wood", rotZ=-6),
]}

S["heroes_hall_solid"] = {"canvas": "building3x3", "parts": [
    box([0, 0, 0], [3, 3, 0.08], "stone"),
    box([0.25, 0.2, 0.08], [2.5, 1.4, 0.14], "stone"),
    box([0.3, 0.25, 0.22], [2.4, 1.3, 0.88], "stone"),
    *[box([x, 1.52, 0.22], [0.14, 0.08, 0.88], "stone") for x in (0.3, 1.0, 1.86, 2.56)],
    box([0.3, 0.25, 1.1], [2.4, 1.33, 0.06], "stone"),
    roof([0.18, 0.12, 1.16], [2.64, 1.56, 0.86], "tile"),
    box([0.5, 0.45, 1.16], [0.24, 0.24, 1.0], "stone", accroche="cheminee"),
    box([0.48, 0.43, 2.16], [0.28, 0.28, 0.05], "iron", accroche="cheminee"),
    # door under a lintel, warm windows, the trophy in the middle of the wall
    box([0.5, 1.55, 0.22], [0.36, 0.03, 0.6], "darkwood", accroche="porte"),
    box([0.45, 1.55, 0.82], [0.46, 0.06, 0.09], "stone"),
    *[box([x, 1.55, 0.5], [0.16, 0.03, 0.24], "amber") for x in (2.15, 2.45)],
    box([2.71, 0.6, 0.5], [0.03, 0.16, 0.24], "amber"),
    *trophy(1.43, 1.55, 0.66, 1.1),
    # the arch: plinths, dressed pillars with capitals, lintel, keystone, a shield on each pillar
    *[part for x in (1.0, 2.0) for part in (
        cbox(x, 2.3, 0.08, 0.38, 0.4, 0.12, "stone"),
        cbox(x, 2.3, 0.2, 0.3, 0.32, 1.12, "stone"),
        cbox(x, 2.3, 1.32, 0.36, 0.38, 0.08, "stone"),
        cyl([x, 2.47, 0.82], 0.1, 0.03, "banner", axis=[0, 1, 0]))],
    cbox(1.5, 2.3, 1.4, 1.42, 0.38, 0.22, "stone"),
    cbox(1.5, 2.3, 1.62, 0.3, 0.3, 0.1, "stone"),
    *[box([x - 0.035, 2.5, 1.0], [0.07, 0.04, 0.1], "amber") for x in (0.85, 2.15)],
    # paving through the arch, the banner poles
    box([1.25, 1.6, 0.08], [0.5, 1.38, 0.02], "stone"),
    *poles((0.42, 2.58), 2.72, 0.08, 1.85, "darkwood"),
    *[cbox(x, 2.72, 0.08, 0.18, 0.18, 0.08, "stone") for x in (0.42, 2.58)],
]}

S["heroes_hall_grand"] = {"canvas": "building3x3", "parts": [
    box([0, 0, 0], [3, 3, 0.08], "stone"),
    box([0.2, 0.15, 0.08], [2.6, 1.5, 0.22], "stone"),
    box([0.28, 0.22, 0.3], [2.44, 1.2, 1.06], "stone"),
    box([0.25, 0.19, 1.36], [2.5, 1.26, 0.08], "stone"),
    roof([0.16, 0.1, 1.44], [2.68, 1.44, 0.9], "tile"),
    # a lantern tower on the ridge, warm slits, pyramid roof with a finial
    box([1.22, 0.53, 1.95], [0.56, 0.56, 0.52], "stone"),
    *[box([x, 1.09, 2.08], [0.08, 0.03, 0.24], "amber") for x in (1.33, 1.59)],
    box([1.78, 0.68, 2.08], [0.03, 0.08, 0.24], "amber"),
    box([1.18, 0.49, 2.47], [0.64, 0.64, 0.06], "stone"),
    cone([1.5, 0.81, 2.53], 0.46, 0.0, 0.33, "tile", verts=4, rotZ=45),
    cone([1.5, 0.81, 2.86], 0.03, 0.0, 0.12, "iron", roof=False),
    box([0.42, 0.4, 1.44], [0.22, 0.22, 0.95], "stone", accroche="cheminee"),
    box([0.4, 0.38, 2.39], [0.26, 0.26, 0.05], "iron", accroche="cheminee"),
    # the portico: four columns on the lit wall under an entablature
    box([0.9, 1.42, 0.3], [1.2, 0.42, 0.04], "stone"),
    *[cyl([x, 1.66, 0.34], 0.07, 0.96, "stone") for x in (0.98, 1.34, 1.66, 2.02)],
    box([0.86, 1.42, 1.3], [1.28, 0.42, 0.14], "stone"),
    box([1.3, 1.43, 0.3], [0.4, 0.03, 0.7], "darkwood", accroche="porte"),
    *trophy(1.5, 1.43, 1.12, 0.9),
    *[box([x, 1.43, 0.6], [0.16, 0.03, 0.3], "amber") for x in (0.45, 2.38)],
    *[box([2.73, y, 0.6], [0.03, 0.16, 0.3], "amber") for y in (0.45, 0.95)],
    # the triumphal arch: plinths, pillars, attic, and the hero's statue raising a sword
    *[part for x in (0.95, 2.05) for part in (
        cbox(x, 2.35, 0.08, 0.46, 0.46, 0.16, "stone"),
        cbox(x, 2.35, 0.24, 0.38, 0.38, 1.24, "stone"),
        cbox(x, 2.35, 1.48, 0.44, 0.44, 0.08, "stone"),
        cyl([x, 2.55, 0.9], 0.12, 0.03, "banner", axis=[0, 1, 0]),
        cyl([x, 2.58, 0.9], 0.04, 0.02, "iron", axis=[0, 1, 0]))],
    cbox(1.5, 2.35, 1.56, 1.56, 0.44, 0.26, "stone"),
    cbox(1.5, 2.35, 1.82, 1.66, 0.48, 0.07, "stone"),
    cbox(1.5, 2.35, 1.89, 0.36, 0.3, 0.14, "stone"),
    cone([1.5, 2.35, 2.03], 0.12, 0.08, 0.42, "iron"),
    cyl([1.5, 2.35, 2.45], 0.065, 0.12, "iron"),
    strut([1.58, 2.35, 2.3], [1.72, 2.35, 2.55], 0.03, "iron"),
    strut([1.72, 2.35, 2.5], [1.76, 2.35, 2.92], 0.018, "iron", verts=4),
    box([1.66, 2.3, 2.5], [0.16, 0.1, 0.03], "iron"),
    *[box([x - 0.035, 2.59, 1.1], [0.07, 0.04, 0.1], "amber") for x in (0.72, 2.28)],
    # steps and paving, the banner poles on stone bases
    box([1.0, 2.62, 0.08], [1.0, 0.3, 0.03], "stone"),
    box([1.2, 1.84, 0.08], [0.6, 0.78, 0.02], "stone"),
    *poles((0.3, 2.7), 2.78, 0.2, 2.1, "darkwood", rad=0.06),
    *[cbox(x, 2.78, 0.08, 0.22, 0.22, 0.12, "stone") for x in (0.3, 2.7)],
]}

# --- champion arena, 3x3: enceinte ronde à gradins, ouverte au ciel ------------------------------
# Centred on (1.5, 1.5); the gate faces the viewer's corner (45 deg, between +gx and +gy) so the
# floor and the stands across it show through. Fire bowls on the rim: coals `ember`, flames the app's.
# The bench ring (rough) and the wall's coping (solid, grand) are marked roofs: snow lands there.
C = 1.5
GATE = 45


def gate_xy(rad, side):
    """A point on the gate's edge: `side` = -1 or 1, on the circle of radius rad."""
    th = math.radians(GATE + side * 17)
    return C + rad * math.cos(th), C + rad * math.sin(th)


S["champion_arena_rough"] = {"canvas": "building3x3", "parts": [
    box([0, 0, 0], [3, 3, 0.04], "darkwood"),
    cyl([C, C, 0.04], 1.05, 0.015, "wood", roof=False),
    # a palisade of stakes, uneven, open at the gate
    *[part for k in range(30) if abs((12 * k - GATE + 180) % 360 - 180) > 17
      for (x, y), h in [(around(C, C, 1.3, [12 * k])[0], 0.5 + 0.06 * ((k * 7) % 5) / 4)]
      for part in (cyl([x, y, 0.04], 0.055, h, "wood"), cone([x, y, 0.04 + h], 0.055, 0.0, 0.12, "wood"))],
    # one ring of plank benches inside
    *ring(C, C, 0.04, 1.18, 0.16, 0.16, 24, "darkwood", gate=(GATE, 20), jitter=[0.0, 0.02, -0.02], roof=True),
    # gate posts and a crossbar
    *[cyl([*gate_xy(1.3, s), 0.04], 0.07, 0.7, "darkwood") for s in (-1, 1)],
    strut([*gate_xy(1.3, -1), 0.68], [*gate_xy(1.3, 1), 0.68], 0.05, "darkwood"),
    # two fire bowls on posts, a wooden post in the middle of the ring
    *brazier(*around(C, C, 1.38, [100])[0], 0.04, 0.58, "darkwood"),
    *brazier(*around(C, C, 1.38, [350])[0], 0.04, 0.58, "darkwood"),
    cyl([C, C, 0.055], 0.06, 0.55, "wood", accroche="porte"),
]}

S["champion_arena_solid"] = {"canvas": "building3x3", "parts": [
    box([0, 0, 0], [3, 3, 0.08], "stone"),
    cyl([C, C, 0.08], 0.82, 0.015, "wood", roof=False),
    # the outer wall and its coping, three tiers of stands stepping down to the floor
    *ring(C, C, 0.08, 1.45, 0.2, 0.72, 32, "stone", gate=(GATE, 16)),
    *ring(C, C, 0.8, 1.47, 0.24, 0.06, 32, "stone", gate=(GATE, 16), roof=True),
    *ring(C, C, 0.08, 1.26, 0.2, 0.48, 30, "stone", gate=(GATE, 18)),
    *ring(C, C, 0.08, 1.07, 0.2, 0.3, 28, "stone", gate=(GATE, 20)),
    *ring(C, C, 0.08, 0.9, 0.12, 0.14, 26, "stone", gate=(GATE, 22)),
    # the gate: two pillars and a lintel
    *[cbox(*gate_xy(1.4, s), 0.08, 0.24, 0.24, 0.92, "stone", rotZ=GATE) for s in (-1, 1)],
    strut([*gate_xy(1.4, -1), 0.94], [*gate_xy(1.4, 1), 0.94], 0.1, "stone", verts=4),
    box([C + 1.0 * math.cos(math.radians(GATE)) - 0.15, C + 1.0 * math.sin(math.radians(GATE)) - 0.15, 0.08],
        [0.3, 0.3, 0.015], "darkwood", accroche="porte"),
    # four fire bowls on the rim
    *[part for x, y in around(C, C, 1.35, [105, 195, 255, 345]) for part in brazier(x, y, 0.86, 0.1)],
    # a sand floor with a weapon rack in the middle
    cbox(C, C, 0.095, 0.22, 0.22, 0.14, "stone"),
    *[strut([C - 0.05 + 0.05 * k, C, 0.23], [C - 0.08 + 0.08 * k, C + 0.02, 0.62], 0.012, "iron", verts=4)
      for k in range(3)],
]}

S["champion_arena_grand"] = {"canvas": "building3x3", "parts": [
    box([0, 0, 0], [3, 3, 0.08], "stone"),
    cyl([C, C, 0.08], 1.5, 0.06, "stone"),
    cyl([C, C, 0.14], 0.74, 0.015, "wood", roof=False),
    # the outer wall: plinth, wall, dark arcade openings outside, cornice, attic with merlons
    *ring(C, C, 0.14, 1.46, 0.22, 0.86, 36, "stone", gate=(GATE, 15)),
    *[part for deg in range(5, 360, 20) if abs((deg - GATE + 180) % 360 - 180) > 24
      for (x, y) in around(C, C, 1.465, [deg])
      for part in (cbox(x, y, 0.2, 0.16, 0.02, 0.4, "darkwood", rotZ=deg + 90),
                   cbox(*around(C, C, 1.47, [deg + 10])[0], 0.14, 0.06, 0.04, 0.86, "stone", rotZ=deg + 100))],
    *ring(C, C, 1.0, 1.49, 0.26, 0.07, 36, "stone", gate=(GATE, 15), roof=True),
    *ring(C, C, 1.07, 1.44, 0.12, 0.14, 18, "stone", gate=(GATE, 24)),
    # four tiers of stands
    *ring(C, C, 0.14, 1.26, 0.2, 0.62, 32, "stone", gate=(GATE, 17)),
    *ring(C, C, 0.14, 1.08, 0.18, 0.44, 30, "stone", gate=(GATE, 19)),
    *ring(C, C, 0.14, 0.92, 0.16, 0.27, 28, "stone", gate=(GATE, 21)),
    *ring(C, C, 0.14, 0.78, 0.1, 0.12, 26, "stone", gate=(GATE, 24)),
    # the gate: two round towers with tiled cones, a lintel, iron portcullis
    *[part for s in (-1, 1) for part in (
        cyl([*gate_xy(1.36, s), 0.14], 0.22, 1.06, "stone"),
        cyl([*gate_xy(1.36, s), 1.2], 0.25, 0.06, "stone"),
        cone([*gate_xy(1.36, s), 1.26], 0.23, 0.0, 0.24, "tile"))],
    strut([*gate_xy(1.36, -1), 0.98], [*gate_xy(1.36, 1), 0.98], 0.12, "stone", verts=4),
    strut([*gate_xy(1.48, -1), 0.72], [*gate_xy(1.48, 1), 0.72], 0.03, "iron", verts=4),
    box([C + 1.0 * math.cos(math.radians(GATE)) - 0.15, C + 1.0 * math.sin(math.radians(GATE)) - 0.15, 0.14],
        [0.3, 0.3, 0.015], "darkwood", accroche="porte"),
    # six fire bowls on the rim
    *[part for x, y in around(C, C, 1.4, [95, 145, 195, 255, 305, 355]) for part in brazier(x, y, 1.07, 0.08)],
    # the champion's podium in the middle: steps, a plinth, a great sword planted in it
    cyl([C, C, 0.155], 0.3, 0.08, "stone"),
    cbox(C, C, 0.235, 0.32, 0.32, 0.2, "stone", rotZ=45),
    strut([C, C, 0.43], [C, C, 1.05], 0.03, "iron", verts=4),
    box([C - 0.14, C - 0.025, 0.86], [0.28, 0.05, 0.04], "iron"),
]}

# --- high road, 1x2 on building1x2: le départ de la grand-route ----------------------------------
# isoLayout.json puts it at gx 10, gy 17-18 with the village path at gy 16: the road runs along gy,
# from its gy 0 end (the village) to its gy 2 end (the world). The signpost stands on its stone pile
# at the +gx edge; the lantern (heights.py ESTIMATES `lanterne`, x 0.5-0.8, y 0.6-0.9) hangs from an
# arm at the rough and solid stages and from the gate's lintel at the grand one: the app draws it.


def signpost(x, y, z0, h, mat, lean=(0.0, 0.0), arm_to=None):
    """A post with two arrow boards pointing both ways along the road, an arm for the lantern."""
    top = [x + lean[0], y + lean[1], z0 + h]
    parts = [strut([x, y, z0], top, 0.035, mat, verts=4)]
    for dy, dz in ((0.26, -0.2), (-0.26, -0.4)):
        y0, y1 = sorted((top[1], top[1] + dy))
        parts.append(box([top[0] - 0.015, y0, top[2] + dz], [0.04, y1 - y0, 0.12], mat))
        parts.append(cone([top[0], top[1] + dy, top[2] + dz + 0.06], 0.07, 0.0, 0.08, mat,
                          axis=[0, math.copysign(1, dy), 0], verts=4))
    if arm_to:
        parts.append(strut([top[0], top[1], top[2] - 0.08], [arm_to[0], arm_to[1], top[2] - 0.08], 0.018, mat,
                           verts=4))
        parts.append(cyl([arm_to[0], arm_to[1], top[2] - 0.2], 0.008, 0.12, "iron"))
    return parts


def paving(x0, x1, z0, rows, mat="stone"):
    """Slabs in courses along gy between x0 and x1, every other course offset by half a slab."""
    parts, step = [], (x1 - x0) / 2
    for row in range(rows):
        y = 0.04 + 0.24 * row
        cuts = [x0, x0 + step, x1] if row % 2 == 0 else [x0, x0 + step / 2, x0 + 1.5 * step, x1]
        parts += [box([a + 0.01, y, z0], [b - a - 0.02, 0.22, 0.025], mat) for a, b in zip(cuts, cuts[1:])]
    return parts


S["high_road_rough"] = {"canvas": "building1x2", "parts": [
    box([0, 0, 0], [1, 2, 0.04], "darkwood"),
    # ruts and a few flat stones on the track
    *[box([x, 0.04, 0.04], [0.06, 1.92, 0.006], "wood") for x in (0.25, 0.6)],
    *[cbox(x, y, 0.04, 0.16, 0.12, 0.02, "stone", rotZ=t) for x, y, t in
      ((0.42, 0.35, 12), (0.34, 1.25, -9), (0.55, 1.62, 21))],
    # the signpost on its pile of stones, leaning, an arm for the lantern
    rock(0.8, 0.78, 0.04, 0.2, 0.12, 0.16, 15),
    rock(0.72, 0.95, 0.04, 0.12, 0.06, 0.12, 40),
    rock(0.86, 0.6, 0.04, 0.12, 0.05, 0.12, 5),
    rock(0.82, 0.76, 0.2, 0.12, 0.05, 0.1, 28),
    *signpost(0.82, 0.76, 0.26, 1.18, "wood", lean=(-0.04, 0.02), arm_to=(0.62, 0.76)),
    # round 2, a silhouette at 30 %: two tall rough boundary stones on the far edge, a heap of
    # stones at the far end with a cart wheel left leaning on it
    rock(0.1, 0.12, 0.04, 0.09, 0.05, 0.55, 10),
    rock(0.1, 1.88, 0.04, 0.09, 0.05, 0.6, -8),
    rock(0.78, 1.7, 0.04, 0.2, 0.1, 0.26, 20),
    rock(0.6, 1.84, 0.04, 0.14, 0.06, 0.18, 50),
    rock(0.85, 1.45, 0.04, 0.13, 0.06, 0.2, 5),
    rock(0.74, 1.64, 0.26, 0.13, 0.05, 0.18, 33),
    cyl([0.48, 1.6, 0.22], 0.2, 0.04, "darkwood", axis=[0.94, 0, 0.34]),
    cyl([0.5, 1.6, 0.23], 0.05, 0.05, "wood", axis=[0.94, 0, 0.34]),
]}

S["high_road_solid"] = {"canvas": "building1x2", "parts": [
    box([0, 0, 0], [1, 2, 0.06], "darkwood"),
    # paving between two curbs, laid in courses
    *paving(0.17, 0.83, 0.06, 8),
    *[box([x, 0.02, 0.06], [0.07, 1.96, 0.06], "stone") for x in (0.1, 0.83)],
    # the signpost on a dressed base with a tiled cap, the arm for the lantern
    cbox(0.9, 0.75, 0.06, 0.18, 0.2, 0.16, "stone"),
    *signpost(0.9, 0.75, 0.22, 1.3, "darkwood", arm_to=(0.65, 0.75)),
    cone([0.9, 0.75, 1.52], 0.07, 0.0, 0.08, "tile", verts=4, rotZ=45),
    # milestones at the two ends, knee-high
    *[part for y in (0.15, 1.85) for part in (cbox(0.07, y, 0.06, 0.12, 0.14, 0.48, "stone"),
                                              cone([0.07, y, 0.54], 0.085, 0.0, 0.08, "stone", verts=4, rotZ=45))],
    # round 2: a timber arch across the road at its far end, braced, under a small tiled ridge
    *[cbox(x, 1.45, 0.06, 0.1, 0.1, 1.2, "wood") for x in (0.08, 0.92)],
    box([0.0, 1.4, 1.26], [1.0, 0.1, 0.1], "darkwood"),
    roof([0.0, 1.37, 1.36], [1.0, 0.16, 0.1], "tile"),
    strut([0.13, 1.45, 0.98], [0.34, 1.45, 1.26], 0.025, "darkwood", verts=4),
    strut([0.87, 1.45, 0.98], [0.66, 1.45, 1.26], 0.025, "darkwood", verts=4),
]}

S["high_road_grand"] = {"canvas": "building1x2", "parts": [
    box([0, 0, 0], [1, 2, 0.08], "stone"),
    # dressed paving and curbs
    *paving(0.16, 0.84, 0.08, 8),
    *[box([x, 0.02, 0.08], [0.08, 1.96, 0.07], "stone") for x in (0.08, 0.84)],
    # the gate across the road at gy 0.75: two pillars, a lintel, a tiled ridge; the lantern hangs from it
    *[part for x in (0.12, 0.88) for part in (
        cbox(x, 0.75, 0.08, 0.24, 0.44, 0.14, "stone"),
        cbox(x, 0.75, 0.22, 0.2, 0.38, 1.5, "stone"),
        cbox(x, 0.75, 1.72, 0.24, 0.44, 0.08, "stone"))],
    box([0.0, 0.53, 1.8], [1.0, 0.44, 0.24], "stone"),
    roof([0.0, 0.5, 2.04], [1.0, 0.5, 0.22], "tile"),
    cyl([0.65, 0.75, 1.68], 0.008, 0.18, "iron"),
    box([0.25, 0.73, 0.08], [0.5, 0.06, 0.03], "stone", accroche="porte"),
    # a shield over the gate, the signpost on its base past the gate, milestones and a bench stone
    cyl([0.5, 0.88, 1.95], 0.07, 0.02, "banner", axis=[0, 1, 0]),
    cbox(0.9, 1.4, 0.08, 0.18, 0.2, 0.16, "stone"),
    *signpost(0.9, 1.4, 0.24, 1.15, "darkwood"),
    cone([0.9, 1.4, 1.39], 0.07, 0.0, 0.08, "tile", verts=4, rotZ=45),
    *[part for y in (0.2, 1.85) for part in (cbox(0.06, y, 0.08, 0.1, 0.12, 0.34, "stone"),
                                             cone([0.06, y, 0.42], 0.07, 0.0, 0.07, "stone", verts=4, rotZ=45))],
    *[box([x - 0.03, 0.94, 1.2], [0.06, 0.03, 0.09], "amber") for x in (0.12, 0.88)],
]}

FOOT = {"dragon_lair": (3, 3), "heroes_hall": (3, 3), "champion_arena": (3, 3), "high_road": (1, 2)}
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
