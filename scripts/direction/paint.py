#!/usr/bin/env python3
"""Concept paintovers of the village renders (target images, never assets).
    paint.py [--model klein|flux3] [--try N] [--only A_t1_v1,...] | paint.py board
Never overwrites: a repeat needs a new --try. Reserve/settle through iso_loop (via bld/concepts.run)."""
import argparse
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "bld"))
sys.path.insert(0, str(ROOT / "scripts" / "iso"))
import concepts
from PIL import Image, ImageDraw, ImageFont

D = ROOT / "docs/designs/village/direction"
SRC, OUT = D / "scratch/atelier", D / "scratch/paint"
SIZE = (832, 1312)
STATES = {"t1": "t1-jour", "t6": "t6-jour", "t12": "t12-jour", "t12n": "t12-nuit"}
KEYS = {"t1": "t1", "t6": "t6", "t12": "t12 jour", "t12n": "t12 nuit"}
PRE = "Image 1 is a render of the village: repaint it. "
SUF = (" Isometric 2:1, same camera as image 1. No people, no text, no writing, no banners with symbols. The player's buildings stay "
       "the tallest and brightest things; the added quarter houses are lower and more muted. Matte surfaces, ink outlines #0F1518.")


PRE3 = "Image 1 is a rough layout of the village. Transform it boldly into the finished scene described here; keep only the camera and the player's buildings. "
PRE3N = "Image 1 is the village by day. Repaint the same scene at night, same layout. "
EXTRA = {"A": "One wide cobbled S-curved street is clearly visible, running from the bottom to the top of the image, built on both sides.",
         "B": "The river is wide and visibly wraps behind and to the right of the town in one continuous bend; the old straight stream is gone.", "C": ""}
FILL = "Painted houses and gardens fill at least half of the empty ground between and around the buildings, from the lower wall to the top of the village."
T1 = {"A": "A stake-lined dirt track is clearly visible from the bottom of the image to the camp.",
      "B": "The river visibly curves around the meadow in one wide bend.",
      "C": "The clearing has an irregular outline with gaps and a trail opening, never a closed ring of trees."}
NIGHT = ("Windows glow warm amber one by one across the whole town, not patches of fire. Moonlit ground keeps visible moss, ochre and stone "
         "colours, the trees keep their distinct tints, and the sky-lit shadows are slate blue, not a uniform blue filter. "
         "No flames except the central campfire.")


def prompts3(P):
    """FLUX 3 wording: the Klein prompts with the strong prefix and per-direction lines."""
    out = {}
    for (dr, k), t in P.items():
        brief = t[len(PRE):-len(SUF)]
        extra = {"t1": T1[dr], "t12 nuit": EXTRA[dr] + " " + NIGHT}.get(k, EXTRA[dr] + " " + FILL)
        out[dr, k] = (PRE3N if k == "t12 nuit" else PRE3) + brief + " " + extra.strip() + SUF
    return out


def prompts():
    out, cur = {}, None
    for line in (D / "directions.md").read_text().splitlines():
        if m := re.match(r"## ([ABC])\.", line):
            cur = m[1]
        elif cur and (m := re.match(r"- \*\*FLUX (t1|t6|t12 jour|t12 nuit)\*\* : (.*)", line)):
            out[cur, m[1]] = PRE + m[2].strip() + SUF
    assert len(out) == 12, len(out)
    return out


def ref(st):
    f = OUT / f"ref_{st}.png"
    if not f.exists():
        im = Image.open(next(SRC.glob(f"render-{STATES[st]}-*.png"))).convert("RGB").crop((0, 300, 1080, 2000))
        im.resize(SIZE, Image.LANCZOS).save(f)
    return f


def board(model="klein"):
    w, h, lab = 270, 426, 40
    W = lab + w + 8 + 3 * (2 * w + 12)
    b = Image.new("RGB", (W, 4 * (h + 22) + 20), (30, 30, 30))
    d, ft = ImageDraw.Draw(b), ImageFont.load_default(16)
    d.text((lab, 2), "input", fill="white", font=ft)
    for r, st in enumerate(STATES):
        y = r * (h + 22) + 20
        d.text((4, y + 4), st, fill="white", font=ft)
        b.paste(Image.open(ref(st)).resize((w, h)), (lab, y))
        for c, dr in enumerate("ABC"):
            for v in (1, 2):
                x = lab + w + 8 + c * (2 * w + 12) + (v - 1) * (w + 4)
                f = OUT / f"{model}_{dr}_{st}_v{v}.png"
                if f.exists():
                    b.paste(Image.open(f).convert("RGB").resize((w, h)), (x, y))
                    d.text((x + 4, y + 4), f"{dr} {st} v{v}", fill="white", font=ft)
    b.save(OUT / f"{model}_board.jpg", quality=85)
    print(b.size)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", nargs="?", default="run")
    ap.add_argument("--model", default="klein", choices=["klein", "flux3"])
    ap.add_argument("--try", dest="attempt", type=int, default=1)
    ap.add_argument("--only", default="")
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    if a.cmd == "board":
        sys.exit(board(a.model))
    from iso_loop import FLUX3, KLEIN, klein_price
    concepts.SIZE = SIZE
    P, jobs = prompts(), []
    P = P if a.model == "klein" else prompts3(P)
    for di, dr in enumerate("ABC"):
        for si, st in enumerate(STATES):
            for v in (1, 2):
                if a.only and f"{dr}_{st}_v{v}" not in a.only.split(","):
                    continue
                tag = "" if a.attempt == 1 else f"_t{a.attempt}"
                jobs.append((OUT / f"{a.model}_{dr}_{st}_v{v}{tag}.png", P[dr, KEYS[st]], 61000 + 1000 * di + 100 * si + 10 * a.attempt + v, st))
    concepts.free([j[0] for j in jobs])
    kl = a.model == "klein"

    def rf(o):  # flux3 night: the same direction and variation by day
        st = next(j[3] for j in jobs if j[0] == o)
        return OUT / o.name.replace("t12n", "t12") if st == "t12n" and not kl else ref(st)
    concepts.run([j[:3] for j in jobs], klein_price(*SIZE) if kl else 0.10, f"direction {a.model} t{a.attempt}", KLEIN if kl else FLUX3,
                 "direction_klein_real" if kl else None, not kl, lambda o: (rf(o),))
