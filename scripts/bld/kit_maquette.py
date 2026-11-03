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
"""
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
