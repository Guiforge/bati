"""Generate the 15 blockout specs of L1-T03 (wizard_tower, druid_grove, campfire, tent, training_dummy)
into argv[1] (default: this folder). Checks every vertex stays inside the footprint and every stage's top under its cap."""

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


def strut(a, b, rad, mat, **kw):
    """A round pole from point a to point b (a tilted cylinder)."""
    d = [b[i] - a[i] for i in range(3)]
    n = math.sqrt(sum(x * x for x in d))
    return cyl(a, rad, n, mat, axis=[r(x / n) for x in d], **kw)


def cbox(cx, cy, z0, sx, sy, sz, mat, **kw):
    """A box by its ground centre (rotZ turns it about that centre)."""
    return box([cx - sx / 2, cy - sy / 2, z0], [sx, sy, sz], mat, **kw)


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


def standing(cx, cy, rad, z0, hs, w, t, mat, skew=None):
    """Standing stones on a circle, broad side facing the centre."""
    parts = []
    n = len(hs)
    for k, h in enumerate(hs):
        th = 2 * math.pi * k / n + math.radians(20)
        x, y = cx + rad * math.cos(th), cy + rad * math.sin(th)
        sk = skew[k % len(skew)] if skew else 0.0
        parts.append(cbox(x, y, z0, w, t, h, mat, rotZ=r(math.degrees(th) + 90 + sk)))
    return parts, n


def blob(cx, cy, z0, rad, h, mat, **kw):
    """A rounded crown from two frustums: widening, then closing."""
    return [
        cone([cx, cy, z0], rad * 0.6, rad, h * 0.4, mat, **kw),
        cone([cx, cy, z0 + h * 0.4], rad, rad * 0.35, h * 0.6, mat, **kw),
    ]


def tree(cx, cy, z0, trunk_h, crown_r, crown_h):
    return [cyl([cx, cy, z0], 0.06, trunk_h + 0.05, "wood"),
            *blob(cx, cy, z0 + trunk_h, crown_r, crown_h, "thatch", roof=True)]


def logs_crossed(cx, cy, z0, length, rad, mat="darkwood", n=2):
    parts = []
    for k in range(n):
        a = math.radians(45 + 180 * k / n)
        dx, dy = math.cos(a) * length / 2, math.sin(a) * length / 2
        lift = 0.03 * k
        parts.append(strut([cx - dx, cy - dy, z0 + rad + lift], [cx + dx, cy + dy, z0 + rad + 0.06 + lift], rad, mat))
    return parts


S = {}

# --- campfire, 1x1: cercle de pierres autour de bûches croisées ---------------------------------
# The flame is the app's (lot 4). L1-T03 round 2: the coal bed is raised to the curb's height so it
# is seen, with a bright `fire` core; logs lean into a crossed cone over it; standing stones,
# benches and, at grand, a tripod and a cauldron give a silhouette that reads at 30 %.


def teepee(cx, cy, z0, foot, top, n, rad, mat="darkwood", phase=20):
    return [strut([cx + foot * math.cos(math.radians(phase + 360 * k / n)),
                   cy + foot * math.sin(math.radians(phase + 360 * k / n)), z0],
                  [cx - 0.03 * math.cos(math.radians(phase + 360 * k / n)),
                   cy - 0.03 * math.sin(math.radians(phase + 360 * k / n)), top], rad, mat) for k in range(n)]


S["campfire_rough"] = {"canvas": "decor1x1", "parts": [
    box([0, 0, 0], [1, 1, 0.03], "wood"),
    box([0.36, 0.36, 0.03], [0.28, 0.28, 0.08], "ember"),
    box([0.44, 0.44, 0.11], [0.12, 0.12, 0.02], "fire"),
    *ring(0.5, 0.5, 0.03, 0.32, 0.12, 0.13, 7, "stone", jitter=[0.02, -0.02, 0.04, 0.0, -0.01, 0.03, -0.03],
          tilt=[8, -6, 12, -10, 4, -8, 10]),
    *teepee(0.5, 0.5, 0.11, 0.17, 0.36, 3, 0.03),
    cyl([0.1, 0.18, 0.09], 0.065, 0.5, "darkwood", axis=[0.1, 1, 0]),
    # L2-T07: a stone kerb on the front-left edge, its long +gy face in the moon's side
    # (iso_audit.light judges a material with a lit and a shaded face of 1500 px each)
    box([0.3, 0.86, 0.03], [0.5, 0.1, 0.16], "stone", rotZ=-5),
    cbox(0.85, 0.15, 0.03, 0.14, 0.12, 0.34, "stone", rotZ=20),
    cyl([0.86, 0.86, 0.03], 0.06, 0.1, "darkwood"),
]}

