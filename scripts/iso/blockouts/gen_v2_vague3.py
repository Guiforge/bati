"""F1 vague 3: richer blockouts of 13 buildings for the FLUX 3 daytime repaint, every existing stage,
written beside the originals as <code>_<stade>_v2.json (same canvas, same footprint, same camera).

    python3 scripts/iso/blockouts/gen_v2_vague3.py
    scripts/iso/team/heavy.sh python3 scripts/iso/blockouts/render_v2.py wizard_tower_rough_v2 ...

Specs and renders go to ~/.cache/bati-art-loop/iso/blockouts_v2/ (see render_v2.py), never into the
repo's scanned folders. Rules applied to every stage (Mara's brief):
  1. the socle (the box at the origin covering the footprint) takes the shared `dryGrass` class;
  2. the vocation volume exists on every stage (crystal, trunks, winch, arrows, rack, jet, shields,
     brazier, gate passage, bones and gold, sand), checked against the night sprite;
  3. no thin piece: a box with two sides under MIN, or a rod under RMIN, is thickened around its centre;
  4. a light class: the emissive materials (windows, embers, the crystal) all land at G 200 in classes.png;
  5. the highest shadow-casting vertex never rises (asserted), anything taller would be noShadow.
`materials` and `emissive` in a spec add classes of their own (iso_blockout.py), their codes after the spec's.
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "exports"))
import heights as H  # noqa: E402

OUT = pathlib.Path.home() / ".cache" / "bati-art-loop" / "iso" / "blockouts_v2" / "specs"
MIN = 0.06   # thinnest side of a piece, in cells (16 px on the canvas: more than 2 cells of the 0.6 view)
RMIN = 0.03  # thinnest rod radius
LIGHT = ("amber", "fire", "ember", "crystal")

# Classes the shared isoSpec does not have yet (tones top, lit, shadow). Local to the _v2 specs so no
# code of an existing class moves; proposed for isoSpec.json when the painter keeps them.
MATERIALS = {
    "dryGrass": {"tones": ["#8A8A52", "#767246", "#3C3A26"]},
    "road": {"tones": ["#8A7C66", "#74685A", "#3A342E"]},
    "gold": {"tones": ["#C9A23C", "#A88730", "#4A3C16"]},
    "bone": {"tones": ["#C8C0AC", "#A8A090", "#4A4640"]},
    "water": {"tones": ["#6FA3BA", "#4F8299", "#22404E"]},
    "sand": {"tones": ["#B59A6A", "#9A8258", "#4A3E2A"]},
}
CRYSTAL = "#8FD8FF"

STAGES = {
    "wizard_tower": "rough solid grand", "druid_grove": "rough solid grand", "quarry": "rough solid grand",
    "archery_range": "rough solid grand", "training_dummy": "rough solid grand", "fountain": "rough solid",
    "armory": "rough solid", "watchtower": "rough solid", "castle_wall": "rough solid",
    "observatory": "rough solid", "dragon_lair": "rough solid grand", "champion_arena": "rough solid grand",
}  # high_road: left as it is (a signpost, a milestone and a gate arch on a paved road, see the report)


def load(name):
    return json.loads((HERE / f"{name}.json").read_text())


def box(x, y, z, sx, sy, sz, mat, **k):
    return {"type": "box", "at": [x, y, z], "size": [sx, sy, sz], "mat": mat, **k}


def cyl(c, r, h, mat, **k):
    return {"type": "cyl", "center": list(c), "r": r, "h": h, "mat": mat, **k}


def cone(c, r, r2, h, mat, **k):
    return {"type": "cone", "center": list(c), "r": r, "r2": r2, "h": h, "mat": mat, **k}


def crystal(cx, cy, z, r, h):
    """A bipyramid of the light class, apex down on `z`: noShadow like everything that glows."""
    lo = h * 0.4
    return [cone([cx, cy, z], 0.0, r, lo, "crystal", verts=8, noShadow=True),
            cone([cx, cy, z + lo], r, 0.0, h - lo, "crystal", verts=8, noShadow=True)]


def bone(x, y, z, length, rot):
    """A long bone: shaft box and a knob at each end, `rot` degrees about its centre."""
    return [box(x, y, z, length, 0.06, 0.06, "bone", rotZ=rot),
            box(x - 0.02, y - 0.02, z - 0.01, 0.1, 0.1, 0.08, "bone", rotZ=rot),
            box(x + length - 0.08, y - 0.02, z - 0.01, 0.1, 0.1, 0.08, "bone", rotZ=rot)]


def brazier(x, y, z):
    """A pole, an iron bowl and a bed of embers (the light class)."""
    return [cyl([x, y, z], 0.04, 0.32, "darkwood"),
            cone([x, y, z + 0.32], 0.08, 0.15, 0.13, "iron"),
            box(x - 0.08, y - 0.08, z + 0.45, 0.16, 0.16, 0.025, "ember")]


def socle(spec):
    p = spec["parts"][0]  # the box at the origin covering the footprint, always first
    assert p["type"] == "box" and p["at"] == [0.0, 0.0, 0.0], p
    p["mat"] = "dryGrass"


def thicken(p):
    """Raise a thin piece to MIN / RMIN around its centre; a plate (one thin side) stays."""
    if p.get("mat") in LIGHT:
        return
    if p["type"] == "box":
        thin = [i for i in range(3) if p["size"][i] < MIN - 1e-9]
        if len(thin) >= 2 or (len(thin) == 1 and sorted(p["size"])[1] < MIN):
            for i in thin:
                d = MIN - p["size"][i]
                p["at"][i] = round(p["at"][i] - d / 2, 4)
                p["size"][i] = MIN
    elif p["type"] == "cyl" and p["r"] < RMIN and p["h"] >= 0.05:
        p["r"] = RMIN


def top_and_reach(spec):
    """Highest and widest shadow-casting vertices of a spec, as heights.py counts them."""
    verts = []
    for p in spec["parts"]:
        if p.get("mat", "wood") in H.EMISSIVE or p.get("mat") in LIGHT or p.get("noShadow"):
            continue
        verts += H.part_vertices(p)
    w, d = H.SPEC["canvases"][spec["canvas"]]["footprint"]
    sh = H.shadow(verts, w, d)["auDela"]
    return round(max(v[2] for v in verts), 4), sh["+gx"], sh["-gy"]


# --- per building ---------------------------------------------------------------------------------

def wizard_tower(stage, s):
    tip = {"rough": (0.566, 0.467, 2.35, 0.11, 0.30), "solid": (0.5, 0.5, 2.87, 0.11, 0.30),
           "grand": (0.5, 0.5, 3.47, 0.12, 0.34)}[stage]
    s["parts"] += crystal(*tip)
    s["emissive"] = {"crystal": CRYSTAL}


def druid_grove(stage, s):
    P = s["parts"]
    lift = {"rough": (0.32, [(10, 11, 0.22, 1.78), (12, 13, 1.8, 0.24)], 0.36),
            "solid": (0.38, [(19, 20, 0.2, 1.8), (21, 22, 1.82, 0.4)], 0.42),
            "grand": (0.5, [(27, 28, 1.82, 1.82)], 0.54)}[stage]
    dz, bushes, trunk_h = lift
    base = {"rough": 0.04, "solid": 0.04, "grand": 0.06}[stage]
    for a, b, x, y in bushes:
        P[a]["center"][2] += dz
        P[b]["center"][2] += dz
        P.append(cyl([x, y, base], 0.07, trunk_h, "wood"))
    for i, p in enumerate(P):  # the existing trees get a real trunk
        if p["type"] == "cyl" and p["mat"] == "wood" and p["r"] == 0.06:
            p["r"] = 0.09


def quarry(stage, s):
    P = s["parts"]
    if stage == "rough":  # a hand winch beside the face: two posts, a drum, a crank, a rope and its block
        P += [box(1.36, 0.46, 0.05, 0.08, 0.08, 0.66, "darkwood"), box(1.36, 1.0, 0.05, 0.08, 0.08, 0.66, "darkwood"),
              cyl([1.4, 0.4, 0.62], 0.08, 0.66, "wood", axis=[0, 1, 0]),
              box(1.34, 1.02, 0.6, 0.18, 0.06, 0.06, "darkwood"),
              box(1.43, 0.74, 0.14, 0.06, 0.06, 0.5, "canvas"),
              box(1.3, 0.62, 0.05, 0.3, 0.28, 0.12, "stone")]
    elif stage == "solid":  # the goat's drum and crank at the foot, a sling and a block under the hook
        P += [cyl([1.4, 0.92, 0.3], 0.07, 0.44, "wood", axis=[1, 0, 0]),
              box(1.86, 0.88, 0.26, 0.06, 0.06, 0.22, "darkwood"),
              box(1.62, 0.84, 0.12, 0.06, 0.06, 0.2, "canvas"),
              box(1.5, 0.78, 0.08, 0.26, 0.24, 0.12, "stone")]
    else:  # a pick leaning on the block pile and wedges at the face
        P += [cyl([1.02, 1.12, 0.14], 0.03, 0.6, "wood", axis=[0.3, 0.1, 0.95]),
              box(0.96, 1.08, 0.7, 0.24, 0.06, 0.06, "iron", rotZ=20),
              box(0.5, 0.95, 0.14, 0.12, 0.08, 0.1, "iron"), box(0.8, 0.95, 0.14, 0.12, 0.08, 0.1, "iron")]


def archery_range(stage, s):
    P = s["parts"]
    base = {"rough": 0.04, "solid": 0.08, "grand": 0.12}[stage]
    targets = {"rough": [(1.0, 0.74, 0.51)], "solid": [(0.6, 0.69, 0.59), (1.4, 0.69, 0.59)],
               "grand": [(0.45, 0.73, 0.63), (1.0, 0.73, 0.63), (1.55, 0.73, 0.63)]}[stage]
    for tx, ty, tz in targets:  # two arrows stuck in each disc, shafts out toward the archers (+gy)
        for dx, dz in ((0.03, 0.01), (-0.1, 0.09)):
            P += [cyl([tx + dx, ty, tz + dz], 0.03, 0.4, "wood", axis=[0, 1, -0.2]),
                  box(tx + dx - 0.04, ty + 0.36, tz + dz - 0.08, 0.08, 0.09, 0.05, "canvas")]
    qx, qy = 1.55, 1.95  # quiver of arrows and the bow that goes with it
    P += [cyl([qx, qy, base], 0.08, 0.3, "darkwood")]
    for dx in (-0.03, 0.0, 0.03):
        P += [cyl([qx + dx, qy, base + 0.28], 0.03, 0.3, "wood", axis=[dx * 3, 0, 1])]
    P += [cyl([qx + 0.22, qy + 0.05, base], 0.03, 0.62, "wood", axis=[-0.32, 0, 0.95])]


def training_dummy(stage, s):
    if stage == "grand":
        return  # its rack is there already (the night sprite's)
    z = {"rough": 0.04, "solid": 0.06}[stage]
    # Right of the dummy, along gy, so it does not hide the pole: two posts, a bar, three arms on it.
    s["parts"] += [box(0.86, 0.3, z, 0.07, 0.07, 0.38, "darkwood"), box(0.86, 0.6, z, 0.07, 0.07, 0.38, "darkwood"),
                   box(0.855, 0.3, z + 0.27, 0.08, 0.37, 0.06, "darkwood"),
                   box(0.78, 0.37, z, 0.06, 0.06, 0.34, "wood"), box(0.78, 0.46, z, 0.06, 0.06, 0.34, "wood"),
                   box(0.78, 0.55, z, 0.06, 0.06, 0.34, "iron")]


def fountain(stage, s):
    P = s["parts"]
    if stage == "rough":
        P[1]["mat"] = "water"
        P += [cyl([1.0, 1.0, 0.73], 0.05, 0.24, "water", noShadow=True),
              cone([1.0, 1.0, 0.95], 0.0, 0.14, 0.1, "water", verts=8, noShadow=True)]
        P += [cyl([1.0, 1.0, 0.99], 0.03, 0.22, "water", axis=[a, b, -0.6], noShadow=True)
              for a, b in ((0.8, 0), (-0.8, 0), (0, 0.8), (0, -0.8))]
    else:
        for i in (2, 38, 41):
            P[i]["mat"] = "water"
        P += [cyl([1.0, 1.0, 1.12], 0.05, 0.2, "water", noShadow=True),
              cone([1.0, 1.0, 1.3], 0.0, 0.14, 0.1, "water", verts=8, noShadow=True)]
        P += [cyl([1.0, 1.0, 1.36], 0.03, 0.22, "water", axis=[a, b, -0.6], noShadow=True)
              for a, b in ((0.8, 0), (-0.8, 0), (0, 0.8), (0, -0.8))]


def armory(stage, s):
    P = s["parts"]
    if stage == "rough":
        x, shields = 1.47, [(1.12, 0.3, 0.14), (1.4, 0.3, 0.12)]
    else:
        x, shields = 1.57, [(1.35, 0.52, 0.14), (0.62, 0.52, 0.08)]
    for y, z, r in shields:  # round shields hung on the +gx wall, an iron boss on each
        P += [cyl([x, y, z], r, 0.05, "banner", axis=[1, 0, 0]), cyl([x + 0.04, y, z], 0.045, 0.04, "iron", axis=[1, 0, 0])]


def watchtower(stage, s):
    s["parts"] += brazier(*({"rough": (0.6, 0.3, 0.04), "solid": (0.55, 0.3, 0.08)}[stage]))


def castle_wall(stage, s):
    P = s["parts"]
    if stage == "rough":
        door = P.pop(4)  # the closed door goes: the road runs through the gate
        P += [dict(box(0.26, 1.2, 0.04, 0.48, 0.06, 0.68, "darkwood"), accroche="porte"),
              box(0.26, 1.74, 0.04, 0.48, 0.06, 0.68, "darkwood"),
              box(0.0, 1.2, 0.04, 1.0, 0.6, 0.02, "road")]
        assert door["accroche"] == "porte"
    else:
        for i in (23, 22, 1):  # portcullis, door, plinth (popped from the end so indexes stay true)
            P.pop(i)
        P += [box(0.16, 0.9, 0.08, 0.68, 0.35, 0.16, "stone"), box(0.16, 1.75, 0.08, 0.68, 1.21, 0.16, "stone"),
              dict(box(0.26, 1.25, 0.1, 0.48, 0.06, 0.78, "darkwood"), accroche="porte"),
              box(0.26, 1.69, 0.1, 0.48, 0.06, 0.78, "darkwood"),
              box(0.0, 1.25, 0.08, 1.0, 0.5, 0.02, "road")]
        P += [cone([0.66, y, 0.88], 0.035, 0.0, 0.12, "iron", axis=[0, 0, -1], verts=4)
              for y in (1.33, 1.45, 1.57, 1.69)]


def observatory(stage, s):
    pass  # the split dome and the spyglass are there; common rules only


def dragon_lair(stage, s):
    P = s["parts"]
    k = {"rough": 0.7, "solid": 0.85, "grand": 1.0}[stage]
    z = 0.055
    P += [cone([1.5, 2.05, z], 0.26 * k, 0.08 * k, 0.12 * k, "gold"), cone([1.5, 2.05, z + 0.1 * k], 0.12 * k, 0.04, 0.07, "gold")]
    for dx, dy in ((0.3, 0.1), (-0.3, 0.15), (0.12, -0.2)):
        P.append(cyl([1.5 + dx, 2.05 + dy, z], 0.06, 0.03, "gold"))
    P += bone(0.9, 2.35 if stage != "rough" else 2.1, z, 0.34, 20) + bone(1.95, 1.7, z, 0.3, -35)
    if stage != "rough":
        P += bone(2.2, 2.2, z, 0.38, 70) + bone(0.75, 1.85, z, 0.3, 100)
        P += [box(2.3, 1.55, z, 0.2, 0.16, 0.14, "bone", rotZ=25), box(2.33, 1.55, z + 0.14, 0.14, 0.1, 0.05, "bone", rotZ=25)]
    if stage == "grand":
        P += bone(1.0, 2.7, z, 0.4, -10) + bone(2.0, 2.65, z, 0.36, 15)
        P += [cyl([1.0 + 0.5 * i, 2.58, z], 0.03, 0.2, "bone", axis=[0, 0.3, 1]) for i in range(2)]
        for dx in (-0.45, 0.45):  # gold spilled to the sides
            P.append(cone([1.5 + dx, 2.1, z], 0.14, 0.05, 0.07, "gold"))


def champion_arena(stage, s):
    P = s["parts"]
    P[{"rough": 1, "solid": 1, "grand": 2}[stage]]["mat"] = "sand"  # the oval floor, sand


BUILD = {f.__name__: f for f in (wizard_tower, druid_grove, quarry, archery_range, training_dummy, fountain,
                                  armory, watchtower, castle_wall, observatory, dragon_lair, champion_arena)}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    for code, stages in STAGES.items():
        for stage in stages.split():
            name = f"{code}_{stage}"
            spec = load(name)
            before = top_and_reach(spec)
            socle(spec)
            spec["materials"] = MATERIALS
            BUILD[code](stage, spec)
            for p in spec["parts"][1:]:
                thicken(p)
            after = top_and_reach(spec)
            assert after[0] <= before[0] + 1e-4, (name, before, after)
            (OUT / f"{name}_v2.json").write_text(json.dumps(spec, indent=1) + "\n")
            rows.append((name, len(load(name)["parts"]), len(spec["parts"]), before, after))
            print(name, rows[-1][1:], flush=True)
    (OUT / "heights_avant_apres.json").write_text(json.dumps(
        {r[0]: {"parts": [r[1], r[2]], "hauteurMax": [r[3][0], r[4][0]], "auDela": {"+gx": [r[3][1], r[4][1]], "-gy": [r[3][2], r[4][2]]}}
         for r in rows}, indent=1) + "\n")


if __name__ == "__main__":
    main()
