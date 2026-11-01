"""Footprints, maximum heights and ground shadows of the 21 buildings at every stage, and of the
decor (L0-T05, L0-T11).

Writes heights.json beside this file, for the map layout and its shadow-gap rule. Pure stdlib.

Grid as in constants/isoSpec.json: gx to screen right-down, gy to screen left-down, z up, one unit
= one cell edge, Blender y = -gy. A ground point of a vertex P is P - (P.z / L.z) L, so in grid
coordinates a shadow moves (+0.4951, -0.4951) per unit of height: toward +gx and -gy, which is
straight to screen right. That is why "beyond the footprint" is measured in +gx and -gy only.

Every stage with a blockout (scripts/iso/blockouts/<code>_<stage>.json) is measured from it with
the same projection as iso_blockout.py: convex hull of every non-emissive vertex's ground point.
The vertices are the `volumes` Blender exported (stage_exports.py, L1-T01) when the render has
them, otherwise rebuilt from the spec; check() fails if the two disagree (a stale render).
A stage without one falls back on ESTIMATES: a box of the footprint and the stage's height.
`source` says which, per stage. Parts that move (sails, flames, water, banners, lanterns) are
listed apart in `mobile` and never count in `hauteurMax`. Decor (trees, groves, rocks) is a box of
its cell and an estimated height.
"""

import json
import math
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ISO = HERE.parent
REPO = ISO.parent.parent
SPEC = json.loads((REPO / "constants" / "isoSpec.json").read_text())
LX, LY, LZ = SPEC["moon"]["L"]  # Blender coordinates
EMISSIVE = set(k for k in SPEC["emissive"] if not k.startswith("_"))
# Ground shift per unit of height, in grid coordinates (gy = -Blender y).
SHIFT = (-LX / LZ, LY / LZ)
SEGMENTS = 32  # iso_blockout.py's minimum for a round part

# The 21 codes, in the schema's order.
_SCHEMA = (REPO / "db" / "schema.ts").read_text().split("export const buildingCodes = [")[1]
CODES = re.findall(r'^  "(\w+)",', _SCHEMA.split("] as const")[0], re.M)

STAGES_3 = ["rough", "solid", "grand"]
STAGES_2 = ["rough", "solid"]  # tier 3 caps at level 3 (constants/buildingLevels.ts)

# code: (tier, [w, d], {stage: height}, note, {stage: [mobile parts]})
# A mobile part: name, box [[x0, y0, z0], [x1, y1, z1]] in grid units, castsShadow.
# Heights are scaled on the two POC blockouts. A stage with a blockout ignores its row here.


def flame(x0, y0, x1, y1, z0, z1):
    # Rounded: a hearth's top plus 0.4 otherwise writes 0.6000000000000001 into heights.json.
    return {"nom": "flammes", "boite": [[round(v, 4) for v in (x0, y0, z0)], [round(v, 4) for v in (x1, y1, z1)]],
            "ombrePortee": False}


def banner(x0, y0, x1, y1, z0, z1, nom="bannieres"):
    # A banner is thin cloth that the app sways: its shadow is too small to set a gap.
    return {"nom": nom, "boite": [[x0, y0, z0], [x1, y1, z1]], "ombrePortee": False}