S["campfire_solid"] = {"canvas": "decor1x1", "parts": [
    box([0, 0, 0], [1, 1, 0.06], "stone"),
    box([0.35, 0.35, 0.06], [0.3, 0.3, 0.09], "ember"),
    box([0.43, 0.43, 0.15], [0.14, 0.14, 0.02], "fire"),
    *ring(0.5, 0.5, 0.06, 0.33, 0.11, 0.15, 10, "stone"),
    *teepee(0.5, 0.5, 0.15, 0.18, 0.46, 4, 0.032),
    # log benches on the two back sides, framing the fire
    cyl([0.1, 0.2, 0.13], 0.07, 0.62, "darkwood", axis=[0, 1, 0]),
    cyl([0.2, 0.1, 0.13], 0.07, 0.62, "darkwood", axis=[1, 0, 0]),
    box([0.28, 0.87, 0.06], [0.5, 0.09, 0.16], "stone"),  # L2-T07: kerb, long lit +gy face
    # two standing stones at the side corners, a woodpile against one
    cbox(0.1, 0.88, 0.06, 0.15, 0.12, 0.5, "stone", rotZ=-40),
    cbox(0.88, 0.1, 0.06, 0.15, 0.12, 0.56, "stone", rotZ=-50),
    *[cyl([0.62 + 0.09 * i, 0.04, 0.06 + z], 0.04, 0.2, "wood", axis=[0.15, 1, 0])
      for i, z in ((0, 0.04), (1, 0.04), (0.5, 0.12))],
]}

S["campfire_grand"] = {"canvas": "decor1x1", "parts": [
    box([0, 0, 0], [1, 1, 0.08], "stone"),
    cyl([0.5, 0.5, 0.08], 0.44, 0.03, "stone"),
    box([0.35, 0.35, 0.11], [0.3, 0.3, 0.09], "ember"),
    box([0.43, 0.43, 0.2], [0.14, 0.14, 0.02], "fire"),
    *ring(0.5, 0.5, 0.11, 0.35, 0.1, 0.14, 12, "stone"),
    *ring(0.5, 0.5, 0.25, 0.355, 0.11, 0.03, 12, "stone"),
    *teepee(0.5, 0.5, 0.2, 0.17, 0.42, 4, 0.03),
    # iron tripod over the fire, a cauldron hung from it
    *teepee(0.5, 0.5, 0.11, 0.4, 0.95, 3, 0.022, "iron", phase=60),
    box([0.495, 0.495, 0.66], [0.01, 0.01, 0.3], "iron", noShadow=True),
    cone([0.5, 0.5, 0.5], 0.09, 0.12, 0.16, "iron"),
    # benches in dressed wood on stone feet at the back, standing stones at the side corners
    box([0.06, 0.12, 0.08], [0.08, 0.06, 0.12], "stone"),
    box([0.06, 0.66, 0.08], [0.08, 0.06, 0.12], "stone"),
    box([0.04, 0.08, 0.2], [0.12, 0.66, 0.04], "wood"),
    box([0.12, 0.06, 0.08], [0.06, 0.08, 0.12], "stone"),
    box([0.66, 0.06, 0.08], [0.06, 0.08, 0.12], "stone"),
    box([0.08, 0.04, 0.2], [0.66, 0.12, 0.04], "wood"),
    box([0.25, 0.9, 0.08], [0.55, 0.09, 0.17], "stone"),  # L2-T07: kerb, long lit +gy face
    cbox(0.1, 0.9, 0.08, 0.15, 0.12, 0.68, "stone", rotZ=-40),
    cbox(0.9, 0.1, 0.08, 0.15, 0.12, 0.74, "stone", rotZ=-50),
    cone([0.1, 0.9, 0.76], 0.075, 0.03, 0.06, "stone"),
    cone([0.9, 0.1, 0.82], 0.075, 0.03, 0.06, "stone"),
]}

