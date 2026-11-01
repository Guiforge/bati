"""Generate the blockout specs of L1-T06 into argv[1] (default: pieces/ beside this file); format them
with biome afterwards. They are:
decor (trees, groves, rocks), water (canal tiles, bridge, the cascade's lip and its falling water),
scaffolds (1 x 1 and 2 x 2, for the building site of lot 5) and the seven villagers (front and back).

Slugs are `pieces/<family>_<variant>`: none is a building stage, so they live in their own folder
(every top-level spec is a building stage to heights.py and __tests__/iso-layout.test.ts), and
iso_loop.sprite_path keeps the mock-up at `blockout/pieces/<family>_<variant>.webp`.

- Decor keeps heights.py DECORS (a box of its cell at the estimated height, which isoLayout.json was
  laid out with): every variant stays inside its cell and under that height, so its shadow is inside
  the estimate's and heights.json does not move.
- Water is flat, like the well's and the fountain's: `thatch` marked not a roof (the palette has no
  water). Canal tiles run along gy, as isoLayout.json's canal does (gx 5, gy 1 to 19). What runs
  (the falling sheet of the cascade) is a separate piece on the `sails` canvas, anchored at the
  cascade cell's back corner, below ground, `noShadow`: the app animates it (lot 4).
- A scaffold is see-through (poles, planks, braces, ladder, no floor): it stands over the old stage
  while the next one is built. Its height is capped so its shadow stays within one cell, the least
  any 1 x 1 or 2 x 2 building already needs (heights.json `cases`).
- A villager stands in the middle of the `villager` canvas (pxScale 2, anchor at the cell's centre),
  about as tall as the forge's door (0.52), lit from the front (`light`, CHECKLIST item 15: the app
  mirrors him). The seven roles and what they carry are those of constants/villagers.ts and
  scripts/generate-villagers.py (CAST). `face` looks at the viewer (+gx +gy), `dos` is the same
  figure turned 180 degrees.
"""

import json
import math
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent.parent
sys.path.insert(0, str(REPO / "scripts/iso/exports"))
import heights as Hg  # noqa: E402

OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "pieces"


def r(v):
    return round(v, 4) + 0.0


def box(at, size, mat, **kw):
    return {"type": "box", "at": [r(a) for a in at], "size": [r(s) for s in size], "mat": mat, **kw}


def cyl(center, rad, h, mat, **kw):
    return {"type": "cyl", "center": [r(c) for c in center], "r": r(rad), "h": r(h), "mat": mat, **kw}


def cone(center, rad, r2, h, mat, **kw):
    return {"type": "cone", "center": [r(c) for c in center], "r": r(rad), "r2": r(r2), "h": r(h), "mat": mat, **kw}


def strut(a, b, rad, mat, **kw):
    d = [b[i] - a[i] for i in range(3)]
    n = math.sqrt(sum(x * x for x in d))
    return cyl(a, rad, n, mat, axis=[r(x / n) for x in d], **kw)


def cbox(cx, cy, z0, sx, sy, sz, mat, **kw):
    return box([cx - sx / 2, cy - sy / 2, z0], [sx, sy, sz], mat, **kw)


def rock(cx, cy, z0, rad, r2, h, turn, mat="stone", **kw):
    """A faceted rock: a square frustum (4-vertex cone), corners at rad from its axis."""
    return cone([cx, cy, z0], rad, r2, h, mat, verts=4, rotZ=r(turn), **kw)


def crown(cx, cy, z0, rad, h, mat="thatch", **kw):
    """A tree crown in two frustums, round (8 facets drew an ink line on every edge: a cut gem)."""
    kw.setdefault("roof", True)
    return [cone([cx, cy, z0], rad * 0.55, rad, h * 0.4, mat, **kw),
            cone([cx, cy, z0 + h * 0.4], rad, rad * 0.3, h * 0.6, mat, **kw)]


def turned(parts, cx, cy, deg):
    """The whole group turned by deg about (cx, cy)."""
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
            else:
                q["rotZ"] = r(p.get("rotZ", 0.0) + deg)
        out.append(q)
    return out


