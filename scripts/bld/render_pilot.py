#!/usr/bin/env python3
"""Renders the pilot maquettes (windmill, observatory; five stages each) for one named round.

    python3 scripts/bld/render_pilot.py r1 [--only windmill_rough observatory_mythic ...]

Reads scripts/iso/blockouts/bld/*.json (written by gen_pilot_specs.py), drives Blender through
isolib.blender (one at a time, sequential), and writes under docs/designs/village-buildings/maquettes/<round>/:

    <code>_<stage>.png               the maquette on a neutral ground (the windmill: tower alone)
    <code>_<stage>.mask.png          alpha >= 128 in white, for `bldtools.py footprint`
    windmill_<stage>_sails.png       tower with its sail variant turned to X, scaled per the card
    silhouettes/<code>_<stage>.png   black silhouette (no ground slab, no stand-ins), + .96.png blurred
    silhouettes/windmill_<stage>_X.png, _plus.png   with sails in two poses (mythic: + storm-cloud blob)
    strip_windmill.png, strip_observatory.png, footprint.txt, report.json

A round folder that exists is never written again: pick a new name. Scratch (passes, rgba) goes to
~/.cache/bati-buildings/pilot/<round>, outside the repo, and the art loop's own cache is not touched.
"""

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CACHE = pathlib.Path.home() / ".cache" / "bati-buildings"
os.environ["ART_LOOP_DIR"] = str(CACHE / "art-loop")  # isolib's WORK: not the art loop's passes
sys.path.insert(0, str(ROOT / "scripts" / "iso"))
sys.path.insert(0, str(HERE))
from PIL import Image, ImageDraw  # noqa: E402

import bldtools as T  # noqa: E402
import isolib as L  # noqa: E402

SPECS = ROOT / "scripts" / "iso" / "blockouts" / "bld"
STAGES = ["rough", "solid", "grand", "legendary", "mythic"]
CLOUD = (700, 75, 880, 145)  # card: centre (790, 110), 180 x 70 px; a silhouette-only stand-in
EPS = 1e-4


def sails_composite(tower: Image.Image, sails: Image.Image, pivot, scale, plus: bool) -> Image.Image:
    s = sails.rotate(45 if plus else 0, resample=Image.BICUBIC)
    n = round(s.width * scale)
    s = s.resize((n, n), Image.LANCZOS)
    out = tower.copy()
    out.alpha_composite(s, (round(pivot[0] - n / 2), round(pivot[1] - n / 2)))
    return out


def with_cloud(im: Image.Image) -> Image.Image:
    im = im.copy()
    ImageDraw.Draw(im).ellipse(CLOUD, fill=(0, 0, 0, 255))
    return im


def silhouette(rgba_path: pathlib.Path, prefix: pathlib.Path) -> None:
    T.silhouette(rgba_path, str(prefix))
    shutil.move(f"{prefix}.sil.png", f"{prefix}.png")


def check(spec: dict, info: dict) -> dict:
    """hauteurMax and the parts that leave the 2 x 2 footprint, from the rendered vertices."""
    top, out = 0.0, []
    for vol, part in zip(info["volumes"], spec["parts"]):
        v = vol["vertices"]
        if not part.get("_marker"):
            top = max(top, max(p[2] for p in v))
        if min(p[0] for p in v) < -EPS or max(p[0] for p in v) > 2 + EPS \
                or min(p[1] for p in v) < -EPS or max(p[1] for p in v) > 2 + EPS or min(p[2] for p in v) < -EPS:
            out.append(f"part {vol['part']} {part['type']} {part.get('mat')}")
    return {"hauteurMax": round(top, 3), "outsideFootprint": out}


