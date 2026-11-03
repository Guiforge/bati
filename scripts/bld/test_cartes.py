#!/usr/bin/env python3
"""Self-check of gen_cartes.py and of the `sails` + `rects` shape. Run: python3 scripts/bld/test_cartes.py

The Blender step (rects draw only the rectangles, flat, in the blade's plane) runs when flatpak is there."""

import json
import pathlib
import shutil
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import gen_cartes as C  # noqa: E402

KINDS = {"box", "roof", "cyl", "cone", "sails", "sphere"}


def check_specs():
    files = sorted(C.OUT.glob("*.json"))
    assert len(files) == 35, len(files)
    for f in files:
        spec = json.loads(f.read_text())
        assert spec["canvas"] in ("building2x2", "sails"), f
        mats = set(spec.get("materials", {}))
        for p in spec["parts"]:
            assert p["type"] in KINDS, (f.name, p)
            if "r" in p and p["type"] != "sails":
                assert p["r"] > 0, (f.name, p)
            assert p["mat"] in {"stone", "plaster", "wood", "darkwood", "thatch", "tile", "iron", "canvas", "banner", "amber"} | mats, (f.name, p["mat"])
    # every stage keeps its plate and a ground marker; ribbons carry a layer
    for name in ("windmill", "observatory"):
        for st in C.OB_ORDER:
            parts = json.loads((C.OUT / f"{name}_{st}.json").read_text())["parts"]
            assert sum(1 for p in parts if p.get("_plate")) == 1 and any(p.get("_marker") for p in parts), (name, st)
    rub = json.loads((C.OUT / "windmill_rubans.json").read_text())["parts"]
    assert len(rub) == 120 and {p["layer"] for p in rub} == {"behind", "sousAiles"}
    # ground points of the card: the placement helper inverts the projection
    x, y = C.px_to_grid(732, 1094)
    assert abs(x - 1.78) < 0.01 and abs(y - 0.30) < 0.01, (x, y)


def check_rects():
    if not shutil.which("flatpak"):
        print("no flatpak: rects not rendered")
        return
    import render_pilot as R
    spec = {"canvas": "sails", "parts": [{"type": "sails", "length": 1.25, "width": 0.3, "hub": 0.09, "mat": "canvas",
                                          "rects": [[0, 0.5, 0.9, -0.1, 0.1]]}]}
    p = pathlib.Path.home() / ".cache" / "bati-buildings" / "test-rects"
    p.mkdir(parents=True, exist_ok=True)
    (p / "s.json").write_text(json.dumps(spec))
    R.L.blender(p / "s.json", p / "s.rgba.png", socle_shadow=False)
    from PIL import Image
    box = Image.open(p / "s.rgba.png").convert("RGBA").getchannel("A").point(lambda v: 255 if v >= 128 else 0).getbbox()
    # one 0.4 x 0.2 rectangle on blade 0 (up right): ~109 x 54 along the diagonal, nowhere near a full sail
    assert box and 60 < box[2] - box[0] < 130 and 60 < box[3] - box[1] < 130, box
    assert box[0] > 384 and box[3] < 384, box  # right of the hub and above it


if __name__ == "__main__":
    C.main()
    check_specs()
    check_rects()
    print("test_cartes: ok")
