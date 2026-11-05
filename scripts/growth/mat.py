#!/usr/bin/env python3
"""The square's focal point (tiers 10 to 12): one tall festive mast with red and ochre banners and a small brazier at its foot.

    mat.py paint <mat|feu> [note]   one gpt-image-2.5-sunburst edit (high, 1024x1024), session growth-2, reference sheet only, never overwritten;
                          a second call is the one retry and needs a note. Raw: scratch/final/raw/mat_<k>.png, logged in final/log.json
    mat.py cut <mat|feu> <k>        key, trim, scale, night from the day (finals_cut.cut), 0 $: scratch/final/mat.jour.webp, .nuit.webp, .json
"""
import json
import pathlib
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "growth"))
import finals as FI  # noqa: E402

def _p(obj):
    return ("Image 1 is a reference sheet of three finished buildings of the same village (forge, hall, tent): copy only their ink line weight, "
            "flat colour blocks and brush texture, none of their shapes. Draw one new object in the same hand, seen from the same isometric "
            "three-quarter view from above, standing alone. " + obj + " The object stands alone on a flat uniform magenta #FF00FF background "
            "that fills the whole picture: no ground plate, no diamond of earth, sand or grass, the base ends cleanly on the magenta, and the "
            "painted parts never use the magenta colour. The ink outline has the same thickness as on the reference sheet. Flat colours, matte "
            "surfaces, no gloss, no painted cast shadow, no people, no letters, no symbols.")


PROMPTS = {
    "mat": _p(
        "A tall festive mast for a village square, drawn narrow and very tall: one slim straight dark timber pole, three times the height of a "
        "house, filling the picture's height, and the whole object no wider than a fifth of its height. A short slim crossbar near the top, "
        "only a little wider than the pole. Hung straight down from the pole and the short crossbar, three long narrow banners of vivid saturated "
        "red, a strong pure red like fresh madder dye, with a narrow dull ochre trim, swallow-tailed ends, hanging still, one above the other "
        "along the pole: the red is the brightest and most saturated colour of the picture. Two small iron lanterns with a warm yellow-orange "
        "glowing glass hang on short chains from the pole, one near the top and one in the middle. At the foot of the pole a small round low "
        "stone brazier with a bright orange fire in it and a few stones around the pole's base."),
    "feu": _p(
        "A great square bonfire for the heart of a village square: a tall tidy stack of split logs laid in a crossed pile about as tall as a "
        "house, inside a low ring of stones, with big bright flames, yellow and orange with a deep orange edge, rising from the top of the pile "
        "and a few sparks, standing on its own. A few unlit logs and stones lie around the ring's foot. The flames are the brightest part of "
        "the picture."),
}
PROMPT = PROMPTS["mat"]


def paint(note=None, i="mat"):
    import openai_loop
    from lib import flux
    flux.PROVENANCE = ROOT / "scripts" / "provenance.json"
    k = 1
    while (FI.RAW / f"{i}_{k}.png").exists():
        k += 1
    if k > 3:
        sys.exit("stop: the mast and the fire are budgeted: 6 images in all")
    if k > 1 and not note:
        sys.exit("a retry needs a note: the one thing changed")
    out = FI.RAW / f"{i}_{k}.png"
    t = time.time()
    res = openai_loop.edit(out, PROMPTS[i], [FI.SHEET], "1024x1024", FI.QUALITY, FI.SESSION, FI.MODEL)
    entry = {"id": i, "k": k, "note": note, "cost": res["cost"], "usage": res["usage"], "seconds": round(time.time() - t, 1), "out": str(out.relative_to(ROOT))}
    log = json.loads(FI.log_path().read_text())
    log.append(entry)
    FI.log_path().write_text(json.dumps(log, indent=1) + "\n")
    print(json.dumps(entry), flush=True)


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["paint"]:
        paint(" ".join(a[2:]) or None, a[1])
    elif a[:1] == ["cut"]:
        import finals_cut as FC
        print(FC.cut(a[1], int(a[2])))
    else:
        sys.exit(__doc__)