def strip(out: pathlib.Path, rows: list[list[pathlib.Path]], k=0.5) -> None:
    first = Image.open(rows[0][0])
    w, h = round(first.width * k), round(first.height * k)
    im = Image.new("RGB", (w * len(rows[0]), h * len(rows)), (255, 255, 255))
    for r, row in enumerate(rows):
        for c, p in enumerate(row):
            im.paste(Image.open(p).convert("RGB").resize((w, h), Image.LANCZOS), (c * w, r * h))
    im.save(out, optimize=True)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("round")
    ap.add_argument("--only", nargs="*", default=[])
    a = ap.parse_args(argv)
    out = ROOT / "docs" / "designs" / "village-buildings" / "maquettes" / a.round
    if out.exists():
        raise SystemExit(f"{out} exists: a round is never overwritten, give a new name")
    work = CACHE / "pilot" / a.round
    work.mkdir(parents=True, exist_ok=True)
    (out / "silhouettes").mkdir(parents=True)
    report = {}

    # sail variants first: one render per distinct spec, copied for the stages that share it
    sails, done = {}, {}
    for st in STAGES:
        spec = SPECS / f"windmill_sails_{st}.json"
        key = hashlib.sha1(spec.read_bytes()).hexdigest()
        if key not in done:
            done[key] = work / f"windmill_sails_{st}.rgba.png"
            L.blender(spec, done[key], socle_shadow=False)
        sails[st] = Image.open(done[key]).convert("RGBA")

    for code in ("windmill", "observatory"):
        for st in STAGES:
            name = f"{code}_{st}"
            if a.only and name not in a.only:
                continue
            spec_path = SPECS / f"{name}.json"
            spec = json.loads(spec_path.read_text())
            rgba = work / f"{name}.rgba.png"
            info = L.blender(spec_path, rgba, socle_shadow=False)
            report[name] = check(spec, info)
            tower = Image.open(rgba).convert("RGBA")
            T.flat(rgba).save(out / f"{name}.png", optimize=True)
            tower.getchannel("A").point(lambda v: 255 if v >= 128 else 0).save(out / f"{name}.mask.png")
            # the black shape: the building without its ground slab and stand-ins
            bare = dict(spec, parts=[p for p in spec["parts"] if not (p.get("_plate") or p.get("_marker"))])
            bare_spec = work / f"{name}.bare.json"
            bare_spec.write_text(json.dumps(bare))
            bare_rgba = work / f"{name}.bare.rgba.png"
            L.blender(bare_spec, bare_rgba, socle_shadow=False)
            sil = out / "silhouettes"
            silhouette(bare_rgba, sil / name)
            if code != "windmill":
                continue
            base = Image.open(bare_rgba).convert("RGBA")
            for pose, plus in (("X", False), ("plus", True)):
                comp = sails_composite(base, sails[st], info["pivot"], info["sailsScale"], plus)
                box = sails_composite(Image.new("RGBA", base.size), sails[st], info["pivot"], info["sailsScale"], plus).getbbox()
                report[name][f"sails_{pose}_bbox"] = box
                if box and (box[0] < 0 or box[1] < 0 or box[2] > base.width or box[3] > base.height):
                    report[name].setdefault("sailsOutsideCanvas", []).append(pose)
                if st == "mythic":
                    comp = with_cloud(comp)
                p = work / f"{name}_{pose}.rgba.png"
                comp.save(p)
                silhouette(p, sil / f"{name}_{pose}")
            colour = sails_composite(tower, sails[st], info["pivot"], info["sailsScale"], False)
            colour_path = work / f"{name}_sails.rgba.png"
            colour.save(colour_path)
            T.flat(colour_path).save(out / f"{name}_sails.png", optimize=True)

    full = not a.only
    if full:
        strip(out / "strip_windmill.png",
              [[out / f"windmill_{s}_sails.png" for s in STAGES],
               [out / "silhouettes" / f"windmill_{s}_X.png" for s in STAGES],
               [out / "silhouettes" / f"windmill_{s}_plus.png" for s in STAGES],
               [out / "silhouettes" / f"windmill_{s}.png" for s in STAGES]])
        strip(out / "strip_observatory.png",
              [[out / f"observatory_{s}.png" for s in STAGES],
               [out / "silhouettes" / f"observatory_{s}.png" for s in STAGES]])
        lines = []
        for code in ("windmill", "observatory"):
            masks = [str(out / f"{code}_{s}.mask.png") for s in STAGES]
            bad = T.footprint(masks)
            lines.append(f"{code}: " + ("; ".join(bad) or "footprints match"))
        (out / "footprint.txt").write_text("\n".join(lines) + "\n")
        print("\n".join(lines))
    (out / "report.json").write_text(json.dumps(report, indent=1) + "\n")
    print(json.dumps({k: (v["hauteurMax"], v["outsideFootprint"]) for k, v in report.items()}, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