ESTIMATES = {
    "campfire": (1, [1, 1], {"rough": 0.25, "solid": 0.3, "grand": 0.45},
                 "anneau de pierres, le feu est hors volume",
                 {"rough": [flame(0.3, 0.3, 0.7, 0.7, 0.1, 0.6)],
                  "solid": [flame(0.25, 0.25, 0.75, 0.75, 0.1, 0.9)],
                  "grand": [flame(0.2, 0.2, 0.8, 0.8, 0.15, 1.2)]}),
    "tent": (1, [2, 2], {"rough": 0.95, "solid": 1.2, "grand": 1.45},
             "tente sur estrade (grand)",
             {"grand": [banner(0.1, 0.1, 1.9, 1.9, 1.3, 1.75, "fanions")]}),
    "training_dummy": (1, [1, 1], {"rough": 1.15, "solid": 1.35, "grand": 1.7},
                       "poteau sur socle",
                       {"grand": [banner(0.15, 0.3, 0.85, 0.7, 0.9, 1.5)]}),
    "archery_range": (2, [2, 3], {"rough": 1.0, "solid": 1.3, "grand": 1.7},
                      "auvent des tireurs et buttes de cibles", {"grand": [banner(0.1, 0.1, 1.9, 0.4, 1.5, 2.1)]}),
    "quarry": (2, [2, 2], {"rough": 1.1, "solid": 1.5, "grand": 1.9},
               "fosse, blocs et chèvre de levage (le mât est le point haut)", {}),
    "forge": (2, [2, 2], {"rough": 1.15, "solid": 1.83, "grand": 2.78},
              "forge à toit de tuiles, foyer sous l'auvent",
              {s: [flame(1.4, 0.4, 1.75, 0.8, 0.4, 0.9)] for s in STAGES_3}),
    "windmill": (2, [2, 2], {"rough": 1.7, "solid": 2.32, "grand": 2.88},
                 "tour du moulin ; les ailes viennent du pivot de son blockout", {}),
    "well": (2, [1, 1], {"rough": 0.9, "solid": 1.15, "grand": 1.5},
             "margelle et toit sur deux poteaux", {}),
    "farm": (2, [2, 3], {"rough": 0.8, "solid": 1.0, "grand": 1.3},
             "champ et appentis (l'appentis est le point haut)", {}),
    "wizard_tower": (2, [1, 1], {"rough": 2.5, "solid": 2.9, "grand": 3.5},
                     "tour étroite",
                     {s: [{"nom": "orbe", "boite": [[0.35, 0.35, h], [0.65, 0.65, h + 0.35]], "ombrePortee": False}]
                      for s, h in {"rough": 2.5, "solid": 2.9, "grand": 3.5}.items()}),
    "druid_grove": (2, [2, 2], {"rough": 0.7, "solid": 1.2, "grand": 1.6},
                    "cercle de pierres, arche au grand", {}),
    "watchtower": (3, [1, 1], {"rough": 2.3, "solid": 2.8},
                   "tour de bois à plateforme",
                   {"solid": [banner(0.45, 0.45, 0.75, 0.55, 2.8, 3.3, "drapeau")]}),
    "castle_wall": (3, [1, 3], {"rough": 1.7, "solid": 2.3},
                    "un pan de rempart et sa tour d'angle, posé comme un mur", {}),
    "armory": (3, [2, 2], {"rough": 1.4, "solid": 1.8},
               "salle à pignon, foyer à la porte",
               {"rough": [flame(0.6, 1.6, 1.0, 1.9, 0.1, 0.5)], "solid": [flame(0.6, 1.6, 1.0, 1.9, 0.1, 0.6)]}),
    "fountain": (3, [2, 2], {"rough": 0.8, "solid": 1.25},
                 "vasques étagées",
                 {"rough": [{"nom": "eau", "boite": [[0.6, 0.6, 0.3], [1.4, 1.4, 1.0]], "ombrePortee": False}],
                  "solid": [{"nom": "eau", "boite": [[0.4, 0.4, 0.3], [1.6, 1.6, 1.5]], "ombrePortee": False}]}),
    "observatory": (3, [2, 2], {"rough": 2.3, "solid": 2.7},
                    "tour ronde à coupole, lunette sortant de la coupole", {}),
    "barn": (3, [2, 3], {"rough": 1.5, "solid": 1.9},
             "grange à pignon, bottes de foin contre le flanc", {}),
    "dragon_lair": (4, [3, 3], {"rough": 1.5, "solid": 1.9, "grand": 2.6},
                    "butte rocheuse et sa gueule",
                    {s: [flame(1.1, 2.3, 1.9, 2.9, 0.1, z)] for s, z in {"rough": 0.6, "solid": 0.8, "grand": 1.4}.items()}),
    "heroes_hall": (4, [3, 3], {"rough": 1.9, "solid": 2.4, "grand": 3.0},
                    "portique et salle",
                    # the cloth hangs below each mast's iron collar (L1-T05 round 2: masts at 1.09, 1.93, 2.3)
                    {s: [banner(0.1, 2.6, 2.9, 2.9, z0, z1)]
                     for s, (z0, z1) in {"rough": (0.3, 0.8), "solid": (0.9, 1.65), "grand": (1.2, 2.0)}.items()}),
    "champion_arena": (4, [3, 3], {"rough": 0.9, "solid": 1.1, "grand": 1.5},
                       "gradins en anneau",
                       {s: [flame(0.0, 0.0, 3.0, 3.0, h, h + 0.4)] for s, h in {"rough": 0.9, "solid": 1.1, "grand": 1.5}.items()}),
    "high_road": (4, [1, 2], {"rough": 1.5, "solid": 1.8, "grand": 2.3},
                  "c'est une route : un tronçon de chemin de 1x2 cases que le panneau borde, pas un bâtiment",
                  # from the signpost's arm (rough, solid) or the gate's iron rod, under its lintel (grand:
                  # rod 1.68 to 1.86, lintel from 1.8; L1-T05 round 2, it was half inside the lintel)
                  {s: [{"nom": "lanterne", "boite": [[0.5, 0.6, z0], [0.8, 0.9, z0 + 0.4]], "ombrePortee": False}]
                   for s, z0 in {"rough": 0.8, "solid": 1.1, "grand": 1.28}.items()}),
}