# --- tent, 2x2: toile en pointe sur deux mâts, rabat ouvert --------------------------------------
# L1-T03 round 3: no walls, the two slopes run down to the ground, two poles proud of the ridge,
# guy ropes to stakes, the door flap tied open. The cloth is `thatch`, the palette's cold blue-grey:
# round 2's `wood` read as a warm brown house (art review of L1-T04), `canvas` was the lightest
# tone of the board (round 1). Each stage is built with its ridge along gy and then mirrored across
# the gx = gy diagonal: the ridge runs along gx, the long slope faces +gy and takes the moon (top
# tone), and the gable with the door and the flap faces +gx, in the shadow tone.


def tent(x0, y0, z0, sx, sy, rh, door_w=0.3, door_h=0.45, pole=0.12, finial=None, lean=0.0, mat="thatch"):
    cx = x0 + sx / 2
    top = z0 + rh
    parts = [roof([x0, y0, z0], [sx, sy, rh], mat, ridge="y")]
    for k, (py, out) in enumerate(((y0 - 0.02, -1), (y0 + sy + 0.02, 1))):
        head = [cx + lean * (1 - 2 * k), py, top + pole]
        parts.append(strut([cx, py, z0], head, 0.03, "darkwood"))
        if finial:
            parts.append(cone(head, 0.045, 0.0, finial, "iron", roof=False))
        # a guy rope from the pole's head to a stake beyond the gable
        sy_ = py + out * 0.2
        parts.append(strut(head, [cx, sy_, z0 + 0.05], 0.008, "darkwood"))
        parts.append(cbox(cx, sy_, z0, 0.04, 0.04, 0.08, "wood"))
    # guy ropes off the two slopes, staked a little out from their foot
    for side in (-1, 1):
        foot = cx + side * (sx / 2 + 0.13)
        for f in (0.25, 0.75):
            y = y0 + sy * f
            parts.append(strut([cx + side * sx * 0.32, y, z0 + rh * 0.36], [foot, y, z0 + 0.05], 0.008, "darkwood"))
            parts.append(cbox(foot, y, z0, 0.04, 0.04, 0.08, "wood"))
    # the doorway, dark, and the flap tied back beside it
    parts.append(cbox(cx, y0 + sy + 0.015, z0, door_w, 0.03, door_h, "darkwood", accroche="porte"))
    parts.append(cbox(cx + door_w / 2 + 0.1, y0 + sy + 0.06, z0, 0.2, 0.03, door_h * 0.8, mat, rotZ=-35, roof=False))
    return parts


def mirrored(parts):
    """The parts mirrored across the gx = gy diagonal (the footprint is square)."""
    out = []
    for p in parts:
        q = dict(p)
        if p["type"] in ("box", "roof"):
            (x, y, z), (sx, sy, sz) = p["at"], p["size"]
            q["at"], q["size"] = [y, x, z], [sy, sx, sz]
            if p["type"] == "roof":
                q["ridge"] = "x" if p.get("ridge", "x") == "y" else "y"
        else:
            x, y, z = p["center"]
            q["center"] = [y, x, z]
            if "axis" in p:
                ax, ay, az = p["axis"]
                q["axis"] = [ay, ax, az]
        if "rotZ" in p:
            q["rotZ"] = r(-p["rotZ"])
        out.append(q)
    return out

def straight(parts):
    """L2-T07: not mirrored. The ridge runs along gy, the long slope faces +gx in the shadow tone
    and the gable with the door faces +gy and takes the moon: one cloth, a lit and a shaded face
    big enough for iso_audit.light (a slope facing the moon is `top`, never the judged `lit`)."""
    return parts