S = {}
CAPS = {}  # slug: (top cap, footprint [w, d], lowest z allowed)

# --- decor: arbre, bosquet, rochers (isoLayout.json `legende` T, G, R) ---------------------------
TREE, GROVE, ROCKS = (Hg.DECORS[n][0] for n in ("arbre", "bosquet", "rochers"))

S["decor_arbre_a"] = {"canvas": "decor1x1", "parts": [  # a round oak
    cyl([0.5, 0.5, 0.0], 0.07, 0.62, "wood"),
    strut([0.5, 0.5, 0.4], [0.33, 0.6, 0.66], 0.03, "wood"),
    *crown(0.5, 0.5, 0.55, 0.36, 0.9),
    *crown(0.3, 0.62, 0.55, 0.2, 0.42),
    *crown(0.68, 0.36, 0.66, 0.2, 0.4),
]}
S["decor_arbre_b"] = {"canvas": "decor1x1", "parts": [  # a fir: three tiers of cones
    cyl([0.5, 0.5, 0.0], 0.06, 0.4, "wood"),
    cone([0.5, 0.5, 0.25], 0.4, 0.12, 0.5, "thatch", roof=True),
    cone([0.5, 0.5, 0.6], 0.31, 0.08, 0.45, "thatch", roof=True),
    cone([0.5, 0.5, 0.95], 0.21, 0.0, 0.53, "thatch", roof=True),
]}
S["decor_arbre_c"] = {"canvas": "decor1x1", "parts": [  # an old crooked tree, two crowns
    cyl([0.5, 0.55, 0.0], 0.085, 0.1, "wood"),
    strut([0.5, 0.55, 0.06], [0.44, 0.48, 0.55], 0.07, "wood"),
    strut([0.44, 0.48, 0.5], [0.66, 0.36, 0.78], 0.04, "wood"),
    *crown(0.4, 0.46, 0.55, 0.33, 0.7),
    *crown(0.66, 0.36, 0.68, 0.24, 0.5),
    rock(0.72, 0.78, 0.0, 0.1, 0.05, 0.1, 20),
]}
S["decor_bosquet_a"] = {"canvas": "decor1x1", "parts": [  # bushes round a young tree
    cyl([0.42, 0.4, 0.0], 0.04, 0.5, "wood"),
    *crown(0.42, 0.4, 0.42, 0.24, 0.68),
    *crown(0.68, 0.62, 0.0, 0.22, 0.42, roof=False),
    *crown(0.28, 0.72, 0.0, 0.18, 0.34, roof=False),
    *crown(0.74, 0.26, 0.0, 0.15, 0.28, roof=False),
]}
S["decor_bosquet_b"] = {"canvas": "decor1x1", "parts": [  # two saplings in a thicket
    cyl([0.36, 0.56, 0.0], 0.035, 0.45, "wood"),
    *crown(0.36, 0.56, 0.38, 0.2, 0.6),
    cyl([0.66, 0.34, 0.0], 0.035, 0.35, "wood"),
    *crown(0.66, 0.34, 0.3, 0.18, 0.52),
    *crown(0.6, 0.72, 0.0, 0.24, 0.36, roof=False),
    *crown(0.24, 0.26, 0.0, 0.16, 0.3, roof=False),
]}
S["decor_rochers_a"] = {"canvas": "decor1x1", "parts": [  # three blocks, knee high
    rock(0.42, 0.45, 0.0, 0.3, 0.15, 0.38, 12),
    rock(0.72, 0.68, 0.0, 0.2, 0.09, 0.24, -20),
    rock(0.24, 0.76, 0.0, 0.14, 0.06, 0.16, 35),
]}
S["decor_rochers_b"] = {"canvas": "decor1x1", "parts": [  # a long boulder and a flat stone
    rock(0.55, 0.42, 0.0, 0.34, 0.18, 0.32, 30),
    rock(0.32, 0.74, 0.0, 0.2, 0.14, 0.1, -10),
    rock(0.8, 0.8, 0.0, 0.11, 0.05, 0.14, 5),
]}
for slug in S:
    CAPS[slug] = ({"arbre": TREE, "bosquet": GROVE, "rochers": ROCKS}[slug.split("_")[1]], [1, 1], 0.0)

