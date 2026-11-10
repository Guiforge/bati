#!/usr/bin/env python3
"""Pilot v3: animate an exercise from key poses (mannequin -> drawn poses -> flip-book -> video).

    python3 scripts/anim-pilot-v3.py refs [slug...]          # mannequin key poses, onion skin, stick GIF (free)

v1 (branch anim-pilot, in ~/bati-archives/2026-11-04-branches.bundle) gave FLUX 3 Video only the
two end pictures and the model invented the path between them. Here the path is fixed first, as
key poses on the house mannequin (art-loop.py's drawing, new slugs only, injected at run time so
art-loop.py's POSES is never edited), then drawn as edits of the shipped picture A.

Nothing here writes to assets/ or scripts/provenance.json. Everything lands in ANIM_PILOT_DIR.
Never run art-loop.py accept from here: it would overwrite the shipped picture.
"""

import importlib.util
import math
import os
import pathlib
import subprocess
import sys

PILOT = pathlib.Path(os.environ.get("ANIM_PILOT_DIR", pathlib.Path.home() / ".cache" / "bati-anim-pilot-v3"))
# art-loop.py reads it at import time: its pose-refs (a private repo) are never written from here.
os.environ["ART_LOOP_DIR"] = str(PILOT / "art-loop")
ROOT = pathlib.Path(__file__).resolve().parent.parent

_spec = importlib.util.spec_from_file_location("artloop", ROOT / "scripts" / "art-loop.py")
artloop = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(artloop)


# --- geometry -------------------------------------------------------------------------------------
# Every pose sits on A's own geometry: A scaled to 1024, the same canvas art-loop.py draws on.

def ik(root, end, upper, lower, bend):
    """The middle joint of a two-bone limb. bend = +1 or -1 picks the side the joint points to.

    A target out of reach is pulled in to a straight limb rather than stretching a bone, which is
    the one failure a drawn mannequin must never show.
    """
    dx, dy = end[0] - root[0], end[1] - root[1]
    d = min(math.hypot(dx, dy), upper + lower - 1e-6)
    a = math.atan2(dy, dx)
    cos_t = max(-1.0, min(1.0, (upper * upper + d * d - lower * lower) / (2 * upper * d)))
    t = a + bend * math.acos(cos_t)
    return (round(root[0] + upper * math.cos(t)), round(root[1] + upper * math.sin(t)))


def rot(p, centre, degrees):
    r = math.radians(degrees)
    x, y = p[0] - centre[0], p[1] - centre[1]
    return (round(centre[0] + x * math.cos(r) - y * math.sin(r)), round(centre[1] + x * math.sin(r) + y * math.cos(r)))


def add(p, d):
    return (p[0] + d[0], p[1] + d[1])


def lerp(a, b, t):
    return (round(a[0] + (b[0] - a[0]) * t), round(a[1] + (b[1] - a[1]) * t))


# --- poses ----------------------------------------------------------------------------------------

def dip_pose(lift):
    """Side view facing right. lift 0 = A (bottom), 1 = top. Hands fixed on the bar."""
    hands = [(535, 495), (522, 495)]  # near, far
    # Forward lean from the hands up: about 15 degrees at the top, A's own 11 at the bottom. It also
    # keeps the near arm clear of the torso, so the stick figure shows the arm working.
    shoulder = lerp((535, 355), (537, 266), lift)
    hip = lerp((500, 555), (483, 463), lift)
    # Slight forward lean everywhere, a little more at the bottom: the shoulders lead the hips.
    d = (hip[0] - 500, hip[1] - 555)
    head = add(shoulder, lerp((80, -62), (58, -78), lift))
    arms = [[shoulder, ik(shoulder, h, 100, 128, +1), h] for h in hands]  # +1: elbow goes back
    legs = [[add(hip, (5, 0)), add((595, 615), d), add((572, 770), d), add((470, 815), d)],
            [add(hip, (-8, 0)), add((580, 622), d), add((556, 762), d), add((448, 826), d)]]
    return {
        "head": head, "torso": [shoulder, hip],
        "far": [arms[1], legs[1]], "near": [arms[0], legs[0]],
        "props": [((250, 489), (822, 503)), ((230, 512), (800, 526)), ((270, 520), (290, 1024)),
                  ((298, 520), (316, 1024)), ((778, 520), (796, 1024)), ((800, 500), (816, 1024))],
    }


