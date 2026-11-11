#!/usr/bin/env python3
"""Pilot v3: animate an exercise from key poses (mannequin -> drawn poses -> flip-book -> video).

    python3 scripts/anim-pilot-v3.py refs [slug...]          # mannequin key poses, onion skin, stick GIF (free)
    python3 scripts/anim-pilot-v3.py check [slug...]         # anatomy rules over every guide (free)
    python3 scripts/anim-pilot-v3.py selftest                # the rules catch what they must (free)

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
import shutil
import statistics
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
    # Hip, knee, ankle. Until the anatomy check there was a joint mid-thigh, and the shin read as a long
    # foot pointing backwards.
    legs = [[add(hip, (5, 0)), add((572, 770), d), add((470, 815), d)],
            [add(hip, (-8, 0)), add((556, 762), d), add((448, 826), d)]]
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
    # Halfway the forearm is upright and the upper arm points at the camera. The elbows used to sit
    # 90 px lower, which made the forearm 250 px long against 157 in the hang.
    middle = [(368, 247 + drop), (622, 224 + drop)]
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
    hip = pick((418, 392), (420, 398), (436, 418))         # cat tucks the pelvis under
    shoulder = pick((692, 338), (692, 335), (690, 335))
    # v2: five spine points. Cow is a gentle sag (Guillaume, 10/11: v1's cow bent "too much, it looks
    # odd"), cat a deep even dome from tailbone to neck (the still's cat was flagged as too shallow).
    lift = pick((-30, 0), (0, 0), (85, 0))[0]                                # + = up (dome), - = down (sag)
    spine = [shoulder] + [(round(shoulder[0] + (hip[0] - shoulder[0]) * t),
                           round(shoulder[1] + (hip[1] - shoulder[1]) * t - lift * math.sin(math.pi * t)))
                          for t in (0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875)] + [hip]
    head = pick((835, 268), (842, 338), (820, 440))        # looks up / ahead / tucked to the chest
    face = {-1: (1, -0.6), 0: (1, 0.4), 1: (0.2, 1)}[round(shape)]
    arms = [[add(shoulder, (6, 6)), lerp(add(shoulder, (6, 6)), hands[0], 0.5), hands[0], add(hands[0], (40, 0))],
            [add(shoulder, (60, -10)), lerp(add(shoulder, (60, -10)), hands[1], 0.5), hands[1], add(hands[1], (40, 0))]]
    legs = [[hip, knees[0], feet[0]], [add(hip, (-30, -14)), knees[1], feet[1]]]
    return {
        "head": head, "face": face, "torso": spine, "pins": [hands[0], knees[0], feet[0]],
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
    # Knee, ankle, toes: the shin used to run to the toes, half as long again as the thigh.
    legs = [[hips, knees[0], lerp(knees[0], feet[0], 0.8), feet[0]],
            [add(hips, (40, -20)), knees[1], lerp(knees[1], feet[1], 0.8), feet[1]]]
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
        # In a hang the shoulders ride up beside the ears: the arms start there, not at the chest (they
        # were half as long again as the body).
        near=[[(590, 430), (619, 336), (648, 242)], [(545, 690), (550, 860), (540, 1010)]],
        far=[[(465, 430), (428, 336), (392, 242)], [(495, 690), (490, 860), (500, 1010)]],
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


# --- full run, lot 2: lower body ------------------------------------------------------------------
# Guides are written on A's own geometry. For a standing pose whose head would leave A's frame
# (squat, lunge, curtsy), A is zoomed out around the feet first (`zoom`, flip-book only, like
# Thread the Needle's shifted A), and the guide gets the same transform.

def _zoomed(pose, z):
    s, cx, cy = z
    f = lambda p: (round(cx + s * (p[0] - cx)), round(cy + s * (p[1] - cy)))  # noqa: E731
    out = {"head": f(pose["head"]), "torso": [f(p) for p in pose["torso"]],
           "near": [[f(p) for p in limb] for limb in pose["near"]],
           "far": [[f(p) for p in limb] for limb in pose["far"]], "props": []}
    for shape in pose["props"]:
        out["props"].append(tuple(f(p) for p in shape) if len(shape) == 2 else [f(p) for p in shape])
    return out


LOT2 = {
    # 3/4 front, facing right. A = bottom (k2); drawn: standing top. Zoomed: head would leave the frame.
    "squat": ("k2", 3, (0.78, 480, 880), _guide(
        (405, 240), [(400, 330), (395, 522)],
        near=[[(430, 335), (540, 335), (650, 330)], [(440, 520), (525, 665), (540, 825)]],
        far=[[(380, 330), (490, 322), (600, 315)], [(350, 525), (345, 690), (341, 853)]],
        props=FLOOR(885))),
    # Side, facing right, split stance. A = bottom (back knee near the floor); drawn: top.
    "lunge": ("k2", 3, (0.74, 480, 940), _guide(
        (500, -39), [(478, 103), (478, 430)],
        near=[[(478, 110), (450, 230), (480, 330)], [(478, 430), (606, 650), (752, 900), (826, 946)]],
        far=[[(470, 105), (440, 225), (470, 320)], [(470, 430), (330, 650), (179, 868)]],
        props=FLOOR(950))),
    # Side, lying, head left. A = top (hips up); drawn: bottom (hips on the floor).
    "glute_bridge": ("k1", 2, None, _guide(
        # The hips come down where A's torso length puts them: at x 480 the thigh was 340 px, the shin 215.
        (142, 478), [(284, 535), (603, 565)],
        near=[[(284, 540), (390, 600), (480, 640)], [(603, 565), (738, 385), (796, 592)]],
        far=[[(280, 530), (380, 590), (470, 630)], [(593, 560), (720, 395), (770, 600)]],
        props=FLOOR(660))),
    # Side, lying, one leg extended up. A = top; drawn: bottom (hips down, the leg stays extended).
    "single_leg_glute_bridge": ("k1", 3, None, _guide(
        (94, 663), [(250, 660), (470, 660)],
        near=[[(250, 665), (380, 690), (520, 700)], [(470, 660), (776, 503), (905, 390)]],
        far=[[(245, 655), (370, 685), (510, 695)], [(465, 655), (677, 520), (734, 691)]],
        props=FLOOR(705))),
    # Legs only, front three-quarter. A = top (on the toes); drawn: bottom (heels down).
    "standing_calf_raise": ("k1", 1, None, _guide(
        (430, -60), [(430, -20), (430, 60)],
        near=[[(560, 100), (560, 370), (590, 780), (690, 880)]],
        far=[[(310, 100), (300, 370), (330, 780), (440, 880)]],
        props=FLOOR(885))),
    # Front view. A = bottom (back leg crossed behind); drawn: top. Zoomed.
    "curtsy_squat": ("k2", 3, (0.75, 480, 920), _guide(
        (478, -32), [(484, 110), (470, 320)],
        near=[[(577, 110), (560, 200), (478, 195)], [(500, 320), (610, 515), (720, 711)]],
        far=[[(392, 110), (400, 200), (470, 195)], [(440, 320), (395, 615), (350, 910)]],
        props=FLOOR(920))),
    # Side, facing right, back foot on a bench. A = bottom; drawn: top.
    "bulgarian_split_squat": ("k2", 3, None, _guide(
        (500, 85), [(470, 190), (450, 486)],
        near=[[(470, 195), (450, 330), (450, 450)], [(450, 486), (600, 680), (683, 862), (768, 876)]],
        far=[[(465, 190), (440, 325), (440, 445)], [(445, 486), (330, 660), (185, 648)]],
        props=[((125, 630), (300, 660)), ((130, 660), (150, 900)), ((270, 660), (290, 900))] + FLOOR(885))),
    # Side, facing right, balance on one leg. A = bottom (hinged); drawn: top (upright).
    "single_leg_deadlift": ("k2", 4, None, _guide(
        (595, 170), [(580, 265), (575, 455)],
        near=[[(585, 270), (595, 390), (600, 500)], [(575, 455), (585, 630), (592, 805), (648, 833)]],
        far=[[(575, 265), (580, 385), (585, 495)], [(565, 455), (540, 640), (510, 790)]],
        props=FLOOR(840))),
}
for _slug, (_a_key, _rep, _zoom, _pose) in LOT2.items():
    _other = "k2" if _a_key == "k1" else "k1"
    EXERCISES[_slug] = {"rep_s": _rep, "a_key": _a_key, "zoom": _zoom,
                        "keys": {"k1": None, "k2": None} | {_other: _zoomed(_pose, _zoom) if _zoom else _pose},
                        "times": [0.0, _rep / 2, float(_rep)], "same": {}}


# --- full run, lot 3: core ------------------------------------------------------------------------
# windshield_wipers is left out: its still shows the hero side-on, so the legs' side-to-side sweep
# would travel towards and away from the camera, which this framing cannot show (camera finding).
LOT3 = {
    # Side, lying, head left. A = top (shoulders curled up); drawn: bottom (shoulders down).
    "crunch": ("k1", 2, None, _guide(
        (110, 610), [(240, 640), (430, 660)],
        near=[[(240, 630), (190, 540), (130, 590)], [(430, 660), (540, 398), (640, 796)]],
        far=[[(235, 625), (200, 545), (140, 580)], [(425, 655), (560, 420), (839, 740)]],
        props=FLOOR(705))),
    # Side, lying, head right. A = one side (elbow to the opposite knee); drawn: the other side.
    "bicycle_crunch": ("k1", 2, None, _guide(
        (770, 505), [(700, 530), (577, 600)],
        near=[[(700, 530), (650, 470), (760, 460)], [(577, 600), (500, 430), (620, 520)]],
        far=[[(705, 520), (800, 560), (770, 480)], [(570, 595), (340, 520), (150, 470)]],
        props=FLOOR(680))),
    # Side, lying, head left. A = top (hips curled up); drawn: bottom (hips down, thighs vertical).
    "reverse_crunch": ("k2", 2, None, _guide(
        (114, 634), [(250, 650), (560, 640)],
        near=[[(250, 655), (450, 690), (780, 650)], [(560, 640), (560, 420), (790, 420)]],
        far=[[(245, 650), (440, 685), (770, 645)], [(550, 635), (545, 430), (775, 430)]],
        props=FLOOR(700))),
    # Side, lying, head left. A = extended (one arm overhead, the other leg long); drawn: start.
    "dead_bug": ("k2", 2, None, _guide(
        (250, 592), [(336, 606), (563, 648)],
        near=[[(340, 600), (370, 480), (400, 350)], [(563, 648), (570, 470), (740, 470)]],
        far=[[(330, 600), (355, 475), (380, 345)], [(555, 645), (560, 480), (730, 480)]],
        props=FLOOR(700))),
    # Side, on a bench, head left. A = top (body raised at an angle); drawn: lowered, just above the bench.
    "dragon_flag": ("k1", 4, None, _guide(
        (208, 626), [(321, 660), (540, 615)],
        near=[[(321, 660), (250, 610), (151, 654)], [(540, 615), (740, 590), (940, 560)]],
        far=[[(315, 655), (245, 605), (145, 650)], [(535, 610), (735, 580), (935, 548)]],
        props=[((122, 682), (890, 740)), ((140, 740), (190, 905)), ((820, 740), (870, 905))])),
    # Seated V, side-on. A = twisted to one side; drawn: twisted to the other side.
    "russian_twist": ("k1", 2, None, _guide(
        (215, 300), [(240, 420), (313, 720)],
        near=[[(260, 430), (330, 560), (420, 600)], [(313, 720), (540, 449), (893, 608), (981, 648)]],
        far=[[(220, 425), (300, 560), (410, 610)], [(305, 715), (530, 460), (874, 620), (960, 660)]],
        props=FLOOR(790))),
    # Front three-quarter, under a bar. A = legs raised; drawn: dead hang, legs straight down. Zoomed.
    "hanging_leg_raise": ("k2", 3, (0.78, 350, 130), _guide(
        (343, 392), [(360, 450), (360, 640)],
        near=[[(410, 385), (444, 268), (478, 151)], [(370, 640), (370, 830), (370, 1010)]],
        far=[[(308, 380), (265, 244), (222, 108)], [(350, 640), (345, 830), (345, 1010)]],
        props=[[(0, 70), (1024, 232), (1024, 250), (0, 88)]])),
}
for _slug, (_a_key, _rep, _zoom, _pose) in LOT3.items():
    _other = "k2" if _a_key == "k1" else "k1"
    EXERCISES[_slug] = {"rep_s": _rep, "a_key": _a_key, "zoom": _zoom,
                        "keys": {"k1": None, "k2": None} | {_other: _zoomed(_pose, _zoom) if _zoom else _pose},
                        "times": [0.0, _rep / 2, float(_rep)], "same": {}}


# --- full run, lot 4: bar, wall and floor leftovers ----------------------------------------------
# muscle_up is left out: its still already shows two heroes (below and above the bar), a two-panel
# strip in one picture, so there is no single pose to edit from (finding).
LOT4 = {
    # Front, under a bar. A = top; drawn: dead hang. Zoomed so the legs fit.
    "negative_pullup": ("k1", 5, (0.78, 512, 149), _guide(
        (512, 360), [(512, 440), (510, 690)],
        near=[[(600, 440), (620, 300), (640, 149)], [(530, 690), (525, 880), (520, 1080)]],
        far=[[(420, 440), (400, 300), (384, 149)], [(490, 690), (485, 880), (480, 1080)]],
        props=[((0, 140), (1024, 158))])),
    # Back view, under a bar. A = active hang (shoulders down); drawn: passive hang (shoulders shrugged).
    "scapular_pullup": ("k2", 2, None, _guide(
        (535, 295), [(535, 330), (535, 540)],
        near=[[(625, 300), (622, 210), (620, 114)], [(560, 540), (555, 700), (530, 885)]],
        far=[[(445, 300), (420, 210), (392, 114)], [(510, 540), (505, 700), (490, 885)]],
        props=[((0, 105), (1024, 123))])),
    # Front, under a bar. A = toes at the bar; drawn: dead hang. Zoomed.
    "toes_to_bar": ("k2", 3, (0.7, 512, 100), _guide(
        (512, 380), [(512, 450), (512, 700)],
        near=[[(610, 390), (710, 249), (811, 108)], [(530, 700), (530, 930), (530, 1150)]],
        far=[[(414, 390), (314, 249), (213, 108)], [(494, 700), (494, 930), (494, 1150)]],
        props=[((0, 100), (1024, 118))])),
    # Side, leaning back from a door, holding a towel. A = top (pulled in); drawn: bottom (arms straight).
    "towel_door_row": ("k1", 3, None, _guide(
        (200, 250), [(240, 380), (420, 690)],
        near=[[(245, 385), (390, 405), (535, 421)], [(420, 690), (530, 840), (648, 990)]],
        far=[[(235, 375), (380, 395), (528, 412)], [(410, 690), (520, 845), (630, 985)]],
        props=[((660, 0), (680, 1024))])),
    # Back view, upside down against a wall. A = bottom (head near the floor); drawn: top (arms straight).
    "handstand_pushup": ("k2", 5, None, _guide(
        (512, 690), [(512, 570), (512, 315)],
        near=[[(585, 570), (630, 730), (683, 882)], [(530, 315), (530, 170), (530, 30)]],
        far=[[(440, 570), (385, 730), (327, 882)], [(494, 315), (494, 170), (494, 30)]],
        props=FLOOR(890))),
    # Side, lying face down, head left. A = top (chest and legs lifted, arms in a W); drawn: flat.
    "superman_w": ("k1", 4, None, _guide(
        (220, 630), [(320, 640), (570, 650)],
        near=[[(330, 640), (400, 610), (270, 625)], [(570, 650), (750, 650), (920, 650)]],
        far=[[(320, 635), (390, 600), (265, 615)], [(560, 645), (740, 642), (910, 642)]],
        props=FLOOR(670))),
    # Front. A = in the air; drawn: the squat it jumps from (feet on the floor).
    "jump_squat": ("k2", 2, None, _guide(
        (515, 450), [(515, 560), (490, 760)],
        near=[[(600, 560), (580, 640), (520, 600)], [(530, 760), (610, 820), (580, 960)]],
        far=[[(430, 560), (450, 640), (510, 600)], [(450, 760), (370, 820), (400, 960)]],
        props=FLOOR(965))),
}
for _slug, (_a_key, _rep, _zoom, _pose) in LOT4.items():
    _other = "k2" if _a_key == "k1" else "k1"
    EXERCISES[_slug] = {"rep_s": _rep, "a_key": _a_key, "zoom": _zoom,
                        "keys": {"k1": None, "k2": None} | {_other: _zoomed(_pose, _zoom) if _zoom else _pose},
                        "times": [0.0, _rep / 2, float(_rep)], "same": {}}


# --- full run, lot 5: jumps and timed movements ----------------------------------------------------
# Left out (findings): burpee and jumping_jack (their stills already show two heroes), superman (a
# hold), wrist_circles (a circle that two poses cannot show), wardens_walk (a landscape, an outing).
LOT5 = {
    # Front. A = on one leg, the other bent behind; drawn: the mirror (other leg).
    "skater_hop": ("k1", 2, None, _guide(
        (452, 128), [(480, 260), (480, 555)],
        near=[[(540, 270), (620, 380), (560, 470)], [(500, 555), (530, 750), (560, 939)]],
        far=[[(420, 270), (330, 380), (300, 480)], [(460, 555), (430, 640), (440, 683)]],
        props=FLOOR(950))),
    # Front. A = star in the air; drawn: the crouch it jumps from.
    "star_jump": ("k2", 2, None, _guide(
        (510, 380), [(510, 470), (510, 650)],
        near=[[(570, 480), (600, 600), (590, 720)], [(550, 650), (560, 760), (540, 880)]],
        far=[[(450, 480), (420, 600), (430, 720)], [(470, 650), (460, 760), (480, 880)]],
        props=FLOOR(890))),
    # Three-quarter, crawling. A = one hand and the opposite foot forward; drawn: the other pair forward.
    "bear_crawl": ("k1", 2, None, _guide(
        (738, 354), [(640, 420), (330, 450)],
        near=[[(650, 430), (600, 590), (620, 738)], [(330, 450), (300, 560), (240, 674)]],
        far=[[(700, 420), (790, 580), (887, 738)], [(340, 445), (230, 560), (119, 674)]],
        props=FLOOR(760))),
    # Side, propped on the elbows, legs up. A = one leg high, one low; drawn: swapped.
    "flutter_kicks": ("k1", 1, None, _guide(
        (180, 400), [(240, 470), (520, 560)],
        near=[[(240, 475), (200, 560), (260, 600)], [(520, 560), (700, 540), (911, 420)]],
        far=[[(235, 470), (195, 555), (250, 595)], [(515, 555), (700, 470), (879, 500)]],
        props=FLOOR(620))),
    # Front three-quarter. A = one knee up; drawn: the other knee up.
    "high_knees": ("k1", 1, None, _guide(
        (512, 110), [(510, 230), (500, 450)],
        near=[[(560, 240), (600, 330), (620, 260)], [(520, 450), (530, 680), (520, 896)]],
        far=[[(450, 240), (410, 330), (400, 420)], [(480, 450), (440, 470), (430, 640)]],
        props=FLOOR(905))),
    # Side, high plank, head left. A = plank; drawn: one knee driven to the chest.
    "mountain_climber": ("k1", 1, None, _guide(
        (119, 363), [(230, 430), (653, 491)],
        near=[[(230, 440), (180, 580), (119, 704)], [(653, 491), (420, 560), (520, 690)]],
        far=[[(240, 430), (240, 570), (247, 704)], [(650, 485), (800, 590), (951, 693)]],
        props=FLOOR(710))),
    # Three-quarter, deep lunge. A = arm reaching up, chest open; drawn: elbow down to the front instep.
    "worlds_greatest_stretch": ("k1", 2, None, _guide(
        (300, 640), [(360, 680), (560, 690)],
        near=[[(370, 700), (340, 790), (330, 880)], [(560, 690), (300, 820), (290, 994)]],
        far=[[(350, 690), (290, 790), (226, 887)], [(560, 690), (700, 740), (845, 781)]],
        props=FLOOR(1000))),
}
for _slug, (_a_key, _rep, _zoom, _pose) in LOT5.items():
    _other = "k2" if _a_key == "k1" else "k1"
    EXERCISES[_slug] = {"rep_s": _rep, "a_key": _a_key, "zoom": _zoom,
                        "keys": {"k1": None, "k2": None} | {_other: _zoomed(_pose, _zoom) if _zoom else _pose},
                        "times": [0.0, _rep / 2, float(_rep)], "same": {}}


def zoom_a(slug):
    """A zoomed out around the feet (EXERCISES[slug]["zoom"] = scale, cx, cy), the edges filled with
    A's own mirrored background: a standing pose then fits the frame. Flip-book only."""
    s, cx, cy = EXERCISES[slug]["zoom"]
    src, out = PILOT / "A" / f"{slug}.png", PILOT / "A" / f"{slug}_z.png"
    k = 1280 / 1024
    # Edge, not mirror: a mirror fill reflected the hero's head upside down above it.
    magick(src, "-resize", "1280x1280!", "-virtual-pixel", "edge", "-distort", "SRT",
           f"{cx * k},{cy * k} {s} 0 {cx * k},{cy * k}", out)
    log({"provider": "local", "model": "imagemagick", "step": "align", "slug": slug, "file": str(out.relative_to(PILOT)),
         "inputs": [{"name": str(src.relative_to(PILOT)), "sha256": sha(src)}],
         "params": {"zoom_out_scale": s, "centre_at_1024": [cx, cy], "fill": "edge"}, "date": now(), "cost_usd": 0})
    return out


