"""Render the `_v2` blockouts of the FLUX 3 repaint (F1) outside the repo's scanned folders.

    scripts/iso/team/heavy.sh python3 scripts/iso/blockouts/render_v2.py <slug_v2> ...

Same pipeline as exports/stage_exports.py (same camera, canvas, anchor, exports); only the three
roots move, so no test or app code sees the files:
  ~/.cache/bati-art-loop/iso/blockouts_v2/specs/    <slug>.json      (written by gen_v2.py / gen_v2_vague3.py)
  ~/.cache/bati-art-loop/iso/blockouts_v2/renders/  <slug>.*.png, .anchor.json
  ~/.cache/bati-art-loop/iso/blockouts_v2/mockups/blockout/<slug>.webp (+ .json)
"""
import pathlib
import sys

ISO = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ISO))
sys.path.insert(0, str(ISO / "exports"))
import isolib as L  # noqa: E402

CACHE = pathlib.Path.home() / ".cache" / "bati-art-loop" / "iso" / "blockouts_v2"
L.BLOCKOUTS = CACHE / "specs"
L.RENDERS = CACHE / "renders"
L.SPRITES = CACHE / "mockups"
import stage_exports  # noqa: E402

if __name__ == "__main__":
    for slug in sys.argv[1:] or sorted(p.stem for p in L.BLOCKOUTS.glob("*_v2.json")):  # no slug: every spec
        try:
            stage_exports.export(slug)
        except ValueError as e:  # its closing print makes a repo-relative path; the files are all written by then
            if "is not in the subpath" not in str(e):
                raise
            print(slug, "ok")