S["tent_rough"] = {"canvas": "building2x2", "parts": straight([
    box([0, 0, 0], [2, 2, 0.04], "darkwood"),
    # L1-T05 round 2: a small low tent; the solid is half as tall again, the grand a pavilion
    *tent(0.52, 0.55, 0.04, 0.96, 0.9, 0.8, door_w=0.22, door_h=0.28, pole=0.06, lean=0.05),
    # a patch on the slope, a crate and a stump by the door
    roof([0.68, 0.72, 0.2], [0.64, 0.25, 0.3], "darkwood", ridge="y", roof=False),
    box([1.5, 1.68, 0.04], [0.24, 0.22, 0.18], "wood", rotZ=-12),
    cyl([0.25, 1.75, 0.04], 0.08, 0.14, "darkwood"),
])}

S["tent_solid"] = {"canvas": "building2x2", "parts": straight([
    box([0, 0, 0], [2, 2, 0.08], "stone"),
    *tent(0.4, 0.3, 0.08, 1.15, 1.3, 1.12, door_w=0.32, door_h=0.5, pole=0.14),
    # a chest and a barrel by the door, a stool
    box([1.58, 1.74, 0.08], [0.3, 0.2, 0.2], "darkwood"),
    box([1.58, 1.73, 0.2], [0.3, 0.22, 0.03], "iron"),
    cyl([0.2, 1.78, 0.08], 0.11, 0.28, "darkwood"),
    cyl([1.84, 0.4, 0.08], 0.07, 0.16, "wood"),
])}

S["tent_grand"] = {"canvas": "building2x2", "parts": straight([
    box([0, 0, 0], [2, 2, 0.08], "stone"),
    box([0.2, 0.08, 0.08], [1.6, 1.82, 0.1], "darkwood"),
    # L1-T18: door at the forge's 0.52 (it was 0.66) and ridge 1.28, under the forge solid's 1.43
    *tent(0.3, 0.3, 0.18, 1.4, 1.4, 1.1, door_w=0.34, door_h=0.52, pole=0.06, finial=0.08),
    # a red band along the ridge, pennant poles at the deck's front corners (the pennants are the app's)
    roof([0.87, 0.3, 1.08], [0.26, 1.4, 0.22], "banner", ridge="y"),
    cyl([0.26, 1.82, 0.18], 0.025, 0.85, "darkwood"),
    cone([0.26, 1.82, 1.03], 0.04, 0.0, 0.07, "iron", roof=False),
    cyl([1.74, 0.14, 0.18], 0.025, 0.85, "darkwood"),
    cone([1.74, 0.14, 1.03], 0.04, 0.0, 0.07, "iron", roof=False),
    # iron-bound chest, two barrels, a weapon rack
    box([1.6, 1.78, 0.18], [0.3, 0.2, 0.2], "darkwood"),
    box([1.6, 1.77, 0.3], [0.3, 0.22, 0.03], "iron"),
    cyl([0.12, 1.2, 0.08], 0.1, 0.28, "darkwood"),
    cyl([0.12, 1.45, 0.08], 0.09, 0.24, "darkwood"),
    box([1.86, 0.8, 0.08], [0.05, 0.05, 0.5], "wood"),
    box([1.86, 1.12, 0.08], [0.05, 0.05, 0.5], "wood"),
    box([1.85, 0.8, 0.46], [0.07, 0.37, 0.04], "wood"),
    *[box([1.9, y, 0.08], [0.02, 0.03, 0.45], "iron") for y in (0.9, 0.97, 1.04)],
])}

# --- training dummy, 1x1: mannequin de paille sur un poteau en croix -----------------------------
# L1-T03 round 3: the cross is back (the H0 repere). A squared wooden post, a crossbar held
# across the view (grid (0.707, -0.707), screen horizontal) so the cross reads at 30 %, straw
# bundles on its ends; a straw torso (`thatch`, not a roof) bound with one rope, a straw sack for a
# head. No `canvas` (the lightest tone) and no round iron bands: round 2 read as a barrel, then as a
# robot. Shield, sword and rack come with the later stages. On decor1x1 since L1-T18 (tower1x1 before,
# when it stood 1.6 high).

ACROSS = (0.707, -0.707)  # the crossbar's direction: screen horizontal
FRONT = (0.707, 0.707)  # toward the viewer


