#!/usr/bin/env python3
"""Redraw an exercise picture against a pose reference, one audited attempt at a time.

    python3 scripts/art-loop.py ref dip                      # draw the pose reference only
    python3 scripts/art-loop.py candidates dip 1             # attempt 1: 4 candidates + a sheet
    python3 scripts/art-loop.py candidates dip 2 pose.txt    # attempt 2 with a rewritten pose
    python3 scripts/art-loop.py trace dip photo.jpg choice.json  # a CC photo becomes the reference
    python3 scripts/art-loop.py accept dip <candidate.jpg>   # ship it, file its provenance

Why a reference at all: docs/content/missing-image.md §8 ran out of words. The poses that fail are
the ones that differ from the model's favourite pose by degree (a leg rotated, an arm threaded, a
body held off the floor), and no wording moved them. FLUX.2 takes up to eight images, and a pose
image is how BFL itself says structure is controlled.

Why a mannequin drawn here rather than a photo: it is ours, so the ledger can pin it by hash and
the art stays redistributable (see scripts/lib/flux.py). It also carries only the pose. A photo
brings a face, clothes and light the model then copies. Limbs on the near side are orange, far
side blue, so a crossing limb stays readable where a filled silhouette would merge it.

The loop itself is run by a person or an agent: attempt, look at the sheet against CHECKLIST,
then either accept, re-roll (same pose, new seeds) or rewrite the pose. Three attempts at most,
then the slug goes back to a human. The checklist is written by a human and never edited by the
judge, otherwise the judge can pass an image by lowering the bar.
"""

import concurrent.futures
import importlib.util
import json
import os
import pathlib
import shutil
import subprocess
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from lib.flux import ROOT, generate, record, seed_for  # noqa: E402

REFS = ROOT / "scripts" / "pose-refs"
# Not /tmp: a reboot wiped a whole run there, accepted candidates included.
WORK = pathlib.Path(os.environ.get("ART_LOOP_DIR", pathlib.Path.home() / ".cache" / "bati-art-loop"))
CANDIDATES = 4

BG, TORSO, NEAR, FAR, PROP = "#0B0F19", "#9AA3B5", "#F28C28", "#3BA7E8", "#6B7280"

PREAMBLE = (
    "Image 1 is a crude jointed-mannequin diagram that fixes the exact pose and camera angle. "
    "Orange limbs are on the side nearest the camera, blue limbs on the far side, grey is the "
    "torso and head, and flat grey shapes are the equipment. Draw the hero in precisely this "
    "pose: the same joint angles, the same limbs touching the floor or the equipment, the same "
    "viewpoint. Draw a real person in the style described below; nothing of the diagram itself, "
    "its colours or its flat shapes appears in the picture."
)

# For a pose traced from a real photo (see `trace`): the tracing keeps the body's outline and
# drops everything the model should not copy, the face, the clothes, the room.
TRACED_PREAMBLE = (
    "Image 1 is a pale line drawing on a dark ground that fixes the exact pose and camera angle. "
    "Draw the hero in precisely this pose: the same joint angles, the same parts of the body "
    "touching the floor, the same viewpoint. Draw a real person in the style described below; "
    "nothing of the drawing itself, its thin pale lines, appears in the picture, and any object "
    "in it that the description below does not name is left out."
)

