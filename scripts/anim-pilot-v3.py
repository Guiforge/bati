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


def thread_pose(phase):
    """Seen from the threading side's front, slightly above; head to the left. phase: "table",
    "open" (threading arm to the ceiling) or "thread" (= A). Orange = the threading arm (near the
    camera), blue = the planted arm. The planted hand, the knees and the feet never move."""
    planted_hand, thread_floor = (200, 650), (440, 745)
    knees, feet = [(560, 595), (650, 482)], [(915, 560), (800, 478)]
    hips = {"table": (525, 330), "open": (525, 325), "thread": (515, 292)}[phase]
    p_sh = {"table": (230, 345), "open": (240, 350), "thread": (322, 405)}[phase]   # planted shoulder
    t_sh = {"table": (305, 372), "open": (300, 330), "thread": (300, 515)}[phase]   # threading shoulder
    head = {"table": (130, 330), "open": (170, 270), "thread": (175, 525)}[phase]
    if phase == "thread":
        planted = [p_sh, (340, 598), planted_hand]                    # bent, forearm on the floor
        threading = [t_sh, lerp(t_sh, thread_floor, 0.5), thread_floor]  # straight along the floor, palm up
    else:
        planted = [p_sh, lerp(p_sh, planted_hand, 0.5), planted_hand]
        t_hand = (330, 680) if phase == "table" else (352, 70)
        threading = [t_sh, lerp(t_sh, t_hand, 0.5), t_hand]
    mid = lerp(p_sh, t_sh, 0.5)
    legs = [[hips, knees[0], feet[0]], [add(hips, (40, -20)), knees[1], feet[1]]]
    # The threading arm is the FAR one (blue): in A it passes under the chest and comes out palm up on the
    # camera side, while the near arm is the one planted by the head. v1 had them swapped, and the open
    # pose raised the near arm, which never threads (caught by Guillaume on the flip-book).
    return {"head": head, "torso": [mid, hips], "far": [threading, legs[1]], "near": [planted, legs[0]],
            "props": [[(0, 600), (1024, 600), (1024, 1024), (0, 1024)]]}


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
    # Time-based and one-sided: one side's cycle, 8 s (decision in its motion sheet).
    "thread_the_needle": {"rep_s": 8, "a_key": "k3", "keys": {
        "k1": thread_pose("table"), "k2": thread_pose("open"), "k3": thread_pose("thread"), "k4": thread_pose("thread")},
        # k4 holds the thread (coach, round 1: the hold has to be a key of its own or the return starts at 4 s).
        "times": [0.0, 2.0, 4.0, 5.5, 8.0], "same": {"k4": "k3"}},
}


# --- full run, lot 1 ------------------------------------------------------------------------------
# From the pilot: an exercise that travels up and down gets its two end poses only (0 of 12 halfway
# poses passed). A already shows one end, so each exercise needs one drawing: its pose guide is
# written here, on A's geometry (1024 canvas), and A's own key has no mannequin (None).

def _guide(head, torso, near, far, props=()):
    return {"head": head, "torso": torso, "near": near, "far": far, "props": list(props)}


FLOOR = lambda y: [[(0, y), (1024, y), (1024, 1024), (0, 1024)]]  # noqa: E731

LOT1 = {
    # Three-quarter front view, facing the camera's right. A = top; drawn: bottom.
    "diamond_pushup": ("k1", 3, _guide(
        (870, 610), [(735, 640), (356, 600)],
        near=[[(780, 640), (850, 610), (768, 732)], [(356, 600), (213, 640), (128, 668)]],
        far=[[(690, 620), (560, 600), (668, 732)], [(356, 600), (220, 655), (140, 690)]],
        props=FLOOR(740))),
    # Side view facing left, on the knees. A = bottom; drawn: top (arms straight).
    "knee_pushup": ("k2", 3, _guide(
        (175, 380), [(315, 425), (560, 520)],
        near=[[(315, 430), (305, 545), (293, 661)], [(560, 520), (677, 583), (919, 562)]],
        far=[[(300, 420), (275, 500), (250, 583)], [(560, 515), (670, 570), (900, 548)]],
        props=FLOOR(670))),
    # Side view facing right, hands on the wall. A = bottom; drawn: top (arms straight, body back).
    "wall_pushup": ("k2", 2, _guide(
        (515, 275), [(470, 350), (342, 599)],
        near=[[(470, 352), (600, 322), (725, 293)], [(342, 599), (271, 738), (185, 904)]],
        far=[[(465, 345), (590, 305), (712, 270)], [(335, 600), (262, 742), (175, 900)]],
        props=[((614, 0), (1024, 1024))])),
    # Front view. A = bottom, shifted over the bent arm; drawn: top, centred, both arms straight.
    "archer_pushup": ("k2", 3, _guide(
        (520, 300), [(520, 430), (515, 600)],
        near=[[(620, 430), (735, 590), (847, 748)], [(560, 600), (600, 640), (634, 662)]],
        far=[[(420, 430), (265, 590), (108, 748)], [(470, 600), (420, 640), (364, 662)]],
        props=FLOOR(760))),
    # Side view facing right, hips high. A = bottom (head near the floor); drawn: top (arms straight).
    "pike_pushup": ("k2", 3, _guide(
        (790, 590), [(700, 470), (526, 256)],
        near=[[(705, 475), (800, 625), (896, 775)], [(526, 256), (284, 469), (142, 711)]],
        far=[[(690, 465), (580, 630), (469, 797)], [(515, 262), (270, 480), (125, 720)]],
        props=FLOOR(800))),
    # Front view. A = top; drawn: dead hang (feet near the bottom edge).
    "pullups": ("k1", 4, _guide(
        (525, 395), [(527, 500), (520, 675)],
        near=[[(600, 520), (624, 381), (648, 242)], [(545, 690), (550, 860), (540, 1010)]],
        far=[[(455, 520), (424, 381), (392, 242)], [(495, 690), (490, 860), (500, 1010)]],
        props=[((240, 236), (820, 250))])),
    # Side view facing left, under a low bar. A = top (chest at the bar); drawn: bottom (arms straight).
    "inverted_row": ("k1", 3, _guide(
        (290, 380), [(380, 460), (593, 647)],
        near=[[(385, 462), (420, 330), (469, 199)], [(593, 647), (735, 772), (853, 876)]],
        far=[[(375, 455), (365, 325), (355, 193)], [(585, 650), (725, 780), (840, 880)]],
        props=[((0, 172), (1024, 186))] + FLOOR(890))),
    # Side view facing left, lying under a table, knees bent. A = bottom (arms straight); drawn: top.
    "table_row": ("k2", 3, _guide(
        (200, 410), [(262, 395), (535, 400)],
        near=[[(262, 398), (330, 470), (293, 321)], [(535, 400), (677, 392), (762, 662)]],
        far=[[(255, 392), (320, 455), (280, 318)], [(530, 405), (665, 400), (748, 660)]],
        props=[((80, 300), (1000, 330))] + FLOOR(700))),
}
for _slug, (_a_key, _rep, _pose) in LOT1.items():
    _other = "k2" if _a_key == "k1" else "k1"
    EXERCISES[_slug] = {"rep_s": _rep, "a_key": _a_key, "keys": {"k1": None, "k2": None} | {_other: _pose},
                        "times": [0.0, _rep / 2, float(_rep)], "same": {}}


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


