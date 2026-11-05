#!/usr/bin/env python3
"""G8, G10, G19: the final paintings of the quarter pieces, the stumps and F's countryside pieces.

    finals.py plan                     the list, the count, the reserve
    finals.py paint <id> [<id> ...]    one gpt-image-2.5-sunburst edit each (high, 1024x1024), session growth-2, never overwritten
    finals.py retry <id> <note>        same, but a new attempt k+1 with the one change noted in log.json

Concept = image 1, the reference sheet of our sprites = image 2 (the stumps' sheet and the stall's sprite are image 1 for their ids).
Outputs scratch/final/raw/<id>_<k>.png. Every call is logged in scratch/final/log.json; provenance by the wrapper.
Stops before a call that would take this run past RUN_CAP.
"""
import json
import pathlib
import sys
import time

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "iso"))
sys.path.insert(0, str(ROOT / "scripts"))
D = ROOT / "docs/designs/village/growth"
Q, C = D / "scratch/quartiers", D / "scratch/concepts"
F = D / "scratch/final"
RAW, WORK = F / "raw", F / "work"
SHEET = D / "scratch/bakeoff/in/sheet.png"
MODEL, SESSION, QUALITY = "gpt-image-2.5-sunburst", "growth-2", "high"
RUN_CAP, PER_IMAGE = 2.70, 0.07

REF = ("Image 2 is a reference sheet of three finished buildings of the same village (forge, hall, tent): copy only their ink line "
       "weight, flat colour blocks and brush texture, none of their shapes. ")
THATCH = "The thatch is dark warm grey-brown: a few long even strokes, calm. "
SLATE = "The roof is dark grey-brown slate in flat even rows, no warm tile. "
SHINGLES = "The roof is dark grey-brown wooden shingles in flat even rows, no warm tile. "
WINDOW = "One tiny dim window with a faint dull glow, no vivid orange. "
WINDOWS = "The windows are tiny and dim with a faint dull glow, no vivid orange. "
TAIL = ("The ink outline has the same thickness as on the reference sheet. Flat colours, matte surfaces, no gloss, no painted cast "
        "shadow, no people, no letters, no flags, no red.")
DARKER = "Everything is one step darker in value than usual: walls, roofs, fences, soil and wood all in low dark values. "


def ground(obj, floor=""):
    return (f"The {obj} stands alone on a flat uniform magenta #FF00FF background that fills the whole picture: no ground plate, no "
            f"diamond of earth or sand, no grass, the bottom edges of the walls end cleanly on the magenta. {floor}")


def house(thing, obj, same, roof, window, walls="The walls are a darker, duller grey-brown plaster. ", extra="", floor=""):
    return (f"Image 1 is the concept of {thing}: repaint exactly this {obj}, {same}, same size in the picture. {REF}Changes to make. "
            f"{ground(obj, floor)}{walls}{extra}{roof}{window}{TAIL}")