# Joints on a 1024 canvas, y downwards. Each limb is a polyline of joints; `far` is drawn first,
# then the torso, then `near`, which is the whole occlusion model and all it needs to be.
POSES = {
    # Seen from beyond the feet, looking up the body, mid-sweep. A view from straight above was
    # read as a person standing with arms out: the flat floor has to be drawn, as a plane in
    # perspective, for "lying down" to survive the trip through the model.
    "windshield_wipers": {
        "head": (512, 470),
        "torso": [(512, 520), (512, 690)],
        "far": [[(470, 540), (340, 560), (190, 580)], [(500, 700), (570, 540), (640, 380)]],
        "near": [[(554, 540), (684, 560), (834, 580)], [(526, 705), (598, 548), (668, 392)]],
        "props": [[(250, 440), (774, 440), (1000, 800), (24, 800)]],
        "checklist": [
            "The person lies on their back on the floor.",
            "Both arms stretch straight out sideways in a T, both hands flat on the floor.",
            "Both shoulders stay flat on the floor.",
            "Both legs are pressed together and straight at the knee.",
            "The legs rise from the hips and lean over to ONE side, not straight up and not flat.",
            "Exactly one person with two arms and two legs, no second body, not floating.",
        ],
    },
    # Side view, facing right. Hands flat on the floor, feet in the air.
    "tuck_planche": {
        "head": (648, 520),
        "torso": [(600, 572), (380, 600)],
        "far": [[(585, 590), (555, 720), (530, 860)], [(390, 610), (505, 665), (400, 725)]],
        "near": [[(575, 600), (545, 730), (520, 860)], [(380, 600), (495, 680), (390, 740)]],
        "props": [((200, 860), (824, 872))],
        "checklist": [
            "Only the two hands touch the floor, flat, with no block, step or other prop.",
            "Both feet are clearly in the air, with visible empty space under them.",
            "Both arms are straight, elbows locked.",
            "The shoulders lean forward, ahead of the hands.",
            "The knees are tucked up against the chest and the hips are about shoulder height.",
        ],
    },
    # Seen from above and behind, head at the top. The threading arm (blue) runs under the chest
    # and out the other side; the planted arm (orange) reaches forward past the head. A side or
    # front view foreshortens exactly the arm that makes the movement, so neither was usable.
    "thread_the_needle": {
        "reference": False,
        "head": (440, 300),
        "torso": [(512, 350), (512, 640)],
        "far": [
            [(560, 360), (410, 372), (240, 382)],
            [(470, 640), (470, 860)],
            [(554, 640), (554, 860)],
        ],
        "near": [[(470, 350), (400, 280), (380, 190)]],
        "props": [],
        "checklist": [
            "Exactly two arms and two legs, no extra limb anywhere.",
            "Kneeling on both knees, with the hips raised above the knees.",
            "One shoulder and the side of the head rest on the floor.",
            "That same arm lies flat along the floor, passed under the chest and out the other "
            "side, palm up.",
            "The other hand is planted on the floor.",
        ],
    },
    # Front view, hanging. No floor: the feet hang over nothing.
    "pullups": {
        "head": (512, 200),
        "torso": [(512, 290), (512, 560)],
        "far": [[(430, 320), (350, 410), (400, 250)], [(470, 560), (470, 720), (545, 800)]],
        "near": [[(594, 320), (674, 410), (624, 250)], [(554, 560), (554, 720), (480, 805)]],
        "props": [((150, 242), (874, 258))],
        "checklist": [
            "Hanging from one horizontal bar, both hands gripping it overhand, elbows bent.",
            "The chin is above the bar.",
            "The feet hang in the air with nothing under them.",
            "Plain dark background: no wall, no bricks, no room, no scenery.",
            "The face is visible and fully drawn.",
        ],
    },
    # Side view, facing right, at the bottom of the dip. Two bars, the far one a little higher.
    "dip": {
        "head": (612, 290),
        "torso": [(580, 350), (525, 625)],
        "far": [[(575, 375), (455, 392), (555, 500)], [(530, 630), (585, 760), (465, 800)]],
        "near": [[(565, 385), (440, 410), (540, 520)], [(520, 630), (570, 770), (450, 820)]],
        "props": [
            ((250, 492), (820, 506)), ((300, 506), (312, 1024)), ((800, 506), (812, 1024)),
            ((230, 514), (800, 528)), ((270, 528), (284, 1024)), ((780, 528), (794, 1024)),
        ],
        "checklist": [
            "Two parallel bars, one on each side of the body, both visible.",
            "The body is held up by the hands on the bars alone, the feet high above the floor.",
            "The elbows are bent to about a right angle and point backwards.",
            "The torso is upright or leaning slightly forward, between the bars.",
            "The knees are bent and the feet are behind the body.",
        ],
    },
}