# --- water: canal tiles along gy, bridge, the cascade at the island's edge ------------------------
# Water `thatch` not a roof, its top at z 0.02; banks of stone blocks at 0.07. Tint for engineer:
# rawColors isoWater / isoWaterShadow / isoFoam (see the report of L1-T06).
WZ = 0.02


def water(x0, y0, x1, y1):
    return box([x0, y0, 0.0], [x1 - x0, y1 - y0, WZ], "thatch", roof=False)


def bank_y(x0, x1, y0, y1, n=4):
    """A bank of n stone blocks along gy between y0 and y1, x0 to x1 wide."""
    step = (y1 - y0) / n
    return [box([x0, y0 + k * step + 0.005, 0.0], [x1 - x0, step - 0.01, 0.07 - 0.01 * (k % 2)], "stone")
            for k in range(n)]


def bank_x(y0, y1, x0, x1, n=4):
    step = (x1 - x0) / n
    return [box([x0 + k * step + 0.005, y0, 0.0], [step - 0.01, y1 - y0, 0.07 - 0.01 * (k % 2)], "stone")
            for k in range(n)]


B = 0.12  # bank width
S["eau_canal_droit"] = {"canvas": "decor1x1", "parts": [
    water(B, 0, 1 - B, 1), *bank_y(0, B, 0, 1), *bank_y(1 - B, 1, 0, 1)]}
S["eau_canal_angle"] = {"canvas": "decor1x1", "parts": [  # from the gy 1 edge round to the gx 1 edge
    water(B, B, 1, 1), *bank_y(0, B, 0, 1), *bank_x(0, B, B, 1, 3),
    box([1 - B, 1 - B, 0.0], [B, B, 0.07], "stone")]}
S["eau_canal_berge"] = {"canvas": "decor1x1", "parts": [  # the canal's head: closed toward gy 0
    water(B, B, 1 - B, 1), *bank_y(0, B, 0, 1), *bank_y(1 - B, 1, 0, 1), *bank_x(0, B, B, 1 - B, 3),
    rock(0.5, 0.08, 0.07, 0.07, 0.03, 0.06, 15)]}
S["eau_canal_pont"] = {"canvas": "decor1x1", "parts": [  # the path crosses along gx on planks
    water(B, 0, 1 - B, 1), *bank_y(0, B, 0, 1), *bank_y(1 - B, 1, 0, 1),
    *[box([0.0, 0.22 + 0.112 * k, 0.07], [1.0, 0.1, 0.04], "wood") for k in range(5)],
    *[part for y in (0.2, 0.78) for part in (
        *[cbox(x, y + 0.01, 0.07, 0.05, 0.05, 0.22, "darkwood") for x in (0.08, 0.5, 0.92)],
        box([0.04, y - 0.015, 0.25], [0.92, 0.05, 0.04], "darkwood"))],
]}
S["eau_cascade_bord"] = {"canvas": "decor1x1", "parts": [  # the lip: the water leaves at gy 1
    water(B, 0, 1 - B, 1), *bank_y(0, B, 0, 1, 3), *bank_y(1 - B, 1, 0, 1, 3),
    rock(0.1, 0.9, 0.0, 0.09, 0.05, 0.22, 10), rock(0.88, 0.88, 0.0, 0.1, 0.05, 0.26, -15),
    rock(0.36, 0.94, 0.0, 0.06, 0.03, 0.05, 30), rock(0.66, 0.92, 0.0, 0.07, 0.03, 0.06, 5)]}
for slug in ("eau_canal_droit", "eau_canal_angle", "eau_canal_berge", "eau_cascade_bord"):
    CAPS[slug] = (0.3, [1, 1], 0.0)