def unique_keys(slug):
    """The key poses that need a drawing of their own: the rest reuse one (same position, other direction)."""
    return [k for k in EXERCISES[slug]["keys"] if k not in EXERCISES[slug]["same"]]


def smooth(points, steps=12):
    """A Catmull-Rom curve through the points: a spine of several joints bends as one back."""
    if len(points) < 3:
        return list(points)
    pts = [points[0], *points, points[-1]]
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        for j in range(steps):
            t = j / steps
            out.append(tuple(0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t * t
                                    + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t ** 3) for c in (0, 1)))
    return out + [points[-1]]


def draw(slug, key):
    """Mannequin v2 (2026-11-10, Guillaume: "more joints"). art-loop.py's colours, plus:

    - the torso is a spine through every point given (shoulders first, pelvis last), drawn as one
      curve with a chest block, a pelvis block and vertebra ticks, so a rounded or arched back reads;
    - a neck, and a nose wedge on the head when the pose gives `face` (the direction it looks);
    - white joint dots at elbows, wrists, knees and ankles; a 4th limb point is the hand or foot,
      drawn thinner, so heel up / heel down and pointed toes read;
    - `pins`: white rings on the points that never move (hands, feet, knees on the floor).
    v3 (anatomy pass): a grey shoulder line and pelvis line join the two sides' joints through the spine; a
    foot is a wedge with a heel, a hand a narrower wedge; a bent knee or elbow carries a bump on the outside
    of the bend (kneecap, point of the elbow). Same colours, so the prompts' legend still holds.
    v1 notes kept: a thin torso and a dark outline on the near limbs, so a straight arm in front of
    the body does not sink into the torso band (dip, round 3)."""
    from PIL import Image, ImageDraw
    pose = EXERCISES[slug]["keys"][key]
    image = Image.new("RGB", (1024, 1024), artloop.BG)
    d = ImageDraw.Draw(image)
    for shape in pose["props"]:
        if shape[0] == "line":  # a bar seen in depth: ("line", end, end, width)
            d.line(shape[1:3], fill=artloop.PROP, width=shape[3])
        elif len(shape) == 2:
            d.rectangle(shape, fill=artloop.PROP)
        else:
            d.polygon(shape, fill="#1F2533")

    def dot(p, r, colour):
        d.ellipse((p[0] - r, p[1] - r, p[0] + r, p[1] + r), fill=colour)

    def limb(points, colour, leg, width=30, outline=0):
        hand = "#5BF08C" if colour == artloop.NEAR else "#1F9A55"  # green mitten: bright near, dark far
        bones, end = (points[:-1], points[-1]) if len(points) > 3 else (points, None)
        (a, b, c_), flex = bones, abs(_ang(*bones[:2], *bones[1:]))
        k = math.dist(b, lerp(a, c_, 0.5)) or 1
        for w, c in ((width + 2 * outline, artloop.BG), (width, colour)) if outline else ((width, colour),):
            d.line(bones, fill=c, width=w, joint="curve")
            for p in bones:
                dot(p, w / 2, c)
            if flex > 20:  # kneecap, point of the elbow: a bump on the outside of the bend
                dot((b[0] + (b[0] - (a[0] + c_[0]) / 2) / k * width * 0.4, b[1] + (b[1] - (a[1] + c_[1]) / 2) / k * width * 0.4),
                    w * 0.36, c)
            if end:  # hand or foot: a wedge, wide at the wrist or heel and narrow at the tips
                (x0, y0), (x1, y1) = bones[-1], end
                n = math.dist(bones[-1], end) or 1
                ux, uy, o = (x1 - x0) / n, (y1 - y0) / n, (w - width) / 2
                wide, tip = width * (0.45 if leg else 0.5) + o, width * 0.2 + o
                hc = c if leg or c == artloop.BG else hand
                d.polygon([(x0 - uy * wide, y0 + ux * wide), (x0 + uy * wide, y0 - ux * wide),
                           (x1 + uy * tip, y1 - ux * tip), (x1 - uy * tip, y1 + ux * tip)], fill=hc)
                dot(end, tip, hc)
                if leg:  # the heel, behind the ankle
                    dot((x0 - ux * width * 0.3, y0 - uy * width * 0.3), wide, c)
        if not leg:  # the palm: a round mitten past the wrist, whatever the hand point says
            dot(lerp(bones[-1], end, 0.5) if end else bones[-1], 25 + (w - width) / 2, hand if c != artloop.BG else c)
        for p in bones[1:]:
            dot(p, 6, "white")

    def blob(a, b, width, colour):
        d.line([a, b], fill=colour, width=width)
        dot(a, width / 2, colour)
        dot(b, width / 2, colour)

    for points in pose["far"]:
        limb(points, artloop.FAR, points is pose["far"][-1])
    spine = smooth(pose["torso"])
    n = len(spine)
    # Shoulder line and pelvis line, from one side's joint to the other's through the spine: in a front
    # view the limbs no longer float beside the trunk, and the width of the shoulders and hips reads.
    for i, at in ((0, spine[0]), (-1, spine[-1])):
        if len(pose["near"]) > 1 or i:
            d.line([pose["far"][i][0], at, pose["near"][i][0]], fill=artloop.TORSO, width=30, joint="curve")
            dot(pose["far"][i][0], 15, artloop.TORSO)
    d.line(spine, fill=artloop.TORSO, width=40, joint="curve")
    blob(spine[0], spine[max(1, n // 3)], 66, artloop.TORSO)       # chest
    blob(spine[-1], spine[min(n - 2, n - 1 - n // 6)], 58, artloop.TORSO)  # pelvis
    for p in spine[2:-2:max(1, n // 8)]:
        dot(p, 5, "#4B5263")                                         # vertebrae
    x, y = pose["head"]
    d.line([spine[0], (x, y)], fill=artloop.TORSO, width=26)         # neck
    dot((x, y), 50, "#101420")                                        # outline, so the head parts from the neck
    dot((x, y), 44, "#F5C518")                                        # yellow head
    if pose.get("face"):
        fx, fy = pose["face"]
        k = 1 / max(1e-6, math.hypot(fx, fy))
        fx, fy = fx * k, fy * k
        d.polygon([(x + fx * 66, y + fy * 66), (x + fx * 36 - fy * 16, y + fy * 36 + fx * 16),
                   (x + fx * 36 + fy * 16, y + fy * 36 - fx * 16)], fill="#E8590C", outline="#101420")
        dot((x + fx * 20 - fy * 14, y + fy * 20 + fx * 14), 7, "#101420")  # eye, on the face side
    for points in pose["near"]:
        limb(points, artloop.NEAR, points is pose["near"][-1], outline=7)
    for p in pose.get("pins", ()):
        d.ellipse((p[0] - 22, p[1] - 22, p[0] + 22, p[1] + 22), outline="white", width=5)
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
OPENAI_MODEL = os.environ.get("ANIM_OPENAI_MODEL", "gpt-image-2.5-sunburst")
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
    except (TimeoutError, urllib.error.URLError) as error:
        # A read timeout killed a whole batch once (lunge, lot 2). Whether OpenAI billed it is
        # unknown: logged at 0 with the reason, checked against the usage page if it matters.
        log({**entry, "error": f"no answer: {error}", "cost_usd": 0, "cost_basis": "unknown, request timed out"})
        print(f"  x {slug} {key} {route}: no answer: {error}", file=sys.stderr)
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
        "pose guide (a jointed mannequin: grey torso, spine, neck and head, the head's wedge is the nose; "
        "orange limbs nearest the camera, blue limbs on the far side, white dots are elbows, wrists, knees "
        "and ankles, white rings mark the contact points that never move); nothing of its colours, shapes or flat style appears in the result. "
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
    ("diamond_pushup", "k2"): "The hero is now at the BOTTOM of a diamond push-up: chest lowered to a fist above the hands, elbows bent and pointing back along the ribs, close to the body, never flared out; both arms stay clearly visible and readable, the near upper arm drawn along the side of the ribs with its elbow behind the shoulder, the far arm partly visible beside it; one rigid straight line from head to heels, hips level with the shoulders; head neutral.",
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
    "knee_pushup": "Both hands stay flat on exactly the same spots of the floor and both knees stay on exactly the same spot of the floor as in image 1, with the shins and raised feet at the same angle as in image 1. The body pivots on the knees: only the torso, head and arms move.",
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
# --- full run, lot 2: lower body ------------------------------------------------------------------
POSE_TEXT.update({
    ("squat", "k1"): "The hero is now STANDING at the top of a squat: legs straight, hips over the feet, chest up, both arms still reaching straight forward at shoulder height; the whole body is taller than in image 1 and the head stays fully inside the frame.",
    ("lunge", "k1"): "The hero is now at the TOP of a lunge in the same split stance: both legs nearly straight, torso upright, hands on the hips, hips between the feet; the body is taller than in image 1 and the head stays fully inside the frame.",
    ("glute_bridge", "k2"): "The hero is now at the BOTTOM of a glute bridge: the hips lowered to just touch the floor, knees still bent, feet flat where they are, shoulders, head and arms flat on the floor.",
    ("single_leg_glute_bridge", "k2"): "The hero is now at the BOTTOM of a single-leg glute bridge: the hips lowered all the way, the buttocks resting on the floor, the back flat on the floor, the working foot flat where it is with the knee bent, and the free leg still straight and extended, lowered together with the hips.",
    ("standing_calf_raise", "k2"): "The legs are now at the BOTTOM of a calf raise: both heels pressed flat on the floor, the whole sole of each shoe flat and level on the floor, toes and heels at the same height, knees straight, the balls of the feet on the same spots; the legs and the knees are clearly lower in the frame than in image 1, by about the height of a heel lift.",
    ("curtsy_squat", "k1"): "The hero is now at the TOP of a curtsy squat, standing tall in the same crossed stance: the back foot still crossed behind the front foot on its toes, both legs nearly straight, torso upright, hands clasped at the chest; the body is taller than in image 1 and the head stays fully inside the frame.",
    ("bulgarian_split_squat", "k1"): "The hero is now at the TOP of a Bulgarian split squat: the front leg nearly straight, hips higher, torso upright, the back foot still resting on the bench, arms down by the sides.",
    ("single_leg_deadlift", "k1"): "The hero is now at the TOP of a single-leg deadlift: standing upright on the same leg, the free foot just off the floor slightly behind, torso vertical, arms hanging down by the sides.",
})
NEVER.update({
    "squat": "Both feet stay flat on exactly the same spots of the floor; the heels never lift.",
    "lunge": "The front foot and the back foot stay on exactly the same spots of the floor: the stance does not change.",
    "glute_bridge": "Both feet stay flat on exactly the same spots of the floor and the shoulders and head stay on the same spot.",
    "single_leg_glute_bridge": "The working foot stays flat on exactly the same spot of the floor and the shoulders and head stay on the same spot.",
    "standing_calf_raise": "The balls of both feet stay on exactly the same spots of the floor.",
    "curtsy_squat": "Both feet stay on exactly the same spots of the floor, the back foot crossed behind the front one.",
    "bulgarian_split_squat": "The front foot stays flat on exactly the same spot of the floor and the back foot stays on the bench, which does not move.",
    "single_leg_deadlift": "The standing foot stays flat on exactly the same spot of the floor.",
})
VIDEO_MOTION.update({
    "squat": "One slow bodyweight squat with the arms reaching forward. The feet never move and the heels stay down. From standing the hips go back and down, knees over the toes, then the hero stands back up.",
    "lunge": "One slow static lunge in a fixed split stance, hands on the hips. The feet never move. From nearly straight legs both knees bend until the back knee is a hand above the floor, then the hero rises back up.",
    "glute_bridge": "One slow glute bridge lying on the back. The feet, shoulders and head never move. The hips lift until shoulders, hips and knees make one line, then lower to just touch the floor.",
    "single_leg_glute_bridge": "One slow single-leg glute bridge lying on the back, one leg extended. The working foot, shoulders and head never move. The hips lift until level, the free leg rising in line, then lower to just touch the floor.",
    "standing_calf_raise": "One slow standing calf raise, legs only. The balls of the feet never move and the knees stay straight. The heels rise high onto the balls of the feet, then lower flat to the floor.",
    "curtsy_squat": "One slow curtsy squat in a fixed crossed stance, hands at the chest. The feet never move. From standing tall the knees bend, the back knee lowering towards the floor behind, then the hero rises back up.",
    "bulgarian_split_squat": "One slow Bulgarian split squat, back foot on a bench. The front foot and the bench never move. From a nearly straight front leg the hero lowers until the back knee is close to the floor, then rises back up.",
    "single_leg_deadlift": "One slow single-leg deadlift. The standing foot never moves. From upright on one leg the hero hinges forward with a straight back as the free leg rises behind, until torso and free leg are nearly horizontal, then returns upright.",
})
# --- full run, lot 3: core ------------------------------------------------------------------------
POSE_TEXT.update({
    ("crunch", "k2"): "The hero is now at the BOTTOM of a crunch: lying flat on the back, shoulders and head resting on the floor, hands still lightly behind the head with the elbows out, knees still bent and feet flat on the floor.",
    ("bicycle_crunch", "k2"): "The hero now does the OTHER SIDE of a bicycle crunch: the legs SWAP. The leg with the white bandage at the ankle, which is extended in image 1, is now BENT with its knee pulled in towards the chest; the leg that was bent in image 1 is now extended long just above the floor, and the shoulders twist the other way so the opposite elbow reaches towards that bent knee; BOTH hands stay behind the head, fingers at the back of the head, and never touch the legs.",
    ("reverse_crunch", "k1"): "The hero is now at the BOTTOM of a reverse crunch: lying flat, hips and lower back resting on the floor, thighs vertical, knees bent at 90 degrees with the shins level and the feet in the air, arms flat along the floor by the sides.",
    ("dead_bug", "k1"): "The hero is now in the START position of a dead bug: lying flat on the back, lower back pressed to the floor, both arms pointing straight up to the ceiling above the shoulders, both knees bent at 90 degrees above the hips with the shins level.",
    ("dragon_flag", "k2"): "The hero is now at the BOTTOM of a dragon flag: the body stays one rigid straight line from the shoulders to the feet and is lowered until it is just above the bench, nearly horizontal; only the upper back and shoulders rest on the bench, hands still gripping the bench behind the head.",
    ("russian_twist", "k2"): "The hero now twists to the OTHER SIDE in a Russian twist: same seated V with the torso leaning back at the same angle as in image 1 (not sitting up straight), a straight back, the hips exactly where they are in image 1, knees bent and feet on the floor, the clasped hands now beside the opposite hip and the chest and shoulders turned that way.",
    ("hanging_leg_raise", "k1"): "The hero now hangs at the BOTTOM of a hanging leg raise: both arms straight, both legs hanging straight down together under the hips, body still and vertical below the bar. The bar and the hands stay exactly where they are in image 1.",
})
NEVER.update({
    "crunch": "Both feet stay flat on exactly the same spots of the floor and the hips stay on the floor.",
    "bicycle_crunch": "The hips stay on the same spot of the floor and the hands stay behind the head.",
    "reverse_crunch": "The shoulders, head and arms stay flat on exactly the same spot of the floor.",
    "dead_bug": "The head, shoulders and lower back stay on exactly the same spot of the floor.",
    "dragon_flag": "The upper back and shoulders stay on exactly the same spot of the bench and the hands keep gripping the bench behind the head. The bench does not move.",
    "russian_twist": "The hips stay on exactly the same spot of the floor and both feet stay on the same spots.",
    "hanging_leg_raise": "Both hands stay on exactly the same spots of the bar. The bar does not move. No swing.",
})
VIDEO_MOTION.update({
    "crunch": "One slow crunch lying on the back, knees bent, hands lightly behind the head. The feet and hips never move. The shoulders curl up off the floor, then lower back down.",
    "bicycle_crunch": "One slow bicycle crunch cycle lying on the back, hands behind the head. The hips never move. One knee comes in as the opposite elbow twists towards it while the other leg extends, then the legs and the twist switch sides.",
    "reverse_crunch": "One slow reverse crunch lying on the back. The shoulders, head and arms never move. With the knees bent at 90 degrees the hips curl up off the floor bringing the knees towards the chest, then lower back down.",
    "dead_bug": "One slow dead bug lying on the back. The back stays pressed to the floor. From both arms up and both knees at 90 degrees, one arm reaches overhead to the floor as the opposite leg extends long, then both return.",
    "dragon_flag": "One slow dragon flag on a bench, gripping it behind the head. The shoulders never leave the bench and the body stays one rigid straight line. The body lowers from raised to just above the bench, then rises back.",
    "russian_twist": "One slow Russian twist in a seated V, feet on the floor. The hips and feet never move. The clasped hands and the shoulders turn to one side, then across to the other side.",
    "hanging_leg_raise": "One slow hanging leg raise. The hands never move on the bar and the body does not swing. From a dead hang the knees and legs lift up in front of the body, then lower back down to hang straight.",
})
# --- full run, lot 4 ------------------------------------------------------------------------------
POSE_TEXT.update({
    ("negative_pullup", "k2"): "The hero now hangs at the BOTTOM of a negative pull-up: both arms fully straight, body vertical and still below the bar, head well below the bar, legs straight and together. The bar and the hands stay exactly where they are in image 1.",
    ("scapular_pullup", "k1"): "The hero now hangs PASSIVELY at the start of a scapular pull-up: arms straight, the shoulders clearly shrugged right up to the ears so the upper arms press against the sides of the head and the head sinks deep between the arms, the shoulder blades spread apart and high on the back, the whole body hanging visibly lower than in image 1 (by about a hand's width). The bar and the hands stay exactly where they are in image 1.",
    ("toes_to_bar", "k1"): "The hero now hangs at the BOTTOM of a toes-to-bar: both arms straight, body vertical and still, both legs together hanging straight down under the hips. The bar and the hands stay exactly where they are in image 1.",
    ("towel_door_row", "k2"): "The hero is now at the BOTTOM of a towel door row: both arms fully straight holding the towel, the body leaning further back in one straight line from the heels to the head, feet on the same spot.",
    ("handstand_pushup", "k1"): "The hero is now at the TOP of a handstand push-up against the wall: both arms fully straight, the head well above the floor between the arms, the body straight and vertical upside down, heels against the wall.",
    ("superman_w", "k2"): "The hero is now lying FLAT face down at the bottom of a superman W: chest, arms and legs resting on the floor, the arms still bent in a W beside the head.",
    ("jump_squat", "k1"): "The hero is now at the BOTTOM of the squat before the jump: both feet flat on the floor, knees bent and pushed out over the toes, hips back and down, chest up, hands clasped at the chest.",
})
NEVER.update({
    "negative_pullup": "Both hands stay on exactly the same spots of the bar. The bar does not move. No swing.",
    "scapular_pullup": "Both hands stay on exactly the same spots of the bar and the arms stay straight. The bar does not move.",
    "toes_to_bar": "Both hands stay on exactly the same spots of the bar. The bar does not move. No swing.",
    "towel_door_row": "Both hands stay on the towel at the same spot by the door handle and both feet stay on exactly the same spot. The door does not move.",
    "handstand_pushup": "Both hands stay flat on exactly the same spots of the floor, shoulder width, exactly as far apart as in image 1; the arms are vertical, not splayed. The heels stay against the wall and simply slide up it as the arms straighten. The wall, the floor and the background do not change.",
    "superman_w": "The hips stay on exactly the same spot of the floor.",
    "jump_squat": "The camera and the background do not move; the feet land where they took off.",
})
VIDEO_MOTION.update({
    "negative_pullup": "One slow negative pull-up. The hands never move on the bar and the legs never swing. From the chin above the bar the body lowers very slowly to a dead hang on straight arms, then returns to the top.",
    "scapular_pullup": "One slow scapular pull-up. The hands never move and the arms stay straight. From a relaxed hang with the shoulders up by the ears, the shoulder blades pull down and the body rises a little, then relaxes back.",
    "toes_to_bar": "One slow toes-to-bar. The hands never move on the bar and the body does not swing. From a dead hang the straight legs lift until the toes touch the bar, then lower back down.",
    "towel_door_row": "One slow towel door row. The feet and the towel by the handle never move. From straight arms leaning back the hero pulls the chest towards the door, then lowers back to straight arms.",
    "handstand_pushup": "One slow handstand push-up against a wall. The hands never move and the heels stay on the wall. From straight arms the body lowers until the head nearly touches the floor, then presses back up.",
    "superman_w": "One slow superman W lying face down. The hips never move. The chest and legs lift off the floor as the arms pull into a W, then lower back down.",
    "jump_squat": "One jump squat. From a squat with the feet flat the hero jumps straight up, both feet leaving the floor, and lands softly back in the squat.",
})
# --- full run, lot 5 ------------------------------------------------------------------------------
POSE_TEXT.update({
    ("skater_hop", "k2"): "The hero now lands the OTHER WAY in a skater hop: the legs SWAP. The leg that stands on the floor in image 1 is now the one bent and lifted behind; the leg that is lifted behind in image 1 now stands on the floor, knee softly bent. The arms swing the other way too.",
    ("star_jump", "k1"): "The hero is now in the CROUCH before a star jump: both feet flat on the floor close together, knees bent, hips low, chest up, both arms down with the hands near the knees.",
    ("bear_crawl", "k2"): "The hero now takes the NEXT STEP of a bear crawl: the hand and foot that are forward in image 1 are now back, and the other hand and the opposite foot are now forward; knees stay a hand above the floor, back flat.",
    ("flutter_kicks", "k2"): "The legs now SWAP in a flutter kick: the leg that is higher in image 1 is now the lower one, and the lower one is now the higher one; both legs stay straight and off the floor.",
    ("high_knees", "k2"): "The hero now drives the OTHER KNEE up in high knees: the legs SWAP. The leg that stands on the floor in image 1 is now lifted with the knee at hip height; the leg whose knee is up in image 1 now stands on the floor. The arms swing the other way.",
    ("mountain_climber", "k2"): "The hero now drives one knee in for a mountain climber: from the same high plank, one knee is pulled forward towards the chest under the body, its foot off the floor; the other leg stays straight back with the toes on the floor; hips stay level with the shoulders.",
    ("worlds_greatest_stretch", "k2"): "The hero now drops the raised arm for a world's greatest stretch: in the same deep lunge, the arm that reaches up to the sky in image 1 comes all the way down, bent, its ELBOW pressed to the floor just inside the front foot, the forearm flat on the floor, the chest low and turned to face the floor; the other hand stays flat on the floor where it is in image 1. Exactly two arms.",
})
NEVER.update({
    "skater_hop": "The camera, framing and background do not move.",
    "star_jump": "The camera, framing and background do not move; the feet land where they took off.",
    "bear_crawl": "The camera, framing and background do not move; the hero stays at the same place in the frame.",
    "flutter_kicks": "The hips, elbows and upper body stay exactly where they are in image 1.",
    "high_knees": "The camera, framing and background do not move; the hero stays at the same place in the frame.",
    "mountain_climber": "Both hands stay flat on exactly the same spots of the floor and the back foot stays on exactly the same spot.",
    "worlds_greatest_stretch": "The front foot, the back foot and the hand on the floor stay on exactly the same spots.",
})
VIDEO_MOTION.update({
    "skater_hop": "One skater hop cycle. The hero hops sideways from one leg to the other, landing softly on one foot with the other leg swinging behind, then hops back.",
    "star_jump": "One star jump. From a crouch the hero jumps up, spreading arms and legs into a star in the air, and lands softly back in the crouch.",
    "bear_crawl": "One bear crawl step on all fours with the knees just off the floor. Opposite hand and foot step forward together, then the other pair, the back staying flat.",
    "flutter_kicks": "Flutter kicks propped on the elbows. The straight legs alternate up and down in small kicks, the hips and upper body staying still.",
    "high_knees": "High knees on the spot. One knee drives up to hip height, then the other, the arms swinging in opposition.",
    "mountain_climber": "One mountain climber from a high plank. The hands and the back foot stay put. One knee drives towards the chest, then returns to the plank.",
    "worlds_greatest_stretch": "One slow world's greatest stretch in a deep lunge. The feet and the planted hand stay put. The elbow drops to the inside of the front foot, then the arm sweeps up to the ceiling as the chest opens.",
})
# --- v2 redo (2026-11-10, after Guillaume's review of the full run) -------------------------------
# Mannequin v2 is posed by joint angles (forward kinematics) instead of hand-placed points: bones
# keep their length from pose to pose, which hand-placed guides did not guarantee. Angles are in
# degrees on the image: 0 = right, 90 = down, 180 = left, 270 = up. A bone may be (angle, scale)
# when it points at the camera and looks shorter.
SEG = {"torso": 250, "neck": 34, "head": 40, "thigh": 225, "shin": 215, "foot": 62,
       "upper": 140, "fore": 125, "hand": 38}
BONES = {"arm": ("upper", "fore", "hand"), "leg": ("thigh", "shin", "foot")}


def step(p, deg, length):
    r = math.radians(deg)
    return (round(p[0] + math.cos(r) * length), round(p[1] + math.sin(r) * length))


def chain(root, spec, bones):
    """A limb from root: a list of bone angles, or {"to": point, "bend": +1|-1, "end": angle} when
    the hand or foot must land on a fixed spot (two-bone IK, then the hand or foot at `end`)."""
    if isinstance(spec, dict):
        pts = [root, ik(root, spec["to"], SEG[bones[0]], SEG[bones[1]], spec["bend"]), spec["to"]]
        if "end" in spec:
            pts.append(step(spec["to"], spec["end"], SEG[bones[2]]))
        return pts
    pts = [root]
    for a, bone in zip(spec, bones):
        deg, scale = a if isinstance(a, tuple) else (a, 1.0)
        pts.append(step(pts[-1], deg, SEG[bone] * scale))
    return pts


def fk(hip, trunk, *, near_arm, far_arm, near_leg, far_leg, arc=0, back=1, head=None, face=None,
       torso=1.0, near_at=((0, 0), (0, 0)), far_at=((14, -10), (14, -10)), props=(), pins=()):
    """A mannequin from its hip, the trunk's angle and each limb. arc bends the spine towards the
    back (+, rounded) or the front (-, arched); `back` flips which side is the back. near_at/far_at
    offset each side's shoulder and hip: depth in a side view, width in a front view."""
    sh = step(hip, trunk, SEG["torso"] * torso)
    r = math.radians(trunk)
    bx, by = back * math.sin(r), -back * math.cos(r)
    spine = [sh] + [(round(sh[0] + (hip[0] - sh[0]) * t + bx * arc * math.sin(math.pi * t)),
                     round(sh[1] + (hip[1] - sh[1]) * t + by * arc * math.sin(math.pi * t)))
                    for t in (0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875)] + [hip]
    h = trunk if head is None else head
    head_c = step(step(sh, h, SEG["neck"]), h, SEG["head"])

    def side(arm, leg, at):
        return [chain(add(sh, at[0]), arm, BONES["arm"]), chain(add(hip, at[1]), leg, BONES["leg"])]

    # What this pose declares as pointing at the camera: check() lets nothing else look shorter.
    short = {f"{s} {bone}": a[1] for s, specs in (("near", (near_arm, near_leg)), ("far", (far_arm, far_leg)))
             for spec, kind in zip(specs, BONES) if not isinstance(spec, dict)
             for a, bone in zip(spec, BONES[kind]) if isinstance(a, tuple)} | ({"torso": torso} if torso != 1 else {})
    return {"head": head_c, "face": face, "torso": spine, "near": side(near_arm, near_leg, near_at), "short": short,
            "far": side(far_arm, far_leg, far_at), "props": list(props), "pins": list(pins)}


def solve(f, lo, hi, target, n=400):
    """The angle in [lo, hi] where f(angle) is closest to target (a scan: these are one-off guides)."""
    return min((lo + (hi - lo) * i / n for i in range(n + 1)), key=lambda a: abs(f(a) - target))


def _row(theta, ankle, hand, bend):
    """Inverted row: one rigid body pivoting on the heels, hands on the bar."""
    hip = step(ankle, theta, SEG["thigh"] + SEG["shin"])
    arm = {"to": hand, "bend": bend, "end": 270}
    leg = {"to": ankle, "bend": 1, "end": theta - 60}
    return fk(hip, theta, face=(0.3, -1),
              near_arm=arm, far_arm={**arm, "to": add(hand, (14, 0))}, near_leg=leg, far_leg=leg,
              far_at=((0, -12), (0, -12)), props=[((360, 462), (1000, 478))] + FLOOR(820), pins=[hand, ankle])


FRONT = (((-70, 0), (-42, 0)), ((70, 0), (42, 0)))  # front view: the hero's right side is image left
WALL = [((780, 0), (1024, 1024))] + FLOOR(900)
BENCH = [((90, 615), (330, 640)), ((105, 640), (125, 880)), ((295, 640), (315, 880))] + FLOOR(880)
# The bar sits over the chest. At x 830 it was past the shoulders, over the face, and at the top the
# elbows had nowhere to go but beyond the head.
ROW_ANKLE, ROW_HAND = (160, 800), (720, 468)
_row_bottom = solve(lambda t: math.dist(step(ROW_ANKLE, t, 690), ROW_HAND), 338, 360, 262)


def _wall(hip, trunk):
    arm = {"to": (782, 300), "bend": 1, "end": 280}  # elbows down: -1 folded them up, backwards
    leg = {"to": (295, 898), "bend": -1, "end": 5}
    return fk(hip, trunk, face=(1, 0), near_arm=arm, far_arm={**arm, "to": (782, 285)}, near_leg=leg,
              far_leg={**leg, "to": (307, 890)}, props=WALL, pins=[(782, 300), (295, 898)])


def _pike(hip, trunk, head):
    arm = {"to": (690, 878), "bend": 1, "end": 0}
    leg = {"to": (310, 856), "bend": -1, "end": 20}
    return fk(hip, trunk, head=head, face=(0.3, 1), near_arm=arm, far_arm={**arm, "to": (700, 868)}, near_leg=leg,
              far_leg={**leg, "to": (322, 848)}, props=FLOOR(880), pins=[(690, 878), (310, 856)])


def _bulgarian(hip, trunk):
    return fk(hip, trunk, face=(1, 0), near_arm=(100, 92), far_arm=(98, 90),
              near_leg={"to": (640, 858), "bend": -1, "end": 0}, far_leg={"to": (300, 598), "bend": -1, "end": 190},
              props=BENCH, pins=[(640, 858), (300, 598)])


def _crunch(trunk, arc, head, face, arms):
    leg = {"to": (770, 780), "bend": -1, "end": 15}
    return fk((540, 768), trunk, arc=arc, head=head, face=face, near_arm=arms, far_arm=tuple(a - 3 for a in arms),
              near_leg=leg, far_leg={**leg, "to": (782, 772)}, props=FLOOR(800), pins=[(770, 780)])


def _climber(near_in):
    arm = {"to": (705, 840), "bend": 1, "end": 0}
    tuck, back = (30, 160, 140), {"to": (85, 824), "bend": -1, "end": 70}
    return fk((450, 640), 352, face=(0.6, 1), near_arm=arm, far_arm={**arm, "to": (717, 832)},
              near_leg=tuck if near_in else back, far_leg=back if near_in else tuck, props=FLOOR(845), pins=[(705, 840)])


def _superman(arms, far_arms):
    return fk((440, 770), 352, arc=-15, head=340, face=(1, -0.3), near_arm=arms, far_arm=far_arms,
              near_leg=(176, 178, 178), far_leg=(177, 179, 179), props=FLOOR(800))


# slug: a_key, rep seconds, mode, every key's guide. Modes: "fresh" redraws A too (Guillaume: "redraw
# all, even our image"); "mirror" = a front or top view whose other side is A flipped, free and exact
# (both models failed every side swap seen from the side); "edit" keeps A.
V2 = {
    "wall_pushup": ("k2", 2, "fresh", {"k1": _wall((445, 485), 290), "k2": _wall(rot((445, 485), (295, 898), 12), 302)}),
    "pike_pushup": ("k2", 3, "fresh", {"k1": _pike((470, 445), 52, 75), "k2": _pike((492, 452), 74, 85)}),
    "inverted_row": ("k2", 3, "fresh", {"k1": _row(_row_bottom, ROW_ANKLE, ROW_HAND, -1), "k2": _row(334, ROW_ANKLE, ROW_HAND, -1)}),
    "bulgarian_split_squat": ("k2", 3, "fresh", {"k1": _bulgarian((490, 440), 272), "k2": _bulgarian((455, 610), 282)}),
    "crunch": ("k2", 2, "fresh", {"k1": _crunch(181, 0, None, (0, -1), (250, 107)),
                                  "k2": _crunch(202, 22, 214, (-0.3, -1), (280, 136))}),
    "reverse_crunch": ("k2", 2, "fresh", {
        "k1": fk((560, 770), 180, face=(0, -1), near_arm=(2, 0), far_arm=(4, 0), near_leg=(270, 0, 0),
                 far_leg=(272, 2, 2), props=FLOOR(800), pins=[(310, 770)]),
        # Only the hips lift: the shoulders and the head stay on k1's spots (they used to rise 120 px, the
        # arms standing under them like props).
        "k2": fk((553, 712), 166, arc=25, head=180, face=(0, -1), near_arm=(2, 0), far_arm=(4, 0),
                 near_leg=(240, 330, 330), far_leg=(242, 332, 332), props=FLOOR(800), pins=[(310, 770)])}),
    "superman_w": ("k2", 2, "fresh", {"k1": _superman((342, 340, 340), (340, 338, 338)),
                                      # A W: the elbows point out at the camera, so the upper arm is short.
                                      "k2": _superman(((170, 0.35), 350, 350), ((168, 0.35), 348, 348))}),
    "mountain_climber": ("k1", 1, "fresh", {"k1": _climber(True), "k2": _climber(False)}),
    # Seen from directly above, on the back on a mat, head at the top: the other side is the mirror image.
    "bicycle_crunch": ("k1", 2, "mirror", {
        "k1": fk((512, 640), 268, torso=0.85, near_at=FRONT[0], far_at=FRONT[1], near_arm=(20, 215), far_arm=(330, 200),
                 near_leg=(92, 92, 90), far_leg=((285, 0.6), (70, 0.5), (80, 0.4)), props=[[(340, 120), (684, 120), (684, 960), (340, 960)]]),
        "k2": None}),
    "skater_hop": ("k1", 1, "mirror", {
        "k1": fk((380, 550), 265, near_at=FRONT[0], far_at=FRONT[1], near_arm=((160, 0.9), (175, 0.9)),
                 far_arm=((130, 0.9), (160, 0.9)), near_leg=((95, 0.75), (88, 0.75), (90, 0.3)),
                 far_leg=((115, 0.8), (160, 0.7), (170, 0.4)), props=FLOOR(900), pins=[(345, 880)]),
        "k2": None}),
    "high_knees": ("k1", 1, "mirror", {
        "k1": fk((512, 520), 270, near_at=FRONT[0], far_at=FRONT[1], near_arm=((95, 0.9), (100, 0.7)),
                 far_arm=((95, 0.7), (262, 0.75)), near_leg=((95, 0.35), (95, 1.0), (95, 0.4)),
                 far_leg=(90, 90, (92, 0.5)), props=FLOOR(980)),
        "k2": None}),
}
for _slug, (_a_key, _rep, _mode, _keys) in V2.items():
    EXERCISES[_slug] = {"rep_s": _rep, "a_key": _a_key, "mode": _mode, "keys": _keys,
                        "times": [0.0, _rep / 2, float(_rep)], "same": {}}


FRESH = ("Draw a new square illustration for a fitness app. Image 1 is only a pose guide: a jointed mannequin "
         "(grey torso, spine, neck and head, the head's wedge is the nose; orange limbs are the side nearest "
         "the camera, blue limbs the far side; white dots are elbows, wrists, knees and ankles; white rings "
         "mark contact points; grey shapes are the floor and equipment). Nothing of its colours or flat "
         "shapes appears in the result. Image 2 shows the hero: draw this same hero, same face, hair, skin, "
         "build, outfit, shoes and glow effects, in the same comic-book art style, line work and colouring, "
         "on the same kind of plain dark background with the same lighting. Do not copy image 2's pose or "
         "framing: the pose, the camera angle and where the body sits in the frame all come from image 1, "
         "and the whole body fits in the frame with a margin. One person only, two arms, two legs.")
FRONT_NOTE = ("In this front view the orange limbs are the hero's RIGHT arm and leg (on the left of the picture) "
              "and the blue limbs the hero's LEFT arm and leg.")
POSE_TEXT.update({
    ("wall_pushup", "k2"): "Side view, the hero faces a wall on the right: the BOTTOM of a wall push-up. The body is one straight line from the heels to the head, leaning towards the wall, the chest close to it; elbows bent, pointing down and back, hands flat on the wall at shoulder height; feet flat on the floor about a leg's length from the wall.",
    ("wall_pushup", "k1"): "The hero is now at the TOP of the wall push-up: both arms straight, the body one straight line leaning a little less towards the wall, further from it.",
    ("pike_pushup", "k2"): "Side view facing right: the BOTTOM of a pike push-up. Hips high, the body an upside-down V; hands flat on the floor shoulder-width apart, elbows bent and pointing back; the top of the head almost touching the floor just in front of the hands; legs straight, heels lifted, on the balls of the feet.",
    ("pike_pushup", "k1"): "The hero is now at the TOP of the pike push-up: both arms fully straight, the head between the arms well above the floor, hips high, the body an upside-down V, legs straight.",
    ("inverted_row", "k2"): "Side view, head to the right: the TOP of an inverted row under a waist-high bar. The body is one rigid straight plank from the heels to the head, heels on the floor, toes up; hands grip the bar overhand just above the chest, the chest touching the bar, elbows bent and pointing down towards the floor and back towards the feet.",
    ("inverted_row", "k1"): "The hero is now at the BOTTOM of the inverted row: both arms fully straight, hanging from the bar, the body still one rigid straight plank from the heels to the head, just above the floor.",
    ("bulgarian_split_squat", "k2"): "Side view facing right: the BOTTOM of a Bulgarian split squat. The REAR foot rests on top of a bench behind the hero, laces down, sole up; the rear knee bent and almost touching the floor; the front foot flat on the floor well in front, the front knee bent about 90 degrees over the ankle, front thigh close to level; torso upright, leaning very slightly forward; arms relaxed by the sides.",
    ("bulgarian_split_squat", "k1"): "The hero is now at the TOP of the Bulgarian split squat: the front leg straight, the body tall and upright, the rear foot still resting laces down on the bench with that knee bent and pointing at the floor.",
    ("crunch", "k2"): "Side view, lying on the back, head to the left: the TOP of a crunch. The knees bent, feet flat on the floor; the shoulder blades and head curled up off the floor, the upper back rounded, the lower back still flat on the floor; fingertips lightly behind the ears, elbows wide.",
    ("crunch", "k1"): "The hero is now at the BOTTOM of the crunch: the head and shoulders back down, the whole back flat on the floor, knees still bent, feet flat, fingertips behind the ears.",
    ("reverse_crunch", "k2"): "Side view, lying on the back, head to the left: the TOP of a reverse crunch. Arms flat on the floor along the sides, palms down; the hips curled up off the floor, the knees pulled in over the chest, the shins pointing up, the lower back rounded off the floor; the head and shoulders stay on the floor.",
    ("reverse_crunch", "k1"): "The hero is now at the START of the reverse crunch: the whole back flat on the floor, the knees bent at 90 degrees straight above the hips with the shins level, arms flat on the floor along the sides.",
    ("superman_w", "k2"): "Side view, lying face down, head to the right: the W position of a superman W pull. The chest and head are lifted a hand's width off the floor, the legs straight and lifted a little; both elbows pulled back and down to the sides of the ribs like a pull-up, the forearms pointing forward, the hands beside the shoulders, thumbs up; eyes to the floor ahead.",
    ("superman_w", "k1"): "The hero now reaches the arms out for the start of the superman W: both arms straight forward past the head, hands off the floor, the chest and legs still lifted, the eyes to the floor ahead.",
    ("mountain_climber", "k1"): "Side view facing right: a mountain climber. A high plank on straight arms, hands flat under the shoulders; the knee NEAREST the camera driven forward under the chest, that foot off the floor; the far leg straight back on the ball of the foot; the back flat, hips level with the shoulders.",
    ("mountain_climber", "k2"): "The legs SWITCH: the leg NEAREST the camera is now straight back, on the ball of the foot, and the knee FARTHEST from the camera is driven forward under the chest, partly hidden behind the near arm; the back flat, hips level.",
    ("bicycle_crunch", "k1"): "Seen from directly above, the hero lying on the back on a dark mat, head at the top of the picture, feet at the bottom. A bicycle crunch: the shoulders curled up off the mat with the trunk twisted; fingertips behind the head; the hero's RIGHT elbow (left of the picture) crosses towards the hero's LEFT knee, which is pulled up to the chest; the hero's RIGHT leg is straight and long, just above the mat. " + FRONT_NOTE,
    ("skater_hop", "k1"): "Front view, the hero facing the camera: the landing of a skater hop. The hero has just bounded sideways and lands on the RIGHT foot (left of the picture), that knee bent, hips back, the chest leaning forward; the LEFT leg swings behind the landing leg, crossing behind it, that foot off the floor; the LEFT arm swings across in front of the body and the RIGHT arm swings out to the side. The hero stands in the left half of the frame. " + FRONT_NOTE,
    ("high_knees", "k1"): "Front view, the hero facing the camera: running in place with high knees. The RIGHT knee is driven up to hip height in front of the body (left of the picture), that foot off the floor under the knee; the LEFT leg straight on the ball of the foot; the LEFT arm bent at 90 degrees swinging forward and up, the RIGHT arm bent and swinging back; torso tall. " + FRONT_NOTE,
})
NEVER.update({
    "wall_pushup": "The hands stay flat on exactly the same spots of the wall and the feet on the same spots of the floor.",
    "pike_pushup": "The hands and feet stay on exactly the same spots of the floor.",
    "inverted_row": "The hands stay on exactly the same spots of the bar and the heels on the same spot of the floor. The bar does not move.",
    "bulgarian_split_squat": "The front foot stays flat on exactly the same spot and the rear foot stays on the same spot of the bench. The bench does not move.",
    "crunch": "The feet stay flat on the same spot and the hips and lower back stay on the floor.",
    "reverse_crunch": "The head, shoulders and arms stay on exactly the same spots of the floor.",
    "superman_w": "The hips and legs stay exactly where they are; only the arms move.",
    "mountain_climber": "Both hands stay flat on exactly the same spots of the floor; the shoulders stay over the hands.",
})
VIDEO_MOTION.update({
    "wall_pushup": "One slow wall push-up. The hands on the wall and the feet on the floor never move; the straight body leans in as the elbows bend, then the arms press it back.",
    "pike_pushup": "One slow pike push-up. The hands and feet never move; the hips stay high; the elbows bend and the head lowers towards the floor in front of the hands, then the arms press back to straight.",
    "inverted_row": "One slow inverted row. The heels and the hands on the bar never move; the rigid straight body pulls up until the chest touches the bar, then lowers to straight arms.",
    "bulgarian_split_squat": "One slow Bulgarian split squat. The front foot and the rear foot on the bench never move; the hips lower straight down until the rear knee nearly touches the floor, then rise.",
    "crunch": "One slow crunch on the back. The feet and lower back never move; the head and shoulders curl up off the floor, then lower.",
    "reverse_crunch": "One slow reverse crunch on the back. The head, shoulders and arms never move; the knees pull in over the chest as the hips curl off the floor, then lower back to 90 degrees.",
    "superman_w": "One slow superman W pull, lying face down with the chest lifted. The hips and legs never move; the straight arms reach forward, then the elbows pull back to the ribs like a pull-up, then reach forward again.",
    "mountain_climber": "Mountain climbers at an easy pace. The hands never move and the hips stay level; the near knee drives under the chest while the far leg is back, then the legs switch, one knee at a time.",
    "bicycle_crunch": "One slow bicycle crunch seen from above. The right elbow comes to the left knee as the right leg extends, then the left elbow comes to the right knee as the left leg extends.",
    "skater_hop": "Skater hops at an easy pace: a bound sideways landing on one foot, the other leg sweeping behind, then a bound back to the other side.",
    "high_knees": "High knees at an easy pace, running in place: one knee up to hip height, then the other, arms pumping opposite.",
})


def fresh(slug, n):
    """A new A for a "fresh" exercise: image 1 = the mannequin of A's key, image 2 = the shipped still
    (the hero's identity and the style only). The old A is kept as A/<slug>_orig.png on adoption."""
    ex = EXERCISES[slug]
    key = ex["a_key"]
    guide = draw(slug, key)
    still = PILOT / "A" / (f"{slug}_orig.png" if (PILOT / "A" / f"{slug}_orig.png").exists() else f"{slug}.png")
    out = PILOT / "poses" / slug / f"A_O{n}.png"
    if out.exists():
        return out
    made = openai_edit(f"{FRESH} {POSE_TEXT[(slug, key)]}", (guide, still), out, step="pose", slug=slug, key="A", route="O")
    if made:
        magick(guide, made, "-resize", "1280x1280!", "-compose", "blend", "-define", "compose:args=50", "-composite",
               out.with_name(out.stem + "_onion.png"))
    return made


def adopt(slug, cand):
    """The accepted new A replaces the cached A (the shipped still in assets/ is never touched)."""
    a, orig = PILOT / "A" / f"{slug}.png", PILOT / "A" / f"{slug}_orig.png"
    if not orig.exists():
        shutil.copy(a, orig)
    magick(cand, "-resize", "1024x1024", a)
    return a


def mirror(slug):
    """k2 of a "mirror" exercise: A flipped left to right, logged as a local step."""
    ex = EXERCISES[slug]
    other = "k2" if ex["a_key"] == "k1" else "k1"
    src, out = PILOT / "A" / f"{slug}.png", PILOT / "poses" / slug / f"{other}_M1.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    magick(src, "-flop", out)
    log({"provider": "local", "model": "imagemagick", "step": "mirror", "slug": slug, "key": other,
         "file": str(out.relative_to(PILOT)), "inputs": [{"name": str(src.relative_to(PILOT)), "sha256": sha(src)}],
         "date": now(), "cost_usd": 0})
    acc = json.loads(ACCEPTED.read_text())
    acc.setdefault(slug, {})[other] = str(out.relative_to(PILOT))
    ACCEPTED.write_text(json.dumps(acc, indent=1))
    return out


# v2 edits that keep A (Guillaume's review, 10/11). The pilot and lot guides re-render through the v2
# mannequin as they are; these change keys, add keys or fix a guide.
_slgb = EXERCISES["single_leg_glute_bridge"]["keys"]["k2"]
# The lot-2 guide had the raised leg on the NEAR side, but in A it is the far one, behind the bent
# working leg: the drawn bottom swapped the legs (Guillaume: "the legs got inverted").
_slgb["near"], _slgb["far"] = [_slgb["near"][0], _slgb["far"][1]], [_slgb["far"][0], _slgb["near"][1]]
_slgb["pins"] = [_slgb["near"][1][-1]]
EXERCISES["dip"]["keys"]["k3"] = {**dip_pose(0), "face": (1, 0), "pins": [(535, 495)]}
EXERCISES["dead_bug"].update({"rep_s": 4, "times": [0.0, 1.0, 2.0, 3.0, 4.0], "same": {"k3": "k1"}})
EXERCISES["dead_bug"]["keys"] = {
    "k1": EXERCISES["dead_bug"]["keys"]["k1"], "k2": None, "k3": None,
    # The other side: the arm and leg nearest the camera extend, the far ones come back up.
    "k4": _guide((250, 592), [(336, 606), (563, 648)],
                 near=[[(340, 600), (215, 616), (90, 632)], [(563, 648), (775, 654), (983, 650)]],
                 far=[[(330, 600), (355, 475), (380, 345)], [(555, 645), (560, 480), (730, 480)]],
                 props=FLOOR(700))}
EXERCISES["pistol_squat"] = {"rep_s": 4, "a_key": "k2", "times": [0.0, 2.0, 4.0], "same": {}, "keys": {
    # Side view facing left, arms forward. A = bottom; drawn: top, standing tall on one leg.
    "k1": fk((712, 480), 268, face=(-1, 0), near_arm=(182, 180, 180), far_arm=(184, 182, 182),
             near_leg={"to": (722, 916), "bend": 1, "end": 180}, far_leg=(150, 165, 170),
             props=FLOOR(930), pins=[(722, 916)]),
    "k2": None}}
for _s, _pins in {"knee_pushup": [(293, 661), (677, 583)], "standing_calf_raise": [(690, 880), (440, 880)],
                  "bear_crawl": [], "flutter_kicks": [(240, 475)], "worlds_greatest_stretch": [(330, 880), (290, 994), (845, 781)]}.items():
    for _k, _g in EXERCISES[_s]["keys"].items():
        if _g is not None:
            _g["pins"] = _pins
POSE_TEXT.update({
    ("dip", "k3"): "The hero is now at the BOTTOM of a dip: the body lowered between the bars, elbows bent about 90 degrees and pointing straight back, the upper arms close to level, shoulders just above elbow height and pressed down away from the ears, torso tilted slightly forward, chest proud. The legs keep exactly the same bent shape as in image 1, feet together behind, off the floor, and simply move down with the hips.",
    ("cat_cow", "k2"): "The hero is now in a GENTLE cow position: the middle of the back dips only slightly into a shallow, soft curve, the belly relaxed, the tailbone tilting up a little, the chest moving forward, the head lifted to look forward and slightly up. Arms straight. A mild arch, not a deep sway.",
    ("cat_cow", "k4"): "The hero is now in the CAT position: the whole back rounds UP into a deep, even dome from the tailbone to the neck, like an angry cat, the middle of the back the highest point; the tailbone tucks under, the belly draws in, the head drops between the straight arms, chin towards the chest, eyes to the knees.",
    ("single_leg_glute_bridge", "k2"): "The hero is now at the BOTTOM of a single-leg glute bridge: the hips lowered all the way, the buttocks resting on the floor, the back flat on the floor. Same legs as image 1: the leg FARTHER from the camera (with the silver shin guard and the glowing shoe) stays straight and extended in the air, lowered with the hips, passing BEHIND the other leg; the leg NEAREST the camera (white sock, foot flat) stays bent with its foot flat on the floor where it is in image 1.",
    ("dead_bug", "k4"): "The hero now does the OTHER SIDE of the dead bug: the arm NEAREST the camera, which points to the ceiling in image 1, now reaches straight overhead to rest just above the floor behind the head; the arm FARTHER from the camera now points straight up to the ceiling. The leg NEAREST the camera, bent in image 1, now extends long and straight just above the floor; the leg FARTHER from the camera is now bent at 90 degrees above the hips, shin level. Lower back pressed to the floor.",
    ("pistol_squat", "k1"): "The hero is now at the TOP of a pistol squat: standing tall on the one leg whose foot is flat on the floor, that leg fully straight; the other leg held straight out in front, off the floor, a little lower than in image 1; both arms still straight forward at shoulder height; torso upright.",
    ("standing_calf_raise", "k2"): "Focus on the calves: the legs are now at the BOTTOM of a calf raise, both heels pressed flat on the floor, the whole sole of each shoe flat and level, the calf muscles relaxed and long; knees straight; the balls of the feet on the same spots; the legs and knees are lower in the frame than in image 1 by about the height of a heel lift.",
    ("bear_crawl", "k2"): "The hero now takes the NEXT STEP of a bear crawl, as the guide shows: the hand NEAREST the camera is now back under its shoulder and the hand FARTHER from the camera reaches forward; the foot NEAREST the camera steps forward under the hip and the foot FARTHER from the camera is back. Knees a hand above the floor, back flat.",
    ("flutter_kicks", "k2"): "The legs now SWAP in a flutter kick, as the guide shows: the leg NEAREST the camera is now the HIGHER one and the leg FARTHER from the camera the LOWER one; both legs stay straight and off the floor.",
})
NEVER.setdefault("pistol_squat", "The standing foot stays flat on exactly the same spot of the floor.")
VIDEO_MOTION.update({
    "pistol_squat": "One slow pistol squat on one leg. The standing foot never moves; the free leg is held straight forward off the floor; the hips lower all the way down, then rise back to standing tall.",
    "dead_bug": "Two slow dead bug reps, one per side, lying on the back with the lower back pressed to the floor: one arm reaches overhead as the opposite leg extends, both return; then the other arm and the other leg.",
    "archer_pushup": "One slow archer push-up to one side. The hands and both feet never move at all, the toes stay planted on the same spot for the whole clip. From straight wide arms the chest lowers towards one hand as that elbow bends while the other arm stays straight out to the side, then presses back up to the centre.",
})


# Retry 1 of the fresh stills (blind scores, 10/11): each line names what the first pair missed.
POSE_TEXT[("inverted_row", "k2")] += " The bar is LOW, at standing hip height, in the middle of the picture, NOT at head height; the body is a low diagonal close to the floor, about 25 degrees from horizontal, the elbows clearly pointing down to the floor."
POSE_TEXT[("crunch", "k2")] += " Curl HIGH: the shoulder blades clearly lifted well off the floor, the upper back rounded so the torso rises at about 35 degrees from the floor, chin slightly tucked, eyes to the knees. It must not look like lying flat."
POSE_TEXT[("reverse_crunch", "k2")] += " The hips and lower back are clearly LIFTED off the floor by a hand's width, the pelvis rolled up towards the ribs, the knees over the face and chest, the shins angled up and back towards the head."
POSE_TEXT[("superman_w", "k2")] += " The forearms point FORWARD, level with the floor, the open hands beside and a little in front of the head; both straight legs lifted and visible separately."
POSE_TEXT[("bicycle_crunch", "k1")] += " The crossing must be obvious: the RIGHT elbow reaches over the stomach and touches the LEFT knee in the middle of the body, the shoulders clearly twisted; the bent knee is on the picture RIGHT, the straight leg on the picture LEFT."


# Retry 1 of the v2 edits (blind scores, 10/11).
POSE_TEXT[("dead_bug", "k4")] += " BOTH arms must change compared with image 1: the arm that lies overhead in image 1 now points straight up to the ceiling, and the arm that points up in image 1 now lies overhead behind the head. The legs swap too."
POSE_TEXT[("flutter_kicks", "k2")] += " The change must be obvious: the leg that is HIGH in image 1 is now LOW, a hand above the floor, and the leg that is LOW in image 1 is now HIGH, raised to about 45 degrees."
POSE_TEXT[("worlds_greatest_stretch", "k2")] += " The hand of that arm is NOT on the floor: the whole forearm lies flat on the floor, the elbow touching the floor right beside the inside of the front foot, the chest dropped low over the front thigh."
POSE_TEXT[("bear_crawl", "k2")] += " In image 1 one hand is forward of the other: in the new pose the OTHER hand is the forward one, and the same for the feet."
POSE_TEXT[("knee_pushup", "k1")] += " Do not move the hands or knees at all: draw the hands and knees exactly over their pixels in image 1."
POSE_TEXT[("standing_calf_raise", "k2")] += " Do not move the feet sideways or change their size: the toes of each shoe stay exactly over their pixels in image 1; only the heels come down."


# Retry 2 (last) of the fresh stills.
POSE_TEXT[("inverted_row", "k2")] += " Think of a sturdy bar at the height of a dining table: standing next to it, it would reach the hero's hips. The feet are far from the bar, so the body slopes gently, the head much lower than a standing head."
POSE_TEXT[("superman_w", "k2")] += " The chest and shoulders are lifted HIGH off the floor, the upper body clearly raised like a banana shape, the elbows tucked in to the sides of the ribs."
POSE_TEXT[("bicycle_crunch", "k1")] += " The RIGHT elbow is NOT behind the head: it is in front of the body, across the belly, touching the LEFT knee."


# --- v3 (2026-11-10, Guillaume's second review) ---------------------------------------------------
# "Redo without the old pictures, as if it were a new exercise": every key gets an fk guide, A is drawn
# from its guide with a style reference only (no picture of that exercise), the other keys are drawn
# with the guide FIRST and the new A second as the hero (`fresh_key`): with A first, both models anchor
# to A's pose and the side swaps never happen.
STYLE_REF = pathlib.Path(os.environ["ANIM_STYLE_REF"]) if os.environ.get("ANIM_STYLE_REF") else (
    PILOT / "A" / "squat_orig.png" if (PILOT / "A" / "squat_orig.png").exists() else PILOT / "A" / "squat.png")
HERO = os.environ.get("ANIM_HERO", "an athletic hero of the same kind")  # Guillaume, 10/11: "un personnage masculin"
NEW = ("Draw a new square illustration for a fitness app. Image 1 is only a pose guide: a jointed mannequin "
       "(grey torso, spine and neck; the yellow disc is the head, its red-orange wedge the nose, the black dot an eye; green mittens are the hands, bright green near, dark green far; orange limbs are the side nearest the "
       "camera, blue limbs the far side; white dots are joints; white rings mark contact points; grey shapes are "
       "the floor and equipment). Nothing of its colours or flat shapes appears in the result: no yellow head, no green mittens. Image 2 is a STYLE "
       "reference only: draw in exactly its comic-book art style, line work, colouring and lighting, on a plain "
       "dark background, with " + HERO + " in sports clothes. Do not copy image 2's pose, "
       "framing or props: the pose, the camera angle and where the body sits in the frame all come from image 1, "
       "and the whole body fits in the frame with a margin. One person only, two arms, two legs.")
SAME = ("Image 1 is only a pose guide: a jointed mannequin (grey torso, spine and neck; the yellow disc is the head, its red-orange wedge the nose, "
        "the black dot an eye; green mittens are the hands, bright green near, dark green far; orange limbs are the side nearest the camera, blue limbs the far side; white dots are joints; "
        "white rings mark contact points that never move). Nothing of its colours or flat shapes appears: no yellow head, no green mittens. Image 2 "
        "shows the hero: redraw image 2 with the same hero, outfit, background, lighting, art style, camera, "
        "framing and scale, changing ONLY the pose so that it matches image 1 exactly, limb by limb, near and far "
        "side included. One person only, two arms, two legs.")


def fresh_new(slug, n):
    """v3 A: guide + style reference, no picture of this exercise."""
    key = EXERCISES[slug]["a_key"]
    guide = draw(slug, key)
    out = PILOT / "poses" / slug / f"A_N{n}.png"
    if out.exists():
        return out
    made = openai_edit(f"{NEW} {POSE_TEXT[(slug, key)]}", (guide, STYLE_REF), out, step="pose", slug=slug, key="A", route="O")
    if made:
        magick(guide, made, "-resize", "1280x1280!", "-compose", "blend", "-define", "compose:args=50", "-composite",
               out.with_name(out.stem + "_onion.png"))
    return made


def fresh_key(slug, key, n, base=None):
    """v3 other key: image 1 = its guide, image 2 = the new A (or `base`) as the hero and the scene."""
    guide = draw(slug, key)
    a = PILOT / base if base else PILOT / "A" / f"{slug}.png"
    out = PILOT / "poses" / slug / f"{key}_N{n}.png"
    if out.exists():
        return out
    made = openai_edit(f"{SAME} {POSE_TEXT[(slug, key)]} {NEVER.get(slug, '')}", (guide, a), out,
                       step="pose", slug=slug, key=key, route="O")
    if made:
        magick(a, made, "-resize", "1280x1280!", "-compose", "blend", "-define", "compose:args=50", "-composite",
               out.with_name(out.stem + "_onion.png"))
    return made


def _archer(bottom):
    # Each arm is 416 px in both keys (the far one grew to 490 at the bottom, the near forearm shrank to
    # 128), and the top is centred between the hands.
    if bottom:  # chest lowered over the near (orange, picture right) hand, the far arm straight out
        return _guide((612, 525), [(602, 618), (548, 652)],
                      near=[[(700, 624), (847, 545), (847, 748)], [(566, 652), (606, 660), (634, 662)]],
                      far=[[(504, 612), (306, 680), (108, 748)], [(524, 650), (432, 658), (364, 662)]], props=FLOOR(760))
    return _guide((478, 300), [(478, 430), (497, 600)],
                  near=[[(578, 430), (712, 589), (847, 748)], [(540, 600), (590, 640), (634, 662)]],
                  far=[[(378, 430), (243, 589), (108, 748)], [(455, 600), (410, 640), (364, 662)]], props=FLOOR(760))


def _curtsy(bottom):
    arms = dict(near_arm=((100, 0.7), (10, 0.6)), far_arm=((80, 0.7), (170, 0.6)))
    if bottom:
        return fk((505, 640), 272, near_at=FRONT[0], far_at=FRONT[1], **arms,
                  near_leg={"to": (420, 935), "bend": 1, "end": 90}, far_leg={"to": (330, 905), "bend": -1, "end": 100},
                  props=FLOOR(960), pins=[(420, 935)])
    return fk((512, 495), 270, near_at=FRONT[0], far_at=FRONT[1], **arms,
              near_leg=(92, 90, (90, 0.4)), far_leg=(88, 90, (90, 0.4)), props=FLOOR(960), pins=[(450, 935)])


def _slgb(top):
    hip = (560, 600) if top else (560, 768)
    trunk = 145 if top else 180
    leg = 325 if top else 335
    arm = 9 if top else 2  # flat on the floor along the body (an ik arm put the elbow under the floor)
    return fk(hip, trunk, head=180, face=(0, -1), near_arm=(arm, arm, arm),
              far_arm=(arm - 1, arm - 1, arm - 1), near_leg=(leg, leg, leg - 30),
              far_leg={"to": (735, 775), "bend": -1, "end": 0}, props=FLOOR(790), pins=[(735, 775)])


def _bear(near_hand_forward):
    # Feet behind the hips and on their balls, knees under the belly. They were ahead of the hips, flat,
    # which sent the knees to the wrists and bent the ankles 60 degrees past flat.
    hf, hb, ff, fb = (720, 800), (640, 800), (330, 752), (250, 752)
    nh, fh = (hf, hb) if near_hand_forward else (hb, hf)
    nf, ff_ = (fb, ff) if near_hand_forward else (ff, fb)  # opposite foot goes with the forward hand
    return fk((420, 545), 0, head=345, face=(1, 0.3), near_arm={"to": nh, "bend": 1, "end": 0},
              far_arm={"to": add(fh, (10, -8)), "bend": 1, "end": 0}, near_leg={"to": nf, "bend": -1, "end": 60},
              far_leg={"to": add(ff_, (10, -8)), "bend": -1, "end": 60}, props=FLOOR(805))


def _flutter(near_high):
    hi, lo = (333, 333, 300), (352, 352, 330)
    return fk((560, 765), 200, head=195, face=(0.3, -1), near_arm=(100, 5, 5), far_arm=(98, 3, 3),
              near_leg=hi if near_high else lo, far_leg=lo if near_high else hi, props=FLOOR(800), pins=[(560, 765)])


def _wgs(up):
    # The back knee points at the floor (bend +1 bent it backwards) and the back foot stands on its ball
    # (it went through the floor); the whole hero sits 40 px to the right so that leg stays long.
    pins = [(660, 880), (740, 880), (40, 832)]
    legs = dict(near_leg={"to": (740, 880), "bend": -1, "end": 0}, far_leg={"to": (40, 832), "bend": -1, "end": 65})
    if up:
        return fk((470, 800), 340, head=330, face=(0.2, -1), near_arm={"to": (660, 880), "bend": 1, "end": 0},
                  far_arm=(270, 270, 270), **legs, props=FLOOR(885), pins=pins)
    return fk((470, 800), 5, head=15, face=(0.3, 1), near_arm={"to": (660, 880), "bend": 1, "end": 0},
              far_arm=((100, 0.4), 0, 0), **legs, props=FLOOR(885), pins=pins)


def _pistol(bottom):
    arms = dict(near_arm=(182, 180, 180), far_arm=(184, 182, 182))
    if bottom:
        return fk((820, 790), 250, face=(-1, 0), **arms, near_leg={"to": (722, 916), "bend": 1, "end": 180},
                  far_leg=(178, 178, 215), props=FLOOR(930), pins=[(722, 916)])
    return fk((712, 480), 268, face=(-1, 0), **arms, near_leg={"to": (722, 916), "bend": 1, "end": 180},
              far_leg=(152, 150, 190), props=FLOOR(930), pins=[(722, 916)])  # (150, 165): a knee bent backwards


V3 = {  # slug: a_key, rep seconds, keys (in order), times, same
    "cat_cow": ("k4", 6, {"k1": cat_pose(0), "k2": cat_pose(-1), "k3": cat_pose(0), "k4": cat_pose(1)}, [0.0, 1.5, 3.0, 4.5, 6.0], {"k3": "k1"}),
    "wall_pushup": ("k2", 2, V2["wall_pushup"][3], None, {}),
    "pike_pushup": ("k2", 3, V2["pike_pushup"][3], None, {}),
    "inverted_row": ("k2", 3, V2["inverted_row"][3], None, {}),
    "archer_pushup": ("k2", 3, {"k1": _archer(False), "k2": _archer(True)}, None, {}),
    "curtsy_squat": ("k2", 3, {"k1": _curtsy(False), "k2": _curtsy(True)}, None, {}),
    "single_leg_glute_bridge": ("k1", 3, {"k1": _slgb(True), "k2": _slgb(False)}, None, {}),
    "bear_crawl": ("k1", 2, {"k1": _bear(True), "k2": _bear(False)}, None, {}),
    "flutter_kicks": ("k1", 1, {"k1": _flutter(True), "k2": _flutter(False)}, None, {}),
    "worlds_greatest_stretch": ("k1", 2, {"k1": _wgs(True), "k2": _wgs(False)}, None, {}),
    "pistol_squat": ("k2", 4, {"k1": _pistol(False), "k2": _pistol(True)}, None, {}),
}
for _slug, (_a_key, _rep, _keys, _times, _same) in V3.items():
    EXERCISES[_slug] = {"rep_s": _rep, "a_key": _a_key, "mode": "new", "keys": _keys, "same": _same,
                        "times": _times or [0.0, _rep / 2, float(_rep)]}
# Bicycle crunch, again from above, with the crossing elbow ON the knee in the guide.
V2["bicycle_crunch"][3]["k1"] = fk((512, 640), 268, torso=0.85, near_at=FRONT[0], far_at=FRONT[1], near_arm=(35, 190),
                                   far_arm=(330, 200), near_leg=(92, 92, 90), far_leg=((282, 0.55), (70, 0.5), (80, 0.4)),
                                   props=[[(340, 120), (684, 120), (684, 960), (340, 960)]])
EXERCISES["bicycle_crunch"]["mode"] = "new"
# More pictures where Guillaume asked the movement to go on.
EXERCISES["reverse_crunch"]["keys"]["k3"] = fk((560, 770), 180, face=(0, -1), near_arm=(2, 0), far_arm=(4, 0),
                                                near_leg=(338, 338, 330), far_leg=(340, 340, 332), props=FLOOR(800), pins=[(310, 770)])
EXERCISES["reverse_crunch"].update({"rep_s": 3, "times": [0.0, 1.0, 2.0, 3.0]})
# k1 near knee in (A), k2 plank, k3 far knee in, k4 plank again: one full left-right cycle.
_plank = fk((450, 640), 352, face=(0.6, 1), near_arm={"to": (705, 840), "bend": 1, "end": 0},
            far_arm={"to": (717, 832), "bend": 1, "end": 0}, near_leg={"to": (85, 824), "bend": -1, "end": 70},
            far_leg={"to": (100, 816), "bend": -1, "end": 70}, props=FLOOR(845), pins=[(705, 840)])
EXERCISES["mountain_climber"].update({"rep_s": 2, "times": [0.0, 0.5, 1.0, 1.5, 2.0], "same": {"k4": "k2"},
                                      "keys": {"k1": None, "k2": _plank, "k3": _climber(False), "k4": None}})
POSE_TEXT[("mountain_climber", "k3")] = POSE_TEXT[("mountain_climber", "k2")]
POSE_TEXT.update({
    ("cat_cow", "k4"): "Side view facing right, on hands and knees: the CAT position. Hands under the shoulders, knees under the hips; the whole back rounds UP into a deep even dome from the tailbone to the neck, the tailbone tucked, the head dropped between the straight arms, chin to the chest.",
    ("cat_cow", "k1"): "The hero is now in a NEUTRAL tabletop: the back flat from the tailbone to the head, head in line, eyes to the floor. Arms straight, hands and knees on the same spots.",
    ("cat_cow", "k2"): "The hero is now in a GENTLE cow: a shallow, soft dip in the middle of the back, the head lifted to look forward. Arms straight, hands and knees on the same spots. A mild arch only.",
    ("archer_pushup", "k2"): "Front view, the camera low in front of the hero's head: the BOTTOM of an archer push-up. A plank with the hands flat on the floor very wide apart; the chest lowered over the hero's LEFT hand (right of the picture), that elbow bent; the other arm fully straight out to the side; legs straight behind, feet together on the toes. The feet stay still.",
    ("archer_pushup", "k1"): "The hero is now at the TOP of the archer push-up: both arms fully straight and very wide, the chest centred between the hands, the body one straight plank; the feet together on the same spot.",
    ("curtsy_squat", "k2"): "Front view, facing the camera: the BOTTOM of a curtsy squat. The hero's RIGHT foot (left of the picture) is flat on the floor, that knee bent over the toes; the LEFT leg has stepped diagonally BEHIND the right leg, crossing behind it, on the ball of the foot, the left knee bent low towards the floor; hips square to the camera, torso upright, hands clasped in front of the chest.",
    ("curtsy_squat", "k1"): "The hero is now standing tall at the TOP of the curtsy squat: both feet side by side, hip-width apart, legs straight, hands clasped in front of the chest.",
    ("single_leg_glute_bridge", "k1"): "Side view, lying on the back, head to the left: the TOP of a single-leg glute bridge. Shoulders and arms flat on the floor; the leg FARTHER from the camera bent, its foot flat on the floor; the hips lifted high so the body is one straight line from the shoulders to the knee; the leg NEAREST the camera straight and raised, in line with the body.",
    ("single_leg_glute_bridge", "k2"): "The hero is now at the BOTTOM of the single-leg glute bridge: the hips down on the floor, the back flat; the far leg still bent with its foot flat on the same spot; the near leg still straight and raised in the air.",
    ("bear_crawl", "k1"): "Side view facing right: a bear crawl. On hands and feet, the knees bent and hovering a hand above the floor, the back flat and level; the hand NEAREST the camera is forward, the far hand back; the FAR foot is forward and the near foot back (opposite hand and foot forward together).",
    ("bear_crawl", "k2"): "The next step of the bear crawl: now the hand FARTHER from the camera is forward and the near hand back; the NEAR foot is forward and the far foot back. Knees still hovering, back flat.",
    ("flutter_kicks", "k1"): "Side view, head to the left: flutter kicks. Lying on the back, propped on both forearms, the hips on the floor; both legs straight and off the floor; the leg NEAREST the camera HIGH, at about 30 degrees, the far leg LOW, just above the floor.",
    ("flutter_kicks", "k2"): "The legs swap: now the leg FARTHER from the camera is HIGH, at about 30 degrees, and the leg NEAREST the camera is LOW, just above the floor. Same forearms, same hips.",
    ("worlds_greatest_stretch", "k1"): "Side view facing right: the world's greatest stretch. A deep lunge, the front foot flat, the back leg long and straight on the ball of the foot; the near hand flat on the floor inside the front foot; the chest turned open and the far arm reaching straight up to the ceiling, eyes following the hand.",
    ("worlds_greatest_stretch", "k2"): "Same deep lunge: now the far arm comes down and its forearm lies flat on the floor, the elbow beside the inside of the front foot, the chest low over the front thigh, facing the floor. The near hand, the front foot and the back foot stay on the same spots.",
    ("pistol_squat", "k2"): "Side view facing left: the BOTTOM of a pistol squat. Balanced on one foot flat on the floor, that knee fully bent, the hips all the way down near the heel; the other leg held straight out in front, off the floor; both arms straight forward at shoulder height; torso leaning slightly forward.",
    ("pistol_squat", "k1"): "The hero is now at the TOP of the pistol squat: standing tall on the same one straight leg, the other leg held straight out in front, off the floor; both arms straight forward.",
    ("reverse_crunch", "k3"): "The hero now EXTENDS both legs: the back flat on the floor, both legs straight and long together, pointing away at about 20 degrees above the floor, toes pointed; arms flat on the floor along the sides, head and shoulders on the same spots.",
    ("mountain_climber", "k2"): "The hero is now in a straight HIGH PLANK between two steps: both legs straight back, both feet on the balls of the feet next to each other, the body one straight line from the head to the heels, hands on the same spots.",
})
NEVER.update({
    "cat_cow": NEVER["cat_cow"], "archer_pushup": "Both hands stay flat on exactly the same spots, very wide apart, and the feet stay on exactly the same spot.",
    "curtsy_squat": "The front foot stays flat on exactly the same spot.",
    "single_leg_glute_bridge": "The bent leg's foot, the shoulders and the head stay on exactly the same spots.",
    "bear_crawl": "The camera, the framing and the background do not move; the hero stays at the same place in the frame.",
    "flutter_kicks": "The forearms, the hips and the upper body stay exactly where they are.",
    "worlds_greatest_stretch": "The near hand, the front foot and the back foot stay on exactly the same spots.",
    "pistol_squat": "The standing foot stays flat on exactly the same spot.",
})
VIDEO_MOTION.update({
    "curtsy_squat": "One slow curtsy squat. The front foot never moves; one leg steps diagonally behind the other and both knees bend low, then the hero rises and steps back to standing.",
    "reverse_crunch": "One slow reverse crunch with a leg extension, on the back. The head, shoulders and arms never move; from knees at 90 degrees the knees pull in over the chest as the hips curl up, then both legs extend long and low, then return to 90 degrees.",
    "mountain_climber": "Mountain climbers at an easy pace. The hands never move and the hips stay level; the near knee drives under the chest, then the far knee, one at a time, passing through a straight plank.",
    "flutter_kicks": "Flutter kicks propped on the forearms. The straight legs alternate up and down in small kicks, the hips and upper body staying still.",
    "bear_crawl": "One bear crawl step on all fours with the knees just off the floor. Opposite hand and foot step forward together, then the other pair, the back staying flat.",
    "worlds_greatest_stretch": "One slow world's greatest stretch in a deep lunge. The feet and the planted hand stay put. The arm sweeps up to the ceiling as the chest opens, then the forearm drops to the floor inside the front foot.",
})


# v3 retry 1 (blind scores).
POSE_TEXT[("archer_pushup", "k2")] += " Camera further back: the whole body small enough that both hands sit well inside the frame with a clear margin on each side, and the straight legs and feet visible behind the hips."
POSE_TEXT[("curtsy_squat", "k2")] += " The crossing is the whole point: the LEFT foot lands BEHIND and to the RIGHT of the right foot (on the left of the picture), so the left thigh crosses behind the right knee, like a curtsy; NOT a side lunge."
POSE_TEXT[("flutter_kicks", "k1")] += " Keep the whole hero small in the frame, the feet well inside the right edge with a clear margin."
POSE_TEXT[("bicycle_crunch", "k1")] += " The bent knee is pulled HIGH, right up to the chest, and the elbow TOUCHES that knee; the shoulders and head are clearly curled up off the mat."


# v3 retry 2 (last).
POSE_TEXT[("archer_pushup", "k2")] += " The bent arm is DEEPLY bent, the elbow at 90 degrees, the chest and head almost touching the floor beside that hand; the hero is drawn smaller, centred, with the hands at least a hand's width from each edge."
POSE_TEXT[("curtsy_squat", "k2")] = ("Three-quarter front view, the hero facing the camera and slightly to the picture's left: the BOTTOM of a "
    "curtsy squat. The right foot flat in front, that knee bent; the left leg has stepped BEHIND the right leg and across it, "
    "so the left shin is seen BEHIND the right calf and the left foot (on its ball) appears on the far side of the right foot; "
    "both knees bent low, hips square, torso upright, hands clasped at the chest. The legs cross like an X behind the front knee.")


# v3 second poses, retry 1.
POSE_TEXT[("cat_cow", "k2")] += " The head lifts only a little, eyes forward and slightly down, the neck long; the hands do not move forward."
POSE_TEXT[("worlds_greatest_stretch", "k2")] += " Show the forearm clearly: from the elbow on the floor next to the inner arch of the front foot, the forearm and hand lie flat on the floor pointing forward."
POSE_TEXT[("bear_crawl", "k2")] += " The step must be obvious: the forward hand of image 2 is now clearly BEHIND the other hand, by a full forearm length, and the same for the feet."


# --- anatomy (2026-11-10, Guillaume: "impossible, not human" guides mislead the image models) --------
# Degrees. A signed limit needs to know where the belly is, so it holds in side views only; elsewhere
# (front, back, top, three-quarter) the same limit is applied to the size of the angle.
LIMITS = {
    "elbow": (-5, 160),       # 0 = straight, below 0 = bent the wrong way
    "knee": (-5, 160),
    "shoulder": (-100, 200),  # upper arm against the trunk: + = forward, 180 = overhead, - = behind
    "hip": (-50, 150),        # thigh against the trunk: + = forward
    "wrist": (-100, 100),     # hand against the forearm, either way
    "ankle": (-10, 125),      # foot against the shin: 90 = flat-footed, 0 = toes pointed, - = toes behind
    "neck": (-60, 70),        # + = chin to the chest
    "spine": (-60, 100),      # the whole back: + = rounded, - = arched
    "vertebra": (-30, 30),    # one joint of the spine
    "head": (0.4, 3.0),       # head centre to the top of the spine (a traced one starts at the shoulder joint)
    "bone": 0.15,             # a bone of an fk guide against SEG at the pose's own scale
    "traced": 0.50,           # the same for a hand-placed guide: it follows a drawn hero, in perspective
    "keys": 0.12,             # the same bone between two keys of one exercise
    "short": 0.05,            # the least a bone allowed to foreshorten may show
}
# Side views, by where the belly is: +1 = like a hero standing and facing right (so also on the back
# head left, face down head right), -1 = the mirror. A slug that is not here is not a side view.
SIDE = (dict.fromkeys("dip pushups cat_cow wall_pushup pike_pushup table_row lunge glute_bridge single_leg_glute_bridge "
                      "bulgarian_split_squat single_leg_deadlift crunch reverse_crunch dead_bug dragon_flag russian_twist "
                      "towel_door_row superman_w bear_crawl flutter_kicks mountain_climber worlds_greatest_stretch".split(), 1)
        | dict.fromkeys("knee_pushup inverted_row pistol_squat".split(), -1))
# Bones a guide may show shorter than they are, as "thigh" (both sides) or "near thigh" (an fk guide
# also declares its own, per bone, as (angle, scale)). A limb with such a bone is out of the picture
# plane, where a 2D angle says nothing: only its lengths are checked.
LOOSE = {
    "dip": "shin",                                  # knees bent, the shins point away behind the bars
    "chin_up": "upper",                             # front view: the elbows come towards the camera
    "thread_the_needle": "upper, fore, thigh, far shin, far foot",  # seen from above, the body turning
    "diamond_pushup": "upper, fore, thigh, shin",   # three-quarter front at the bottom: every limb folds in depth
    "archer_pushup": "torso, thigh, shin, near upper",    # camera low in front of the head: the body points away
    "standing_calf_raise": "torso, head, thigh",    # legs only: the frame cuts the thighs
    "dead_bug": "near thigh, near shin",            # the bent leg tips towards the camera in A
    "worlds_greatest_stretch": "near thigh, far upper",   # the front knee opens beside the chest, the far arm with the turned chest
}


def _ang(a, b, c, d):
    """Signed degrees from the direction a->b to the direction c->d (image axes: + = clockwise)."""
    u, v = (b[0] - a[0], b[1] - a[1]), (d[0] - c[0], d[1] - c[1])
    return math.degrees(math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]))


def _limbs(pose):
    for side in ("near", "far"):
        for kind, pts in zip(list(BONES)[-len(pose[side]):], pose[side]):  # a lone limb is a leg (calf raise)
            yield side, kind, pts


def bone_lengths(pose):
    """{bone: px}. The torso is its chord: a curved spine is drawn longer, it does not grow."""
    out = {"torso": math.dist(pose["torso"][0], pose["torso"][-1])}
    for side, kind, pts in _limbs(pose):
        out.update({f"{side} {name}": math.dist(a, b) for name, a, b in zip(BONES[kind], pts, pts[1:])})
    return out


def check(pose, view=0, loose=()):
    """What is not human in one pose, as a list of sentences (empty = fine). view: SIDE's +1 or -1,
    or 0 for a view where only sizes can be judged. loose: bone names allowed to foreshorten."""
    bad, short, torso = [], pose.get("short", {}), pose["torso"]
    free = lambda b: b in short or b in loose or b.split()[-1] in loose  # noqa: E731
    lens = bone_lengths(pose)
    ratios = [v / SEG[b.split()[-1]] for b, v in lens.items() if not free(b) and b.split()[-1] not in ("hand", "foot")]
    scale = statistics.median(ratios) if ratios else 1.0
    tol = LIMITS["bone" if "short" in pose else "traced"]
    for b, v in lens.items():
        r = v / (SEG[b.split()[-1]] * scale)
        lo, hi = ((short[b] - tol, short[b] + tol) if b in short else
                  (LIMITS["short"], 1 + tol) if free(b) else (1 - tol, 1 + tol))
        if not lo <= r <= hi:
            bad.append(f"{b}: {r:.2f} of its length (allowed {lo:.2f} to {hi:.2f})")

    def test(name, where, a, sign):
        lo, hi = LIMITS[name]
        a = a * sign if sign else abs(a)
        if not (lo <= a <= hi or lo <= a + 360 <= hi if sign else a <= max(-lo, hi)):
            bad.append(f"{where}: {a:.0f} deg (allowed {lo} to {hi}{'' if sign else ', size only'})")

    for side, kind, pts in _limbs(pose):
        if any(free(f"{side} {n}") for n in BONES[kind]):
            continue
        root, mid, end = ("shoulder", "elbow", "wrist") if kind == "arm" else ("hip", "knee", "ankle")
        trunk = torso[:2] if kind == "arm" else torso[-2:]
        test(root, f"{side} {root}", _ang(*trunk, *pts[:2]), -view)
        test(mid, f"{side} {mid}", _ang(*pts[:2], *pts[1:3]), view if kind == "leg" else -view)
        if len(pts) > 3:
            test(end, f"{side} {end}", _ang(*pts[1:3], *pts[2:4]), -view)
    if "head" not in loose:
        test("neck", "neck", _ang(torso[1], torso[0], torso[0], pose["head"]), view)
        r, (lo, hi) = math.dist(torso[0], pose["head"]) / ((SEG["neck"] + SEG["head"]) * scale), LIMITS["head"]
        if not lo <= r <= hi:
            bad.append(f"head: {r:.2f} of its distance to the shoulders (allowed {lo} to {hi})")
    turns = [_ang(a, b, b, c) for a, b, c in zip(torso, torso[1:], torso[2:])]
    test("spine", "spine", sum(turns), -view)
    if turns:
        test("vertebra", "sharpest spine joint", max(turns, key=abs), 1)
    return bad


def violations(slug):
    """{key: [sentences]} for every guide of the exercise that breaks a rule; "keys" holds the bones
    whose length changes from one key to another without being declared foreshortened."""
    loose = [b.strip() for b in LOOSE.get(slug, "").split(",") if b.strip()]
    poses = {k: p for k, p in EXERCISES[slug]["keys"].items() if p is not None}
    out = {k: check(p, SIDE.get(slug, 0), loose) for k, p in poses.items()}
    lens = {k: bone_lengths(p) for k, p in poses.items()}
    out["keys"] = []
    for b in sorted(set.intersection(*(set(v) for v in lens.values()))) if lens else ():
        if b in loose or b.split()[-1] in loose or any(b in p.get("short", {}) for p in poses.values()):
            continue
        (lo, klo), (hi, khi) = min((v[b], k) for k, v in lens.items()), max((v[b], k) for k, v in lens.items())
        if hi > lo * (1 + LIMITS["keys"]):
            out["keys"].append(f"{b}: {lo:.0f} px in {klo}, {hi:.0f} px in {khi}")
    return {k: v for k, v in out.items() if v}


def report(slug):
    found = violations(slug)
    for k, lines in sorted(found.items()):
        for line in lines:
            print(f"  ! {slug} {k}: {line}")
    return found


def selftest():
    def squat(bend=-1, foot=0, ankle=(560, 900)):  # side view facing right, feet flat
        leg = {"to": ankle, "bend": bend, "end": foot}
        return fk((440, 660), 300, near_arm=(20, 350, 350), far_arm=(22, 352, 352), near_leg=leg, far_leg=leg)
    assert check(squat(), 1) == [], check(squat(), 1)
    assert check(_zoomed(squat(), (0.7, 500, 900)), 1) == [], "a smaller hero is the same hero"
    assert any("knee" in v for v in check(squat(bend=1), 1)), "knees bent backwards"
    assert not any("knee" in v for v in check(squat(bend=1), 0)), "a front view cannot tell"
    assert any("ankle" in v for v in check(squat(foot=180), 1)), "toes pointing behind"
    assert any("shin" in v for v in check(squat(ankle=(800, 1040)), 1)), "an out-of-reach foot stretches the shin"
    bent = squat()
    bent["far"][0] = chain(bent["far"][0][0], (20, 200), BONES["arm"])
    assert any("far elbow" in v for v in check(bent, 1)), "an elbow folded backwards"
    bent = fk((440, 660), 300, arc=-110, near_arm=(20, 350), far_arm=(22, 352), near_leg=(40, 130), far_leg=(40, 130))
    assert any("spine" in v for v in check(bent, 1)), "a back arched in two"
    print("selftest ok")


# --- v5 (2026-11-10): the moving exercises still without an animation ----------------------------
# Cameras from the web research notes: front for jumping jack, top for windshield wipers (the other side
# mirrored), side for burpee and calf raise.
def _jack(star):
    if star:
        return fk((512, 500), 270, near_at=FRONT[0], far_at=FRONT[1], near_arm=(225, 230, 230), far_arm=(315, 310, 310),
                  near_leg=(108, 106, (100, 0.4)), far_leg=(72, 74, (80, 0.4)), props=FLOOR(960))
    return fk((512, 515), 270, near_at=FRONT[0], far_at=FRONT[1], near_arm=(95, 92, 92), far_arm=(85, 88, 88),
              near_leg=(93, 91, (90, 0.4)), far_leg=(87, 89, (90, 0.4)), props=FLOOR(960), pins=[(470, 950), (554, 950)])


def _wipers():
    """From directly above, lying on the back, head at the top, arms out in a T, both legs raised and tipped
    together to the hero's right (left of the picture); the legs point at the camera, so they look short."""
    return fk((512, 600), 270, near_at=FRONT[0], far_at=FRONT[1], near_arm=(180, 180, 180), far_arm=(0, 0, 0),
              near_leg=((160, 0.55), (160, 0.55), (160, 0.3)), far_leg=((150, 0.55), (150, 0.55), (150, 0.3)),
              props=[[(300, 140), (724, 140), (724, 900), (300, 900)]])


def _burpee(k):
    """Side view facing right; floor at 980 so the jump fits the frame."""
    hand, foot = (640, 968), (485, 958)
    if k == "stand":
        return fk((480, 520), 272, face=(1, 0.2), near_arm=(95, 93, 93), far_arm=(97, 95, 95),
                  near_leg={"to": foot, "bend": -1, "end": 0}, far_leg={"to": add(foot, (12, -8)), "bend": -1, "end": 0},
                  props=FLOOR(980), pins=[foot])
    if k == "squat":
        return fk((380, 760), 350, face=(1, 0.6), near_arm={"to": hand, "bend": 1, "end": 0},
                  far_arm={"to": add(hand, (12, -8)), "bend": 1, "end": 0}, near_leg={"to": foot, "bend": -1, "end": 20},
                  far_leg={"to": add(foot, (12, -8)), "bend": -1, "end": 20}, props=FLOOR(980), pins=[hand, foot])
    if k == "plank":
        return fk((410, 780), 345, face=(0.6, 1), near_arm={"to": hand, "bend": 1, "end": 0},
                  far_arm={"to": add(hand, (12, -8)), "bend": 1, "end": 0}, near_leg={"to": (40, 925), "bend": -1, "end": 75},
                  far_leg={"to": (52, 917), "bend": -1, "end": 75}, props=FLOOR(980), pins=[hand])
    return fk((480, 515), 270, face=(1, -0.3), near_arm=(292, 290, 290), far_arm=(288, 286, 286),
              near_leg=(94, 90, (75, 0.6)), far_leg=(92, 88, (75, 0.6)), props=FLOOR(980))


def _calf(up):
    hip, ankle = ((500, 420), (505, 860)) if up else ((500, 450), (505, 890))
    leg = {"to": ankle, "bend": -1, "end": 45 if up else 0}
    return fk(hip, 272, face=(1, 0), near_arm=(95, 92, 92), far_arm=(97, 94, 94), near_leg=leg,
              far_leg={**leg, "to": add(ankle, (12, -8))}, props=FLOOR(920), pins=[(549, 905) if up else (567, 890)])


V5 = {  # slug: a_key, rep seconds, mode, keys, times
    "jumping_jack": ("k2", 1, "new", {"k1": _jack(False), "k2": _jack(True)}, None),
    "windshield_wipers": ("k1", 4, "mirror", {"k1": _wipers(), "k2": None}, None),
    "burpee": ("k2", 4, "new", {"k1": _burpee("stand"), "k2": _burpee("squat"), "k3": _burpee("plank"),
                                "k4": _burpee("jump")}, [0.0, 1.0, 2.0, 3.0, 4.0]),
    "standing_calf_raise": ("k1", 2, "new", {"k1": _calf(True), "k2": _calf(False)}, None),
}
for _slug, (_a_key, _rep, _mode, _keys, _times) in V5.items():
    EXERCISES[_slug] = {"rep_s": _rep, "a_key": _a_key, "mode": _mode, "keys": _keys, "same": {},
                        "times": _times or [0.0, _rep / 2, float(_rep)]}
POSE_TEXT.update({
    ("jumping_jack", "k2"): "Front view, the hero facing the camera: the OPEN star position of a jumping jack. Feet wide apart, a little wider than the shoulders, on the balls of the feet, knees soft; both arms straight, raised high in a V above the head; torso tall.",
    ("jumping_jack", "k1"): "The hero is now in the CLOSED position of the jumping jack: standing tall, feet together, arms straight down by the sides.",
    ("windshield_wipers", "k1"): "Seen from directly above, the hero lying on the back on a dark mat, head at the top of the picture: windshield wipers. Arms straight out to the sides in a T, palms flat on the mat; both legs raised straight and together, tipped as one to the hero's RIGHT (left of the picture) at about 45 degrees, the feet off the mat; shoulders flat on the mat. " + FRONT_NOTE,
    ("burpee", "k2"): "Side view facing right: the SQUAT of a burpee. Feet flat, knees bent deep, hips low behind the heels, both hands flat on the floor in front of the feet, shoulder-width apart, back flat, eyes ahead on the floor.",
    ("burpee", "k1"): "The hero is now STANDING tall at the start of the burpee, feet flat on the same spot, arms by the sides.",
    ("burpee", "k3"): "The hero is now in a HIGH PLANK of the burpee: hands flat on the same spots under the shoulders, both legs jumped straight back, on the balls of the feet, the body one straight line from head to heels, no sagging hips.",
    ("burpee", "k4"): "The hero now JUMPS at the end of the burpee: the whole body straight in the air, both feet off the floor above the same spot, toes pointed down, both arms straight overhead.",
    ("standing_calf_raise", "k1"): "Side view facing right, the whole body: the TOP of a standing calf raise. Standing tall, legs straight, high on the balls of both feet, the heels lifted well off the floor, the calf muscles clearly contracted; arms by the sides.",
    ("standing_calf_raise", "k2"): "The hero is now at the BOTTOM of the calf raise: both heels down flat on the floor, the whole sole of each shoe flat, legs straight, the body lower by the height of the heel lift; the balls of the feet on the same spots.",
})
NEVER.update({
    "jumping_jack": "The camera, the framing and the background do not move.",
    "burpee": "The camera, the framing and the background do not move; the hands land on the same spots in the squat and the plank.",
    "standing_calf_raise": "The balls of both feet stay on exactly the same spots of the floor.",
})
VIDEO_MOTION.update({
    "jumping_jack": "Jumping jacks at an easy pace: feet jump apart as the arms swing up overhead, then back together as the arms come down.",
    "windshield_wipers": "One slow windshield wiper seen from above, lying on the back with the arms out: the straight legs, together, tip down to one side, come back through the middle and tip to the other side; the shoulders stay flat.",
    "burpee": "One burpee: from standing, squat and put the hands down, jump the feet back to a plank, jump the feet back in to the squat, then jump up with the arms overhead and land softly.",
    "standing_calf_raise": "One slow standing calf raise, the whole body: the heels rise high onto the balls of the feet, then lower flat to the floor; the knees stay straight.",
})


POSE_TEXT[("burpee", "k2")] += " The back stays FLAT and long from the hips to the head, chest forward over the knees, not rounded."


# --- v6 (2026-11-10, Guillaume's third review): decompose each gesture into 4 to 8 pictures before any
# video, so the video model has less to invent. The in-between guides come from the same fk helpers
# with their parameters interpolated (bones keep their length, pins stay put); the key poses were checked
# against the CC0 key poses of open-exercise-figures (figures/0499, 0459, 0872, 1604, 3224, 3361: their
# angles, read as references only, nothing copied into the pictures).
def _lerp(a, b, t):
    return a + (b - a) * t


def _seq(slug, a_key, rep, keys, same):
    """An exercise as an ordered loop: `keys` in order, `same` names the keys that reuse another key's picture."""
    n = len(keys)
    EXERCISES[slug] = {"rep_s": rep, "a_key": a_key, "mode": "new", "keys": keys, "same": same,
                       "times": [round(rep * i / n, 3) for i in range(n + 1)]}


_PT, _PB = ((470, 445), 52, 75), ((492, 452), 74, 85)  # pike top, bottom: hip, trunk, head
_pike_at = lambda t: _pike(tuple(round(_lerp(a, b, t)) for a, b in zip(_PT[0], _PB[0])),  # noqa: E731
                           _lerp(_PT[1], _PB[1], t), _lerp(_PT[2], _PB[2], t))
_seq("pike_pushup", "k4", 3, {"k1": _pike_at(0), "k2": _pike_at(1 / 3), "k3": _pike_at(2 / 3), "k4": _pike_at(1),
                              "k5": None, "k6": None}, {"k5": "k3", "k6": "k2"})
_row_at = lambda t: _row(_lerp(_row_bottom, 334, t), ROW_ANKLE, ROW_HAND, -1)  # noqa: E731
_seq("inverted_row", "k3", 3, {"k1": _row_at(0), "k2": _row_at(0.5), "k3": _row_at(1), "k4": None}, {"k4": "k2"})
_seq("bicycle_crunch", "k1", 2, {
    "k1": None,
    # Between the two sides: shoulders curled up square, both elbows wide, both knees half bent at the same height.
    "k2": fk((512, 640), 270, torso=0.85, near_at=FRONT[0], far_at=FRONT[1], near_arm=(250, 330), far_arm=(290, 210),
             near_leg=((95, 0.7), (92, 0.75), (90, 0.4)), far_leg=((85, 0.7), (88, 0.75), (90, 0.4)),
             props=[[(340, 120), (684, 120), (684, 960), (340, 960)]]),
    "k3": None, "k4": None}, {"k4": "k2"})
_jack_half = fk((512, 470), 270, near_at=FRONT[0], far_at=FRONT[1], near_arm=(160, 161, 161), far_arm=(20, 19, 19),
                near_leg=(100, 98, (95, 0.4)), far_leg=(80, 82, (85, 0.4)), props=FLOOR(960))  # airborne, no pins
_seq("jumping_jack", "k3", 1, {"k1": _jack(False), "k2": _jack_half, "k3": _jack(True), "k4": None}, {"k4": "k2"})


def _wipers_at(tip):
    """From above; tip 1 = legs tipped to the hero's right like A, 0 = legs straight up at the camera."""
    s = max(0.08, 0.55 * tip)
    return fk((512, 600), 270, near_at=FRONT[0], far_at=FRONT[1], near_arm=(180, 180, 180), far_arm=(0, 0, 0),
              near_leg=((160, s), (160, s), (160, max(0.08, 0.3 * tip))),
              far_leg=((150, s), (150, s), (150, max(0.08, 0.3 * tip))),
              props=[[(300, 140), (724, 140), (724, 900), (300, 900)]])


_seq("windshield_wipers", "k1", 4, {"k1": _wipers_at(1), "k2": _wipers_at(0.5), "k3": _wipers_at(0), "k4": None,
                                    "k5": None, "k6": None, "k7": None, "k8": None}, {"k6": "k4", "k7": "k3", "k8": "k2"})
_flutter_mid = fk((560, 765), 200, head=195, face=(0.3, -1), near_arm=(100, 5, 5), far_arm=(98, 3, 3),
                  near_leg=(342, 342, 315), far_leg=(343, 343, 316), props=FLOOR(800), pins=[(560, 765)])
_seq("flutter_kicks", "k1", 1, {"k1": _flutter(True), "k2": _flutter_mid, "k3": _flutter(False), "k4": None}, {"k4": "k2"})
_rc = V2["reverse_crunch"][3]
_seq("reverse_crunch", "k3", 3, {
    "k1": _rc["k1"],
    "k2": fk((556, 741), 173, arc=12, head=180, face=(0, -1), near_arm=(2, 0), far_arm=(4, 0),
             near_leg=(255, 345, 345), far_leg=(257, 347, 347), props=FLOOR(800), pins=[(310, 770)]),
    "k3": _rc["k2"], "k4": None, "k5": None,
    # 40 degrees up, not 20: at 20 the feet reached the right edge and the old drawing was cropped there.
    "k6": fk((560, 770), 180, face=(0, -1), near_arm=(2, 0), far_arm=(4, 0), near_leg=(320, 320, 312),
             far_leg=(322, 322, 314), props=FLOOR(800), pins=[(310, 770)])}, {"k4": "k2", "k5": "k1"})
# One arm swings across in front of the chest, the other back (short: it points away from the camera).
_skater_air = fk((512, 500), 270, near_at=FRONT[0], far_at=FRONT[1], near_arm=((40, 0.8), (10, 0.8)),
                 far_arm=((100, 0.5), (120, 0.5)), near_leg=((95, 0.8), (100, 0.75), (95, 0.4)),
                 far_leg=((80, 0.8), (75, 0.75), (85, 0.4)), props=FLOOR(900))  # mid-hop, both feet off the floor
_seq("skater_hop", "k1", 1, {"k1": None, "k2": _skater_air, "k3": None, "k4": None}, {})


def _wgs_down():
    """World's greatest stretch, start and between: the same lunge, both hands flat inside the front foot."""
    return fk((470, 800), 8, head=20, face=(0.3, 1), near_arm={"to": (660, 880), "bend": 1, "end": 0},
              far_arm={"to": (676, 872), "bend": 1, "end": 0}, near_leg={"to": (740, 880), "bend": -1, "end": 0},
              far_leg={"to": (40, 832), "bend": -1, "end": 65}, props=FLOOR(885), pins=[(660, 880), (740, 880), (40, 832)])


def _xform(pose, s, anchor, to, flip=False, floor=None):
    """The same pose mirrored (flip) and scaled by s about `anchor`, which lands on `to`."""
    def P(p):
        x = (2 * anchor[0] - p[0]) if flip else p[0]
        return (round(to[0] + (x - anchor[0]) * s), round(to[1] + (p[1] - anchor[1]) * s))
    face = pose["face"] and ((-pose["face"][0], pose["face"][1]) if flip else pose["face"])
    return {**pose, "head": P(pose["head"]), "face": face, "torso": [P(p) for p in pose["torso"]],
            "near": [[P(p) for p in c] for c in pose["near"]], "far": [[P(p) for p in c] for c in pose["far"]],
            "props": FLOOR(floor) if floor else [[P(p) for p in poly] for poly in pose["props"]],
            "pins": [P(p) for p in pose["pins"]]}


def _wgs_left(phase):
    """World's greatest stretch on the app's picture (Guillaume reviewed that one): the hero faces LEFT.
    phase 0 = both hands down, 1 = the far arm straight up (A). The elbow-to-instep pose is left out: it
    failed twice and is the picture that "breaks at the end". In the mannequin's proportions the shoulders
    sit an arm's length above the floor, so the trunk is lower than in A's comic drawing."""
    f, b = (300, 895), (905, 872)
    legs = dict(near_leg={"to": f, "bend": 1, "end": 180}, far_leg={"to": b, "bend": 1, "end": 125})
    near = {"to": (262, 862), "bend": -1, "end": 180}
    if phase == 0:
        return fk((520, 700), 198, head=170, face=(-0.5, 1), near_arm={**near, "to": (225, 862)},
                  far_arm={"to": (255, 856), "bend": -1, "end": 180}, **legs, props=FLOOR(900), pins=[(225, 862), f, b])
    # Halfway: straight and diagonal, up and forward. Pointed at the camera (short) it read as a hand lifting off.
    up = (272, 272, 272) if phase == 1 else (225, 225, 225)
    return fk((520, 690), 200, head=230 if phase == 1 else 195, face=(-0.3, -1) if phase == 1 else (-0.6, 0.2),
              near_arm=near, far_arm=up, **legs, props=FLOOR(900), pins=[(262, 862), f, b])


# v6 retry 1 (blind scores): what the first pair missed.
_V6_RETRY = {
    ("inverted_row", "k1"): " The CHIN is slightly TUCKED, the neck long and straight, the top of the head pointing to the right along the body line, the eyes looking up at the bar only by turning the eyes; the head is exactly as in image 2: in profile, in line with the body, the back of the head level with the back, eyes on the bar above; the chin is NOT lifted and the face does NOT turn to the camera.",
    ("windshield_wipers", "k2"): " Seen from above the raised legs are strongly FORESHORTENED: from the hips they look only about a third as long as in image 2, ending close to the hips, the soles half turned to the camera. The KNEES are LOCKED STRAIGHT: each leg is one straight line from hip to heel, no bend.",
    ("skater_hop", "k2"): " A clear GAP of floor under both feet: the hero is well above the floor, the shadow small and separate below. One arm swings across in front of the body and the other back, like a speed skater, not both out to the sides.",
}
SIDE["worlds_greatest_stretch"] = -1  # the app's hero faces left
_seq("worlds_greatest_stretch", "k3", 4, {"k1": _wgs_left(0), "k2": _wgs_left(0.5), "k3": _wgs_left(1), "k4": None}, {"k4": "k2"})
EXERCISES["superman_w"]["zoom_fix"] = "k1 re-fitted on A by the legs: it was 7 % smaller, the video zoomed"
FLOPS = {  # slug: {key: key it is the mirror of} (front and top views: exact and free)
    "bicycle_crunch": {"k3": "k1"}, "windshield_wipers": {"k4": "k2", "k5": "k1"}, "skater_hop": {"k3": "k1", "k4": "k2"},
}
POSE_TEXT.update({
    ("pike_pushup", "k2"): "The hero is a THIRD of the way down a pike push-up: hips high in an upside-down V, legs straight, the elbows starting to bend backwards along the body, the head a little lower than in the top position, still well above the floor between the hands.",
    ("pike_pushup", "k3"): "The hero is TWO THIRDS of the way down a pike push-up: hips high, legs straight, the elbows clearly bent and pointing back towards the feet, the top of the head halfway between the shoulders' top position and the floor, in front of the hands.",
    ("inverted_row", "k1"): "The BOTTOM of an inverted row: hanging under the bar on straight arms, the arms perpendicular to the body, the bar above the chest; the body one straight plank from the heels to the head. The head stays IN LINE with the body, the back of the head level with the back, the face turned UP to the bar in profile; the hero does not look at the camera.",
    ("inverted_row", "k2"): "HALFWAY up an inverted row: the elbows bent at 90 degrees, pointing down to the floor, the chest halfway to the bar; the body one straight plank. The head stays IN LINE with the body, face up to the bar in profile; the hero does not look at the camera.",
    ("inverted_row", "k3"): "The TOP of an inverted row: the chest touching the bar, the elbows bent and behind the body, the body one straight plank. The head stays IN LINE with the body, the neck long, face up in profile, just past the bar; the head is NOT tilted back and the hero does not look at the camera.",
    ("bicycle_crunch", "k2"): "Seen from directly above: the hero is BETWEEN two bicycle crunch sides. Shoulders curled up off the mat and square, both hands behind the head, both elbows wide; both knees half bent at the same height, the legs passing each other, both feet off the mat. " + FRONT_NOTE,
    ("jumping_jack", "k2"): "The hero is HALFWAY through a jumping jack, in the air: both arms straight out to the sides, level with the shoulders; the feet off the floor, apart about shoulder width, knees soft.",
    ("windshield_wipers", "k2"): "Seen from directly above: the same windshield wiper, now the legs, straight and together, are tipped only HALFWAY to the hero's right, about 20 degrees from vertical, the feet much closer to above the hips than in image 2. Arms out in a T, shoulders flat. " + FRONT_NOTE,
    ("windshield_wipers", "k3"): "Seen from directly above: the legs, straight and together, now point STRAIGHT UP at the camera, so they look very short, the soles of both shoes facing the camera just below the hips. Arms out in a T, shoulders flat. " + FRONT_NOTE,
    ("flutter_kicks", "k2"): "The legs PASS each other in a flutter kick: both straight legs at the SAME height, about 15 degrees above the floor, side by side. Same forearms, same hips.",
    ("reverse_crunch", "k2"): "The hero is HALFWAY into a reverse crunch: the knees, bent at 90 degrees, are drawn towards the chest, the hips just starting to roll up off the floor; the head, shoulders and arms flat on the same spots.",
    ("reverse_crunch", "k6"): "The hero EXTENDS both legs: the back flat on the floor, both legs straight and together, pointing away and up at about 40 degrees above the floor, toes pointed; arms along the sides, head and shoulders on the same spots. The whole hero fits inside the frame: the feet end well before the right edge, as small as in image 2.",
    ("skater_hop", "k2"): "Front view, facing the camera: the hero is IN THE AIR in the middle of a skater hop, crossing from one side of the picture to the other: centred, both feet off the floor, the legs close together and slightly bent, the arms swinging across the body, the hero a little higher than when landing.",
    ("worlds_greatest_stretch", "k1"): "Side view facing right: the START of the world's greatest stretch. A deep lunge, the front foot flat, the back leg long and straight on the ball of the foot; BOTH hands flat on the floor inside the front foot, the arms straight, the chest low over the front thigh, eyes to the floor.",
    ("worlds_greatest_stretch", "k2"): "Same deep lunge: the arm farther from the camera bends and that ELBOW drops to the floor beside the inside of the front foot, the forearm flat on the floor; the near hand stays flat on its spot; the chest low over the front thigh. Every limb stays whole and attached; the back knee stays off the floor.",
})
POSE_TEXT[("worlds_greatest_stretch", "k2")] = ("HALFWAY through the rotation of the world's greatest stretch, same deep lunge: one hand stays flat on the "
    "floor inside the front foot; the other arm is fully STRAIGHT and raised HALFWAY, pointing diagonally up and forward at about 45 degrees, "
    "the hand high above the head's level, open; the chest half turned open; eyes follow the hand.")
for _k, _extra in _V6_RETRY.items():
    POSE_TEXT[_k] += _extra


# --- v7 (2026-11-10): the side swaps that failed seen from the side (dead bug 5 times, bear crawl 6) are
# redrawn from directly above, where the other side is A mirrored, exact and free. New A, male hero.
_MAT = [[(340, 120), (684, 120), (684, 960), (340, 960)]]


def _bug(side):
    """From above, head at the top. side 0 = start (both arms at the ceiling, both knees 90/90: limbs
    pointing at the camera look short); 1 = hero's left arm overhead on the floor, right leg long."""
    up_arm, up_leg = ((180, 0.15), (180, 0.15), (180, 0.1)), ((90, 0.15), (90, 0.95), (90, 0.3))
    if side == 0:
        return fk((512, 600), 270, near_at=FRONT[0], far_at=FRONT[1], near_arm=up_arm, far_arm=((0, 0.15), (0, 0.15), (0, 0.1)),
                  near_leg=up_leg, far_leg=up_leg, props=_MAT)
    return fk((512, 600), 270, near_at=FRONT[0], far_at=FRONT[1], near_arm=up_arm, far_arm=(272, 270, 270),
              near_leg=(92, 90, (90, 0.4)), far_leg=up_leg, props=_MAT)


def _crawl(step):
    """Bear crawl from above, face down, crawling to the top of the picture. step 1: the hero's right hand
    (picture right, far) and left foot (picture left, near) forward; 0: hands and feet level."""
    fwd_arm, back_arm = ((270, 0.45), (270, 0.4), (270, 0.2)), ((90, 0.12), (270, 0.12), (270, 0.2))
    fwd_leg, back_leg = ((270, 0.3), (90, 0.55), (90, 0.2)), ((90, 0.12), (90, 0.6), (90, 0.2))
    mid_arm, mid_leg = ((270, 0.25), (270, 0.25), (270, 0.2)), ((90, 0.05), (90, 0.6), (90, 0.2))
    near_arm, far_arm, near_leg, far_leg = ((back_arm, fwd_arm, fwd_leg, back_leg) if step else (mid_arm, mid_arm, mid_leg, mid_leg))
    return _xform(fk((512, 640), 270, torso=0.9, near_at=FRONT[0], far_at=FRONT[1], near_arm=near_arm, far_arm=far_arm,
                     near_leg=near_leg, far_leg=far_leg, props=FLOOR(1000)), 1.0, (512, 640), (512, 600))


_bug_fit = lambda side: _xform(_bug(side), 0.68, (512, 600), (512, 560))  # noqa: E731  the long leg and the overhead arm in frame
_seq("dead_bug", "k2", 4, {"k1": _bug_fit(0), "k2": _bug_fit(1), "k3": None, "k4": None}, {"k3": "k1"})
# Bear crawl from above was tried (v7) and read as wall climbing (blind score 1/5): it keeps its v3 setup.
FLOPS.update({"dead_bug": {"k4": "k2"}})


# Muscle-up (v7): the app's picture is two panels with two heroes, so the whole gesture is new, side view
# facing right, hands fixed on one bar. Drawn at full size around BAR, then scaled to fit hang and lockout.
_BAR = (560, 400)


def _mu(shoulder, trunk, legs, bend):
    hip = step(shoulder, trunk + 180, SEG["torso"])
    arm = {"to": _BAR, "bend": bend}  # no hand bone: the hand is wrapped round the bar
    pose = fk(hip, trunk, head=trunk, face=(1, -0.2), near_arm=arm, far_arm={**arm, "to": add(_BAR, (12, -6))},
              near_leg=legs, far_leg=tuple(a + 3 for a in legs), props=[((300, 396), (820, 404))], pins=[_BAR])
    return _xform(pose, 0.64, _BAR, (530, 330), floor=None)


SIDE["muscle_up"] = 1
_seq("muscle_up", "k5", 6, {
    "k1": _mu((560, 665), 270, (92, 98, 100), 1),    # dead hang, arms straight
    "k2": _mu((520, 470), 285, (100, 110, 100), 1),  # chest to the bar, elbows down
    "k3": _mu((600, 345), 300, (110, 120, 100), 1),  # transition: chest over the bar, elbows back
    "k4": _mu((600, 250), 285, (100, 105, 100), 1),  # bottom of the straight-bar dip
    "k5": _mu((585, 140), 275, (95, 95, 100), 1),    # lockout, hips at the bar (A)
    "k6": None, "k7": None, "k8": None}, {"k6": "k4", "k7": "k3", "k8": "k2"})
POSE_TEXT.update({
    ("muscle_up", "k5"): "Side view facing right, a single straight pull-up bar seen end-on as a short horizontal bar: the TOP of a "
        "muscle-up. The hero is ABOVE the bar, both arms straight and locked, hands gripping the bar under the shoulders, the bar "
        "touching the front of the hips; torso upright, legs straight and together hanging below the bar, toes pointed. Bare "
        "dark background, no floor visible, the whole body and the bar inside the frame with a margin.",
    ("muscle_up", "k1"): "The hero is now in a DEAD HANG under the same bar: arms straight overhead, hands on the same spot of the "
        "bar, the body hanging straight below it, legs together, feet off the floor.",
    ("muscle_up", "k2"): "The hero now PULLS: the chest is up at the bar, just below it, the elbows bent and pointing down, the body "
        "leaning slightly back, legs a little in front; the hands on the same spot of the bar.",
    ("muscle_up", "k3"): "The TRANSITION of the muscle-up: the chest goes OVER the bar, the shoulders just above it and forward, the "
        "elbows sharply bent and pointing back, the wrists turned over on top of the bar; the hips still below the bar.",
    ("muscle_up", "k4"): "The hero is now at the BOTTOM of a straight-bar dip ABOVE the bar: the shoulders well above the bar, the "
        "elbows bent about 90 degrees and pointing back, the torso leaning forward over the bar, the hips just below it.",
})
POSE_TEXT[("muscle_up", "k1")] += (" The BAR stays at exactly the same height and place in the picture as in image 2, about a third "
    "of the way down from the top: it does NOT move up. The hero hangs BELOW it, the head under the bar, the feet near the bottom "
    "of the picture.")
# Curtsy squat from behind was tried (v7): both tries drew a diagonal lunge with no crossing (blind
# score 1/5), as every front view did. It keeps its v3 setup.
NEVER["muscle_up"] ="Both hands stay on exactly the same spot of the bar; the bar does not move. The camera, the framing and the scale do not change."
VIDEO_MOTION["muscle_up"] = ("One slow strict muscle-up on a straight bar: from a dead hang, pull the chest to the bar, turn the "
    "wrists over as the chest passes above the bar, press out of the dip to locked arms, then lower back the same way to the hang. "
    "The hands never move on the bar.")
TOP_NOTE = ("Seen from DIRECTLY ABOVE, the camera looking straight down at the floor. In this guide the orange limbs "
            "are on the left of the picture and the blue limbs on the right.")
POSE_TEXT.update({
    ("dead_bug", "k2"): "Seen from directly above, the hero lying on the back on a dark mat, head at the top of the picture: a dead bug. "
        "The arm on the LEFT of the picture points straight up at the camera (it looks short, the hand above the shoulder); the arm "
        "on the RIGHT of the picture reaches straight overhead, lying just above the floor past the head. The leg on the RIGHT of "
        "the picture is bent 90/90: the knee straight above the hip (the thigh looks short) and the shin level, pointing to the "
        "feet; the leg on the LEFT of the picture is straight and long, just above the mat. Lower back flat on the mat. The whole hero is SMALL in the frame, about two thirds of the picture's height from the overhead hand to the heel, with a clear margin at the top and bottom. The bent leg's shin points DOWN the picture towards the feet, never out to the side. " + TOP_NOTE,
    ("dead_bug", "k1"): "The hero is now in the START of the dead bug, still seen from directly above: BOTH arms point straight up at "
        "the camera (short, hands above the shoulders) and BOTH legs are bent 90/90, knees above the hips, shins level pointing "
        "to the feet, the two legs side by side. Head and shoulders on the same spots.",
    ("bear_crawl", "k1"): "Seen from directly above, the hero on hands and feet, face down, crawling towards the top of the picture: "
        "a bear crawl, back flat and level, knees bent and hovering just above the floor. The hand on the RIGHT of the picture is "
        "forward (towards the top), the hand on the LEFT is back under its shoulder; the foot on the LEFT of the picture is "
        "forward under the hip, the foot on the RIGHT is back. We see the back of the head, the back and the soles of the shoes. " + TOP_NOTE,
    ("bear_crawl", "k2"): "The hero is now BETWEEN two steps of the bear crawl, still from directly above: both hands level under "
        "the shoulders and both feet level, knees hovering, back flat.",
})
NEVER.update({
    "dead_bug": "Head and shoulders stay on exactly the same spots of the mat. The camera, the framing and the scale do not change.",
    "bear_crawl": "The camera, the framing and the scale do not change; the hero stays at the same place in the frame.",
})
VIDEO_MOTION.update({
    "dead_bug": "Dead bug seen from above, lying on the back: from both arms up and both knees at 90/90, one arm lowers overhead "
        "as the opposite leg extends long, both return, then the other arm and the other leg. The back stays flat.",
    "bear_crawl": "Bear crawl seen from above, on hands and feet with the knees hovering: opposite hand and foot step forward "
        "together, then the other pair. The hero stays at the same place in the frame.",
})
NEVER.update({
    "pike_pushup": "Both hands stay flat on exactly the same spots and both feet stay on exactly the same spot of the floor: the feet do not slide. The camera, the framing and the scale do not change.",
    "inverted_row": "Both hands stay on exactly the same spots of the bar and both heels on exactly the same spot of the floor. The bar does not move. The camera, the framing and the scale do not change.",
    "bicycle_crunch": "The hips stay on the same spot of the mat. The camera, the framing and the scale do not change.",
    "jumping_jack": "The camera, the framing and the scale do not change; the hero stays centred.",
    "windshield_wipers": "The shoulders, the arms and the head stay exactly where they are. The camera, the framing and the scale do not change.",
    "reverse_crunch": "The head, shoulders and arms stay on exactly the same spots. The camera, the framing and the scale do not change.",
    "skater_hop": "The camera, the framing and the scale do not change.",
})
VIDEO_MOTION.update({
    "pike_pushup": "One slow pike push-up. The hands and the feet never move, not even a little: the feet stay planted. The hips stay high; only the elbows bend and straighten.",
    "inverted_row": "One slow inverted row under a low bar. The hands never move on the bar and the heels never move on the floor; the body stays one straight plank and the head stays in line with it, face up.",
    "bicycle_crunch": "Bicycle crunch seen from above: one elbow meets the opposite knee, both pass through the middle, then the other elbow meets the other knee. The hips stay on the mat. Nothing else happens.",
})


# Bear crawl from the FRONT (v7): camera low in front of the head, the hero crawling towards it. The next
# step is the picture mirrored, exact. From above it read as wall climbing; from the side the swap failed.
def _crawl_front(step):
    fwd, back = ((95, 0.55), (95, 0.55), (90, 0.2)), ((95, 0.4), (95, 0.4), (90, 0.2))
    near_arm, far_arm = (back, fwd) if step else (fwd, fwd)
    return fk((512, 420), 90, torso=0.35, head=270, face=(0, 1), near_at=FRONT[0], far_at=FRONT[1],
              near_arm=near_arm, far_arm=far_arm, near_leg=((92, 0.5), (95, 0.5), (90, 0.3)),
              far_leg=((88, 0.35), (85, 0.4), (90, 0.3)), props=FLOOR(900))


LOOSE["bear_crawl"] = "torso, upper, fore, thigh, shin"  # the whole body points at the camera
_seq("bear_crawl", "k1", 2, {"k1": _crawl_front(1), "k2": None}, {})
FLOPS["bear_crawl"] = {"k2": "k1"}
POSE_TEXT[("bear_crawl", "k1")] = (
    "FRONT view, the camera low on the floor in front of the hero, who crawls TOWARDS the camera: a bear crawl. On hands "
    "and feet, the knees bent and hovering a hand above the floor, the back flat and level, the head up looking at the "
    "camera. The hand on the RIGHT of the picture is placed FORWARD (closer to the camera, bigger) and the hand on the LEFT "
    "of the picture is back under its shoulder; behind, the knee on the LEFT of the picture is forward under the belly and "
    "the knee on the RIGHT is back. We see the face, the shoulders, both arms, and the bent legs behind the body. A plain "
    "dark floor and background; the whole hero inside the frame with a margin.")
POSE_TEXT[("bear_crawl", "k1")] += (" The camera is at chest height, slightly above, NOT on the floor: no giant foreground hand. The "
    "forward hand is only half a forearm ahead of the other. The knees are CLEARLY off the floor, a full hand of dark floor "
    "visible under each knee; the forward knee (left of the picture) is pulled up near its elbow, the other knee is back "
    "behind it, so the two knees are at clearly different depths.")
POSE_TEXT[("bear_crawl", "bq")] = (
    "THREE-QUARTER FRONT view, the camera at chest height in front of the hero and a little to the picture's left: a bear "
    "crawl, the hero crawling towards the camera. On hands and feet, the back flat and level like a table, the head up, the "
    "knees bent and clearly off the floor. The diagonal is OBVIOUS: the hero's LEFT hand (on the right of the picture) is "
    "placed a full forearm FORWARD and, at the same moment, the hero's RIGHT knee (on the left of the picture) is pulled "
    "forward right under the chest, near the right elbow; the other hand stays back under its shoulder and the other leg "
    "stays back, its knee far behind. A plain dark floor and background, a soft shadow under the body, the whole hero in "
    "the frame with a margin.")
# The three-quarter view reads best (blind 3/5 from the front); its mirror would turn the hero round, so the
# next step is drawn on A instead of mirrored.
POSE_TEXT[("bear_crawl", "k1")] = POSE_TEXT[("bear_crawl", "bq")]
_seq("bear_crawl", "k1", 2, {"k1": _crawl_front(1), "k2": _crawl_front(1)}, {})
FLOPS.pop("bear_crawl", None)
POSE_TEXT[("bear_crawl", "k2")] = (
    "The hero takes the NEXT STEP of the bear crawl, same camera, same place in the frame, still facing the same way: the "
    "OTHER diagonal is now forward. The hand that is back in image 2 is now a full forearm FORWARD, and the hand that is "
    "forward in image 2 is now back under its shoulder. The knee that is back in image 2 is now pulled forward under the "
    "chest near its elbow, and the knee that is forward in image 2 is now back. Knees off the floor, back flat. Ignore "
    "image 1's limb positions: it only gives the camera.")
NEVER["bear_crawl"] = "The camera, the framing and the scale do not change."
VIDEO_MOTION["bear_crawl"] = ("Bear crawl seen from the front, crawling towards the camera on hands and feet with the knees "
    "hovering: opposite hand and knee step forward together, then the other pair, the back flat.")

# v8, mannequin first (Guillaume: "fais toutes les positions avec le mannequin, puis je valide, puis on dessine").
# Pike: v6 kept the arms bent at the top and dropped the head BEHIND the hands. Now the shoulder travels from
# arms-straight-in-line-with-the-back to in front of the hands, head nearly on the floor, and the hip is solved
# so the legs stay straight and the feet planted.
_PH, _PF, _PLEG = (690, 878), (310, 856), SEG["thigh"] + SEG["shin"]
_ARM = SEG["upper"] + SEG["fore"] - 2
_p_hip0 = ik(_PF, _PH, _PLEG, _ARM + SEG["torso"], -1)  # top: hand, shoulder and hip in one line
_P_S0 = tuple(round(h + (p - h) * _ARM / math.dist(_PH, _p_hip0)) for h, p in zip(_PH, _p_hip0))
_P_S1 = (_PH[0] + 45, _PH[1] - 150)  # bottom: shoulders just in front of the hands, elbows about 75 degrees


def _pike8(t):
    sh = tuple(round(_lerp(a, b, t)) for a, b in zip(_P_S0, _P_S1))
    hip = ik(_PF, sh, _PLEG, SEG["torso"], -1)
    trunk = math.degrees(math.atan2(sh[1] - hip[1], sh[0] - hip[0]))
    return _pike(hip, trunk, _lerp(trunk + 8, 82, t))


_seq("pike_pushup", "k4", 3, {"k1": _pike8(0), "k2": _pike8(1 / 3), "k3": _pike8(2 / 3), "k4": _pike8(1),
                              "k5": None, "k6": None}, {"k5": "k3", "k6": "k2"})
# Row: same geometry as v6 (it matches free-exercise-db's photos: straight arms slanting to the feet at the
# bottom, chest at the bar at the top), now in thirds like the pike.
_seq("inverted_row", "k4", 3, {"k1": _row_at(0), "k2": _row_at(1 / 3), "k3": _row_at(2 / 3), "k4": _row_at(1),
                               "k5": None, "k6": None}, {"k5": "k3", "k6": "k2"})


# v8b, three-quarter view (Guillaume: "les deux tu peux les mettre de 3/4"). The side pose is solved flat, then
# lifted to 3D: each arm and leg stays in its own vertical plane, shoulder or hip width apart, so no bone
# changes length; the camera turns 35 degrees towards the head and looks down 12 degrees (orthographic).
_YAW, _PITCH, _HALF = math.radians(35), math.radians(12), {"arm": 85, "leg": 50}


def _q34(x, y, z):
    depth = -(x - 500) * math.sin(_YAW) + z * math.cos(_YAW)  # larger = further from the camera
    return (round((x - 500) * math.cos(_YAW) + z * math.sin(_YAW) + 512),
            round((y - 700) * math.cos(_PITCH) - depth * math.sin(_PITCH) + 700))


def _three_quarter(pose, floor, bar=None):
    """A flat side pose (no far_at offset, both sides on the same targets) seen in three-quarter."""
    out = {**pose, "short": {}, "torso": [_q34(*p, 0) for p in pose["torso"]], "head": _q34(*pose["head"], 0)}
    for side, z in (("near", -1), ("far", 1)):
        out[side] = [[_q34(*p, z * _HALF[kind]) for p in chain] for chain, kind in zip(pose[side], ("arm", "leg"))]
    fx, fy = pose["face"]
    out["face"] = (fx * math.cos(_YAW), fy)
    out["pins"] = [c[2] for s in ("near", "far") for c in out[s]]
    out["props"] = [[_q34(x, floor, z) for x, z in ((-300, -700), (1300, -700), (1300, 700), (-300, 700))]]
    if bar:
        out["props"].append(("line", _q34(*bar, -320), _q34(*bar, 320), 18))
    return out


def _pike_flat(t):
    sh = tuple(round(_lerp(a, b, t)) for a, b in zip(_P_S0, _P_S1))
    hip = ik(_PF, sh, _PLEG, SEG["torso"], -1)
    trunk = math.degrees(math.atan2(sh[1] - hip[1], sh[0] - hip[0]))
    arm, leg = {"to": _PH, "bend": 1, "end": 0}, {"to": _PF, "bend": -1, "end": 20}
    side = fk(hip, trunk, head=_lerp(trunk + 8, 82, t), face=(0.3, 1), near_arm=arm, far_arm=arm, near_leg=leg,
              far_leg=leg, far_at=((0, 0), (0, 0)))
    return _three_quarter(side, 880)


def _row_flat(t):
    theta = _lerp(_row_bottom, 334, t)
    hip = step(ROW_ANKLE, theta, SEG["thigh"] + SEG["shin"])
    arm, leg = {"to": ROW_HAND, "bend": -1, "end": 270}, {"to": ROW_ANKLE, "bend": 1, "end": theta - 60}
    side = fk(hip, theta, face=(0.3, -1), near_arm=arm, far_arm=arm, near_leg=leg, far_leg=leg, far_at=((0, 0), (0, 0)))
    return _three_quarter(side, 820, bar=ROW_HAND)


for _slug, _f in (("pike_pushup", _pike_flat), ("inverted_row", _row_flat)):
    _seq(_slug, "k4", 3, {"k1": _f(0), "k2": _f(1 / 3), "k3": _f(2 / 3), "k4": _f(1), "k5": None, "k6": None},
         {"k5": "k3", "k6": "k2"})
    SIDE.pop(_slug, None)
    LOOSE[_slug] = "torso, upper, fore, hand, thigh, shin, foot"  # the camera turns every bone a little


_Q = ("THREE-QUARTER view: the camera is a little above the hero and turned about 35 degrees from the side towards "
      "the hero's head, so both arms and both legs read separately, the near ones larger. ")
_PIKE_STILL = " The hands and feet stay on exactly the same spots of the floor, the legs straight, the hips high."
_ROW_STILL = (" The bar is a straight bar at standing hip height running into the depth of the picture; both hands grip "
              "it overhand, shoulder-width apart, and the heels stay on the floor. The body is one rigid straight plank "
              "from the heels to the head, the head in line with it, face up towards the bar, in profile.")
POSE_TEXT.update({
    ("pike_pushup", "k4"): _Q + "The BOTTOM of a pike push-up: hips high, the body an upside-down V; both hands flat on the "
        "floor shoulder-width apart, both elbows bent about 75 degrees and pointing back towards the feet; the top of the "
        "head nearly touches the floor just IN FRONT of the hands; legs straight, on the balls of the feet." + _PIKE_STILL,
    ("pike_pushup", "k1"): "The TOP of the pike push-up: both arms fully straight, in one straight line with the back from "
        "the hands to the hips, the head between the arms, well above the floor." + _PIKE_STILL,
    ("pike_pushup", "k2"): "A THIRD of the way down the pike push-up: the elbows just starting to bend backwards, the head "
        "a little lower than at the top, still high above the floor." + _PIKE_STILL,
    ("pike_pushup", "k3"): "TWO THIRDS of the way down the pike push-up: the elbows clearly bent and pointing back, the "
        "head halfway down to the floor, moving forward in front of the hands." + _PIKE_STILL,
    ("inverted_row", "k4"): _Q + "The TOP of an inverted row: the chest touches the bar, both elbows bent and behind the "
        "body, pointing down." + _ROW_STILL,
    ("inverted_row", "k1"): "The BOTTOM of the inverted row: both arms fully straight, hanging from the bar, the body "
        "low and nearly level, just above the floor." + _ROW_STILL,
    ("inverted_row", "k2"): "A THIRD of the way up the inverted row: the elbows starting to bend, the chest a third of "
        "the way to the bar." + _ROW_STILL,
    ("inverted_row", "k3"): "TWO THIRDS of the way up the inverted row: the elbows bent at about 90 degrees, pointing "
        "down, the chest close below the bar." + _ROW_STILL,
})


# v8 retry: the first in-betweens bunched up (pike 1/3 already as bent as 2/3; row 1/3 and 2/3 near the top).
POSE_TEXT[("pike_pushup", "k2")] += (" The arms are STILL NEARLY STRAIGHT, the elbows only slightly bent; the head is "
    "only a little below its top position, far above the floor, the shoulders still behind the hands.")
POSE_TEXT[("pike_pushup", "k3")] += (" The head is exactly HALFWAY between the top position and the floor, not lower; "
    "the elbows bent about 120 degrees, clearly less bent than at the bottom.")
POSE_TEXT[("inverted_row", "k2")] += (" The arms are only SLIGHTLY bent, about 150 degrees at the elbow; the chest is "
    "still FAR below the bar, about two thirds of an arm's length under it; the body is nearly as low as at the bottom.")
POSE_TEXT[("inverted_row", "k3")] += (" The chest is still clearly BELOW the bar, about a forearm's length under it, NOT "
    "touching it; the elbows bent at a right angle.")


# v8 retry 2 (blind coach: REDO, things slide): the hands crept along the bar towards the head and the heels slid.
NEVER["inverted_row"] = ("The two hands are drawn EXACTLY over the hands of image 2, at the same pixels on the bar, "
    "nearer the LEFT post than the head is; the straight or bent arms reach from there to the shoulders. The heels "
    "are drawn exactly over the heels of image 2. The bar, the posts, the camera, the framing and the scale do not "
    "change. The face looks up at the bar in profile, not at the camera.")


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
    force = "--force" in rest
    rest = [r for r in rest if r != "--force"]
    if command in ("pose", "fresh", "new", "newkey") and rest and report(rest[0]) and not force:
        sys.exit(f"{rest[0]}: the guide breaks the anatomy rules above. Fix it, or pass --force to pay anyway.")
    if command == "check":  # check [slug...]: anatomy violations of every guide (free); exit 1 if any
        found = [slug for slug in rest or EXERCISES if report(slug)]
        print(f"{len(found)} of {len(rest or EXERCISES)} exercises with violations")
        sys.exit(1 if found else 0)
    elif command == "selftest":
        selftest()
    elif command == "refs":
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
            if EXERCISES[slug].get("zoom"):
                a = zoom_a(slug)
            for k, pose in EXERCISES[slug]["keys"].items():
                if pose is not None:
                    g = draw(slug, k)
                    magick(a, "-resize", "1024x1024", g, "-compose", "blend", "-define", "compose:args=55",
                           "-composite", g.with_name(f"{k}_over_A.png"))
                    print(g)
            report(slug)
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
    elif command == "fresh":  # fresh <slug> <n>...: new A candidates (route O)
        import concurrent.futures
        slug, *ns = rest
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(lambda n: fresh(slug, int(n)), ns))
        print(f"spent {spent():.3f} $")
    elif command == "new":  # new <slug> <n>...: v3 A candidates (guide + style reference)
        import concurrent.futures
        slug, *ns = rest
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(lambda n: fresh_new(slug, int(n)), ns))
        print(f"spent {spent():.3f} $")
    elif command == "newkey":  # newkey <slug> <key> <n>... [--base rel]: v3 other key (guide first)
        import concurrent.futures
        base = rest.pop(rest.index("--base") + 1) if "--base" in rest else None
        rest = [r for r in rest if r != "--base"]
        slug, key, *ns = rest
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            list(pool.map(lambda n: fresh_key(slug, key, int(n), base), ns))
        print(f"spent {spent():.3f} $")
    elif command == "adopt":  # adopt <slug> <candidate.png>
        print(adopt(rest[0], pathlib.Path(rest[1])))
    elif command == "mirror":
        print(mirror(rest[0]))
    elif command == "flop":  # flop <slug>...: every FLOPS key, from the accepted picture (or A) it mirrors
        acc = json.loads(ACCEPTED.read_text())
        for slug in rest:
            for dst, src in FLOPS[slug].items():
                rel = acc.get(slug, {}).get(src) if src != EXERCISES[slug]["a_key"] else None
                srcp, out = PILOT / rel if rel else PILOT / "A" / f"{slug}.png", PILOT / "poses" / slug / f"{dst}_F1.png"
                magick(srcp, "-flop", out)
                log({"provider": "local", "model": "imagemagick", "step": "mirror", "slug": slug, "key": dst,
                     "file": str(out.relative_to(PILOT)), "inputs": [{"name": str(srcp.relative_to(PILOT)), "sha256": sha(srcp)}],
                     "date": now(), "cost_usd": 0})
                acc.setdefault(slug, {})[dst] = str(out.relative_to(PILOT))
                print(out)
        ACCEPTED.write_text(json.dumps(acc, indent=1))
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
