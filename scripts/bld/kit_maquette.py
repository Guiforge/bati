#!/usr/bin/env python3
"""Maquette kit: the shared round shapes of the building maquettes, as spec parts with good defaults.

A part comes out as a plain dict of the spec format (`cone`, `cyl`), so it works in any generator (gen_cartes.py) and in any
hand-written JSON spec: copy the keys. Defaults: 64 segments (iso_blockout.py clamps to 32 at least; 4 and 8 stay deliberate
pyramids and domes), so the lit and shaded faces of a round part change by a thin step, not a 12-degree slab. The renderer is
flat-shaded by design (composed tones, no lit render); the smoothing is maquette_peinture.soften, which blends each material's
lit and shade value by a wide blur, seam pixels included. Everything is built from these shapes, never from downloaded models.

    tower(center, r_bottom, r_top, h, mat="stone")         a round shaft, tapering
    plinth(center, r, h, mat="stone")                      a low round base
    cone_roof(center, r, h, mat, tip=0.04)                 a conical roof ending in a small tip
    tiled_roof(center, r, h) / thatched_roof(center, r, h) the same, in the `tile` / `thatch` material
    roof(center, r, h, mat)                                picks the roof material by name
    dome(center, r, mat, slit=None)                        a half ball of stacked rings; slit=azimuth deg cuts an observatory slit
    arch(base, w, h, depth, mat, wall="x")                 a doorway: dark opening, two jambs, a round head of voussoirs
    scaffold(at, size, levels, level_h)                    poles, ledgers, planks and a brace per level
    treadwheel_crane(center, R, mat)                       a post-and-jib crane with a wooden drum wheel, rope and hook
"""
import math

import gen_pilot_specs as G

SEGMENTS = 64


def tower(center, r_bottom, r_top, h, mat="stone", verts=SEGMENTS, **kw):
    return G.cone(center, r_bottom, r_top, h, mat, verts=verts, **kw)


def plinth(center, r, h, mat="stone", verts=SEGMENTS, **kw):
    return G.cyl(center, r, h, mat, verts=verts, **kw)


def cone_roof(center, r, h, mat, tip=0.04, verts=SEGMENTS, **kw):
    return G.cone(center, r, tip, h, mat, verts=verts, **kw)


def tiled_roof(center, r, h, **kw):
    return cone_roof(center, r, h, "tile", **kw)


def thatched_roof(center, r, h, **kw):
    return cone_roof(center, r, h, "thatch", **kw)


def roof(center, r, h, mat, **kw):
    return cone_roof(center, r, h, mat, **kw)


def dome(center, r, mat="plaster", rings=16, slit=None, slit_w=0.1, slit_mat="darkwood", verts=SEGMENTS):
    """Upper half ball (center = the rim's centre) as `rings` frustums; `slit` is the azimuth in degrees
    (0 = +x, 90 = +y) of a dark strip running from the rim over the top, `slit_w` wide."""
    cx, cy, cz = center
    out = []
    for i in range(rings):
        p0, p1 = math.pi / 2 * i / rings, math.pi / 2 * (i + 1) / rings
        out.append(G.cone([cx, cy, cz + r * math.sin(p0)], r * math.cos(p0), max(r * math.cos(p1), 0.001),
                          r * (math.sin(p1) - math.sin(p0)), mat, verts=verts))
    if slit is not None:
        a, n = math.radians(slit), 24
        pts = [[cx + 1.01 * r * math.cos(t) * math.cos(a), cy + 1.01 * r * math.cos(t) * math.sin(a), cz + 1.01 * r * math.sin(t)]
               for t in (math.pi * 0.46 * k / n for k in range(n + 1))]
        out += [G.seg(pts[k], pts[k + 1], slit_w / 2, slit_mat) for k in range(n)]
    return out