CAPS["eau_canal_pont"] = (0.3, [1, 1], 0.0)

# The falling sheet: on `sails` (anchor = grid origin at the canvas centre), so the app pins this
# canvas's centre on the cascade cell's back corner (gx, gy) at ground level. It drops from the lip
# (local gy 1) down the island's side; foam at the foot. All of it moves: no shadow.
S["eau_cascade_chute"] = {"canvas": "sails", "parts": [
    box([B + 0.02, 1.0, -0.62], [1 - 2 * B - 0.04, 0.05, 0.62], "thatch", roof=False, noShadow=True),
    box([B + 0.06, 1.05, -0.62], [1 - 2 * B - 0.12, 0.04, 0.5], "thatch", roof=False, noShadow=True),
    *[cone([x, 1.09, -0.7], 0.08, 0.03, 0.08, "canvas", noShadow=True, roof=False)
      for x in (0.3, 0.5, 0.7)],
]}
CAPS["eau_cascade_chute"] = (0.0, [1, 1.2], -0.75)

# --- scaffolds: 1 x 1 and 2 x 2, see-through -----------------------------------------------------


def scaffold(w, d, lifts, lift_h, inset=0.05):
    xs, ys = (inset, w - inset), (inset, d - inset)
    top = lifts * lift_h
    parts = []
    # poles at the corners, and along the long sides every cell
    poles = {(x, y) for x in xs for y in ys}
    poles |= {(x, float(k)) for x in xs for k in range(1, d)} | {(float(k), y) for y in ys for k in range(1, w)}
    for x, y in sorted(poles):
        parts.append(cyl([x, y, 0.0], 0.028, top + 0.12, "wood"))
    for k in range(1, lifts + 1):
        z = k * lift_h
        # ledgers all round, planks on the two sides the viewer sees (+gx, +gy), a toe rail
        parts += [box([xs[0], ys[0] - 0.02, z - 0.03], [w - 2 * inset, 0.04, 0.03], "darkwood"),
                  box([xs[0] - 0.02, ys[0], z - 0.03], [0.04, d - 2 * inset, 0.03], "darkwood"),
                  box([xs[1] - 0.12, ys[0], z], [0.17, d - 2 * inset, 0.025], "wood"),
                  box([xs[0], ys[1] - 0.12, z], [w - 2 * inset, 0.17, 0.025], "wood"),
                  box([xs[1] + 0.02, ys[0], z + 0.12], [0.025, d - 2 * inset, 0.03], "darkwood"),
                  box([xs[0], ys[1] + 0.02, z + 0.12], [w - 2 * inset, 0.025, 0.03], "darkwood")]
        # a brace across each seen face, alternating
        a, b = (0, 1) if k % 2 else (1, 0)
        parts.append(strut([xs[1] + 0.03, ys[a], z - lift_h + 0.02], [xs[1] + 0.03, ys[b], z - 0.04], 0.014, "darkwood",
                           verts=4))
        parts.append(strut([xs[a], ys[1] + 0.03, z - lift_h + 0.02], [xs[b], ys[1] + 0.03, z - 0.04], 0.014, "darkwood",
                           verts=4))
    # a ladder up the +gy face, a pulley beam out of the top on the larger one
    lx = xs[0] + 0.18
    parts += [strut([lx, d - 0.02, 0.01], [lx, d - 0.1, top + 0.1], 0.012, "wood", verts=4),
              strut([lx + 0.14, d - 0.02, 0.01], [lx + 0.14, d - 0.1, top + 0.1], 0.012, "wood", verts=4)]
    for k in range(1, int(top / 0.14)):
        z = 0.14 * k
        y = d - 0.02 - 0.08 * z / (top + 0.1)
        parts.append(box([lx, y - 0.01, z], [0.14, 0.02, 0.015], "wood"))
    return parts, top