def dummy(cx, cy, z0, post_h, arm_z, arm, mat, tilt=0.0, sq=0.045, k=1.0, straw="canvas"):
    """Post, crossbar with straw on its ends, straw torso and head; tilt (grid units) leans the post;
    k scales the straw. L1-T05 round 2: straw in `canvas`, the palette's light tone (in `thatch` the
    dummy was a black speck at 30 %), and the whole figure about a third bigger."""
    head = [cx + tilt, cy + tilt * 0.3, z0 + post_h]
    ax, ay = ACROSS
    parts = [strut([cx, cy, z0], head, sq, mat, verts=4)]
    a = [cx - ax * arm, cy - ay * arm, arm_z - 0.02]
    b = [cx + ax * arm, cy + ay * arm, arm_z + 0.02]
    parts.append(strut(a, b, sq * 0.8, mat, verts=4))
    for end, sgn in ((a, -1), (b, 1)):
        x, y = end[0] - sgn * ax * 0.06, end[1] - sgn * ay * 0.06
        parts.append(cone([x, y, end[2] + 0.03 * k], 0.055 * k, 0.03 * k, 0.16 * k, straw, axis=[0, 0, -1], roof=False))
    t0 = arm_z - 0.36 * k
    parts.append(cone([cx, cy, t0], 0.11 * k, 0.15 * k, 0.36 * k, straw, roof=False))
    parts.append(cyl([cx, cy, t0 + 0.2 * k], 0.142 * k, 0.03 * k, "darkwood"))
    parts.append(cone([cx, cy, arm_z + 0.02], 0.07 * k, 0.09 * k, 0.14 * k, straw, roof=False))
    parts.append(cone([cx, cy, arm_z + 0.02 + 0.14 * k], 0.09 * k, 0.03 * k, 0.07 * k, straw, roof=False))
    return parts


def chest_shield(cx, cy, z, rad, depth, mat, boss=None):
    x, y = cx + FRONT[0] * depth, cy + FRONT[1] * depth
    parts = [cyl([x, y, z], rad, 0.035, mat, axis=[FRONT[0], FRONT[1], 0])]
    if boss:
        parts.append(cyl([x + 0.03 * FRONT[0], y + 0.03 * FRONT[1], z], boss, 0.03, "iron", axis=[FRONT[0], FRONT[1], 0]))
    return parts


def planted_sword(x, y, z0, h, mat="wood"):
    return [strut([x, y, z0], [x - 0.04, y + 0.02, z0 + h], 0.022, mat, verts=4),
            strut([x - 0.09, y - 0.035, z0 + h * 0.72], [x + 0.06, y + 0.05, z0 + h * 0.72], 0.016, mat, verts=4)]


# L1-T18: the figure at a man's size (a villager is 0.49 high, the forge's door 0.52); it stood 1.11,
# 1.30 and 1.59, three villagers high at the grand. The stages grow by their base and their gear.
S["training_dummy_rough"] = {"canvas": "decor1x1", "parts": [
    box([0, 0, 0], [1, 1, 0.04], "wood"),
    *dummy(0.48, 0.48, 0.04, 0.52, 0.42, 0.24, "wood", tilt=0.03, sq=0.035, k=0.75),
    # straw spilled at the foot, stones to wedge the post
    box([0.6, 0.74, 0.04], [0.18, 0.08, 0.03], "canvas", rotZ=25, roof=False),
    box([0.18, 0.66, 0.04], [0.14, 0.07, 0.03], "canvas", rotZ=-40, roof=False),
    box([0.53, 0.38, 0.04], [0.08, 0.07, 0.05], "stone", rotZ=15),
    box([0.38, 0.53, 0.04], [0.07, 0.06, 0.05], "stone", rotZ=-20),
]}