# --- paid calls (step 3 and 5) -------------------------------------------------------------------
# Every call goes through spend(): it refuses to start once the ledger is within one call of the
# cap, logs the provider's own cost figure, and keeps the file exactly as the API sent it.

import base64  # noqa: E402
import datetime  # noqa: E402
import hashlib  # noqa: E402
import json  # noqa: E402
import threading  # noqa: E402
import urllib.error  # noqa: E402
import urllib.request  # noqa: E402

sys.path.insert(0, str(ROOT / "scripts"))
from lib.flux import _json, _poll  # noqa: E402

LEDGER = PILOT / "pilot-ledger.json"
ORIGINALS = PILOT / "originals"
# Pilot: 15 $. Full run, approved 2026-11-10: 60 $ on top of the pilot's 5.67 $ (ledger total cap).
CAP = float(os.environ.get("ANIM_CAP", "65.67"))
FLUX3_IMAGE = "https://api.bfl.ai/v1/flux-3-image"
FLUX3_VIDEO = "https://api.bfl.ai/v1/flux-3-video"
OPENAI_EDITS = "https://api.openai.com/v1/images/edits"
OPENAI_MODEL = "gpt-image-2.5-sunburst"
# Per 1M tokens, standard tier (developers.openai.com/api/docs/pricing, read 2026-11-10): the
# Images API returns token usage, not a price, so the cost is computed from it.
OPENAI_PRICE = {"image_in": 8.0, "text_in": 5.0, "image_out": 30.0}
_lock = threading.Lock()


def env_key(name):
    """The key from the environment, else from .env here or in the main checkout (a worktree has none)."""
    if os.environ.get(name):
        return os.environ[name]
    for env in (ROOT / ".env", ROOT.parents[2] / ".env", pathlib.Path.home() / ".config" / "bati" / "openai.env"):
        if env.is_file():
            for line in env.read_text().splitlines():
                k, _, v = line.strip().partition("=")
                if k.strip().removeprefix("export ").strip() == name and v.strip():
                    return v.strip().strip("\"'")
    sys.exit(f"STOP: {name} is missing (environment or .env)")


def sha(data):
    return hashlib.sha256(data if isinstance(data, bytes) else pathlib.Path(data).read_bytes()).hexdigest()


def ledger():
    return json.loads(LEDGER.read_text()) if LEDGER.is_file() else []


def spent():
    return round(sum(e.get("cost_usd") or 0 for e in ledger()), 4)


def log(entry):
    with _lock:
        rows = ledger()
        rows.append(entry)
        LEDGER.write_text(json.dumps(rows, indent=1, ensure_ascii=False) + "\n")


def guard(next_cost):
    if spent() + next_cost > CAP:
        sys.exit(f"STOP: budget, {spent():.2f} $ spent, next call ~{next_cost:.2f} $, cap {CAP} $")


def keep_original(raw, ext):
    """The file as the API sent it, never re-encoded: that is what carries the C2PA signature."""
    digest = sha(raw)
    ORIGINALS.mkdir(parents=True, exist_ok=True)
    (ORIGINALS / f"{digest[:16]}{ext}").write_bytes(raw)
    return digest


def ext_of(raw):
    return ".png" if raw[:4] == b"\x89PNG" else ".webp" if raw[8:12] == b"WEBP" else ".mp4" if raw[4:8] == b"ftyp" else ".jpg"


def png_bytes(path, px=0):
    args = ["magick", str(path), *(["-resize", f"{px}x{px}"] if px else []), "png:-"]
    return subprocess.run(args, check=True, capture_output=True).stdout