parts, top = scaffold(1, 1, 2, 0.5)
S["echafaudage_1x1"] = {"canvas": "decor1x1", "parts": parts}
CAPS["echafaudage_1x1"] = (1.25, [1, 1], 0.0)
parts, top = scaffold(2, 2, 3, 0.48)
parts += [box([1.6, 1.0, top + 0.1], [0.38, 0.05, 0.05], "darkwood"),
          cyl([1.9, 1.025, top - 0.25], 0.006, 0.35, "iron"),
          box([1.86, 0.99, top - 0.33], [0.08, 0.07, 0.08], "wood")]
S["echafaudage_2x2"] = {"canvas": "building2x2", "parts": parts}
CAPS["echafaudage_2x2"] = (1.6, [2, 2], 0.0)

# --- villagers: 7 roles, front and back ----------------------------------------------------------
# Local frame: f toward the viewer (grid +gx +gy), s across the view (screen right, grid +gx -gy).
FRONT_LIGHT = [0.55, 0.55, 0.63]
# Ink at half the buildings' width: at full width a door-high figure is all ink (L1-T06 board).
INK = 0.5  # from the viewer and above: front faces top tone, sides shadow
F, SIDE = (math.sqrt(0.5), math.sqrt(0.5)), (math.sqrt(0.5), -math.sqrt(0.5))


def at(f, s, z):
    return [0.5 + f * F[0] + s * SIDE[0], 0.5 + f * F[1] + s * SIDE[1], z]


def fbox(f, s, z0, df, ds, dz, mat, **kw):
    """A box centred at (f, s), df deep toward the viewer, ds wide across: turned 45 degrees."""
    c = at(f, s, z0)
    return cbox(c[0], c[1], z0, df, ds, dz, mat, rotZ=45, **kw)


def body(skirt, top_mat, leg_mat, skin="plaster", k=1.0, head=None):
    """Legs or a long skirt, a tunic, arms hanging, a faceted head. k widens the shoulders."""
    p = []
    if skirt:
        p.append(cone(at(0, 0, 0.0), 0.085 * k, 0.06 * k, 0.34, skirt, roof=False))
    else:
        p += [strut(at(0, s, 0.0), at(0, s, 0.2), 0.024, leg_mat) for s in (-0.035, 0.035)]
        p.append(cone(at(0, 0, 0.17), 0.07 * k, 0.06 * k, 0.17, top_mat, roof=False))
    p.append(cone(at(0, 0, 0.3), 0.062 * k, 0.07 * k, 0.06, top_mat, roof=False))
    for s in (-1, 1):
        p.append(strut(at(0, s * 0.072 * k, 0.345), at(0.01, s * 0.088 * k, 0.2), 0.02 * k, top_mat))
        p.append(strut(at(0.01, s * 0.088 * k, 0.21), at(0.015, s * 0.09 * k, 0.17), 0.019 * k, skin))
    p.append(cyl(at(0, 0, 0.36), 0.022, 0.03, skin))
    p.append(cone(at(0, 0, 0.385), 0.034, 0.05, 0.045, head or skin, roof=False))
    p.append(cone(at(0, 0, 0.43), 0.05, 0.02, 0.06, head or skin, roof=False))
    return p


def face_skin():
    return [fbox(0.04, 0, 0.4, 0.03, 0.06, 0.05, "plaster")]  # the face itself under a coif or hood