SPECS = {
    "A1a": (Q / "A1a_v2.png", house("one small house", "house", "same shape, same roof, same chimney, same doors, same framing", THATCH, WINDOW)),
    "A1b": (Q / "A1b_v2.png", house("one small house", "house", "same shape, same roof with its small eave on the left, same chimney, same door, same windows, same framing", SHINGLES, WINDOWS)),
    "A1c": (Q / "A1c_v2.png", house("one small house", "house", "same gable shape, same door, same windows, same chimney, same framing", SLATE, WINDOWS,
                                    extra="Keep it low: the walls are about a quarter shorter than in the concept and the roof a little flatter, with a single chimney. ")),
    "A2": (Q / "A2_v2.png", house("one long low house", "house", "same long shape, same thatched roof, same stone gable wall, same door", THATCH,
                                  "At most one tiny dim window with a faint dull glow, no vivid orange. ")),
    "A5": (Q / "A5_v1.png", house("one low timber workshop with a lean-to and stacked planks", "workshop", "same shape, same lean-to on the left, same stacked planks along the wall, same door",
                                  THATCH, WINDOW, walls="The walls are dull grey-brown weathered planks. ")),
    "A6": (Q / "A6_v2.png", house("one narrow stone house", "house", "same narrow shape, same roof, same door, same windows", SLATE, WINDOWS,
                                  extra="Lower it to one and a half storeys: the walls are about a third shorter, the upper windows sit right under the eaves. ")),
    "A7": (Q / "A7_v1.png", house("one long open timber hall", "hall", "same long shape, same heavy timber posts, same big roof, same empty trestles under it", THATCH, "",
                                  walls="The posts are dull dark grey-brown timber. ", floor="No floor: the posts end cleanly on the magenta, which shows through the open side. ")),
    "A8": (Q / "A8_v1.png", house("one L-shaped low house", "house", "same L shape, same thatched roof, same small timber gable, same short steps, same door", THATCH, WINDOW)),
    "B5": (Q / "B5_v1.png", house("one low cabin with a shingled roof", "cabin", "same shape, same roof, same door, same windows", SHINGLES, WINDOWS,
                                  extra="Remove the two cut stumps; keep one small pile of logs beside the door, smaller than in the concept. ")),
    "B6": (Q / "B6_v1.png", house("one low open-fronted shed with long logs resting on trestles", "shed", "same shape, same roof, same open front, same long logs", SHINGLES, "",
                                  walls="The walls are dull grey-brown rough stone and timber. ")),
    "A3": (Q / "A3_v2.png", (
        f"Image 1 is the concept of narrow strip gardens with low hurdle fences and low roofed sheds: repaint this garden as one single "
        f"connected flat block, one compact rectangle with one silhouette, the same strip gardens with dark soil rows and low hurdle fences, "
        f"the same low sheds joined side by side, not four separate plots; one narrow dirt lane may run through it. {REF}Changes to make. "
        f"The block stands alone on a flat uniform magenta #FF00FF background that fills the whole picture: no ground plate, no diamond of "
        f"earth or sand, no grass, the edges of the block end cleanly on the magenta. The soil is dark dull brown, the crops dull muted "
        f"greens, the shed roofs dark warm grey-brown thatch in a few long even strokes. {TAIL}")),
    "A4": (WORK / "etal_in.png", (
        f"Image 1 is the sprite of one market stall: repaint exactly this stall, same shape, same stripes in the same number and the same "
        f"positions, same crates and produce beneath the counter, same size in the picture. {REF}Changes to make. The stall stands alone on a "
        f"flat uniform magenta #FF00FF background that fills the whole picture: no ground, no shadow underneath, the bottoms of the legs and "
        f"crates end cleanly on the magenta. The colours are desaturated but not grey: the stripes a dull muted slate-blue and a dull "
        f"cream, the timber a dull grey-brown, the produce muted dull greens and ochre, every colour keeping a trace of its hue. {TAIL}")),
    "souches": (D / "scratch/bakeoff/souches_gpt_2.png", (
        f"Image 1 is a sheet of five cut tree stumps and two small heaps of wood chips on a flat magenta background: repaint exactly this "
        f"sheet, the same five stumps and the same two chip heaps in the same arrangement, every piece standing apart with clear magenta "
        f"around it. {REF}Changes to make. The sizes are closer together: the widest stump about one seventh of the picture width and "
        f"the smallest about one ninth, the chip heaps about one twelfth. The cut tops are darker, a low-value mid brown with dark rings, "
        f"not pale; the bark is dark brown. Moss on two stumps at most, the ones that have it, dull dark green. The chips are dull tan. "
        f"The background is a flat uniform magenta #FF00FF that fills the whole picture: no ground plate, no painted cast shadow, no people, "
        f"no letters, no flags, no red. The ink outline has the same thickness as on the reference sheet. Flat colours, matte surfaces.")),
}


def scene(c, thing, same, extra=""):
    return (C / f"{c}.png", (
        f"Image 1 is the concept of {thing}: repaint exactly this scene, {same}, same size in the picture. {REF}Changes to make. "
        f"The scene stands alone on a flat uniform magenta #FF00FF background that fills the whole picture: no ground plate, no diamond of "
        f"earth, sand or grass, every wall, fence, stump and crop row stands directly on the magenta and ends cleanly on it. {extra}"
        f"The walls are a dull dark grey-brown. The roofs are dark grey-brown thatch or wooden shingles, no warm tile. Windows are tiny "
        f"and dim with a faint dull glow, no vivid orange. {DARKER}{TAIL}"))