# Decor, by its name in isoLayout.json's `legende`: (height, footprint, note). A box of the whole
# cell, so the shadow is an upper bound: the art never fills its cell.
DECORS = {
    "arbre": (1.5, [1, 1], "arbre isolé, tronc et houppier ; plus bas que la tour du sorcier (2,5)"),
    "bosquet": (1.2, [1, 1], "buissons et jeunes arbres, sous la hauteur d'un arbre"),
    "rochers": (0.4, [1, 1], "deux ou trois blocs à hauteur de genou d'un villageois"),
}
NOT_DECOR = {"herbe", "chemin", "pont", "eau", "cascade"}
# Blockouts that are not a building stage (L1-T06, gen_decor.py, in blockouts/pieces/): decor
# variants, water tiles, scaffolds, animals, statues (one cell, the totem's), villagers. Decor variants are checked against DECORS in check(), scaffolds against
# the buildings of their footprint (L1-T18); water is flat and villagers walk, outside the spacing rule.
PIECES = ("animal_", "decor_", "eau_", "echafaudage_", "statue_", "villageois_")


# --- geometry -----------------------------------------------------------------------------------

def rot(x, y, cx, cy, deg):
    a = math.radians(deg)  # rotZ turns +deg in grid coordinates (iso_blockout.place)
    dx, dy = x - cx, y - cy
    return cx + dx * math.cos(a) - dy * math.sin(a), cy + dx * math.sin(a) + dy * math.cos(a)


def circle(cx, cy, cz, r, n, phase=0.0, axis=None):
    if axis is None:
        # bmesh's circle starts at Blender (0, r): grid (0, -r)
        return [(*rot(cx, cy - r, cx, cy, phase + 360 * i / n), cz) for i in range(n)]
    ax = [axis[0], axis[1], axis[2]]
    norm = math.sqrt(sum(a * a for a in ax))
    ax = [a / norm for a in ax]
    u = [ax[1], -ax[0], 0.0]
    nu = math.sqrt(sum(a * a for a in u))
    # A vertical axis has no horizontal normal: start at grid (0, -r) like Blender's untilted circle.
    u = [a / nu for a in u] if nu > 1e-9 else [0.0, -1.0, 0.0]
    v = [ax[1] * u[2] - ax[2] * u[1], ax[2] * u[0] - ax[0] * u[2], ax[0] * u[1] - ax[1] * u[0]]
    out = []
    for i in range(n):
        t = 2 * math.pi * i / n
        out.append(tuple(c + r * (math.cos(t) * a + math.sin(t) * b) for c, a, b in zip((cx, cy, cz), u, v)))
    return out