def arch(base, w, h, depth, mat="stone", wall="x", jamb=0.1, n=14, hole_mat="darkwood"):
    """An opening in a wall running along `wall` ("x" or "y"); `base` = its foot centre on the wall's face,
    `h` = height to the spring line, so the round head rises w/2 above it. Depth goes the other way."""
    bx, by, bz = base
    u = (1, 0) if wall == "x" else (0, 1)
    v = (u[1], u[0])

    def at(s, z, d=0.0):
        return [bx + u[0] * s + v[0] * d, by + u[1] * s + v[1] * d, z]

    def slab(s0, s1, z, hz, d):  # a box spanning s0..s1 along the wall: (corner, size)
        size = [abs(s1 - s0), d, hz] if wall == "x" else [d, abs(s1 - s0), hz]
        return at(min(s0, s1), z), size

    hw = w / 2
    o, size = slab(-hw, hw, bz, h, depth)
    out = [G.box(o, size, hole_mat)]
    for sgn in (-1, 1):
        o, size = slab(sgn * hw, sgn * (hw + jamb), bz, h, depth)
        out.append(G.box(o, size, mat))
    rr = hw + jamb / 2
    pts = [at(rr * math.cos(math.pi * k / n), bz + h + hw * math.sin(math.pi * k / n) * (rr / hw), depth / 2) for k in range(n + 1)]
    out += [G.seg(pts[k], pts[k + 1], jamb / 2, mat) for k in range(n)]
    return out


def scaffold(at, size, levels=2, level_h=0.5, pole=0.025, plank=0.04):
    """Timber scaffold on the rectangle `size` (x, y) from corner `at`: corner poles, two ledger rings and a
    plank deck per level, one diagonal brace on the front. Poles rise a little above the last deck."""
    x, y, z = at
    sx, sy = size
    top = z + levels * level_h
    corners = [(x, y), (x + sx, y), (x + sx, y + sy), (x, y + sy)]
    out = [G.cyl([cx, cy, z], pole, levels * level_h + 0.25, "wood") for cx, cy in corners]
    for lv in range(1, levels + 1):
        zl = z + lv * level_h
        for zz in (zl - 0.18, zl - plank):
            out += [G.seg([*corners[k], zz], [*corners[(k + 1) % 4], zz], pole * 0.8, "wood") for k in range(4)]
        out.append(G.box([x, y, zl - plank], [sx, sy, plank], "darkwood"))
    out.append(G.seg([x, y, z], [x + sx, y, top - plank], pole * 0.8, "wood"))
    return out


def treadwheel_crane(center, R=0.45, mat="wood", width=0.2, rim=0.03, n=24, spokes=8):
    """Post-and-jib crane. `center` = the foot (ground level, middle of its base). A drum wheel (two rims with
    treads between, spokes, axle) turns on an axle along y at height R+0.2; an A-frame holds it, a jib leans out
    toward +x from the axle top with a rope and hook."""
    cx, cy, cz = center
    zc = cz + R + 0.2
    hw = width / 2
    out = []
    for y in (cy - hw, cy + hw):
        out += G.ring([cx, y, zc], R, [0, 1, 0], n, rim, mat)
    for k in range(n):  # treads
        a = 2 * math.pi * k / n
        px, pz = cx + R * math.cos(a), zc + R * math.sin(a)
        out.append(G.seg([px, cy - hw, pz], [px, cy + hw, pz], rim * 0.7, "darkwood"))
    for k in range(spokes):
        a = 2 * math.pi * k / spokes
        for y in (cy - hw, cy + hw):
            out.append(G.seg([cx, y, zc], [cx + R * math.cos(a), y, zc + R * math.sin(a)], rim * 0.6, mat))
    out.append(G.seg([cx, cy - hw - 0.12, zc], [cx, cy + hw + 0.12, zc], 0.04, "iron"))
    for y in (cy - hw - 0.1, cy + hw + 0.1):  # A-frame legs
        out.append(G.seg([cx - 0.3, y, cz], [cx, y, zc], 0.04, "darkwood"))
        out.append(G.seg([cx + 0.3, y, cz], [cx, y, zc], 0.04, "darkwood"))
    tip = [cx + 0.75, cy, zc + 0.55]
    out.append(G.seg([cx - 0.1, cy, zc - 0.1], tip, 0.04, "darkwood"))
    out.append(G.seg(tip, [tip[0], cy, tip[2] - 0.55], 0.012, "iron"))
    out.append(G.box([tip[0] - 0.04, cy - 0.04, tip[2] - 0.62], [0.08, 0.08, 0.08], "iron"))
    return out