S["training_dummy_solid"] = {"canvas": "decor1x1", "parts": [
    box([0, 0, 0], [1, 1, 0.06], "stone"),
    # a cross foot of beams on the ground
    cbox(0.45, 0.45, 0.06, 0.6, 0.08, 0.07, "wood"),
    cbox(0.45, 0.45, 0.06, 0.08, 0.6, 0.07, "wood"),
    *dummy(0.45, 0.45, 0.13, 0.5, 0.5, 0.26, "wood", sq=0.04, k=0.8),
    *chest_shield(0.45, 0.45, 0.36, 0.1, 0.13, "wood"),
    *planted_sword(0.86, 0.22, 0.06, 0.32),
]}

S["training_dummy_grand"] = {"canvas": "decor1x1", "parts": [
    box([0, 0, 0], [1, 1, 0.06], "stone"),
    cbox(0.46, 0.46, 0.06, 0.6, 0.6, 0.08, "stone"),
    cbox(0.46, 0.46, 0.14, 0.54, 0.08, 0.06, "darkwood"),
    cbox(0.46, 0.46, 0.14, 0.08, 0.54, 0.06, "darkwood"),
    *dummy(0.46, 0.46, 0.2, 0.52, 0.6, 0.28, "darkwood", sq=0.045, k=0.85),
    # a leather cap, the shield with its boss, a second crossbar brace
    cone([0.46, 0.46, 0.82], 0.08, 0.03, 0.06, "darkwood", roof=False),
    *chest_shield(0.46, 0.46, 0.45, 0.11, 0.14, "darkwood", boss=0.035),
    strut([0.46, 0.46, 0.4], [0.46 + 0.17 * ACROSS[0], 0.46 + 0.17 * ACROSS[1], 0.58], 0.016, "darkwood", verts=4),
    strut([0.46, 0.46, 0.4], [0.46 - 0.17 * ACROSS[0], 0.46 - 0.17 * ACROSS[1], 0.58], 0.016, "darkwood", verts=4),
    *planted_sword(0.88, 0.66, 0.14, 0.3, "iron"),
    # weapon rack in the back corner, two practice blades
    box([0.04, 0.04, 0.06], [0.04, 0.04, 0.42], "darkwood"),
    box([0.04, 0.34, 0.06], [0.04, 0.04, 0.42], "darkwood"),
    box([0.03, 0.04, 0.38], [0.06, 0.34, 0.04], "darkwood"),
    *[box([0.08, y, 0.06], [0.02, 0.03, 0.38], "wood") for y in (0.14, 0.24)],
]}

# --- wizard tower, 1x1 on tower1x1: tour fine coiffée d'un cône pointu -------------------------
S["wizard_tower_rough"] = {"canvas": "tower1x1", "parts": [
    box([0, 0, 0], [1, 1, 0.05], "wood"),
    cyl([0.5, 0.5, 0.05], 0.31, 1.25, "stone", rotZ=7),
    cyl([0.52, 0.49, 1.3], 0.27, 0.5, "wood", rotZ=-5),
    cone([0.53, 0.485, 1.78], 0.36, 0.0, 0.58, "thatch", axis=[0.06, -0.03, 1]),
    box([0.42, 0.78, 0.05], [0.17, 0.05, 0.36], "darkwood", accroche="porte"),
    box([0.48, 0.74, 1.45], [0.08, 0.05, 0.13], "amber"),
    # a lean-to of planks and a barrel at the foot
    box([0.74, 0.14, 0.05], [0.18, 0.16, 0.42], "wood", rotZ=10),
    cyl([0.16, 0.84, 0.05], 0.08, 0.2, "darkwood"),
]}

S["wizard_tower_solid"] = {"canvas": "tower1x1", "parts": [
    box([0, 0, 0], [1, 1, 0.08], "stone"),
    cyl([0.5, 0.5, 0.08], 0.36, 0.14, "stone"),
    cyl([0.5, 0.5, 0.22], 0.3, 1.78, "stone"),
    cyl([0.5, 0.5, 2.0], 0.345, 0.09, "stone"),
    cone([0.5, 0.5, 2.09], 0.41, 0.0, 0.72, "tile"),
    cone([0.5, 0.5, 2.79], 0.03, 0.0, 0.1, "iron", roof=False),
    box([0.41, 0.78, 0.22], [0.18, 0.05, 0.4], "darkwood", accroche="porte"),
    box([0.46, 0.77, 1.05], [0.08, 0.05, 0.15], "amber"),
    box([0.77, 0.46, 1.6], [0.05, 0.08, 0.15], "amber"),
    box([0.84, 0.82, 0.08], [0.1, 0.1, 0.14], "wood"),
]}