def part_vertices(p):
    kind = p["type"]
    if kind in ("box", "roof"):
        x0, y0, z0 = p["at"]
        sx, sy, sz = p["size"]
        cx, cy = x0 + sx / 2, y0 + sy / 2
        if kind == "box":
            pts = [(x, y, z) for x in (x0, x0 + sx) for y in (y0, y0 + sy) for z in (z0, z0 + sz)]
        elif p.get("ridge", "x") == "x":
            pts = [(x, y, z0) for x in (x0, x0 + sx) for y in (y0, y0 + sy)]
            pts += [(x0, cy, z0 + sz), (x0 + sx, cy, z0 + sz)]
        else:
            pts = [(x, y, z0) for x in (x0, x0 + sx) for y in (y0, y0 + sy)]
            pts += [(cx, y0, z0 + sz), (cx, y0 + sy, z0 + sz)]
        deg = p.get("rotZ", 0.0)
        return [(*rot(x, y, cx, cy, deg), z) for x, y, z in pts]
    if kind in ("cyl", "cone"):
        cx, cy, cz = p["center"]
        r, h = p["r"], p["h"]
        r2 = p.get("r2", 0.0) if kind == "cone" else r
        n = p["verts"] if p.get("verts") in (4, 8) else max(p.get("verts", SEGMENTS), SEGMENTS)  # as iso_blockout
        axis = p.get("axis")
        if axis:
            norm = math.sqrt(sum(a * a for a in axis))
            top = (cx + axis[0] / norm * h, cy + axis[1] / norm * h, cz + axis[2] / norm * h)
            return circle(cx, cy, cz, r, n, axis=axis) + circle(*top, r2, n, axis=axis)
        phase = p.get("rotZ", 0.0)
        pts = circle(cx, cy, cz, r, n, phase)
        pts += circle(cx, cy, cz + h, r2, n, phase) if r2 > 0 else [(cx, cy, cz + h)]
        return pts
    raise ValueError(f"unknown part {kind}")


def ground(v):
    x, y, z = v
    return (x + SHIFT[0] * z, y + SHIFT[1] * z)


def hull(points):
    pts = sorted(set((round(x, 6), round(y, 6)) for x, y in points))
    if len(pts) < 3:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def box_vertices(x0, y0, z0, x1, y1, z1):
    return [(x, y, z) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]


def shadow(vertices, w, d):
    poly = hull([ground(v) for v in vertices] + [(0, 0), (w, 0), (w, d), (0, d)])
    beyond_x = max(0.0, max(x for x, _ in poly) - w)
    beyond_y = max(0.0, -min(y for _, y in poly))
    return {
        "auDela": {"+gx": round(beyond_x, 4), "-gy": round(beyond_y, 4)},
        "cases": {"+gx": math.ceil(beyond_x - 1e-9), "-gy": math.ceil(beyond_y - 1e-9)},
        "polygone": [[round(x, 4), round(y, 4)] for x, y in poly],
    }


def mobile_entry(m, source):
    out = dict(m, source=source, boite=[[round(v, 4) for v in corner] for corner in m["boite"]])
    if m.get("ombrePortee"):
        (x0, y0, z0), (x1, y1, z1) = m["boite"]
        pts = m.get("_points") or box_vertices(x0, y0, z0, x1, y1, z1)
        out["ombre"] = [[round(x, 4), round(y, 4)] for x, y in hull(ground(v) for v in pts)]
    out.pop("_points", None)
    return out


# --- the two blockouts --------------------------------------------------------------------------

def blockout_vertices(name):
    """The spec's shadow-casting vertices, rebuilt from its parameters (no render needed)."""
    spec = json.loads((ISO / "blockouts" / f"{name}.json").read_text())
    verts = []
    for p in spec["parts"]:
        if p.get("mat", "wood") in EMISSIVE or p.get("noShadow"):
            continue
        verts += part_vertices(p)
    return spec, verts


def exported_vertices(name):
    """The same vertices as Blender exported them (stage_exports.py, `volumes`), or None."""
    anchor = ISO / "blockouts" / "renders" / f"{name}.anchor.json"
    if not anchor.exists():
        return None
    volumes = json.loads(anchor.read_text()).get("volumes")
    if volumes is None:
        return None
    return [tuple(v) for vol in volumes if not vol["emissive"] and not vol["noShadow"] for v in vol["vertices"]]


