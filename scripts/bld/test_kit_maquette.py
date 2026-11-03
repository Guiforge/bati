import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import kit_maquette as K  # noqa: E402


def test_round_shapes_have_enough_segments_and_the_given_geometry():
    t = K.tower([1, 1, 0.16], 0.74, 0.58, 2.29)
    assert (t["type"], t["mat"], t["verts"], t["r"], t["r2"], t["h"]) == ("cone", "stone", 64, 0.74, 0.58, 2.29)
    assert K.plinth([1, 1, 0.04], 0.82, 0.12)["verts"] == 64
    r = K.roof([1, 1, 2.45], 0.9, 0.72, "tile")
    assert (r["type"], r["mat"], r["r2"], r["verts"]) == ("cone", "tile", 0.04, 64)
    assert K.thatched_roof([1, 1, 1.2], 0.78, 0.5)["mat"] == "thatch"
    assert K.tiled_roof([1, 1, 1.2], 0.78, 0.5)["mat"] == "tile"


def extent(parts):
    """(min, max) of x, y, z over the parts: box corners, cyl/cone discs along their axis."""
    lo, hi = [9e9] * 3, [-9e9] * 3
    for p in parts:
        if p["type"] == "box":
            pts = [p["at"], [a + s for a, s in zip(p["at"], p["size"])]]
            pad = 0
        else:
            c, ax = p["center"], p.get("axis", [0, 0, 1])
            pts = [c, [a + b * p["h"] for a, b in zip(c, ax)]]
            pad = max(p["r"], p.get("r2", 0))
        for q in pts:
            for i in range(3):
                lo[i], hi[i] = min(lo[i], q[i] - pad), max(hi[i], q[i] + pad)
    return lo, hi


def inside_canvas(parts):
    lo, hi = extent(parts)
    return min(lo) >= -1e-6 and hi[0] <= 2 and hi[1] <= 2 and hi[2] <= 4.2


def test_dome():
    d = K.dome([1, 1, 1.0], 0.7)
    assert len(d) == 16 and all(p["verts"] == 64 for p in d) and inside_canvas(d)
    s = K.dome([1, 1, 1.0], 0.7, slit=90)
    assert len(s) == 16 + 24 and inside_canvas(s)


def test_arch():
    a = K.arch([1, 1.6, 0.16], 0.5, 0.7, 0.2)
    assert len(a) == 3 + 14 and inside_canvas(a)
    assert inside_canvas(K.arch([1.6, 1, 0.16], 0.5, 0.7, 0.2, wall="y"))


def test_scaffold():
    s = K.scaffold([0.6, 0.6, 0.04], [0.8, 0.6], levels=2, level_h=0.5)
    assert len(s) == 4 + 2 * (8 + 1) + 1 and inside_canvas(s)


def test_treadwheel_crane():
    c = K.treadwheel_crane([1, 1, 0.04])
    assert len(c) == 2 * 24 + 24 + 16 + 1 + 4 + 3 and inside_canvas(c)