def chin_pose(lift):
    """Front view. lift 0 = dead hang, 1 = A (top). Hands fixed on the bar, palms facing the hero."""
    hands = [(378, 225), (605, 202)]  # hero's right (image left), hero's left
    drop = round((1 - lift) * 282)
    shoulders = [(432, 252 + drop), (578, 246 + drop)]
    neck = (505, 230 + drop)
    hip = (510, 470 + drop)
    head = (482, 125 + drop)
    # Placed by hand, not by IK: a front view foreshortens the upper arm (the elbow comes towards
    # the camera), so fixed 2D bone lengths flare the elbows sideways. Top = A's own elbows.
    straight = [lerp(sh, h, 0.5) for sh, h in zip(shoulders, hands)]
    middle = [(352, 335 + drop), (636, 318 + drop)]
    top = [(392, 378), (614, 362)]
    elbows = ([lerp(a, b, lift * 2) for a, b in zip(straight, middle)] if lift <= 0.5
              else [lerp(a, b, lift * 2 - 1) for a, b in zip(middle, top)])
    arms = [[sh, e, h] for sh, e, h in zip(shoulders, elbows, hands)]
    legs = [[(478, 500 + drop), (488, 682 + drop), (500, 900 + drop)],
            [(545, 500 + drop), (580, 680 + drop), (532, 890 + drop)]]
    return {
        "head": head, "torso": [neck, hip],
        "far": [arms[0], legs[0]], "near": [arms[1], legs[1]],
        "props": [[(225, 236), (790, 172), (792, 184), (227, 248)]],
    }


PUSH_TOP = {"head": (842, 515), "shoulder": (700, 552), "hip": (432, 572), "knee": (272, 610),
            "ankle": (132, 652), "toe": (112, 704)}


def push_pose(depth):
    """Side view facing right. depth 0 = A (top), 1 = bottom. The body pivots on the toes, rigid."""
    toe = PUSH_TOP["toe"]
    p = {k: rot(v, toe, 12.6 * depth) for k, v in PUSH_TOP.items()}
    # The neck stays long: the head keeps its height above the body line instead of tipping with it.
    p["head"] = add(p["head"], (0, round(-22 * depth)))
    hands = [(702, 738), (748, 724)]  # near, far: the far hand beside the near one, not splayed ahead
    # Elbows back along the ribs (towards the feet), never flared up past the shoulder.
    arms = [[add(p["shoulder"], (6, 4)), ik(add(p["shoulder"], (6, 4)), hands[0], 90, 95, +1), hands[0]],
            [add(p["shoulder"], (36, -8)), ik(add(p["shoulder"], (36, -8)), hands[1], 90, 95, +1), hands[1]]]
    leg = [p["hip"], p["knee"], p["ankle"], p["toe"]]
    return {
        "head": p["head"], "torso": [p["shoulder"], p["hip"]],
        "far": [arms[1], [add(q, (8, -10)) for q in leg]], "near": [arms[0], leg],
        "props": [[(0, 742), (1024, 742), (1024, 800), (0, 800)]],
    }


def cat_pose(shape):
    """Side three-quarter view facing right, on all fours. shape -1 = cow, 0 = neutral, 1 = cat (A).

    Hands and knees never move; the spine is the whole movement, so the torso is a three-point
    curve (sacrum, mid-back, shoulders) and the head follows it: up in cow, tucked in cat.
    """
    hands = [(705, 768), (830, 712)]  # near, far
    knees = [(468, 702), (420, 660)]
    feet = [(118, 678), (245, 622)]
    pick = (lambda cow, mid, cat: lerp(mid, cat, shape) if shape >= 0 else lerp(mid, cow, -shape))
    hip = pick((418, 392), (420, 398), (432, 410))         # cat tucks the pelvis under
    back = pick((560, 420), (556, 366), (565, 255))        # sags in cow, domes in cat
    shoulder = pick((690, 340), (692, 335), (692, 325))
    head = pick((842, 262), (842, 338), (848, 405))        # looks up / ahead / down
    arms = [[add(shoulder, (6, 6)), lerp(add(shoulder, (6, 6)), hands[0], 0.5), hands[0]],
            [add(shoulder, (60, -10)), lerp(add(shoulder, (60, -10)), hands[1], 0.5), hands[1]]]
    legs = [[hip, knees[0], feet[0]], [add(hip, (-30, -14)), knees[1], feet[1]]]
    return {
        "head": head, "torso": [shoulder, back, hip],
        "far": [arms[1], legs[1]], "near": [arms[0], legs[0]],
        "props": [[(0, 690), (1024, 690), (1024, 1024), (0, 1024)]],
    }


