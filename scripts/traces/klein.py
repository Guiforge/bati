#!/usr/bin/env python3
"""TRACES concepts, FLUX 3 Image Klein only. Throwaway images for Guillaume's page: never assets, nothing placed.
    klein.py paint [--only sentier,arbre] [--try N]    edit-in-context: one square crop per trace, 2 variations per stage (raw concepts)
    klein.py compose                                   paste each concept into the view under a feathered hand-drawn mask, then page extracts + planche.jpg
    klein.py villages                                  made-up villages from the picked variations, 0 $
The base is scratch/fixe/t6-jour.png, view = crop (0,480,1080,2183). Never overwrites. Reserve and settle through iso_loop
(via bld/concepts.run), under the probe traces_klein (0.60 $ job cap, checked here before sending)."""
import argparse
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "bld"))
sys.path.insert(0, str(ROOT / "scripts" / "iso"))
import concepts
from iso_loop import KLEIN, klein_price
from PIL import Image, ImageDraw, ImageFilter, ImageFont

D = ROOT / "docs/designs/village/traces"
S = D / "scratch"
SIZE = (1024, 1024)
PROBE = "traces_klein"
CAP = 0.60
FEATHER = 16
VIEW_BOX = (0, 480, 1080, 2183)

PRE = "Image 1 is a hand-painted isometric map. Keep everything in it exactly as it is, same colours, same ink line, same camera, and add only this: "
TAIL = (" Hand-painted isometric map, ink outlines, warm light from the upper left, matte, calmer and lower than the buildings around, "
        "no painted cast shadow, no people, no animals, no letters, no signs, no flags, no glow.")

# square crop in view coordinates; centre = where the extract is taken; mask = one generous hand-drawn region per trace, shared by its stages
# (ellipse cx,cy,rx,ry, or a polyline with its width), clipped to the crop. Sizes are said as fractions of the image, never in pixels.
BAR = ("on the open sand-coloured ground left of the windmill, between the river and the stone path, a low wide wooden exercise bar: two stout short square "
       "posts of rough timber, thick as a barrel, with one horizontal log across their tops, low and wide and heavy, about as tall as the cottage door beside it. ")
