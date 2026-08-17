#!/usr/bin/env python3
"""Generate the 62 exercise illustrations.

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
    # A block under the hands, same reason as `tuck_l_sit` — flat-palmed on the floor came back
    # with the hips resting on it, which is a seated pike stretch and not this movement.
    #
    # ONE block, though, not two. Two blocks "shoulder-width apart" is unambiguous from the front
    # and meaningless from the side, where the model laid them out front-to-back instead and
    # promptly rested the calves on the spare one — re-grounding the body the blocks were there to
    # lift. Any unoccupied surface in frame becomes a support. From the side the two parallettes
    # overlap into one silhouette anyway, so one block is both correct and un-abusable.
    ("l_sit",
     "A fantasy athlete hero holding an L-sit on a single low stone block, seen from the side. Both "
     "hands press flat on top of that one block, one directly behind the other so only the near "
     "hand shows, arms locked dead straight and vertical. The trunk is held UPRIGHT and vertical, "
     "chest tall, the hips hanging in mid-air level with the top of the block, while both legs "
     "stick straight out forwards and horizontal at hip height — trunk and legs meet at a sharp "
     "right angle and the silhouette reads as a capital letter L. There is exactly ONE stone block "
     "in the entire picture and nothing whatsoever beneath the legs or the hips: only empty dark "
     "space, with the floor far below. The core and arms glow with electric-blue energy. No white "
     "outline, border or frame around the figure."),
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
    # The `0032` batch: seven rungs inserted between movements that were already here, so each of
    # these has to read as *clearly easier* than the art directly above it on the ladder. That is
    # the whole job — a knee push-up drawn as heroically as a diamond push-up teaches nothing.
    ("knee_pushup",
     "A fantasy athlete hero in a push-up with the knees resting on the ground, ankles crossed "
     "behind, chest lowered to a fist above the floor and the body a straight line from head to "
     "knee; the chest and arms glow with soft fiery orange energy, seen from the side."),
    ("wall_handstand",
     "A fantasy athlete hero holding a handstand with the feet resting against a solid stone wall "
     "behind them, arms locked straight, body stacked vertically and ribs closed; the shoulders "
     "and arms glow with silver-blue energy, seen from the side."),
    ("dead_hang",
     "A fantasy athlete hero hanging at full stretch from a rugged stone bar, arms completely "
     "straight, shoulders relaxed away from the ears and feet clear of the ground; the forearms "
     "and hands glow with metallic silver-blue energy, seen from the front."),
    ("negative_pullup",
     "A fantasy athlete hero part-way down from the top of a pull-up on a rugged stone bar, chin "
     "just below bar height and elbows bending open under control, the descent slow and "
     "deliberate; the back and biceps glow with metallic silver-blue energy, seen from a slight "
     "low angle."),
    # Three failures taught the rule this batch runs on. "Seated ... lifted clear of the floor" is a
    # contradiction the model settles by drawing the seated half; forbidding contact ("the hands are
    # the only part touching") produced a bear crawl, because a negative says what to avoid without
    # saying what to draw; and "arms like two pillars" put a literal pillar in the frame.
    #
    # What the whole batch has in common is the real rule: this model cannot draw a body held up by
    # nothing. Every off-the-ground pose it got right — handstand push-up, table row, inverted row,
    # scapular pull-up, dead hang — has a visible object doing the holding, and every one it got
    # wrong had only the floor. So the hands go on two low stone blocks: the gap under the hips
    # stops being an instruction the model can ignore and becomes a thing with a height.
    #
    # Not a cheat on the movement either — parallettes are the standard prop for exactly these
    # three, and raising the hands is how the tuck L-sit is taught before anyone has the compression
    # to clear the floor flat-palmed.
    ("tuck_l_sit",
     "A fantasy athlete hero holding a tuck L-sit on two low stone blocks set shoulder-width apart "
     "on the ground. One hand grips the top of the left block and the other hand grips the top of "
     "the right block — both arms are down at the athlete's sides, locked dead straight and "
     "vertical, and neither hand goes anywhere near the head. The trunk is upright between them "
     "and lifted off the floor, both knees drawn up tight against the chest, the toes hanging in "
     "the air below the knees. Clear dark empty space is visible between the athlete's seat and "
     "the floor. The abdominals and triceps glow with electric-blue energy, seen from the side."),
    # Three failures, three different lessons. Told only that the hips go up, this model put the
    # hands behind the body and pushed, giving a reverse plank — so the arms are pinned to the floor
    # first. Told the raised leg in a main clause and the planted leg in a subordinate one, it drew
    # the raised leg and simply left the other off the body: whatever is not the grammatical subject
    # of a sentence can go missing, so the planted leg now gets a sentence of its own, up front.
    # And "hips driven high" is another lift the model will not render — named instead as a gap
    # with a shape, the trick `l_sit` needed.
    ("single_leg_glute_bridge",
     "A fantasy athlete hero lying face-up on the floor, seen from the side, head and shoulders "
     "flat on the ground, both arms lying flat along the floor at the sides with the palms down — "
     "the hands are beside the hips, NOT behind the body, and they carry no weight. "
     "From the shoulders the body rises in one straight diagonal ramp: shoulder blades pressed to "
     "the floor, hips at the top of the slope, and the line running on down to the knee. "
     "The near leg is bent at the knee and its foot is planted flat and solidly on the floor with "
     "the shin vertical; this planted leg is drawn in full and is what holds the ramp up. "
     "The far leg is lifted right off the floor and held straight, continuing the line of the "
     "thigh out into the air. Both legs are visible. The glutes and hamstrings glow with warm "
     "golden energy."),
    # Came back sitting astride the bench: "rear foot resting on a bench" leaves the rest of the
    # body unaccounted for, and an unoccupied surface is one this model will happily sit on (see
    # `l_sit`). So the bench gets exactly one permitted contact, and the stance is pinned by the
    # countable fact that worked on `pistol_squat` — how many feet are on the floor.
    ("bulgarian_split_squat",
     "A fantasy athlete hero standing in a deep split squat, seen from a three-quarter front angle "
     "with a low stone bench behind them at ankle height. Exactly one foot is on the ground: the "
     "front foot, planted flat a long stride out in front of the bench, its knee bent to a right "
     "angle. The other leg trails away backwards, its knee dropped low and almost touching the "
     "floor behind the athlete. That rear foot is turned over so the SOLE of its shoe faces up at "
     "the sky and only the laces and the top of the foot rest on the near edge of the bench — the "
     "rear foot is never flat on the bench and the athlete never stands up on it, which would be a "
     "step-up and not this movement. The torso is completely upright and vertical, chest tall. The "
     "athlete stands well in front of the bench and never sits on it or straddles it: the one and "
     "only contact with the bench is the top of that trailing foot. The front thigh and glute glow "
     "with electric-blue energy."),
    # The `0033` batch: six summits. The opposite instruction to the one above — each of these ends
    # a route, so the pose should read as the hardest thing on it. The risk here is legibility, not
    # modesty: a tuck planche drawn ambiguously is indistinguishable from a crouch.
    # A named transition means nothing to the model — twice it drew a plain hang, once from behind.
    # So the drawn instant moves to the *lockout* instead: arms straight, body above the bar,
    # bar at hip level. Nothing but a muscle-up ends in a straight-arm support on a high bar, and
    # unlike the transition it cannot collapse into a pull-up, which is what kept happening.
    ("muscle_up",
     "A fantasy athlete hero at the finish of a muscle-up, locked out in a straight-arm support on "
     "top of a rugged stone bar, seen from the side. Both arms are completely straight and press "
     "down onto the bar, the bar sits at the level of the hips and passes UNDER the body, the "
     "chest and head are high above it, and the legs hang straight down beneath the bar with the "
     "feet far above the ground. The athlete is on top of the bar, not below it. The back, chest "
     "and arms glow with metallic silver-blue energy."),
    ("toes_to_bar",
     "A fantasy athlete hero hanging from a rugged stone bar with both legs raised straight "
     "overhead and the toes touching the bar between the hands, body folded sharply at the hips; "
     "the abdominals glow with electric-blue energy, seen from the side."),
    # Came back symmetric, as a crouch on two straight arms. The half that was missing is *where*
    # the straight arm goes: not merely straight, but stretched out sideways almost flat along the
    # floor, with the hands far wider than a push-up. Named as a distance, the asymmetry survives.
    ("archer_pushup",
     "A fantasy athlete hero holding the bottom of an archer push-up, seen from the front at a low "
     "angle. The legs are stretched straight out behind, knees locked and feet together up on the "
     "toes, so that head, hips and heels form one rigid straight plank close to the ground — the "
     "knees are never bent and the hips are never piled up under the body; this is not a crouch. "
     "The two hands are planted very far "
     "apart, much wider than the shoulders. One elbow is bent deeply so that the chest is lowered "
     "right down beside that hand, almost touching the floor. The other arm is stretched straight "
     "out sideways away from the body, elbow locked and palm flat on the ground, nearly horizontal "
     "— that arm is doing no work and is simply extended along the floor. The two arms are doing "
     "completely different things. The bent arm and the chest above it glow with fiery orange-red "
     "energy."),
    # Asked for "one-legged" and got a two-legged squat: the model resolves an unusual pose towards
    # the symmetric one it knows. So the asymmetry is stated as a count of feet on the floor, which
    # is checkable, rather than as an adjective it can quietly drop.
    ("pistol_squat",
     "A fantasy athlete hero balanced at the bottom of a pistol squat. Exactly one foot is planted "
     "on the ground, that thigh folded completely down onto its own calf; the other leg is held "
     "out in front of the body perfectly straight and horizontal at hip height, its heel a long "
     "way clear of the floor, and both arms reach forward as a counterweight. One foot only "
     "touches the ground anywhere in this image — the free leg never touches it at any point. The "
     "working leg glows with electric-blue energy, seen from the side."),
    ("dragon_flag",
     "A fantasy athlete hero lying back on a low stone bench gripping its edge behind their head, "
     "the entire body raised in one rigid straight line balanced on the upper back and shoulders, "
     "feet high in the air; the abdominals glow with electric-blue energy, seen from the side."),
    # A block under the hands, same reason as `tuck_l_sit`. The flat-palmed version came back as a
    # crouch: what separates a tuck planche from squatting on your hands is the forward shoulder
    # lean and the knees being *behind* the hands, so both are stated as positions, not qualities.
    #
    # ONE block, for the reason spelled out on `l_sit`: given a spare block in a side view this one
    # stood a foot on it, which is a crouch on a step and not a balance at all.
    ("tuck_planche",
     "A fantasy athlete hero holding a tuck planche on a single low stone block, seen from the "
     "side, with the torso held HORIZONTAL like a plank in the air. Both hands press flat on top of "
     "that one block, one directly behind the other so only the near hand shows, and the elbows are "
     "locked perfectly straight — the arms are the only thing holding the athlete up. The shoulders "
     "are pushed forward past the wrists, and the back is roughly parallel with the ground, hips "
     "floating out behind the block in empty air at the same height as the shoulders. The knees are "
     "drawn up towards the chest but touch NOTHING — they do not rest on the arms, the elbows or "
     "the block, and this is not a crouch and not a crow pose. There is exactly ONE stone block in "
     "the entire picture — no second block, no step, no ledge — and nothing under the body but "
     "empty dark space with the floor far below. The shoulders and locked arms glow with "
     "silver-blue energy. No white outline, border or frame around the figure."),
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