SPECS["hameau1_F_v2"] = scene("hameau1_F_v2", "a hamlet of four log cabins with shingled roofs, a few cut stumps and two fallen logs",
                              "same four cabins, same layout, same stumps and logs")
SPECS["hameau2_F_v1"] = scene("hameau2_F_v1", "a hamlet of six low log cabins around a round stone well, with a few cut stumps",
                              "same six cabins, same round well, same layout, same stumps")
SPECS["ferme3_F_v1"] = scene("ferme3_F_v1", "a farm with one tall stone barn under a thatched roof, a fence around a field of crop rows and a few cut stumps",
                             "same barn, same fence, same crop rows, same stumps")
SPECS["ferme3_F_v2"] = scene("ferme3_F_v2", "a farm with one long stone barn under a shingled roof, a fence around a field of crop rows and a few cut stumps",
                             "same barn, same fence, same crop rows, same stumps")
SPECS["ferme4_F_v1"] = scene("ferme4_F_v1", "four long low roofed sheds among plots of crop rows and round bushes",
                             "same sheds, same plots, same bushes, same layout")
SPECS["bourg_F_v1"] = scene("bourg_F_v1", "a village of eleven small low houses around a larger open-sided roof, with a low row of hedge along the front edge",
                            "same houses, same larger roof in the middle, same hedge, same layout")


def prep_etal():
    """The stall's own sprite on flat magenta, the baked soft shadow dropped (alpha under 200), scaled up 3.5x."""
    out = WORK / "etal_in.png"
    if out.exists():
        return
    WORK.mkdir(parents=True, exist_ok=True)
    im = Image.open(ROOT / "assets/images/village/iso/accessoires/etal_1.webp").convert("RGBA")
    a = im.getchannel("A").point(lambda v: 255 if v >= 200 else 0)
    im.putalpha(a)
    im = im.crop(im.getbbox())
    s = 800 / max(im.size)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    bg = Image.new("RGBA", (1024, 1024), (255, 0, 255, 255))
    bg.alpha_composite(im, ((1024 - im.width) // 2, (1024 - im.height) // 2))
    bg.convert("RGB").save(out)


def log_path():
    return F / "log.json"


def run_cost():
    p = log_path()
    return sum(e["cost"] for e in json.loads(p.read_text())) if p.exists() else 0.0


def paint(i, note=None):
    import openai_loop
    from lib import flux
    flux.PROVENANCE = ROOT / "scripts" / "provenance.json"
    if i == "A4":
        prep_etal()
    img, prompt = SPECS[i]
    k = 1
    while (RAW / f"{i}_{k}.png").exists():
        k += 1
    if k > 1 and not note:
        sys.exit("a retry needs a note: the one thing changed")
    if run_cost() + PER_IMAGE > RUN_CAP:
        sys.exit(f"stop: run cost {run_cost():.2f} $ + {PER_IMAGE} would pass {RUN_CAP} $")
    out = RAW / f"{i}_{k}.png"
    RAW.mkdir(parents=True, exist_ok=True)
    t = time.time()
    res = openai_loop.edit(out, prompt, [img, SHEET], "1024x1024", QUALITY, SESSION, MODEL)
    entry = {"id": i, "k": k, "note": note, "cost": res["cost"], "usage": res["usage"], "seconds": round(time.time() - t, 1), "out": str(out.relative_to(ROOT))}
    log = json.loads(log_path().read_text()) if log_path().exists() else []
    log.append(entry)
    log_path().write_text(json.dumps(log, indent=1) + "\n")
    print(json.dumps(entry), flush=True)


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["plan"]:
        print(len(SPECS), "images, about", round(len(SPECS) * PER_IMAGE, 2), "$ at", PER_IMAGE, "$ each; run cap", RUN_CAP)
        print(*SPECS)
    elif a[:1] == ["paint"]:
        for i in a[1:]:
            paint(i)
    elif a[:1] == ["retry"]:
        paint(a[1], " ".join(a[2:]))
    else:
        sys.exit(__doc__)
