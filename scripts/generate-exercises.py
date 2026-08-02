#!/usr/bin/env python3
"""Generate the 49 exercise illustrations.

  python3 scripts/generate-exercises.py            # all of them
  python3 scripts/generate-exercises.py squat plank

These images have a job the rest of the art does not: someone mid-session has to look at one and
know what to do with their body. Everything below resolves ties towards legibility.

**Square, not 4:3.** The art lands in six slots and five are square: 180x180 in WarmupView, 64x64
in ProgressionCard, 56x56 in SessionRewards, 50x50 in RestView. The sixth, ActiveExerciseView, is
`aspectRatio={16 / 10}` and crops the top and bottom off these.

**No armour.** Plate hides the joint it covers. The hero trains in fitted cloth with bare arms and
lower legs, because a bent elbow the reader cannot see is a rep they cannot copy.

**One figure, nothing else.** Whole body, margin on all four sides, no scenery, no floor line, no
second pose. At 50 pixels the silhouette is the entire message, so anything competing with it
loses. Onion-skin ghosts of the start position and a varied fantasy-race cast were both tried here
and both removed: they read as clutter at thumbnail size, which is where these are mostly seen.

The per-exercise descriptions carry the anatomy — contact points, joint angles, camera side — and
are kept verbatim from the version that generated the first set.
"""

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from lib.flux import ROOT, run  # noqa: E402

# Appended verbatim to every description below. Identical characters every time is what holds
# forty-nine images to one look; the variation belongs in the pose, never here.
#
# The background sentence comes first and blunt because it is the one the model most often ignored:
# roughly one image in seven of an earlier pass came back on white or grey paper instead of the
# void, which is glaring in a dark-only app.
STYLE = (
    "The entire background is one unbroken field of very dark navy-black (#0B0F19), as dark as a "
    "night sky, filling the frame edge to edge behind the figure, with a soft vignette and a crisp "
    "rim light tracing the silhouette, holding no scenery, no floor line and no horizon. "
    "Drawn as a clean Franco-Belgian graphic-novel illustration: confident black ink outlines and "
    "flat cel-shaded colour with simple hard-edged shadows — clear rather than dramatic, the "
    "styling a light finish over what is first and foremost an instructional diagram. "
    "One athletic hero in plain fitted dark training clothes, arms and lower legs bare so that every "
    "joint angle is plainly visible, wearing no armour, no cape and no hood, carrying no weapon, "
    "with nothing else in frame beyond the single surface the movement itself requires. "
    "A single figure in one position, the complete body inside the frame with clear margin on all "
    "four sides, nothing cropped at any edge, the pose large and centred and reading instantly and "
    "unambiguously as the exercise it is. Square 1:1 composition, the camera square to the plane of "
    "the movement at the height of the body's centre, anatomically correct with textbook form. All "
    "four corners are empty background and the artwork is unsigned, bearing no caption, no logo, no "
    "watermark and no artist's mark."
)

