#!/usr/bin/env python3
"""The square's focal point (tiers 10 to 12): one tall festive mast with red and ochre banners and a small brazier at its foot.

    mat.py paint [note]   one gpt-image-2.5-sunburst edit (high, 1024x1024), session growth-2, reference sheet only, never overwritten;
                          a second call is the one retry and needs a note. Raw: scratch/final/raw/mat_<k>.png, logged in final/log.json
    mat.py cut <k>        key, trim, scale, night from the day (finals_cut.cut), 0 $: scratch/final/mat.jour.webp, .nuit.webp, .json
"""
import json
import pathlib
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "growth"))
import finals as FI  # noqa: E402

PROMPT = (
    "Image 1 is a reference sheet of three finished buildings of the same village (forge, hall, tent): copy only their ink line weight, "
    "flat colour blocks and brush texture, none of their shapes. Draw one new object in the same hand: a tall festive mast for a village "
    "square, seen from the same isometric three-quarter view from above, standing alone. A straight dark weathered timber pole about three "
    "times the height of a house, with a crossbar near the top, and long narrow banners hanging from the pole and the crossbar, in dull "
    "muted red and dull ochre in alternating bands, a little frayed at the tips, hanging still. At its foot a small low round stone "
    "brazier with a small warm fire in it and a few stones around the pole's base. The object stands alone on a flat uniform magenta "
    "#FF00FF background that fills the whole picture: no ground plate, no diamond of earth, sand or grass, the base ends cleanly on the "
    "magenta, and the banners never touch the magenta except through their own edge. The ink outline has the same thickness as on the "
    "reference sheet. Flat colours, matte surfaces, no gloss, no painted cast shadow, no people, no letters, no symbols."
)


def paint(note=None):
    import openai_loop
    from lib import flux
    flux.PROVENANCE = ROOT / "scripts" / "provenance.json"
    k = 1
    while (FI.RAW / f"mat_{k}.png").exists():
        k += 1
    if k > 2:
        sys.exit("stop: at most one retry for the mast")
    if k > 1 and not note:
        sys.exit("a retry needs a note: the one thing changed")
    out = FI.RAW / f"mat_{k}.png"
    t = time.time()
    res = openai_loop.edit(out, PROMPT, [FI.SHEET], "1024x1024", FI.QUALITY, FI.SESSION, FI.MODEL)
    entry = {"id": "mat", "k": k, "note": note, "cost": res["cost"], "usage": res["usage"], "seconds": round(time.time() - t, 1), "out": str(out.relative_to(ROOT))}
    log = json.loads(FI.log_path().read_text())
    log.append(entry)
    FI.log_path().write_text(json.dumps(log, indent=1) + "\n")
    print(json.dumps(entry), flush=True)


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["paint"]:
        paint(" ".join(a[1:]) or None)
    elif a[:1] == ["cut"]:
        import finals_cut as FC
        print(FC.cut("mat", int(a[1])))
    else:
        sys.exit(__doc__)