# Exercises drawn from a traced reference (pose-refs/<slug>.traced.png) only need their checklist.
for _slug, _checklist in {
    "chin_up": [
        "One horizontal bar, both hands gripping it UNDERHAND (palms toward the face).",
        "Elbows bent, the chin above the bar, the face visible.",
        "Both feet in the air with nothing under them.",
        "Plain dark background, no wall, no room.",
        "Same flat comic style as the rest of the set (no neon poster look).",
    ],
    "skater_hop": [
        "Front or three-quarter view.",
        "Exactly one foot on the ground, that knee softly bent.",
        "The other leg crosses diagonally BEHIND the standing leg, foot off the ground.",
        "It reads as a sideways bound, not a forward lunge.",
    ],
    "pushups": [
        "Hands flat under the shoulders, body straight from head to heels, toes on the ground.",
        "Bottom of the push-up: chest close to the ground, elbows bent.",
        "Elbows tucked back along the ribs (about 45 degrees), NOT flared out sideways.",
    ],
    "bicycle_crunch": [
        "Lying on the back, shoulders lifted, hands lightly behind the head.",
        "One knee drawn in toward the chest, the opposite elbow reaching toward it.",
        "The other leg is completely STRAIGHT, heel just above the ground.",
        "Normal athletic build, arms not oversized.",
    ],
    "towel_door_row": [
        "A door and its handle are visible.",
        "A towel is LOOPED AROUND the door handle, one end in each hand.",
        "Feet near the door, body straight and leaning back, arms straight.",
    ],
    "dragon_flag": [
        "Lying on a bench, both hands gripping the bench BEHIND THE HEAD.",
        "Only the upper back and shoulders touch the bench.",
        "Shoulders to toes form one straight rigid line, hips lifted off the bench.",
    ],
    "hollow_body_hold": [
        "Lying on the back; the LOWER BACK touches the ground.",
        "Shoulders and straight legs lifted slightly off the ground at both ends.",
        "Arms stretched past the ears in line with the body.",
        "A shallow banana shape, NOT a V-sit sitting on the buttocks.",
    ],
    "mountain_climber": [
        "Straight-arm push-up position, hands under the shoulders.",
        "One knee driven far forward under the chest, near the elbows.",
        "The other leg straight back, toes on the ground; hips level.",
    ],
    "pike_pushup": [
        "Inverted V, hips the highest point, legs straight, feet on the ground.",
        "Elbows bent, the TOP OF THE HEAD pointing down toward the ground between the hands.",
        "The gaze goes back toward the feet, not forward.",
    ],
    "handstand_pushup": [
        "Upside down, heels resting against a wall, legs straight and together.",
        "Hands flat on the ground, elbows bent, head just above the ground.",
        "Shoulders and arms anatomically plausible.",
    ],
    "wall_handstand": [
        "A wall is clearly visible.",
        "Upside down, heels resting against the wall, legs straight and together.",
        "Arms locked straight, hands flat on the ground, head between the arms.",
    ],
    "knee_pushup": [
        "Both knees on the ground, body straight from head to knees.",
        "Hands under the shoulders, elbows bent.",
        "Feet side by side, NOT crossed.",
    ],
    "russian_twist": [
        "Sitting, knees bent, both feet just off the ground, torso leaning back.",
        "The torso is ROTATED to one side, hands together beside that hip.",
        "No ball, weight or object in the hands.",
        "It reads as a twist, not a plain V-sit.",
    ],
    "bulgarian_split_squat": [
        "The top of the REAR foot rests on a chair or bench behind.",
        "Front foot flat, front thigh parallel to the ground, front knee about 90 degrees.",
        "Torso upright; hands empty (no dumbbells).",
        "The hero is not sitting or standing on the chair.",
    ],
    "standing_calf_raise": [
        "The WHOLE body is in the frame, head included.",
        "Standing on the balls of both feet, heels clearly raised, legs straight.",
        "No bar or machine; hands empty.",
    ],
}.items():
    POSES[_slug] = {"checklist": _checklist}

# Round 2 (2026-10-01): a traced drawing that carries the very fault being fixed is worse than no
# reference, and a back view fights a checklist that wants a face. These draw from text alone.
for _slug in ("towel_door_row", "mountain_climber",
              "wall_handstand", "russian_twist"):
    POSES[_slug]["reference"] = False
# The chin-up is the pull-up's pose with the grip turned: same mannequin.
POSES["chin_up"].update({k: POSES["pullups"][k] for k in ("head", "torso", "far", "near", "props")})
# Front view, landing on the near (orange) leg, the far leg crossed behind it.
POSES["skater_hop"].update({
    "head": (490, 220),
    "torso": [(500, 280), (512, 520)],
    "far": [[(450, 300), (380, 250), (320, 215)], [(480, 520), (560, 700), (650, 790)]],
    "near": [[(560, 300), (490, 380), (420, 420)], [(544, 520), (575, 700), (560, 880)]],
    "props": [],
})