EXERCISES = [
    ("squat",
     "A powerful fantasy athlete hero holding a deep bodyweight squat, thighs parallel to the "
     "ground, back straight, arms extended forward for balance; the leg muscles glow with "
     "electric-blue energy veins, intense focused expression."),
    ("pushups",
     "A fantasy athlete hero in a push-up, chest hovering just above the ground, arms bent to a "
     "90-degree angle, body a straight line from head to heels; chest and arms glow with fiery "
     "orange-red energy."),
    ("pullups",
     "A fantasy athlete hero hanging from a rugged stone bar and pulling their chin above it, back "
     "and biceps flexed and glowing with metallic silver-blue energy, seen from a slight low "
     "angle."),
    # "an invisible wall" is unrenderable, so the model kept drawing a free-standing squat. The
    # wall has to be a real object in the scene for the pose to read as a wall-sit at all.
    ("wall_sit",
     "A fantasy athlete hero holding a wall-sit with the back pressed flat against a solid stone "
     "wall behind them, thighs parallel to the "
     "ground, back flat and upright, forearms resting on the knees; the leg muscles glow with cool "
     "stone-grey energy and faint cracks spread under the feet."),
    ("plank",
     "A fantasy athlete hero in a perfect forearm plank, body a straight horizontal line, forearms "
     "and toes planted; the core glows with golden-white energy, calm determined expression, seen "
     "from the side."),
    ("crunch",
     "A fantasy athlete hero performing an abdominal crunch, lying on the back with knees bent and "
     "the torso curled up toward the knees, hands beside the head; the abs glow with electric-blue "
     "energy, seen from the side."),
    # "rugged stone bar" kept rendering as a barbell with stone plates on the ends. A plain fixed
    # bar is what a chin-up needs, and the underhand grip is the whole point of the movement.
    ("chin_up",
     "A fantasy athlete hero hanging from a plain fixed horizontal pull-up bar with an underhand "
     "grip, palms facing them, pulling up "
     "until the chin clears the bar; the back and biceps flex and glow with metallic silver-blue "
     "energy, seen from a slight low angle."),
    ("superman",
     "A fantasy athlete hero lying face down with arms and legs extended and lifted off the ground "
     "in a superman hold, the whole back arched; the back glows with metallic silver-blue energy, "
     "seen from the side."),
    ("bear_crawl",
     "A fantasy athlete hero mid bear-crawl, on hands and toes with knees hovering just above the "
     "ground and hips low, one hand and the opposite foot advancing; the core and shoulders glow "
     "with electric-blue energy, seen from the side."),
    ("russian_twist",
     "A fantasy athlete hero seated with knees bent and feet lifted, leaning back and rotating the "
     "torso to one side with hands together; the obliques glow with electric-blue energy."),
    ("side_plank",
     "A fantasy athlete hero holding a side plank propped on one forearm, hips lifted and body a "
     "straight diagonal line, top arm reaching to the sky; the side of the core glows with "
     "electric-blue energy."),
    ("glute_bridge",
     "A fantasy athlete hero lying on their back with knees bent and hips driven up into a "
     "straight line from shoulders to knees; the glutes and legs glow with warm golden energy, "
     "seen from the side."),
    ("standing_calf_raise",
     "A fantasy athlete hero standing tall and risen high onto the balls of the feet, heels "
     "lifted, calves flexed hard; the calves glow with warm golden energy, seen from the side."),
    ("handstand_pushup",
     "A fantasy athlete hero inverted in a handstand against a stone wall, elbows bent lowering "
     "the head toward the floor; the shoulders and arms glow with cyan-white energy."),
    ("wall_pushup",
     "A fantasy athlete hero standing an arm's length from a stone wall, hands at shoulder height "
     "and elbows bent bringing the chest toward the wall; the chest and arms glow with fiery "
     "orange-red energy, seen from the side."),
    ("flutter_kicks",
     "A fantasy athlete hero lying on their back with legs extended just above the ground, "
     "alternating small scissor kicks with motion streaks; the lower abs glow with electric-blue "
     "energy, seen from the side."),
    ("inverted_row",
     "A fantasy athlete hero hanging beneath a low stone bar with body straight and heels on the "
     "ground, pulling the chest up to the bar; the back and arms glow with metallic silver-blue "
     "energy, seen from the side."),
    ("dead_bug",
     "A fantasy athlete hero lying on their back, one arm reaching overhead and the opposite leg "
     "extended low while the other limbs stay raised at 90 degrees; the core glows with "
     "electric-blue energy, seen from the side."),
    ("hanging_leg_raise",
     "A fantasy athlete hero hanging from a rugged stone bar with arms straight, raising straight "
     "legs in front until parallel with the ground; the abs glow with electric-blue energy, seen "
     "from the side."),
    ("jump_squat",
     "A fantasy athlete hero exploding upward out of a squat into a powerful jump, feet just "
     "leaving the ground with impact dust and motion streaks below; the legs glow with warm golden "
     "energy."),
    ("reverse_crunch",
     "A fantasy athlete hero lying on their back curling the hips off the floor to bring bent "
     "knees toward the chest; the lower abs glow with electric-blue energy, seen from the side."),
    ("curtsy_squat",
     "A fantasy athlete hero stepping one leg diagonally behind the other into a deep curtsy "
     "lunge, both knees bent; the legs glow with warm golden energy."),
    ("scapular_pullup",
     "A fantasy athlete hero hanging from a rugged stone bar with arms completely straight, "
     "shoulder blades pulled down and together lifting the body only slightly; the upper back "
     "glows with metallic silver-blue energy."),
    ("l_sit",
     "A fantasy athlete hero supporting their whole body on straight arms with hands pressed to "
     "the ground beside the hips, legs held straight out horizontally in a rigid L-shape; the core "
     "and arms glow with electric-blue energy, seen from the side."),
    ("star_jump",
     "A fantasy athlete hero at the peak of an explosive star jump, arms and legs flung wide into "
     "a star shape mid-air with motion streaks; the whole body glows with cyan-white energy."),
    ("windshield_wipers",
     "A fantasy athlete hero lying on their back with arms stretched out to the sides and straight "
     "legs held together, rotated to one side in a sweeping arc with motion streaks; the obliques "
     "glow with electric-blue energy, seen from above."),
    ("table_row",
     "A fantasy athlete hero lying face-up beneath a heavy wooden table, both hands gripping its "
     "edge, body held rigid in a straight line from heels to shoulders as they pull their chest up "
     "toward the underside of the table; the back and arm muscles glow with silver-blue energy, "
     "seen from the side."),
    ("towel_door_row",
     "A fantasy athlete hero leaning back with straight arms, both hands gripping the ends of a "
     "thick cloth looped around a sturdy door handle, heels planted and body angled back, pulling "
     "themselves upright with elbows driving past the ribs; the back muscles glow with silver-blue "
     "energy, seen from the side."),
    ("lunge",
     "A fantasy athlete hero holding a static forward lunge, front knee bent to a right angle "
     "directly over the ankle and the back knee hovering just above the ground, torso tall and "
     "vertical, both hands empty and resting on the hips, carrying no weapon and no equipment; the "
     "legs glow with warm golden energy, seen from the side."),
    ("burpee",
     "A fantasy athlete hero at the top of a burpee, exploding into a jump with arms stretched "
     "overhead and feet just off the ground, impact dust and motion streaks below; the whole body "
     "glows with cyan-white energy."),
    ("mountain_climber",
     "A fantasy athlete hero in a push-up position with hands under the shoulders, driving one "
     "knee toward the chest while the other leg stays extended, motion streaks behind the moving "
     "leg; the core glows with electric-blue energy, seen from the side."),
    ("dip",
     "A fantasy athlete hero supported on two rugged stone parallel bars, elbows bent to a right "
     "angle lowering the body between them, chest slightly forward; the arms and chest glow with "
     "amber energy, seen from the side."),
    ("pike_pushup",
     "A fantasy athlete hero in a pike position, hips high in an inverted V with straight legs and "
     "elbows bent to bring the top of the head toward the ground; the shoulders glow with "
     "cyan-white energy, seen from the side."),
    ("jumping_jack",
     "A fantasy athlete hero mid jumping jack, feet apart and arms swept overhead, just off the "
     "ground with motion streaks tracing the arms; the whole body glows with cyan-white energy."),
    ("high_knees",
     "A fantasy athlete hero running in place with one knee driven up to hip height and the other "
     "foot on the ball of the foot, torso upright, motion streaks below; the legs glow with warm "
     "golden energy."),
    ("bicycle_crunch",
     "A fantasy athlete hero lying on their back, one elbow rotating toward the opposite bent knee "
     "while the other leg extends straight and low; the obliques glow with electric-blue energy, "
     "seen from above at a slight angle."),
    ("diamond_pushup",
     "A fantasy athlete hero in a push-up with the hands close together under the chest, thumbs "
     "and index fingers forming a diamond, elbows tucked to the ribs and body a straight line; the "
     "arms and chest glow with amber energy, seen from a low front angle."),
    ("single_leg_deadlift",
     "A fantasy athlete hero balanced on one leg, hinged forward at the hip with a flat back, "
     "hands reaching toward the ground and the free leg extended straight behind; the hamstrings "
     "and back glow with warm golden energy, seen from the side."),
    ("cobra_stretch",
     "A fantasy athlete hero lying face down with hands under the shoulders, chest pressed up and "
     "the spine arched while the hips stay on the ground, head lifted; the chest and back glow "
     "with silver-blue energy, seen from the side."),
    ("warrior_pose",
     "A fantasy athlete hero in a wide warrior stance, front knee bent over the ankle and back leg "
     "straight, both arms extended at shoulder height in opposite directions, gaze forward; the "
     "legs glow with warm golden energy, seen from the side."),
    ("skater_hop",
     "A fantasy athlete hero mid lateral bound, landing on one bent leg with the free leg crossing "
     "behind, arms swept across the body, motion streaks trailing sideways; the legs glow with "
     "warm golden energy."),
    ("hollow_body_hold",
     "A fantasy athlete hero holding a hollow body position on their back, lower back pressed "
     "down, shoulders and straight legs lifted a few centimetres off the ground and arms extended "
     "overhead in a shallow banana shape; the abs glow with electric-blue energy, seen from the "
     "side."),
    ("wrist_circles",
     "A fantasy athlete hero on hands and knees rocking gently forward over flat palms, fingers "
     "splayed wide on the ground and wrists visibly loaded, head neutral and gaze down; the "
     "forearms and wrists glow with fiery orange-red energy, seen from a low three-quarter angle."),
    ("cat_cow",
     "A fantasy athlete hero on hands and knees with the spine arched high toward the ceiling, "
     "head tucked and shoulder blades spread; the whole line of the spine glows with metallic "
     "silver-blue energy, seen from the side."),
    ("thread_the_needle",
     "A fantasy athlete hero kneeling on all fours who has rotated their torso sideways: one "
     "shoulder and the side of the head are pressed flat against the ground, and that same arm is "
     "threaded straight through the gap under the chest so the hand sticks out past the opposite "
     "knee, palm up. The other hand stays planted, the hips stay high and square over the knees, "
     "and the chest faces the side wall rather than the floor. This is a spinal rotation, not a "
     "forward reach: nothing extends in front of the head. The twisted upper back and the grounded "
     "shoulder glow with silver-blue energy, seen from a low three-quarter angle. The background "
     "must be dark navy-black filling the whole frame, with no coloured border, halo or vignette "
     "of any kind."),
    ("standing_forward_fold",
     "A fantasy athlete hero folded forward from the hips with the torso hanging heavy, knees "
     "softly bent and hands drifting toward the floor, hair falling free; the hamstrings and lower "
     "back glow with warm golden energy, seen from the side."),
    ("downward_dog",
     "A fantasy athlete hero in a downward dog, hips pushed high into a sharp inverted V, arms and "
     "legs straight, heels reaching for the ground and head between the arms; the shoulders and "
     "hamstrings glow with silver-blue and golden energy, seen from the side."),
    ("pigeon_pose",
     "A fantasy athlete hero in a pigeon pose, one shin folded forward across the ground and the "
     "other leg extended straight behind, chest lifted and hips square; the front hip and glute "
     "glow with warm golden energy, seen from a three-quarter angle."),
    ("worlds_greatest_stretch",
     "A fantasy athlete hero in a deep lunge with one hand planted inside the front foot and the "
     "other arm reaching straight up in a full rotation, gaze following the raised hand; the front "
     "hip and the twisting upper back glow with golden and silver-blue energy, seen from the side."),
]

if __name__ == "__main__":
    failed = run(
        [(slug, f"{pose} {STYLE}") for slug, pose in EXERCISES],
        out_dir=ROOT / "assets" / "images" / "exercises",
        width=1280,
        height=1280,
        suffix=".jpg",
    )
    sys.exit(1 if failed else 0)