def now():
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def flux3_edit(prompt, refs, out, *, step, slug, key, route, expect=0.06):
    guard(expect)
    api_key = env_key("BFL_API_KEY")
    images = [base64.b64encode(png_bytes(r, 1024)).decode("ascii") for r in refs]
    payload = {"prompt": prompt, "images": images, "aspect_ratio": "1:1", "resolution": "1k",
               "grounding": False, "safety_tolerance": 4}
    entry = {"provider": "bfl", "model": "flux-3-image", "endpoint": FLUX3_IMAGE, "step": step, "slug": slug,
             "key": key, "route": route, "prompt": prompt,
             "params": {k: v for k, v in payload.items() if k not in ("images", "prompt")},
             "inputs": [{"name": str(pathlib.Path(r).relative_to(PILOT)), "sha256": sha(r), "sent_as": "1024px PNG"} for r in refs],
             "date": now()}
    try:
        submitted = _json(FLUX3_IMAGE, api_key, payload)
        url = _poll(submitted["polling_url"], api_key)
        with urllib.request.urlopen(url, timeout=120) as response:
            raw = response.read()
    except Exception as error:  # a refused request is logged (unbilled by BFL) and the batch goes on
        log({**entry, "error": str(error)[:500], "cost_usd": 0})
        print(f"  x {slug} {key} {route}: {error}", file=sys.stderr)
        return None
    kind = ext_of(raw)
    digest = keep_original(raw, kind)
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["magick", f"{kind[1:]}:-", str(out)], input=raw, check=True)
    cost = round(float(submitted.get("cost") or 0) / 100, 4)  # BFL bills in credits, 1 credit = 0.01 $
    log({**entry, "file": str(out.relative_to(PILOT)), "signed_original": {"file": f"{digest[:16]}{kind}", "sha256": digest},
         "api_cost_credits": submitted.get("cost"), "input_mp": submitted.get("input_mp"),
         "output_mp": submitted.get("output_mp"), "cost_usd": cost})
    print(f"  ok {out}  {cost:.3f} $")
    return out


def openai_edit(prompt, refs, out, *, step, slug, key, route, quality="high", expect=0.25):
    guard(expect)
    api_key = env_key("OPENAI_API_KEY")
    images = [{"image_url": "data:image/png;base64," + base64.b64encode(png_bytes(r, 1024)).decode("ascii")} for r in refs]
    payload = {"model": OPENAI_MODEL, "prompt": prompt, "images": images, "size": "1024x1024",
               "quality": quality, "output_format": "png", "n": 1}
    entry = {"provider": "openai", "model": OPENAI_MODEL, "endpoint": OPENAI_EDITS, "step": step, "slug": slug,
             "key": key, "route": route, "prompt": prompt,
             "params": {k: v for k, v in payload.items() if k not in ("images", "prompt")},
             "inputs": [{"name": str(pathlib.Path(r).relative_to(PILOT)), "sha256": sha(r), "sent_as": "1024px PNG"} for r in refs],
             "date": now()}
    request = urllib.request.Request(OPENAI_EDITS, data=json.dumps(payload).encode(), method="POST",
                                     headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=600) as response:
            body = json.loads(response.read())
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")[:500]
        log({**entry, "error": f"{error.code} {detail}", "cost_usd": 0})
        print(f"  x {slug} {key} {route}: {error.code} {detail}", file=sys.stderr)
        return None
    raw = base64.b64decode(body["data"][0]["b64_json"])
    u = body.get("usage", {})
    ind, outd = u.get("input_tokens_details", {}), u.get("output_tokens_details", {})
    image_out = outd.get("image_tokens", u.get("output_tokens", 0))
    cost = round((ind.get("image_tokens", 0) * OPENAI_PRICE["image_in"] + ind.get("text_tokens", 0) * OPENAI_PRICE["text_in"]
                  + image_out * OPENAI_PRICE["image_out"]) / 1e6, 4)
    kind = ext_of(raw)
    digest = keep_original(raw, kind)
    out.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["magick", f"{kind[1:]}:-", "-resize", "1280x1280", str(out)], input=raw, check=True)
    log({**entry, "file": str(out.relative_to(PILOT)), "signed_original": {"file": f"{digest[:16]}{kind}", "sha256": digest},
         "usage": u, "cost_usd": cost, "cost_basis": "usage tokens x list price per 1M"})
    print(f"  ok {out}  {cost:.3f} $")
    return out


# The edit prompt (the user's idea, kept close to its words), then what the pose is, then what must
# never move. The auditors never see these.
EDIT = ("Redraw image 1, changing only the pose so it matches the pose in image 2. Image 2 is only a "
        "pose guide (a jointed mannequin: grey torso and head, orange limbs nearest the camera, blue "
        "limbs on the far side); nothing of its colours, shapes or flat style appears in the result. "
        "Same hero, same face, same hair, same outfit, same background, same lighting, same effects, "
        "same framing, same scale and same camera angle as image 1, in the same comic-book art style "
        "and line work. One person only, two arms, two legs.")