# Each exercise: the key poses of one rep in order (the last returns to the first, so a loop
# closes), the time of each in seconds, and which key pose the shipped picture A already shows.
EXERCISES = {
    "dip": {"rep_s": 4, "a_key": "k3", "keys": {
        "k1": dip_pose(1), "k2": dip_pose(0.5), "k3": dip_pose(0), "k4": dip_pose(0.5)},
        "times": [0.0, 1.0, 2.0, 3.0, 4.0], "same": {"k4": "k2"}},
    "chin_up": {"rep_s": 4, "a_key": "k3", "keys": {
        "k1": chin_pose(0), "k2": chin_pose(0.5), "k3": chin_pose(1), "k4": chin_pose(0.5)},
        "times": [0.0, 1.0, 2.0, 3.0, 4.0], "same": {"k4": "k2"}},
    "pushups": {"rep_s": 3, "a_key": "k1", "keys": {
        "k1": push_pose(0), "k2": push_pose(0.5), "k3": push_pose(1), "k4": push_pose(0.5)},
        "times": [0.0, 0.75, 1.5, 2.25, 3.0], "same": {"k4": "k2"}},
    # Time-based in the catalogue (secondsPerRep is ignored): one breath per cycle, 6 s.
    "cat_cow": {"rep_s": 6, "a_key": "k4", "keys": {
        "k1": cat_pose(0), "k2": cat_pose(-1), "k3": cat_pose(0), "k4": cat_pose(1)},
        "times": [0.0, 1.5, 3.0, 4.5, 6.0], "same": {"k3": "k1"}},
}


def unique_keys(slug):
    """The key poses that need a drawing of their own: the rest reuse one (same position, other direction)."""
    return [k for k in EXERCISES[slug]["keys"] if k not in EXERCISES[slug]["same"]]


def draw(slug, key):
    """art-loop.py's mannequin (same colours, same joints), with two changes for a side view: a
    thinner torso and a dark outline on the near limbs. In art-loop's drawing a straight arm in
    front of the body sank into the 80 px torso band, and both auditors read the dip's top as an
    arm folded against the body (round 3)."""
    from PIL import Image, ImageDraw
    pose = EXERCISES[slug]["keys"][key]
    image = Image.new("RGB", (1024, 1024), artloop.BG)
    d = ImageDraw.Draw(image)
    for shape in pose["props"]:
        if len(shape) == 2:
            d.rectangle(shape, fill=artloop.PROP)
        else:
            d.polygon(shape, fill="#1F2533")

    def limb(points, colour, width=30, outline=0):
        for w, c in ((width + 2 * outline, artloop.BG), (width, colour)) if outline else ((width, colour),):
            d.line(points, fill=c, width=w, joint="curve")
            for x, y in points:
                d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=c)

    for points in pose["far"]:
        limb(points, artloop.FAR)
    limb(pose["torso"], artloop.TORSO, width=62)
    x, y = pose["head"]
    d.ellipse((x - 46, y - 46, x + 46, y + 46), fill=artloop.TORSO)
    for points in pose["near"]:
        limb(points, artloop.NEAR, outline=7)
    out = PILOT / "refs" / slug / f"{key}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    image.save(out)
    subprocess.run(["magick", str(out), *artloop.REPRODUCIBLE, str(out)], check=True)
    return out


def magick(*args):
    subprocess.run(["magick", *map(str, args)], check=True)