S["wizard_tower_grand"] = {"canvas": "tower1x1", "parts": [
    box([0, 0, 0], [1, 1, 0.1], "stone"),
    cyl([0.5, 0.5, 0.1], 0.43, 0.08, "stone"),
    cyl([0.5, 0.5, 0.18], 0.37, 0.18, "stone"),
    cyl([0.5, 0.5, 0.36], 0.3, 1.94, "stone"),
    # buttresses at the foot, toward the four diagonals
    *[cbox(0.5 + 0.3 * dx, 0.5 + 0.3 * dy, 0.36, 0.12, 0.12, 0.42, "stone", rotZ=45)
      for dx, dy in ((0.707, 0.707), (-0.707, 0.707), (0.707, -0.707))],
    # balcony at mid height, iron rail on its rim
    cyl([0.5, 0.5, 1.42], 0.41, 0.05, "darkwood"),
    cyl([0.5, 0.5, 1.47], 0.41, 0.015, "iron"),
    cyl([0.5, 0.5, 2.3], 0.355, 0.12, "stone"),
    cone([0.5, 0.5, 2.42], 0.43, 0.0, 0.92, "tile"),
    cone([0.5, 0.5, 3.33], 0.025, 0.0, 0.16, "iron", roof=False),
    # door under a stone frame, three warm windows
    box([0.39, 0.77, 0.36], [0.22, 0.05, 0.46], "stone"),
    box([0.41, 0.8, 0.36], [0.18, 0.04, 0.4], "darkwood", accroche="porte"),
    box([0.46, 0.77, 1.1], [0.08, 0.05, 0.16], "amber"),
    box([0.77, 0.46, 0.95], [0.05, 0.08, 0.16], "amber"),
    box([0.46, 0.77, 1.85], [0.08, 0.05, 0.16], "amber"),
    box([0.77, 0.46, 2.0], [0.05, 0.08, 0.16], "amber"),
]}

# --- druid grove, 2x2: cercle de pierres levées gravées, mangé de lierre ------------------------
# No foliage colour in the palette: leaves and ivy are `thatch` (dark blue-green), crowns marked as
# roofs (snow lands there), ivy and shrubs not.


def ivy(stone, frac, mat="thatch"):
    """A sleeve of ivy on the lower `frac` of a standing stone, a hair thicker than it."""
    x0, y0, z0 = stone["at"]
    sx, sy, sz = stone["size"]
    return box([x0 - 0.015, y0 - 0.015, z0], [sx + 0.03, sy + 0.03, sz * frac], mat, rotZ=stone["rotZ"], roof=False)


def grove(base_mat, base_z, hs, w, t, rad, skew, ivy_on, extra):
    stones, _ = standing(1.0, 1.0, rad, base_z, hs, w, t, "stone", skew=skew)
    parts = [box([0, 0, 0], [2, 2, base_z], base_mat), *stones]
    parts += [ivy(stones[k], f) for k, f in ivy_on]
    return parts + extra


S["druid_grove_rough"] = {"canvas": "building2x2", "parts": grove(
    "darkwood", 0.04, [0.6, 0.42, 0.55, 0.36, 0.5], 0.2, 0.13, 0.64, [9, -12, 6, -8, 14],
    [(0, 0.5), (2, 0.4)],
    [
        # a fallen stone in the gap, a flat stone in the middle, shrubs
        cbox(1.42, 1.5, 0.04, 0.46, 0.17, 0.13, "stone", rotZ=-30),
        cbox(1.0, 1.0, 0.04, 0.32, 0.26, 0.08, "stone", rotZ=12),
        *blob(0.22, 1.78, 0.04, 0.17, 0.26, "thatch", roof=False),
        *blob(1.8, 0.24, 0.04, 0.15, 0.22, "thatch", roof=False),
    ])}