POSE_TEXT = {
    ("dip", "k1"): "The hero is now at the TOP of a dip: both arms fully straight and vertical, shoulders directly above the hands, pressed down away from the ears, torso tilted slightly forward, chest proud. The body is higher than in image 1, held up by the arms.",
    ("dip", "k2"): "The hero is now HALFWAY up from the bottom of a dip: the whole body is clearly HIGHER than in image 1, by about half of a forearm length, elbows only partly bent (about 120 degrees) and pointing straight back behind the body, not out to the sides, shoulders down away from the ears, torso tilted slightly forward. The legs keep exactly the same bent shape as in image 1 and simply rise with the hips.",
    ("chin_up", "k1"): "The hero now hangs at the BOTTOM of a chin-up: both arms fully straight, elbows straight, body vertical and still below the bar, head well below the bar, legs straight and together. The shoulders are pulled DOWN, away from the ears: a long visible neck between the shoulders, not shrugged. The bar and the hands stay at exactly the same height and position in the picture as in image 1: do not move the camera or the bar up to fit the body. The whole body is lower than in image 1, so the shins and feet leave the bottom of the frame.",
    ("chin_up", "k2"): "The hero is now HALFWAY up a chin-up: elbows bent about 90 degrees, pointing down and slightly forward in front of the body, head about halfway between the hang and the bar, below the bar, legs straight and together.",
    ("pushups", "k3"): "The hero is now at the BOTTOM of a push-up: chest almost touching the floor, lower than the elbow joints; elbows bent and pointing back towards the feet, close to the ribs; one rigid straight line from head to heels, hips neither raised nor sagging; neck long, head in line with the spine.",
    ("pushups", "k2"): "The hero is now HALFWAY down a push-up: elbows bent about 100 degrees, pointing back towards the feet, close to the ribs; body lowered by about half, still one rigid straight line from head to heels; head in line with the spine.",
    ("cat_cow", "k2"): "The hero is now in the COW position: the lower and middle back curve gently DOWN into a soft U, the belly sinking towards the floor, the bottom lifting, the chest moving forward and up between the straight arms, the head lifted to look forward. Arms straight.",
    ("cat_cow", "k1"): "The hero is now in a NEUTRAL tabletop: the back is flat and straight like a table from the tailbone to the back of the head, no dip and no hump; head in line with the spine, eyes to the floor just ahead of the hands. Arms straight.",
    ("thread_the_needle", "k2"): "The hero is now in the OPEN position of thread the needle, on hands and knees: the arm FARTHER from the camera (the one that threads under the chest in the final pose) is lifted straight up to the ceiling, hand above its shoulder, so the chest turns open away from the camera and we see more of the upper back and that shoulder blade; the head turns to look up at the raised hand. The arm NEAREST the camera stays straight, its hand flat on the floor exactly where it is in image 1. The back is long, hips high over the knees, knees and feet exactly where they are in image 1.",
    ("thread_the_needle", "k1"): "The hero is now in a TABLETOP on hands and knees: both arms straight, both hands flat on the floor under the shoulders, the back flat like a table from the tailbone to the head, head in line with the spine, eyes to the floor; hips high over the knees.",
}
NEVER = {
    "thread_the_needle": "The knees, shins and feet stay exactly where they are in image 1 and the hips stay stacked over the knees. The planted hand (the one flat on the floor near the head in image 1) stays on its spot.",
    "dip": "The hands stay on exactly the same spots of the bars as in image 1, gripping them. The bars do not move. The legs keep the same bent shape, feet behind, off the floor.",
    "chin_up": "Both hands stay on exactly the same spots of the bar, with the palms facing the hero's own face (underhand grip: from the camera we see the backs of the hands and the knuckles over the bar). The bar does not move. No swing.",
    "pushups": "The hands stay flat on exactly the same spots of the floor as in image 1 and the toes stay on exactly the same spot. The body pivots on the toes.",
    "cat_cow": "Both hands stay flat on exactly the same spots of the floor, under the shoulders, and both knees and feet stay exactly where they are, knees under the hips. Only the spine and head change.",
}


def edit_prompt(slug, key):
    return f"{EDIT} {POSE_TEXT[(slug, key)]} {NEVER[slug]}"


BETWEEN = ("Image 3 shows the same hero at the other end of this movement. The new pose is exactly HALFWAY "
           "between the pose of image 1 and the pose of image 3, as the pose guide in image 2 shows: clearly "
           "different from both, the body at the middle height between them. Keep image 1's framing.")


def candidate(slug, key, route, n, base=None, between=None):
    """One candidate for one key pose: image 1 = A (or an accepted pose nearer to this one), image 2 =
    the mannequin pose, and for a middle pose optionally image 3 = the accepted pose at the other end:
    with A alone, both models stayed next to A's pose for every halfway pose (dip, chin-up)."""
    a, ref = (PILOT / base if base else PILOT / "A" / f"{slug}.png"), PILOT / "refs" / slug / f"{key}.png"
    out = PILOT / "poses" / slug / f"{key}_{route}{n}.png"
    if out.exists():
        print(f"  = {out} exists")
        return out
    prompt = edit_prompt(slug, key) + (" " + BETWEEN if between else "")
    fn = flux3_edit if route == "F" else openai_edit
    refs = (a, ref, PILOT / between) if between else (a, ref)
    made = fn(prompt, refs, out, step="pose", slug=slug, key=key, route=route)
    if made:
        onion = out.with_name(out.stem + "_onion.png")
        magick(a, made, "-resize", "1280x1280!", "-compose", "blend", "-define", "compose:args=50", "-composite", onion)
    return made


ACCEPTED = PILOT / "accepted.json"  # {slug: {key: candidate path relative to PILOT}}, written as poses pass