def refs(slug):
    ex = EXERCISES[slug]
    keys = list(ex["keys"])
    paths = {k: draw(slug, k) for k in keys}
    d = PILOT / "refs" / slug
    a = PILOT / "A" / f"{slug}.png"
    if not a.exists():
        a.parent.mkdir(parents=True, exist_ok=True)
        magick(ROOT / f"assets/images/exercises/{slug}.webp", a)
    # The A-pose mannequin over A: the check that the mannequin sits on the picture's geometry.
    magick(a, "-resize", "1024x1024", paths[ex["a_key"]], "-compose", "blend", "-define", "compose:args=55",
           "-composite", d / "over_A.png")
    # Onion skin: every distinct pose at the same opacity, darkened so the overlap reads.
    uniq = [paths[k] for k in unique_keys(slug)]
    magick(*uniq, "-evaluate-sequence", "mean", "-level", "0%,60%", d / "onion.png")
    # Strip of the key poses in order, numbered.
    tiles = []
    for i, k in enumerate(keys, 1):
        t = d / f"_tile_{k}.png"
        magick(paths[k], "-resize", "320x320", "-fill", "white", "-pointsize", "36", "-gravity", "northwest",
               "-annotate", "+12+8", str(i), t)
        tiles.append(t)
    magick(*tiles, "+append", d / "strip.png")
    for t in tiles:
        t.unlink()
    # Stick flip-book at the real tempo: each pose shown for its share of the rep (ImageMagick
    # delays are in 1/100 s), looping back to k1.
    times = ex["times"]
    args = []
    for i, k in enumerate(keys):
        args += ["-delay", str(round((times[i + 1] - times[i]) * 100)), paths[k]]
    magick(*args, "-resize", "384x384", "-loop", "0", d / "stick.gif")
    return d


SITE = PILOT / "site"


def kb(path):
    return round(pathlib.Path(path).stat().st_size / 1024)


def anim(frames, delays_cs, out, size=384, quality=80):
    """Animated WebP, one delay per frame in 1/100 s, plus a 0.5x twin (delays doubled): an image
    cannot change its own speed, so the page swaps the file."""
    for target, factor in ((out, 1), (out.with_name(out.stem + "_slow.webp"), 2)):
        args = []
        for f, dl in zip(frames, delays_cs):
            args += ["-delay", str(dl * factor), f]
        magick(*args, "-resize", f"{size}x{size}", "-loop", "0", "-quality", str(quality), target)
    return out


def rel(path):
    return str(pathlib.Path(path).relative_to(SITE))


def stick_media(slug):
    """The mannequin flip-book (step 2) at the real tempo, for the page."""
    ex, d = EXERCISES[slug], SITE / slug
    d.mkdir(parents=True, exist_ok=True)
    keys = list(ex["keys"])
    frames = [PILOT / "refs" / slug / f"{k}.png" for k in keys]
    delays = [round((ex["times"][i + 1] - ex["times"][i]) * 100) for i in range(len(keys))]
    out = anim(frames, delays, d / "stick.webp")
    still = d / "still.webp"
    magick(PILOT / "A" / f"{slug}.png", "-resize", "512x512", "-quality", "82", still)
    for name in ("strip", "onion"):
        magick(PILOT / "refs" / slug / f"{name}.png", "-quality", "80", d / f"mannequin_{name}.webp")
    return {"stick": {"src": rel(out), "slow": rel(out.with_name("stick_slow.webp")), "kb": kb(out), "alt": "mannequin flip-book"},
            "still": {"src": rel(still), "kb": kb(still), "alt": "current still image"}}


def page():
    import json
    state = json.loads((PILOT / "state.json").read_text())
    template = (ROOT / "scripts" / "anim-pilot-v3-page.html").read_text()
    data = json.dumps(state, ensure_ascii=False).replace("</", "<\\/")
    (SITE / "index.html").write_text(template.replace("__DATA__", data))
    files = sorted(str(f.relative_to(SITE)) for f in SITE.rglob("*") if f.is_file() and f.name != "index.html")
    print(json.dumps({"page": str(SITE / "index.html"), "files": files,
                      "kb": sum(kb(SITE / f) for f in files)}))


def main():
    command, *rest = sys.argv[1:] or ["help"]
    if command == "refs":
        for slug in rest or EXERCISES:
            print(refs(slug))
    elif command == "stick-media":
        import json
        print(json.dumps({slug: stick_media(slug) for slug in rest or EXERCISES}, indent=1))
    elif command == "page":
        page()
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