def sails_part(spec):
    # The sails turn in the plane facing the camera: right = grid (0.707, -0.707, 0),
    # up = grid (-0.354, -0.354, 0.866) (camera rotation 60, 0, 45). Their swept disc is the reach.
    sails = json.loads((ISO / "blockouts" / "windmill_sails.json").read_text())["parts"][0]
    scale = spec.get("sailsScale", 1.0)
    reach = math.hypot(sails["hub"] + sails["length"], sails["width"] / 2) * scale
    px, py, pz = spec["pivot"]
    rx, ry = math.sqrt(0.5), -math.sqrt(0.5)
    ux, uy, uz = -math.sqrt(0.5) * 0.5, -math.sqrt(0.5) * 0.5, math.sqrt(3) / 2
    disc = [(px + reach * (math.cos(t) * rx + math.sin(t) * ux),
             py + reach * (math.cos(t) * ry + math.sin(t) * uy),
             pz + reach * math.sin(t) * uz)
            for t in (2 * math.pi * i / 64 for i in range(64))]
    lo = [min(c[i] for c in disc) for i in range(3)]
    hi = [max(c[i] for c in disc) for i in range(3)]
    return {"nom": "ailes", "pivot": spec["pivot"], "rayon": round(reach, 4),
            "boite": [[round(a, 4) for a in lo], [round(a, 4) for a in hi]],
            "ombrePortee": True, "_points": disc}


def from_blockout(code, stage):
    """The stage measured from its blockout, or None when there is none yet."""
    path = ISO / "blockouts" / f"{code}_{stage}.json"
    if not path.exists():
        return None
    spec, verts = blockout_vertices(path.stem)
    verts = exported_vertices(path.stem) or verts  # check() holds the two together
    w, d = SPEC["canvases"][spec["canvas"]]["footprint"]
    assert [w, d] == ESTIMATES[code][1], (path.name, [w, d])  # one footprint at every stage
    mobile = []
    if "pivot" in spec:
        mobile.append(mobile_entry(sails_part(spec), "blockout"))
    # One flame per hearth (the arena's fire bowls); a hearth inside an earlier one's footprint (the
    # campfire's `fire` core on its coal bed) is the same fire.
    # A hearth of any shape (turned box, cylinder) is read by the axis-aligned box of its vertices;
    # the largest bed comes first, so a core listed before its bed still merges into it.
    # shortcut: containment of axis-aligned boxes, so two hearths that only overlap stay two flames and
    # a turned bed's box can swallow a neighbour; fine for today's round bowls and square beds, move to
    # a polygon test the day a stage has a turned or L-shaped hearth.
    def bounds(p):
        v = part_vertices(p)
        return (min(x for x, _, _ in v), min(y for _, y, _ in v), max(x for x, _, _ in v), max(y for _, y, _ in v),
                max(z for _, _, z in v))

    hearths = [bounds(p) for p in spec["parts"] if p.get("mat") in ("fire", "ember")]
    beds = []
    for x0, y0, x1, y1, top in sorted(hearths, key=lambda b: -(b[2] - b[0]) * (b[3] - b[1])):
        if any(a <= x0 + 1e-9 and b <= y0 + 1e-9 and x1 <= c + 1e-9 and y1 <= e + 1e-9 for a, b, c, e in beds):
            continue
        beds.append((x0, y0, x1, y1))
        mobile.append(mobile_entry(flame(x0, y0, x1, y1, top, top + 0.4), "estimation"))
    # The app still draws what the blockout leaves out (banners, orb, water): keep the estimate,
    # except a flame, which the hearth above places.
    modelled = {m["nom"] for m in mobile}
    mobile += [mobile_entry(m, "estimation") for m in ESTIMATES[code][4].get(stage, []) if m["nom"] not in modelled]
    return {
        "source": "blockout",
        "hauteurMax": round(max(z for _, _, z in verts), 4),
        "ombre": shadow(verts, w, d),
        "mobile": mobile,
    }


def decors():
    names = set(json.loads((REPO / "constants" / "isoLayout.json").read_text())["legende"].values())
    assert names - NOT_DECOR == set(DECORS), sorted(names - NOT_DECOR)  # a new decor kind needs a row
    return {
        name: {
            "emprise": [w, d],
            "source": "estimation",
            "note": note,
            "hauteurMax": h,
            "ombre": shadow(box_vertices(0, 0, 0, w, d, h), w, d),
        }
        for name, (h, (w, d), note) in DECORS.items()
    }