S["druid_grove_solid"] = {"canvas": "building2x2", "parts": grove(
    "darkwood", 0.04, [0.92, 0.72, 0.85, 0.66, 0.8, 0.7, 0.88], 0.21, 0.14, 0.68, [3, -4, 2, -3, 4, -2, 3],
    [(0, 0.55), (2, 0.45), (5, 0.5)],
    [
        cyl([1.0, 1.0, 0.04], 0.9, 0.03, "stone"),
        cyl([1.0, 1.0, 0.04], 0.5, 0.035, "darkwood"),
        # altar: a slab on two blocks
        cbox(0.88, 1.0, 0.075, 0.1, 0.24, 0.16, "stone"),
        cbox(1.12, 1.0, 0.075, 0.1, 0.24, 0.16, "stone"),
        cbox(1.0, 1.0, 0.235, 0.4, 0.3, 0.06, "stone"),
        # an oak in the back corner, shrubs at the edges
        *tree(0.24, 0.24, 0.04, 0.5, 0.24, 0.56),
        *blob(0.2, 1.8, 0.04, 0.16, 0.26, "thatch", roof=False),
        *blob(1.82, 0.4, 0.04, 0.14, 0.22, "thatch", roof=False),
    ])}

S["druid_grove_grand"] = {"canvas": "building2x2", "parts": grove(
    "stone", 0.06, [1.0, 0.8, 0.95, 0.78, 0.92, 0.8, 0.98, 0.84], 0.22, 0.15, 0.7, [0, 0, 0, 0, 0, 0, 0, 0],
    [(0, 0.55), (2, 0.45), (4, 0.5), (6, 0.4)],
    [
        cyl([1.0, 1.0, 0.06], 0.5, 0.03, "darkwood"),
        # trilithon at the back, facing the viewer: two uprights and a lintel
        cbox(0.62, 0.3, 0.06, 0.24, 0.16, 1.26, "stone", rotZ=-45),
        cbox(0.3, 0.62, 0.06, 0.24, 0.16, 1.26, "stone", rotZ=-45),
        cbox(0.46, 0.46, 1.32, 0.78, 0.2, 0.16, "stone", rotZ=-45),
        box([0.5, 0.3, 0.06], [0.16, 0.12, 0.6], "thatch", rotZ=-45, roof=False),
        # altar
        cbox(0.88, 1.0, 0.09, 0.1, 0.26, 0.18, "stone"),
        cbox(1.12, 1.0, 0.09, 0.1, 0.26, 0.18, "stone"),
        cbox(1.0, 1.0, 0.27, 0.44, 0.32, 0.07, "stone"),
        # two oaks at the side corners, shrubs
        *tree(1.78, 0.22, 0.06, 0.62, 0.2, 0.62),
        *tree(0.22, 1.78, 0.06, 0.55, 0.2, 0.58),
        *blob(1.82, 1.82, 0.06, 0.14, 0.22, "thatch", roof=False),
    ])}

CAPS = {  # stage height caps: heights.py ESTIMATES, except where the art review of round 2 asked for more
    "campfire": {"rough": 0.45, "solid": 0.7, "grand": 1.0},  # standing stones and tripod read at 30 %
    "tent": {"rough": 1.0, "solid": 1.4, "grand": 1.65},  # roofs steep enough for the +gx slope to be in shadow
}
FOOT = {"wizard_tower": (1, 1), "druid_grove": (2, 2), "campfire": (1, 1), "tent": (2, 2), "training_dummy": (1, 1)}
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
    cap = CAPS.get(code, {}).get(stage, est)
    ok = worst <= 1e-6 and zmax <= cap + 1e-6
    bad += not ok
    flag = "" if ok else "  <-- FIX"
    print(f"{slug:22s} parts {len(spec['parts']):3d}  top {zmax:.3f} / cap {cap} (est {est})  outside {worst:.4f}{flag}")
if bad:
    sys.exit(1)  # nothing written: a failing stage never reaches the specs
OUT.mkdir(parents=True, exist_ok=True)  # after the check: a failing run leaves no empty folder
for slug, spec in S.items():
    (OUT / f"{slug}.json").write_text(json.dumps(spec) + "\n")