# Round 3: side views, head to the right, floor at y=860. The side mannequin is what held for
# the dip and the pull-up; these replace traced drawings that carried the fault (bent "straight"
# leg, shallow split squat, a dip rack for a bench, a push-up at the top) and text that failed.
_FLOOR = ((120, 860), (904, 872))
_SIDE = {
    "pushups": {
        "head": (762, 758), "torso": [(708, 775), (450, 800)],
        "far": [[(685, 776), (605, 786), (618, 860)], [(450, 800), (340, 814), (232, 828), (206, 858)]],
        "near": [[(692, 782), (612, 792), (628, 860)], [(452, 804), (342, 818), (234, 832), (208, 860)]],
        "props": [_FLOOR],
    },
    "knee_pushup": {
        "head": (742, 760), "torso": [(690, 778), (480, 806)],
        "far": [[(668, 780), (590, 790), (600, 860)], [(478, 806), (390, 858), (290, 790)]],
        "near": [[(676, 786), (598, 796), (610, 860)], [(482, 810), (402, 860), (316, 812)]],
        "props": [_FLOOR],
    },
    "pike_pushup": {
        "head": (690, 806), "torso": [(430, 480), (628, 740)],
        "far": [[(622, 742), (566, 786), (584, 860)], [(426, 484), (322, 668), (218, 846)]],
        "near": [[(632, 748), (576, 792), (596, 860)], [(434, 488), (330, 672), (226, 850)]],
        "props": [_FLOOR],
    },
    "hollow_body_hold": {
        "head": (712, 782), "torso": [(650, 806), (482, 846)],
        "far": [[(640, 806), (740, 784), (842, 764)], [(480, 846), (350, 822), (222, 796)]],
        "near": [[(646, 812), (746, 790), (848, 770)], [(484, 850), (354, 828), (226, 802)]],
        "props": [_FLOOR],
    },
    "bicycle_crunch": {
        "head": (676, 758), "torso": [(628, 790), (482, 848)],
        "far": [[(620, 794), (640, 724), (684, 748)], [(480, 846), (560, 690), (442, 652)]],
        "near": [[(616, 800), (566, 720), (662, 744)], [(484, 850), (332, 832), (182, 818)]],
        "props": [_FLOOR],
    },
    "dragon_flag": {
        "head": (262, 734), "torso": [(320, 752), (460, 610)],
        "far": [[(318, 754), (240, 770), (164, 772)], [(456, 612), (572, 500), (686, 398)]],
        "near": [[(326, 760), (246, 778), (170, 780)], [(464, 616), (580, 506), (694, 404)]],
        "props": [((124, 772), (524, 798)), ((150, 798), (164, 860)), ((486, 798), (500, 860))],
    },
    "bulgarian_split_squat": {
        "head": (492, 390), "torso": [(482, 446), (470, 698)],
        "far": [[(478, 470), (418, 560), (468, 640)], [(466, 700), (428, 822), (250, 646)]],
        "near": [[(486, 476), (430, 566), (478, 646)], [(474, 702), (640, 702), (640, 860), (700, 860)]],
        "props": [((120, 640), (300, 660)), ((126, 660), (140, 860)), ((280, 660), (294, 860)),
                  ((120, 500), (136, 640))],
    },
}
for _slug, _pose in _SIDE.items():
    POSES[_slug].update(_pose)


def draw_ref(slug: str) -> pathlib.Path:
    pose = POSES[slug]
    image = Image.new("RGB", (1024, 1024), BG)
    draw = ImageDraw.Draw(image)

    for shape in pose["props"]:
        if len(shape) == 2:
            draw.rectangle(shape, fill=PROP)
        else:
            draw.polygon(shape, fill="#1F2533")

    def limb(points, colour, width=34):
        draw.line(points, fill=colour, width=width, joint="curve")
        for x, y in points:
            draw.ellipse((x - width / 2, y - width / 2, x + width / 2, y + width / 2), fill=colour)

    for points in pose["far"]:
        limb(points, FAR)
    limb(pose["torso"], TORSO, width=80)
    x, y = pose["head"]
    draw.ellipse((x - 48, y - 48, x + 48, y + 48), fill=TORSO)
    for points in pose["near"]:
        limb(points, NEAR)

    REFS.mkdir(parents=True, exist_ok=True)
    out = REFS / f"{slug}.png"
    image.save(out)
    return out