TRACES = {
    "sentier": {
        "crop": (0, 330, 420, 750), "centre": (190, 530), "mask": ("line", [(300, 630), (0, 415)], 150),
        "stages": {
            1: "a short thin winding footpath of pale sand-coloured earth, clearly paler than the grass, one single colour, starting at the river's upper bank beside the small wooden tower "
               "and wandering up and to the left for about one third of the way to the left edge. It is broken in several short pieces and fades out into the grass. "
               "Its width is about one thirtieth of the image width, with soft irregular edges, much narrower than any road.",
            2: "a thin winding footpath of pale sand-coloured earth, clearly paler than the grass, one single colour, continuous, starting at the river's upper bank beside the small wooden tower "
               "and wandering in a loose S-curve up and to the left for about two thirds of the way to the left edge. Its width is about one thirtieth of the image width, "
               "with soft irregular edges and tufts of grass at its sides, much narrower than any road.",
            3: "a footpath of pale sand-coloured earth, clearly paler than the grass, one single colour, starting at the river's upper bank beside the small wooden tower "
               "and wandering in a loose S-curve up and to the left all the way to the left edge of the image. It is a little wider than before, about one twentieth of the image width, "
               "still narrower than any road, with irregular edges and two faint parallel wheel ruts.",
        },
    },
    "poutre": {
        "crop": (440, 360, 740, 660), "centre": (625, 545), "mask": ("ellipse", (625, 545, 115, 65)),
        "stages": {
            1: BAR + "The grass beneath and around it is flattened and pale. Under the bar the ground is empty.",
            2: BAR + "Beneath it a clear oval patch of bare trodden earth, nearly as wide as the bar. Under the bar the ground is empty.",
            3: BAR + "The log is paler and polished smooth in its middle where hands have worn it. Beneath it a wide hollowed oval of bare earth, slightly sunk, "
                     "with a packed edge, wider than the bar. Under the bar the ground is empty.",
        },
    },
    "arbre": {
        "crop": (30, 640, 330, 940), "centre": (150, 780), "mask": ("ellipse", (160, 775, 120, 100)),
        "stages": {
            1: "on the open sandy grass inside the pale curve left of the wooden fence, one young sapling with a thin trunk and a small tuft of leaves, tied to three short wooden stakes. "
               "It is about one fifth of the image height tall.",
            2: "on the open sandy grass inside the pale curve left of the wooden fence, one small broad tree with a visible grey-brown trunk and a rounded low crown of light green leaves. "
               "The crown is about one third of the image width wide, and the whole tree stands alone.",
            3: "on the open sandy grass inside the pale curve left of the wooden fence, one single old tree standing alone: a thick gnarled grey-brown trunk you can clearly see, "
               "a very broad low spreading crown of bright green leaves, about half of the image width wide and about one third of the image height tall, wider than it is tall, "
               "as tall as the cottages around, a shape unlike the dark forest trees.",
        },
    },
    "souche": {
        "crop": (95, 785, 335, 1025), "centre": (225, 895), "mask": ("ellipse", (225, 895, 100, 60)),
        "stages": {
            1: "on the open meadow grass in the middle of the image, one old cut tree stump of grey-brown wood about one seventh of the image width wide, with a large generous bouquet of big bright young green shoots "
               "and leaves springing from its top, as wide as a quarter of the image, much brighter and fresher than anything else on the map.",
            2: "on the open meadow grass in the middle of the image, two old cut tree stumps of grey-brown wood, each about one seventh of the image width wide, standing a third of the image width apart. "
               "The left one carries a large bouquet of big bright young green shoots; the right one has grown a slim young tree with a thin trunk and a bright green crown, "
               "about two fifths of the image height tall.",
        },
    },
    "aire": {
        "crop": (330, 290, 610, 570), "centre": (445, 425), "mask": ("ellipse", (448, 425, 100, 70)),
        "stages": {
            1: "on the open grass bank on the far side of the river from the cottage, a large round patch of flat packed earth, wider than it is tall, about two fifths of the image width wide, "
               "darker and browner than the sand of the village square, with a soft grassy edge.",
            2: "on the open grass bank on the far side of the river from the cottage, a clean large round circle of flat packed dark brown earth, wider than it is tall, about two fifths of the image width wide, "
               "darker than the sand of the village square, ringed with small grey stones set flush with the ground, sharp round edge.",
        },
    },
}
# variation that reads best, set after looking at the images
PICKS = {"sentier": 1, "poutre": 2, "arbre": 1, "souche": 1, "aire": 2}
VILLAGES = {"sans_trace": {}, "coureur": {"sentier": 3, "arbre": 3}, "tractions": {"poutre": 3, "arbre": 3}, "tranquille": {"arbre": 3, "souche": 2}}


def view():
    f = S / "tmp/view.png"
    if not f.exists():
        Image.open(S / "fixe/t6-jour.png").convert("RGB").crop(VIEW_BOX).save(f)
    return Image.open(f).convert("RGB")


def crop_file(t):
    f = S / f"tmp/crop_{t}.png"
    if not f.exists():
        view().crop(TRACES[t]["crop"]).resize(SIZE, Image.LANCZOS).save(f)
    return f


def paint(only, attempt):
    jobs = []
    for ti, (t, spec) in enumerate(TRACES.items()):
        if only and t not in only:
            continue
        for st, text in spec["stages"].items():
            for v in (1, 2):
                tag = "" if attempt == 1 else f"_t{attempt}"
                jobs.append((S / f"concepts/{t}_s{st}_v{v}{tag}.png", PRE + text + TAIL, 83000 + 1000 * attempt + 100 * ti + 10 * st + v))
    cost = klein_price(*SIZE) * len(jobs)
    if cost > CAP:
        sys.exit(f"{len(jobs)} images would cost {cost:.3f} $, over the {CAP} $ cap")
    for t in TRACES:
        crop_file(t)
    concepts.SIZE = SIZE
    concepts.free([j[0] for j in jobs])
    refs = {j[0]: crop_file(j[0].name.split("_s")[0]) for j in jobs}
    concepts.run(jobs, klein_price(*SIZE), f"traces klein t{attempt}", KLEIN, PROBE, False, lambda o: (refs[o],))


