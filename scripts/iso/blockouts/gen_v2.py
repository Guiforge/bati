"""F1 vague 2: richer grand blockouts for the FLUX 3 daytime repaint, written beside the originals as
<code>_<stade>_v2.json (same canvas, same footprint, nothing existing moves, except the hall's stub
statue on the pediment, which is replaced).

    python3 scripts/iso/blockouts/gen_v2.py
    scripts/iso/team/heavy.sh python3 scripts/iso/blockouts/render_v2.py heroes_hall_grand_v2 forge_grand_v2

Mara's rule: every prop of the night sprite exists in the blockout before painting. Banner cloths are
`canvas` (their own class in classes.png, so the coat of arms is laid in code); they and the pennant
are `noShadow` like the other things that move, so hauteurMax and the shadow gap do not change.
"""
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
# The _v2 specs live outside the repo's scanned folders (render_v2.py reads them there).
OUT = pathlib.Path.home() / ".cache" / "bati-art-loop" / "iso" / "blockouts_v2" / "specs"


def load(name):
    return json.loads((HERE / f"{name}.json").read_text())


def save(name, spec):
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{name}_v2.json").write_text(json.dumps(spec, indent=1) + "\n")


def box(x, y, z, sx, sy, sz, mat, **k):
    return {"type": "box", "at": [x, y, z], "size": [sx, sy, sz], "mat": mat, **k}


def cyl(c, r, h, mat, **k):
    return {"type": "cyl", "center": c, "r": r, "h": h, "mat": mat, **k}


# --- heroes_hall grand ---------------------------------------------------------------------------
hh = load("heroes_hall_grand")
# The stub on the pediment: box, cone, two cylinders, thin cylinder, box (all above the arch's cap at z 1.89).
STUB = {(1.32, 2.2, 1.89), (1.5, 2.35, 2.03), (1.5, 2.35, 2.45), (1.58, 2.35, 2.3), (1.72, 2.35, 2.5), (1.66, 2.3, 2.5)}
parts = [p for p in hh["parts"] if tuple(p.get("at", p.get("center"))[:3]) not in STUB]
assert len(hh["parts"]) - len(parts) == 6

# Hero on a plinth, on the axis (gx 1.5) in front of the arch. The door is 0.7 high: the figure, plinth
# apart, is 1.05 (1.5 doors). Drawn at 0.77 then scaled by K around its feet.
cx, y0, z0, K = 1.5, 2.77, 0.38, 1.36


def fb(x, y, z, sx, sy, sz, mat):  # x, y relative to the axis and the front, z to the feet
    return box(cx + x * K, y0 + y * K, z0 + (z - 0.28) * K, sx * K, sy * K, sz * K, mat)


parts += [
    box(1.15, 2.5, 0.08, 0.7, 0.5, 0.26, "stone"),                    # plinth
    box(1.12, 2.47, 0.34, 0.76, 0.56, 0.04, "stone"),                 # its cap
    fb(-0.13, -0.04, 0.32, 0.11, 0.11, 0.24, "stone"),                # legs
    fb(0.02, -0.04, 0.32, 0.11, 0.11, 0.24, "stone"),
    fb(-0.15, -0.06, 0.52, 0.30, 0.18, 0.12, "stone"),                # tunic skirt
    fb(-0.13, -0.04, 0.64, 0.26, 0.14, 0.20, "stone"),                # torso
    fb(-0.17, -0.05, 0.82, 0.34, 0.16, 0.07, "stone"),                # shoulders
    fb(-0.215, -0.03, 0.62, 0.07, 0.10, 0.22, "stone"),               # left arm, down
    fb(-0.255, -0.11, 0.58, 0.05, 0.19, 0.26, "stone"),               # shield on it
    fb(0.145, -0.03, 0.74, 0.07, 0.10, 0.17, "stone"),                # right arm raised
    cyl([cx, y0 + 0.03 * K, z0 + 0.33 * K], 0.065 * K, 0.08 * K, "stone"),   # head
    {"type": "cone", "center": [cx, y0 + 0.03 * K, z0 + 0.41 * K], "r": 0.07 * K, "r2": 0.025 * K, "h": 0.07 * K,
     "mat": "stone", "verts": 8},                                     # helmet
    cyl([cx + 0.18 * K, y0 + 0.01 * K, z0 + 0.35 * K], 0.014 * K, 0.30 * K, "iron"),  # sword up in the fist
    fb(0.145, -0.04, 0.91, 0.07, 0.08, 0.025, "iron"),                # its guard
]
# Two plain banners (no coat of arms), one at each pole: crossbar, cloth, swallow tail.
for px in (0.3, 2.7):
    parts += [
        cyl([px - 0.22, 2.84, 1.95], 0.02, 0.44, "iron", axis=[1, 0, 0], verts=4),
        box(px - 0.16, 2.84, 1.15, 0.32, 0.03, 0.78, "canvas", noShadow=True),
        box(px - 0.16, 2.84, 1.03, 0.14, 0.03, 0.12, "canvas", noShadow=True),
        box(px + 0.02, 2.84, 1.03, 0.14, 0.03, 0.12, "canvas", noShadow=True),
    ]
# One lantern each side of the arch, on the outer face of its pillar (amber glass, iron cap, base and hook).
for gx, hook in ((0.62, 0.68), (2.28, 2.28)):
    parts += [
        box(hook, 2.28, 1.1, 0.05, 0.04, 0.03, "iron"),
        box(gx, 2.27, 0.9, 0.10, 0.10, 0.17, "amber"),
        box(gx - 0.01, 2.26, 1.07, 0.12, 0.12, 0.03, "iron"),
        box(gx - 0.01, 2.26, 0.87, 0.12, 0.12, 0.03, "iron"),
    ]
# Pennant on the turret's finial (the spire stays): pole and a flag the wind will move in the app.
parts += [
    cyl([1.5, 0.81, 2.98], 0.012, 0.26, "iron", noShadow=True),
    box(1.51, 0.80, 3.1, 0.2, 0.02, 0.1, "banner", noShadow=True),
]
hh["parts"] = parts
save("heroes_hall_grand", hh)

# --- forge grand ---------------------------------------------------------------------------------
fg = load("forge_grand")
fg["parts"] += [
    # Sword lying on the anvil, blade toward -gx, hilt toward +gx (as in the night sprite).
    box(1.2, 1.355, 0.52, 0.5, 0.07, 0.025, "iron"),
    box(1.7, 1.31, 0.52, 0.04, 0.16, 0.035, "iron"),
    cyl([1.74, 1.39, 0.5375], 0.016, 0.14, "iron", axis=[1, 0, 0], verts=4),
    cyl([1.88, 1.39, 0.5375], 0.03, 0.03, "iron", axis=[1, 0, 0]),
    # Carved sign on the front gable (the night sprite's plaque).
    box(0.55, 2.0, 1.58, 0.25, 0.05, 0.27, "darkwood"),
]
save("forge_grand", fg)