def exercises_module():
    spec = importlib.util.spec_from_file_location("gen", ROOT / "scripts" / "generate-exercises.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def candidates(slug: str, attempt: int, pose_file: str | None) -> None:
    gen = exercises_module()
    pose = (
        pathlib.Path(pose_file).read_text(encoding="utf-8").strip()
        if pose_file
        else dict(gen.EXERCISES)[slug]
    )
    # A traced photo wins over the mannequin. A pose may also opt out: a reference the model
    # misreads is worse than none (thread_the_needle, before it had a photo).
    traced = REFS / f"{slug}.traced.png"
    if POSES[slug].get("reference") is False:
        refs, preamble = (), ""
    elif traced.exists():
        refs, preamble = (traced,), TRACED_PREAMBLE
    elif "torso" in POSES[slug]:
        refs, preamble = (draw_ref(slug),), PREAMBLE
    else:
        refs, preamble = (), ""
    out_dir = WORK / slug
    out_dir.mkdir(parents=True, exist_ok=True)

    # Seeds are spaced by attempt so a re-roll never repeats a draw already judged.
    outs = [out_dir / f"a{attempt}_c{i}.jpg" for i in range(CANDIDATES)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=CANDIDATES) as pool:
        for i, out in enumerate(outs):
            pool.submit(
                generate,
                slug=slug,
                prompt=f"{preamble} {pose} {gen.STYLE}".strip(),
                out=out,
                width=1280,
                height=1280,
                seed=seed_for(slug) + 1000 * attempt + i,
                references=refs,
            )

    made = [o for o in outs if o.exists()]
    sheet = out_dir / f"a{attempt}_sheet.jpg"
    subprocess.run(
        ["montage", "-label", "%t", *map(str, [*refs, *made]), "-tile", "5x", "-geometry",
         "400x400+6+6", "-pointsize", "20", str(sheet)],
        check=True,
    )
    print(json.dumps({"sheet": str(sheet), "candidates": list(map(str, made)),
                      "checklist": POSES[slug].get("checklist", [])}, indent=2))


def trace(slug: str, photo: str, choice: str) -> None:
    """Reduce a freely licensed photo to its outlines, and keep where it came from beside it.

    Only CC0, public domain, CC BY and CC BY-SA sources: the art ships as CC BY-SA, and the
    source's author and licence are filed next to the tracing so the credit can be given.
    """
    out = REFS / f"{slug}.traced.png"
    # Line art on a transparent ground (Everkinetic via workout-guide) is already the outline:
    # it only needs the dark ground under it. A photo goes through the edge filter.
    has_alpha = subprocess.run(
        ["magick", "identify", "-format", "%A", photo], capture_output=True, text=True
    ).stdout.strip().lower() not in ("", "undefined", "false")
    if has_alpha:
        subprocess.run(
            ["magick", photo, "-resize", "900x900", "-background", BG, "-flatten",
             "-gravity", "center", "-extent", "1024x1024", str(out)],
            check=True,
        )
    else:
        # -colorspace sRGB before the fills: in gray, BG collapses to a lighter grey box.
        subprocess.run(
            ["magick", photo, "-resize", "900x900", "-colorspace", "gray", "-blur", "0x1.2",
             "-canny", "0x1+6%+20%", "-threshold", "50%", "-morphology", "Dilate", "Disk:1.5",
             "-colorspace", "sRGB", "-fill", "#C8D0DC", "-opaque", "white", "-fill", BG,
             "-opaque", "black", "-gravity", "center", "-background", BG, "-extent", "1024x1024",
             str(out)],
            check=True,
        )
    source = json.loads(pathlib.Path(choice).read_text(encoding="utf-8"))
    keep = {k: source[k] for k in ("source_page", "image_url", "licence", "author") if k in source}
    (REFS / f"{slug}.source.json").write_text(json.dumps(keep, indent=2, ensure_ascii=False) + "\n")
    print(out)


def accept(slug: str, candidate: str) -> None:
    src = pathlib.Path(candidate)
    rel = f"assets/images/exercises/{slug}.jpg"
    for old in (ROOT / "assets/images/exercises").glob(f"{slug}.*"):
        old.unlink()
    shutil.copy(src, ROOT / rel)
    entry = json.loads(src.with_suffix(".json").read_text(encoding="utf-8"))
    # A pose traced from someone else's work makes the picture a derived work: say whose, under
    # which licence, the way the Everkinetic-derived entries already do.
    for ref in entry.get("references", []):
        if not ref["path"].endswith(".traced.png"):
            continue  # a mannequin is ours
        source = ROOT / ref["path"].replace(".traced.png", ".source.json")
        if source.is_file():
            credit = json.loads(source.read_text(encoding="utf-8"))
            entry["derived_from"] = credit
            entry["licence"] = (
                f"derived work: pose traced from {credit['author']} ({credit['licence']}), "
                "redistributed under CC BY-SA 4.0"
            )
    record(rel, entry)
    print(f"accepted {src.name} -> {rel}; now run to-webp.py and thumb-exercises.py")


if __name__ == "__main__":
    command, slug, *rest = sys.argv[1:]
    if command == "ref":
        print(draw_ref(slug))
    elif command == "candidates":
        candidates(slug, int(rest[0]), rest[1] if len(rest) > 1 else None)
    elif command == "trace":
        trace(slug, rest[0], rest[1])
    elif command == "accept":
        accept(slug, rest[0])
    else:
        sys.exit(__doc__)
