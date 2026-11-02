#!/usr/bin/env python3
"""Renders the six E1 directions and the witness silhouettes. Never overwrites a folder.

    python3 scripts/bld/render_e1.py <out_dir>             # specs from gen_e1_specs.py -> <out>/<building>_<A|B|C>/
    python3 scripts/bld/render_e1.py <out_dir> --temoins   # current art -> <out>/temoins/

Per direction: color.png (with the sails at 45 degrees for the windmill, the rosette under them in B),
color_tower.png (windmill only), sil.png (black, alpha > 0.5, no slab, no stand-in) and sil.96.png
(96 dp at density 2.75, blurred 1 dp), report.json. Per building: planche_<building>.png beside them.
Scratch goes to ~/.cache/bati-buildings/e1, outside the repo. One Blender at a time.
"""

import argparse
import json
import pathlib
import shutil
import sys

import render_pilot as R  # sets ART_LOOP_DIR, sys.path; imports bldtools and isolib
from PIL import Image, ImageDraw

T, L = R.T, R.L
SPECS = R.SPECS / "e1"
SCRATCH = R.CACHE / "e1"
ROSETTE_PIVOT = (448, 195)  # directions.md, rosette B
ASSETS = R.ROOT / "assets" / "images" / "village" / "iso"


def sil(src: pathlib.Path, prefix: pathlib.Path) -> None:
    T.silhouette(src, str(prefix))
    shutil.move(f"{prefix}.sil.png", f"{prefix}.png")  # <prefix>.png black, <prefix>.96.png blurred


def render(name: str, out: pathlib.Path) -> dict:
    code, letter = name.split("_")
    folder = out / name
    folder.mkdir(parents=True)
    work = SCRATCH / name
    work.mkdir(parents=True, exist_ok=True)
    spec_path = SPECS / f"{code}_mythic_{letter}.json"
    spec = json.loads(spec_path.read_text())
    rgba = work / "tower.rgba.png"
    info = L.blender(spec_path, rgba, socle_shadow=False)
    report = R.check(spec, info)
    bare = dict(spec, parts=[p for p in spec["parts"] if not (p.get("_plate") or p.get("_marker"))])
    (work / "bare.json").write_text(json.dumps(bare))
    bare_rgba = work / "bare.rgba.png"
    L.blender(work / "bare.json", bare_rgba, socle_shadow=False)
    tower, bare_im = Image.open(rgba).convert("RGBA"), Image.open(bare_rgba).convert("RGBA")
    if code == "windmill":
        sails = work / "sails.rgba.png"
        L.blender(SPECS / "windmill_sails.json", sails, socle_shadow=False)
        big = Image.open(sails).convert("RGBA")
        extra = None
        if letter == "B":
            ros = work / "rosette.rgba.png"
            L.blender(SPECS / "windmill_rosette.json", ros, socle_shadow=False)
            extra = Image.open(ros).convert("RGBA")

        def compose(base):
            if extra:  # under the big sails; a blade straight up (this sheet's blades start at 45)
                base = R.sails_composite(base, extra, ROSETTE_PIVOT, 1.0, True)
            return R.sails_composite(base, big, info["pivot"], info["sailsScale"], False)

        T.flat(rgba).save(folder / "color_tower.png", optimize=True)
        tower, bare_im = compose(tower), compose(bare_im)
        report["sails_bbox"] = R.sails_composite(Image.new("RGBA", tower.size), big, info["pivot"], info["sailsScale"], False).getbbox()
    tower.save(work / "color.rgba.png")
    T.flat(work / "color.rgba.png").save(folder / "color.png", optimize=True)
    bare_im.save(work / "sil.rgba.png")
    sil(work / "sil.rgba.png", folder / "sil")
    (folder / "report.json").write_text(json.dumps(report, indent=1) + "\n")
    return report


def planche(out: pathlib.Path, building: str, letters="ABC", cell=(448, 672)) -> None:
    rows = ("color.png", "sil.png", "sil.96.png")
    im = Image.new("RGB", (cell[0] * len(letters), cell[1] * len(rows)), (255, 255, 255))
    for c, letter in enumerate(letters):
        for r, f in enumerate(rows):
            p = Image.open(out / f"{building}_{letter}" / f).convert("RGB")
            if r < 2:
                p = p.resize(cell, Image.LANCZOS)  # half scale; the blur stays at its own 96 dp size
            im.paste(p, (c * cell[0] + (cell[0] - p.width) // 2, r * cell[1] + (cell[1] - p.height) // 2))
        ImageDraw.Draw(im).text((c * cell[0] + 8, 6), f"{building} {letter}", fill=(0, 0, 0))
    im.save(out / f"planche_{building}.png", optimize=True)


def temoins(out: pathlib.Path) -> None:
    """Black and 96 dp blur of today's art: the highest stage each, windmill with its sails at 45 degrees."""
    folder = out / "temoins"
    folder.mkdir(parents=True)
    names = []
    for code, stage in (("wizard_tower", "grand"), ("champion_arena", "grand"), ("heroes_hall", "grand"),
                        ("fountain", "solid"), ("windmill", "grand"), ("observatory", "solid")):
        im = Image.open(ASSETS / code / f"{stage}.jour.webp").convert("RGBA")
        if code == "windmill":
            meta = json.loads((ASSETS / code / f"{stage}.jour.json").read_text())
            sails = Image.open(ASSETS / "windmill_sails.jour.webp").convert("RGBA")
            im = R.sails_composite(im, sails, meta["pivot"], meta["sailsScale"], False)
        src = SCRATCH / f"temoin_{code}_{stage}.png"
        SCRATCH.mkdir(parents=True, exist_ok=True)
        im.save(src)
        sil(src, folder / f"{code}_{stage}")
        names.append(f"{code}_{stage}")
    cell = 320
    sheet = Image.new("RGB", (cell * len(names), cell * 2), (255, 255, 255))
    for c, n in enumerate(names):
        for r, f in enumerate((f"{n}.png", f"{n}.96.png")):
            p = Image.open(folder / f).convert("RGB")
            if r == 0:
                p.thumbnail((cell, cell), Image.LANCZOS)
            sheet.paste(p, (c * cell + (cell - p.width) // 2, r * cell + (cell - p.height) // 2))
        ImageDraw.Draw(sheet).text((c * cell + 6, 6), n, fill=(0, 0, 0))
    sheet.save(folder / "planche_temoins.png", optimize=True)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--temoins", action="store_true")
    a = ap.parse_args(argv)
    out = pathlib.Path(a.out)
    if a.temoins:
        if (out / "temoins").exists():
            raise SystemExit("temoins/ exists: never overwritten")
        temoins(out)
        return 0
    for building in ("windmill", "observatory"):
        if any((out / f"{building}_{x}").exists() for x in "ABC"):
            raise SystemExit(f"{building}_* exists in {out}: never overwritten")
        reports = {f"{building}_{x}": render(f"{building}_{x}", out) for x in "ABC"}
        planche(out, building)
        print(json.dumps({k: (v["hauteurMax"], v["outsideFootprint"]) for k, v in reports.items()}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