def rep_frames(slug):
    """The drawn pose for each key of one rep, A where A is that key, a shared pose where two keys are one position."""
    ex, acc = EXERCISES[slug], json.loads(ACCEPTED.read_text()).get(slug, {})
    out = {}
    for k in ex["keys"]:
        src = ex["same"].get(k, k)
        if src == ex["a_key"]:
            # "A" in accepted.json: A moved in its frame to line up with the drawn poses (flip-book only).
            out[k] = PILOT / acc["A"] if "A" in acc else PILOT / "A" / f"{slug}.png"
        elif src in acc:
            out[k] = PILOT / acc[src]
        # else: no drawing passed for this key (halfway dip and chin-up): it is left out and its time
        # goes to the pose before it, so the rep still runs at the catalogue tempo.
    return out


def rep_times(slug, frames):
    """The start time of each kept key, plus the rep's end."""
    ex = EXERCISES[slug]
    times = dict(zip(ex["keys"], ex["times"]))
    return [times[k] for k in frames] + [ex["times"][-1]]


def flipbook(slug, size=384, fade_cs=15):
    """Step 4: per-pose WebP 512, a fade flip-book and a hard-cut flip-book at the catalogue tempo
    (each with its 0.5x twin), and the comic strip."""
    ex, d = EXERCISES[slug], SITE / slug
    d.mkdir(parents=True, exist_ok=True)
    frames = rep_frames(slug)
    keys = list(frames)
    tmp = PILOT / "tmp" / slug
    tmp.mkdir(parents=True, exist_ok=True)
    small = {}
    if not (d / "still.webp").exists():
        magick(PILOT / "A" / f"{slug}.png", "-resize", "512x512", "-quality", "82", d / "still.webp")
    for k, f in frames.items():
        magick(f, "-resize", "512x512", "-quality", "82", d / f"pose_{k}.webp")
        small[k] = tmp / f"{k}.png"
        magick(f, "-resize", f"{size}x{size}", small[k])
    t = rep_times(slug, frames)
    seg = [round((t[i + 1] - t[i]) * 100) for i in range(len(keys))]
    # Hard cuts: each pose for its whole segment.
    anim([small[k] for k in keys], seg, d / "cuts.webp", size)
    # Fade: each pose held, then a 150 ms cross-fade (3 frames) into the next, looping to k1.
    fr, dl = [], []
    for i, k in enumerate(keys):
        nxt = keys[(i + 1) % len(keys)]
        fr.append(small[k]); dl.append(seg[i] - fade_cs)
        for j, pct in enumerate((25, 50, 75)):
            m = tmp / f"{k}_{nxt}_{pct}.png"
            magick(small[nxt], small[k], "-compose", "blend", "-define", f"compose:args={pct}", "-composite", m)
            fr.append(m); dl.append(fade_cs // 3)
    anim(fr, dl, d / "fade.webp", size)
    # Comic strip: the key poses side by side, small gold numbers, one wide still.
    tiles = []
    for i, k in enumerate(keys, 1):
        t = tmp / f"strip_{k}.png"
        magick(frames[k], "-resize", "320x320", "-fill", "#E2B54A", "-stroke", "#0B0F19", "-strokewidth", "2",
               "-font", "DejaVu-Sans-Bold", "-pointsize", "34", "-gravity", "northwest", "-annotate", "+10+4", str(i), t)
        tiles.append(t)
    magick(*tiles, "-background", "#0B0F19", "-splice", "4x0", "+append", "-chop", "4x0", "-quality", "82", d / "strip.webp")
    # Contact sheet (key poses in order) and the onion skin of every distinct drawn pose.
    magick(*[frames[k] for k in keys], "-resize", "400x400", "+append", "-quality", "80", d / "contact.webp")
    distinct = list(dict.fromkeys(frames.values()))
    magick(*distinct, "-resize", "640x640", "-evaluate-sequence", "mean", "-quality", "82", d / "onion.webp")
    return {name: kb(d / f"{name}.webp") for name in ("fade", "cuts", "strip", "contact", "onion")}


VIDEO_BASE = ("Locked-off static camera, no camera movement, no zoom, no cut. The background, lighting, character, "
              "outfit and art style stay exactly as in the keyframes. One person only, two arms, two legs. "
              "Smooth, controlled, even tempo. Full range of motion.")
VIDEO_MOTION = {
    "pushups": "One slow push-up. The body stays one rigid straight line from head to heels and pivots on the toes; "
               "the hands and toes never move. The elbows bend back along the ribs until the chest is a fist above the floor, "
               "then the arms press back to straight.",
    "cat_cow": "One slow cat-cow on hands and knees. The hands and knees never move and the arms stay straight. "
               "From a flat back the belly sinks and the head lifts (cow), the back returns flat, then the spine rounds up "
               "towards the ceiling with the head tucked down (cat), and returns flat.",
    "dip": "One slow dip between parallel bars. The hands never leave their spot on the bars and the bent legs keep their shape. "
           "From straight arms the body lowers, elbows travelling straight back, until the shoulders reach elbow height, "
           "then presses back up to straight arms.",
    "chin_up": "One slow chin-up with palms facing the hero. The hands never move on the bar and the straight legs never swing. "
               "From a dead hang on straight arms the body rises until the chin is above the bar, then lowers under control "
               "back to straight arms.",
}
VIDEO_MOTION["thread_the_needle"] = (
    "One slow thread the needle on one side, on hands and knees. The knees, feet and the planted hand never move and the "
    "hips stay over the knees. From a flat tabletop the free arm lifts straight up to the ceiling as the chest turns open "
    "towards it, then sweeps down and slides under the chest along the floor, palm up, until that shoulder and the side "
    "of the head rest on the floor; hold, then return to the tabletop.")
# --- full run, lot 1: what each drawn pose is, what never moves, and the video's motion -----------
POSE_TEXT.update({
    ("diamond_pushup", "k2"): "The hero is now at the BOTTOM of a diamond push-up: chest lowered to a fist above the hands, elbows bent and pointing back along the ribs, close to the body, never flared out; one rigid straight line from head to heels; head neutral.",
    ("knee_pushup", "k1"): "The hero is now at the TOP of a knee push-up: both arms fully straight, hands under the shoulders, one straight line from the head through the hips to the knees, hips neither raised nor sagging; head neutral, eyes to the floor ahead of the hands.",
    ("wall_pushup", "k1"): "The hero is now at the TOP of a wall push-up: both arms fully straight, the body leaning back from the wall in one straight line from head to heels, heels down; the chest is now an arm's length from the wall.",
    ("archer_pushup", "k1"): "The hero is now at the TOP of an archer push-up: both arms fully straight and wide apart, the chest centred between the two hands, body in one straight plank; the head is centred too.",
    ("pike_pushup", "k1"): "The hero is now at the TOP of a pike push-up: both arms fully straight, the body an upside-down V with the hips as the highest point, legs straight, head between the arms looking back towards the feet; the head is now well above the floor.",
    ("pullups", "k2"): "The hero now hangs at the BOTTOM of a pull-up: both arms fully straight, elbows straight, body vertical and still below the bar, head well below the bar, legs straight and together; shoulders pulled slightly down away from the ears. The bar and the hands stay at exactly the same height and position in the picture as in image 1: do not move the camera or the bar to fit the body. The whole body is lower than in image 1, so the feet reach the bottom edge of the frame.",
    ("inverted_row", "k2"): "The hero is now at the BOTTOM of an inverted row: both arms fully straight, hanging under the bar, the body one straight line from head to heels at a lower angle, hips not sagging, heels on the same spot of the floor. The bar and the hands stay at exactly the same place in the picture as in image 1.",
    ("table_row", "k1"): "The hero is now at the TOP of a table row: the chest pulled up close to the underside of the table, elbows bent and pointing down past the body, hips up so the shoulders, hips and knees make one straight line; feet flat on the floor where they are in image 1.",
})
NEVER.update({
    "diamond_pushup": "Both hands stay flat on exactly the same spot of the floor, close together in a diamond, and the toes stay on exactly the same spot. The body pivots on the toes.",
    "knee_pushup": "Both hands stay flat on exactly the same spots of the floor and both knees stay on exactly the same spot, feet raised behind. The body pivots on the knees.",
    "wall_pushup": "Both hands stay flat on exactly the same spots of the wall and both feet stay flat on exactly the same spot of the floor. The wall does not move.",
    "archer_pushup": "Both hands stay flat on exactly the same spots of the floor, very wide apart, and the feet stay on exactly the same spot.",
    "pike_pushup": "Both hands stay flat on exactly the same spots of the floor and both feet stay on exactly the same spot; the legs stay straight and the hips stay high.",
    "pullups": "Both hands stay on exactly the same spots of the bar, overhand grip, palms facing away from the hero. The bar does not move. No swing.",
    "inverted_row": "Both hands stay on exactly the same spots of the bar and both heels stay on exactly the same spot of the floor. The bar does not move.",
    "table_row": "Both hands stay on exactly the same spot of the table edge and both feet stay flat on exactly the same spot of the floor. The table does not move.",
})
VIDEO_MOTION.update({
    "diamond_pushup": "One slow diamond push-up. The hands stay together on the floor and the toes never move; the body stays one rigid line and pivots on the toes. The elbows bend back along the ribs until the chest is a fist above the hands, then the arms press back to straight.",
    "knee_pushup": "One slow knee push-up. The hands and knees never move; the body stays one straight line from head to knees and pivots on the knees. The elbows bend until the chest is close to the floor, then the arms press back to straight.",
    "wall_pushup": "One slow wall push-up. The hands stay on the wall and the feet stay on the floor; the body stays one straight line leaning into the wall. The elbows bend until the chest is close to the wall, then the arms press back to straight.",
    "archer_pushup": "One slow archer push-up to one side. The hands and feet never move. From straight wide arms the chest lowers towards one hand as that elbow bends while the other arm stays straight out to the side, then presses back up to the centre.",
    "pike_pushup": "One slow pike push-up. The hands and feet never move and the hips stay high in an upside-down V. The elbows bend until the top of the head nearly touches the floor in front of the hands, then the arms press back to straight.",
    "pullups": "One slow pull-up with an overhand grip. The hands never move on the bar and the straight legs never swing. From the chin over the bar the body lowers under control to a dead hang on straight arms, then pulls back up until the chin is above the bar.",
    "inverted_row": "One slow inverted row under a low bar. The hands never move on the bar and the heels never move on the floor; the body stays one straight plank. From the chest at the bar the body lowers to straight arms, then pulls back up to the bar.",
    "table_row": "One slow table row lying under a table. The hands never move on the table edge and the feet never move on the floor; the hips stay up in line with the shoulders and knees. From the chest close to the table the body lowers to straight arms, then pulls back up.",
})
CREDITS = "https://api.bfl.ai/v1/credits"


def keyframe_jpeg(path):
    """960 px JPEG, raw base64: the format the previous pilot confirmed for flux-3-video keyframes."""
    jpg = subprocess.run(["magick", str(path), "-resize", "960x960", "-quality", "93", "jpg:-"], check=True, capture_output=True).stdout
    return base64.b64encode(jpg).decode("ascii")


def draft(slug, n, expect=0.30):
    """One FLUX 3 Video draft: i2v, 5 s, 1:1, no audio, every key pose as a keyframe at the sheet's
    times scaled to 5 s, the first keyframe repeated at 5 s so the clip loops."""
    out = PILOT / "clips" / slug / f"d{n}.mp4"
    if out.exists():
        return out
    guard(expect)
    ex, frames = EXERCISES[slug], rep_frames(slug)
    keys = list(frames)
    scale = 5 / ex["rep_s"]
    # Kept keys only (a halfway pose that never passed is skipped), each at its sheet time scaled to 5 s.
    times = [round(t * scale, 2) for t in rep_times(slug, frames)]
    keyframes = [[t, keyframe_jpeg(frames[k])] for t, k in zip(times, [*keys, keys[0]])]
    prompt = f"{VIDEO_BASE} {VIDEO_MOTION[slug]}"
    payload = {"mode": "i2v", "prompt": prompt, "duration": 5, "aspect_ratio": "1:1", "generate_audio": False,
               "draft": True, "safety_tolerance": 4, "keyframes": keyframes}
    api_key = env_key("BFL_API_KEY")
    entry = {"provider": "bfl", "model": "flux-3-video", "endpoint": FLUX3_VIDEO, "step": "video-draft", "slug": slug,
             "draft": n, "prompt": prompt, "params": {k: v for k, v in payload.items() if k not in ("keyframes", "prompt")},
             "keyframes": [{"t": t, "key": k, "name": str(pathlib.Path(frames[k]).relative_to(PILOT)), "sha256": sha(frames[k]),
                            "sent_as": "960px JPEG q93"} for t, k in zip(times, [*keys, keys[0]])],
             "date": now()}
    before = _json(CREDITS, api_key)["credits"]
    try:
        submitted = _json(FLUX3_VIDEO, api_key, payload)
        url = _poll(submitted["polling_url"], api_key, timeout=1800.0)
        with urllib.request.urlopen(url, timeout=300) as response:
            raw = response.read()
    except Exception as error:
        log({**entry, "error": str(error)[:500], "cost_usd": 0})
        print(f"  x {slug} d{n}: {error}", file=sys.stderr)
        return None
    digest = keep_original(raw, ".mp4")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(raw)
    cost = submitted.get("cost")
    log({**entry, "file": str(out.relative_to(PILOT)), "signed_original": {"file": f"{digest[:16]}.mp4", "sha256": digest},
         "api_cost_credits": cost, "credits_before": before,
         "cost_usd": round(float(cost) / 100, 4) if cost is not None else expect,
         "cost_basis": "API cost field" if cost is not None else "estimate, no cost field: check credits_before against the balance"})
    control_sheet(out)
    print(f"  ok {out}  cost field {cost}")
    return out


def ff(*args):
    subprocess.run(["ffmpeg", "-v", "error", "-y", *map(str, args)], check=True)


def control_sheet(clip):
    """One frame every 0.2 s with its time under it: what the coach audits."""
    frames = clip.with_suffix("")
    frames.mkdir(exist_ok=True)
    for old in frames.glob("f*.png"):
        old.unlink()
    ff("-i", clip, "-vf", "fps=5,scale=200:-1", frames / "f%03d.png")
    labelled = []
    for i, png in enumerate(sorted(frames.glob("f*.png"))):
        labelled += ["-label", f"{i * 0.2:.1f} s", str(png)]
    subprocess.run(["montage", *labelled, "-tile", "5x", "-geometry", "+3+3", "-background", "#202024",
                    "-fill", "white", "-pointsize", "14", str(clip.with_suffix(".sheet.jpg"))], check=True)


def ssim(a, b):
    out = subprocess.run(["ffmpeg", "-i", str(a), "-i", str(b), "-lavfi", "ssim", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    return float(out.rsplit("All:", 1)[1].split()[0])


def encode(slug, clip, crf=28):
    """The kept draft: the first 5 s (keyframes 0 to 5 are the same picture, so that is the loop),
    MP4 H.264 384 px yuv420p +faststart, animated WebP 384 px at 12 fps, and the seam's SSIM."""
    clip, d = pathlib.Path(clip), SITE / slug
    d.mkdir(parents=True, exist_ok=True)
    mp4, webp = d / "video.mp4", d / "video.webp"
    ff("-i", clip, "-t", "5", "-an", "-vf", "scale=384:384:flags=lanczos", "-c:v", "libx264", "-preset", "veryslow",
       "-crf", crf, "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4)
    ff("-i", mp4, "-vf", "fps=12", "-loop", "0", "-quality", "70", "-c:v", "libwebp", webp)
    tmp = PILOT / "tmp" / slug
    tmp.mkdir(parents=True, exist_ok=True)
    ff("-i", mp4, "-vf", "select=eq(n\\,0)", "-frames:v", "1", tmp / "first.png")
    ff("-sseof", "-0.05", "-i", mp4, "-frames:v", "1", "-update", "1", tmp / "last.png")
    seam = ssim(tmp / "first.png", tmp / "last.png")
    ff("-i", mp4, "-vf", "setpts=2*PTS", "-an", "-c:v", "libx264", "-crf", crf, "-pix_fmt", "yuv420p", "-movflags", "+faststart",
       d / "video_slow.mp4")
    return {"mp4_kb": kb(mp4), "webp_kb": kb(webp), "seam_ssim": round(seam, 4), "crf": crf}


def translate(src, dx, dy, out=None):
    """Move a picture by (dx, dy) px at 1280, filling what is uncovered with its own mirrored edge
    (plain background on these pictures). Thread the Needle: OpenAI drew the tabletop and open poses
    about 320 px (at 1280) lower than A; moving either side the whole way crops the raised hand or
    A's palm, so both move part of the way."""
    out = out or src.with_name(src.stem + "t.png")
    magick(src, "-resize", "1280x1280!", "-virtual-pixel", "mirror", "-distort", "SRT", f"0,0 1 0 {dx},{dy}", out)
    log({"provider": "local", "model": "imagemagick", "step": "align", "slug": src.parent.name,
         "file": str(out.relative_to(PILOT)), "inputs": [{"name": str(src.relative_to(PILOT)), "sha256": sha(src)}],
         "params": {"translate_px_at_1280": [dx, dy]}, "date": now(), "cost_usd": 0})
    return out


def shift_down(src, dy):
    """Undo a vertical re-framing: move the picture down dy px (at 1280) so its bar lands back on
    A's, and fill the band uncovered at the top by stretching the top rows of plain background.
    Chin-up hang, route O: the model kept the scale and the hands' x but slid the scene up to fit
    the feet in frame; the sheet accepts the feet leaving the frame instead."""
    out = src.with_name(src.stem + "a.png")
    # The band is the top rows mirrored: its last row is the source's first, so the seam matches
    # row for row (a plain stretch left a visible edge, which flickers in a flip-book).
    band = 70  # rows of empty background at the top of the source
    magick(src, "-resize", "1280x1280!", "(", "+clone", "-crop", f"1280x{band}+0+0", "+repage", "-flip", "-resize", f"1280x{dy}!", ")",
           "(", "-clone", "0", "-crop", f"1280x{1280 - dy}+0+0", "+repage", ")", "-delete", "0", "-append", out)
    a = PILOT / "A" / f"{src.parent.name}.png"
    magick(a, out, "-resize", "1280x1280!", "-compose", "blend", "-define", "compose:args=50", "-composite",
           out.with_name(out.stem + "_onion.png"))
    log({"provider": "local", "model": "imagemagick", "step": "align", "slug": src.parent.name, "file": str(out.relative_to(PILOT)),
         "inputs": [{"name": str(src.relative_to(PILOT)), "sha256": sha(src)}], "params": {"shift_down_px_at_1280": dy},
         "date": now(), "cost_usd": 0})
    return out


def main():
    command, *rest = sys.argv[1:] or ["help"]
    if command == "refs":
        for slug in rest or EXERCISES:
            print(refs(slug))
    elif command == "stick-media":
        print(json.dumps({slug: stick_media(slug) for slug in rest or EXERCISES}, indent=1))
    elif command == "page":
        page()
    elif command == "guide":  # guide <slug>...: the pose guide of each key that has one, and it over A
        for slug in rest:
            a = PILOT / "A" / f"{slug}.png"
            if not a.exists():
                a.parent.mkdir(parents=True, exist_ok=True)
                magick(ROOT / f"assets/images/exercises/{slug}.webp", a)
            for k, pose in EXERCISES[slug]["keys"].items():
                if pose is not None:
                    g = draw(slug, k)
                    magick(a, "-resize", "1024x1024", g, "-compose", "blend", "-define", "compose:args=55",
                           "-composite", g.with_name(f"{k}_over_A.png"))
                    print(g)
    elif command == "pose":  # pose <slug> <key> <route F|O> <n>...: candidates in parallel
        import concurrent.futures
        base = rest.pop(rest.index("--base") + 1) if "--base" in rest else None
        between = rest.pop(rest.index("--between") + 1) if "--between" in rest else None
        rest = [r for r in rest if r not in ("--base", "--between")]
        slug, key, route, *ns = rest
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(lambda n: candidate(slug, key, route, int(n), base, between), ns))
        print(f"spent {spent():.3f} $")
    elif command == "draft":  # draft <slug> <n>...
        import concurrent.futures
        slug, *ns = rest
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(lambda n: draft(slug, int(n)), ns))
        print(f"spent {spent():.3f} $")
    elif command == "credits":  # the BFL balance: the video endpoint returns no cost field
        print(_json(CREDITS, env_key("BFL_API_KEY"))["credits"])
    elif command == "encode":  # encode <slug> <clip.mp4> [crf]
        print(json.dumps(encode(rest[0], rest[1], int(rest[2]) if len(rest) > 2 else 28)))
    elif command == "flipbook":
        print(json.dumps({slug: flipbook(slug) for slug in rest or EXERCISES}))
    elif command == "translate":  # translate <png> <dx> <dy> [out]  (px at 1280)
        print(translate(pathlib.Path(rest[0]), int(rest[1]), int(rest[2]), pathlib.Path(rest[3]) if len(rest) > 3 else None))
    elif command == "shift":  # shift <candidate.png> <dy at 1280>
        print(shift_down(pathlib.Path(rest[0]), int(rest[1])))
    elif command == "spent":
        rows = ledger()
        for prov in ("bfl", "openai"):
            print(prov, round(sum(r.get("cost_usd") or 0 for r in rows if r["provider"] == prov), 3))
        print("total", spent(), "calls", len(rows))
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
