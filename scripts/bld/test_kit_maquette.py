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