def build():
    assert sorted(CODES) == sorted(ESTIMATES), (CODES, sorted(ESTIMATES))
    buildings = {}
    for code in CODES:
        tier, (w, d), heights, note, mobiles = ESTIMATES[code]
        assert list(heights) == (STAGES_2 if tier == 3 else STAGES_3), code
        stages = {}
        for stage, h in heights.items():
            stages[stage] = from_blockout(code, stage) or {
                "source": "estimation",
                "hauteurMax": h,
                "ombre": shadow(box_vertices(0, 0, 0, w, d, h), w, d),
                "mobile": [mobile_entry(m, "estimation") for m in mobiles.get(stage, [])],
            }
        buildings[code] = {"tier": tier, "emprise": [w, d], "note": note, "stades": stages}
    return {
        "_doc": "Written by scripts/iso/exports/heights.py (L0-T05, L0-T11). Grid units, origin at the "
                "footprint's (0, 0) corner. Each stage's `source` is `blockout` (measured from "
                "scripts/iso/blockouts/<code>_<stade>.json) or `estimation` (a box). hauteurMax excludes "
                "everything in `mobile`. ombre.auDela: how far the ground shadow reaches past the footprint "
                "toward +gx and -gy (screen right), cases: the same rounded up to whole cells. The shadow "
                "never passes the footprint toward -gx or +gy. `decors` is keyed by the names in "
                "isoLayout.json's `legende`, one cell each, estimated.",
        "lune": {"L": [LX, LY, LZ], "decalageParUnite": [round(SHIFT[0], 4), round(SHIFT[1], 4)]},
        "batiments": buildings,
        "decors": decors(),
    }


# --- self-check -----------------------------------------------------------------------------------

def dist_to_polygon(p, poly):
    """0 inside a convex polygon, otherwise the distance to its nearest edge."""
    x, y = p
    n = len(poly)
    signs = []
    best = float("inf")
    for i in range(n):
        (ax, ay), (bx, by) = poly[i], poly[(i + 1) % n]
        signs.append((bx - ax) * (y - ay) - (by - ay) * (x - ax))
        ex, ey = bx - ax, by - ay
        t = max(0.0, min(1.0, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey)))
        best = min(best, math.hypot(x - ax - t * ex, y - ay - t * ey))
    if all(s >= -1e-9 for s in signs) or all(s <= 1e-9 for s in signs):
        return 0.0
    return best