V = {}
V["smith"] = [  # scorched leather apron, bare forearms, short grey beard, a hammer at the belt
    *body(None, "plaster", "darkwood", k=1.2),
    fbox(0.095, 0, 0.12, 0.025, 0.12, 0.24, "darkwood"),
    fbox(0.06, 0, 0.375, 0.03, 0.05, 0.04, "stone"),
    strut(at(0.0, 0.1, 0.22), at(0.0, 0.11, 0.08), 0.012, "wood", verts=4),
    fbox(0.0, 0.11, 0.06, 0.04, 0.07, 0.04, "iron"),
]
V["watcher"] = [  # hooded cloak worn back, a spyglass across the chest
    *body(None, "thatch", "darkwood"),
    cone(at(-0.02, 0, 0.1), 0.095, 0.065, 0.26, "thatch", roof=False),
    fbox(-0.045, 0, 0.36, 0.05, 0.1, 0.06, "thatch"),
    strut(at(0.07, -0.06, 0.24), at(0.07, 0.06, 0.33), 0.016, "iron"),
]
V["sage"] = [  # long dark robe, a brass astrolabe on a cord
    *body("thatch", "thatch", "thatch", k=0.95),
    cyl(at(0.065, 0, 0.27), 0.03, 0.01, "iron", axis=[F[0], F[1], 0]),
]
V["champion"] = [  # padded sleeveless jacket, bare heavy arms, wrapped forearms
    *body(None, "canvas", "darkwood", k=1.3),
    *[strut(at(0, s * 0.094, 0.35), at(0.01, s * 0.115, 0.22), 0.026, "plaster") for s in (-1, 1)],
    *[strut(at(0.01, s * 0.115, 0.22), at(0.015, s * 0.117, 0.17), 0.025, "canvas") for s in (-1, 1)],
]
V["herbalist"] = [  # small, linen coif, heavy wool overdress, a belt of bottles and an herb bundle
    *body("wood", "wood", "wood", k=0.9, head="canvas"), *face_skin(),
    cyl(at(0, 0, 0.24), 0.072, 0.025, "darkwood"),
    *[cyl(at(0.06, s, 0.2), 0.012, 0.04, "tile") for s in (-0.04, 0.0, 0.04)],
    strut(at(0.05, 0.06, 0.18), at(0.06, 0.08, 0.3), 0.014, "thatch", verts=4, roof=False),
]
V["minstrel"] = [  # slight, hood pushed back, rope belt, a pear-shaped lute slung on the back
    *body(None, "banner", "wood", k=0.9),
    fbox(-0.045, 0, 0.35, 0.04, 0.08, 0.05, "banner"),
    cyl(at(0, 0, 0.255), 0.068, 0.015, "canvas"),
    cone(at(-0.085, 0.01, 0.17), 0.045, 0.03, 0.08, "wood", roof=False),
    strut(at(-0.085, 0.01, 0.25), at(-0.085, -0.03, 0.4), 0.01, "darkwood", verts=4),
]
V["farmer"] = [  # broad, linen coif, coarse wool dress, sacking apron, sleeves rolled
    *body("wood", "wood", "wood", k=1.2, head="canvas"), *face_skin(),
    fbox(0.105, 0, 0.06, 0.025, 0.11, 0.22, "canvas"),
]
for role, parts in V.items():
    for view, deg in (("face", 0), ("dos", 180)):
        slug = f"villageois_{role}_{view}"
        S[slug] = {"canvas": "villager", "light": FRONT_LIGHT, "lineScale": INK, "parts": [{**p, "roof": False} for p in turned(parts, 0.5, 0.5, deg)]}  # no snow on a villager
        CAPS[slug] = (0.55, [1, 1], 0.0)

bad = 0
for slug, spec in S.items():
    cap, (w, d), zlow = CAPS[slug]
    zmax, worst = -9.0, 0.0
    for p in spec["parts"]:
        for x, y, z in Hg.part_vertices(p):
            worst = max(worst, -x, -y, x - w, y - d, zlow - z)
            if p["mat"] not in Hg.EMISSIVE and not p.get("noShadow"):
                zmax = max(zmax, z)
    zmax = max(zmax, 0.0)
    ok = worst <= 1e-6 and zmax <= cap + 1e-6
    if slug.startswith("villageois_"):
        ok = ok and zmax >= 0.42  # a door's height, give or take a coif
    bad += not ok
    print(f"{slug:26s} parts {len(spec['parts']):3d}  top {zmax:.3f} / cap {cap}  outside {worst:.4f}"
          f"{'' if ok else '  <-- FIX'}")
if bad:
    sys.exit(1)  # nothing written: a failing piece never reaches the specs
OUT.mkdir(parents=True, exist_ok=True)  # after the check: a failing run leaves no empty folder
for slug, spec in S.items():
    (OUT / f"{slug}.json").write_text(json.dumps(spec) + "\n")