def mask_of(t, size):
    spec = TRACES[t]
    kind, geo, *w = spec["mask"]
    m_img = Image.new("L", size, 0)
    d = ImageDraw.Draw(m_img)
    if kind == "line":
        d.line(geo, fill=255, width=w[0])
        for p in geo:
            d.ellipse((p[0] - w[0] / 2, p[1] - w[0] / 2, p[0] + w[0] / 2, p[1] + w[0] / 2), fill=255)
    else:
        cx, cy, rx, ry = geo
        d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=255)
    x0, y0, x1, y1 = spec["crop"]
    inside = Image.new("L", size, 0)
    ImageDraw.Draw(inside).rectangle((x0 + 14, y0 + 14, x1 - 14, y1 - 14), fill=255)  # never past the crop: outside it the paste is black
    m_img = Image.composite(m_img, inside.point(lambda _v: 0), inside)
    return m_img.filter(ImageFilter.GaussianBlur(FEATHER / 2))


def stamp(base, t, st, v, raw=None):
    x0, y0, x1, y1 = TRACES[t]["crop"]
    raw = raw or Image.open(S / f"concepts/{t}_s{st}_v{v}.png").convert("RGB")
    patch = raw.resize((x1 - x0, y1 - y0), Image.LANCZOS)
    full = Image.new("RGB", base.size)
    full.paste(patch, (x0, y0))
    return Image.composite(full, base, mask_of(t, base.size))


def extract(img, t):
    cx, cy = TRACES[t]["centre"]
    x = min(max(cx - 270, 0), img.width - 540)
    y = min(max(cy - 270, 0), img.height - 540)
    return img.crop((x, y, x + 540, y + 540))


def compose():
    base = view()
    (S / "posees").mkdir(exist_ok=True)
    (S / "page/img").mkdir(parents=True, exist_ok=True)
    for t, spec in TRACES.items():
        extract(base, t).save(S / f"page/img/{t}_avant.jpg", quality=88)
        for st in spec["stages"]:
            for v in (1, 2):
                if not (S / f"concepts/{t}_s{st}_v{v}.png").exists():
                    continue
                out = stamp(base, t, st, v)
                out.save(S / f"posees/{t}_s{st}_v{v}.png")
                extract(out, t).save(S / f"page/img/{t}_s{st}_v{v}.jpg", quality=88)
    planche()


def planche():
    cell, lab, hd = 252, 70, 24
    rows = [(t, v) for t in TRACES for v in (1, 2)]
    img = Image.new("RGB", (lab + 4 * cell, hd + len(rows) * (cell + 2)), (30, 30, 30))
    d, ft = ImageDraw.Draw(img), ImageFont.load_default(16)
    for c, name in enumerate(["avant", "stade 1", "stade 2", "stade 3"]):
        d.text((lab + c * cell + 6, 4), name, fill="white", font=ft)
    for r, (t, v) in enumerate(rows):
        y = hd + r * (cell + 2)
        d.text((4, y + 6), f"{t}\nv{v}", fill="white", font=ft)
        files = [S / f"page/img/{t}_avant.jpg"] + [S / f"page/img/{t}_s{st}_v{v}.jpg" for st in (1, 2, 3)]
        for c, f in enumerate(files):
            if f.exists():
                img.paste(Image.open(f).resize((cell, cell), Image.LANCZOS), (lab + c * cell, y))
    img.save(D / "img/planche.jpg", quality=85)


def villages():
    names = list(VILLAGES)
    pw, ph, hd = 540, 498, 26
    sheet = Image.new("RGB", (1080, 2 * (ph + hd)), (30, 30, 30))
    d, ft = ImageDraw.Draw(sheet), ImageFont.load_default(18)
    for i, name in enumerate(names):
        img = view()
        for t, st in VILLAGES[name].items():
            img = stamp(img, t, st, PICKS[t])
        img.save(S / f"page/img/village_{name}.jpg", quality=88)
        x, y = (i % 2) * pw, (i // 2) * (ph + hd)
        d.text((x + 8, y + 4), name, fill="white", font=ft)
        sheet.paste(img.crop((0, 330, 780, 1050)).resize((pw, ph), Image.LANCZOS), (x, y + hd))
    sheet.save(D / "img/trois-villages.jpg", quality=85)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["paint", "compose", "villages"])
    ap.add_argument("--only", default="")
    ap.add_argument("--try", dest="attempt", type=int, default=1)
    a = ap.parse_args()
    {"paint": lambda: paint(a.only.split(",") if a.only else [], a.attempt), "compose": compose, "villages": villages}[a.cmd]()