def check(data):
    stages = sum(len(b["stades"]) for b in data["batiments"].values())
    assert len(data["batiments"]) == 21, len(data["batiments"])
    assert stages == 57, stages
    worst = {}
    measured = [(c, st, e) for c, b in data["batiments"].items() for st, e in b["stades"].items()
                if e["source"] == "blockout"]
    stems = {p.stem for p in (ISO / "blockouts").glob("*.json")} - {"windmill_sails"}  # sails_part's
    assert {f"{c}_{st}" for c, st, _ in measured} == stems, stems  # every blockout present is used
    pieces = {p.stem for p in (ISO / "blockouts" / "pieces").glob("*.json")}
    assert all(s.startswith(PIECES) for s in pieces), sorted(pieces)
    # Decor variants (L1-T06) stay inside their cell and under DECORS' height: their shadow is then
    # inside the box shadow the map was laid out with, and `decors` below stays an upper bound.
    variants = {}
    for stem in sorted(s for s in pieces if s.startswith("decor_")):
        name = stem.split("_")[1]
        assert name in DECORS, (stem, "unknown decor")
        h, (w, d), _ = DECORS[name]
        verts = blockout_vertices(f"pieces/{stem}")[1]
        assert all(-1e-6 <= x <= w + 1e-6 and -1e-6 <= y <= d + 1e-6 for x, y, _ in verts), (stem, "outside its cell")
        assert max(z for _, _, z in verts) <= h + 1e-6, (stem, "taller than its estimate", h)
        variants.setdefault(name, []).append(stem)
    assert set(variants) == set(DECORS), ("a decor without a blockout variant", sorted(variants))
    # A scaffold (lot 5) stands on a building's footprint in place of the building: its shadow reaches
    # no more cells, either way, than the lowest-reaching stage of the buildings of that footprint, so
    # the map's spacing rule (laid out with those stages) still holds while a building is going up.
    for stem in sorted(s for s in pieces if s.startswith("echafaudage_")):
        w, d = (int(n) for n in stem.split("_")[1].split("x"))
        cases = shadow(blockout_vertices(f"pieces/{stem}")[1], w, d)["cases"]
        same = [s["ombre"]["cases"] for b in data["batiments"].values() if b["emprise"] == [w, d]
                for s in b["stades"].values()]
        assert same, (stem, "no building of this footprint")
        for side in ("+gx", "-gy"):
            limit = min(c[side] for c in same)
            assert cases[side] <= limit, (stem, "shadow reaches past its buildings'", side, cases[side], limit)
    for code, stage, entry in measured:
        # A moving part estimated for this stage never vanishes because the stage got a blockout.
        lost = {m["nom"] for m in ESTIMATES[code][4].get(stage, [])} - {m["nom"] for m in entry["mobile"]}
        assert not lost, (code, stage, "estimated mobile parts dropped", lost)
        anchor = ISO / "blockouts" / "renders" / f"{code}_{stage}.anchor.json"
        parts = json.loads(anchor.read_text())["shadow"]
        theirs = hull([tuple(pt) for s in parts for pt in s["grid"]])
        ours = entry["ombre"]["polygone"]
        gap = max(max(dist_to_polygon(p, theirs) for p in ours),
                  max(dist_to_polygon(p, ours) for p in theirs))
        worst[f"{code}_{stage}"] = round(gap, 4)
        assert gap <= 0.05, (code, stage, gap)
        # A spec edited after its render: the exported volumes are stale, rerun stage_exports.py.
        w, d = data["batiments"][code]["emprise"]
        rebuilt = shadow(blockout_vertices(f"{code}_{stage}")[1], w, d)["polygone"]
        drift = max(max(dist_to_polygon(p, rebuilt) for p in ours), max(dist_to_polygon(p, ours) for p in rebuilt))
        assert drift <= 0.01, (code, stage, "spec and exported volumes disagree", drift)
    legend = json.loads((REPO / "constants" / "isoLayout.json").read_text())["legende"].values()
    assert set(data["decors"]) == set(legend) - NOT_DECOR, sorted(data["decors"])
    for name, dec in data["decors"].items():
        assert set(dec) == {"emprise", "source", "note", "hauteurMax", "ombre"}, name
        assert dec["source"] == "estimation" and dec["hauteurMax"] > 0 and dec["note"], name
        assert dec["ombre"]["auDela"]["+gx"] == round(SHIFT[0] * dec["hauteurMax"], 4), name
    for b in [*data["batiments"].values(), {"emprise": [1, 1], "stades": data["decors"]}]:
        for s in b["stades"].values():
            # The moon is behind-left: nothing reaches toward -gx or +gy.
            assert min(x for x, _ in s["ombre"]["polygone"]) >= -1e-6
            assert max(y for _, y in s["ombre"]["polygone"]) <= b["emprise"][1] + 1e-6
    return stages, worst


def biome_json(v, indent=0, prefix="", suffix=""):
    """JSON laid out as biome formats it (lineWidth 100): an object always open, one key per line;
    an array of scalars or arrays on one line when that line fits, otherwise one item per line."""
    pad = "  " * indent
    if isinstance(v, dict) and v:
        last = len(v) - 1
        rows = [biome_json(x, indent + 1, json.dumps(k, ensure_ascii=False) + ": ", "," * (i < last))
                for i, (k, x) in enumerate(v.items())]
        return f"{pad}{prefix}{{\n" + "\n".join(rows) + f"\n{pad}}}{suffix}"
    if isinstance(v, list) and v:
        flat = json.dumps(v, ensure_ascii=False)
        if "{" not in flat and len(pad + prefix + flat + suffix) <= 100:
            return pad + prefix + flat + suffix
        rows = [biome_json(x, indent + 1, "", "," * (i < len(v) - 1)) for i, x in enumerate(v)]
        return f"{pad}{prefix}[\n" + "\n".join(rows) + f"\n{pad}]{suffix}"
    return pad + prefix + json.dumps(v, ensure_ascii=False) + suffix


if __name__ == "__main__":
    data = build()
    stages, worst = check(data)
    (HERE / "heights.json").write_text(biome_json(data) + "\n")
    print(f"ok: {len(data['batiments'])} bâtiments, {stages} stades, {len(data['decors'])} décors"
          f" -> {HERE / 'heights.json'}")
    print("écart max au polygone des ancrages (cases):", worst)
