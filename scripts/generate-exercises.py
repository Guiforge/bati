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
    # The old draw had a blank black void where the face should be, and read as a hang rather than
    # a pull. Both are named: the face is described as a thing to draw, and the pose is anchored on
    # `dead_hang` with the pull given as an addition to it.
    ("pullups",
     "A fantasy athlete hero hanging from a rugged stone bar high overhead, seen from a slight low "
     "angle, legs together and feet swinging free a long way above the ground. It is a dead hang "
     "but for the arms: both elbows are folded hard, the hands grip the bar overhand with the "
     "knuckles towards the viewer, and they have been pulled down so far that both fists now sit "
     "level with the shoulders, which puts the head up beside them and the chin clearly above the "
     "top of the bar. The face is turned towards the camera and fully drawn, with eyes, nose and mouth "
     "plainly visible and a determined expression. The back and biceps flex and glow with "
     "metallic silver-blue energy."),
    # "an invisible wall" is unrenderable, so the model kept drawing a free-standing squat. The
    # wall has to be a real object in the scene for the pose to read as a wall-sit at all.
    # The wall had to become a real object before the pose read at all — but that only got the
    # model half way: it then invented a stone block to sit on, because a seated shape with nothing
    # under it is the same lift it refuses everywhere else. So the gap gets named as a thing with a
    # size, the way `l_sit` needed, and the seat is given the one place it is allowed to be.
    ("wall_sit",
     "A fantasy athlete hero holding a wall-sit against a solid stone wall, seen from the side. "
     "The back is pressed flat against the wall, the thighs are horizontal and parallel to the "
     "ground, the shins are vertical and both feet are flat on the floor, so that hips and knees "
     "each make a right angle. Behind and below the athlete the stone wall is drawn carrying "
     "straight on down, course after course of masonry, all the way to where it meets the floor, "
     "and that unbroken wall is fully visible in the open space beneath the seat and between the "
     "backside and the ground. The athlete is held up by their own legs alone. The leg muscles "
     "glow with cool stone-grey energy and faint cracks spread under the feet."),
    # "Forearms planted" left the model free to put them anywhere, and it stretched both arms far
    # out past the head, which is a different exercise. The elbows get a position relative to the
    # shoulders instead, and the contact points are counted.
    ("plank",
     "A fantasy athlete hero in a forearm plank, seen from the side. The elbows are planted "
     "directly underneath the shoulders, so the upper arms stand vertical, and the forearms lie "
     "flat on the ground pointing forwards with the fists loosely closed just in front of the "
     "face. From the head to the heels the body holds one straight horizontal line, hips neither "
     "sagging nor lifted. The only things touching the floor are the two forearms and the toes. "
     "The core glows with golden-white energy, calm determined expression."),
    ("crunch",
     "A fantasy athlete hero performing an abdominal crunch, lying on the back with knees bent and "
     "the torso curled up toward the knees, hands beside the head; the abs glow with electric-blue "
     "energy, seen from the side."),
    # "rugged stone bar" kept rendering as a barbell with stone plates on the ends. A plain fixed
    # bar is what a chin-up needs, and the underhand grip is the whole point of the movement.
    # Came back standing on the ground holding a bar at chest height. Anchored on `dead_hang`, the
    # one bar pose this model draws right, with the delta stated as an addition: same hang, bent
    # arms. The floor is named as being far below rather than left unmentioned — an unmentioned
    # floor is one it raises to meet the feet.
    ("chin_up",
     "A fantasy athlete hero hanging from a plain fixed horizontal bar high overhead, seen from a "
     "slight low angle, legs together and ankles crossed with the feet swinging free a long way "
     "above the ground. It is a dead hang but for the arms: both elbows are folded hard, the "
     "hands grip the bar underhand with the palms facing the athlete's own face, and they have "
     "been pulled down so far that both fists now sit level with the shoulders, which puts the "
     "head up beside them and the chin clearly above the top of the bar. The face is turned "
     "towards the camera and fully drawn, with eyes, nose and mouth plainly visible. The back and biceps flex and glow "
     "with metallic silver-blue energy."),
    # Same failure and same fix as `hollow_body_hold`, its mirror image: told the limbs were
    # "lifted", the model drew a figure lying flat, tiny and adrift in the frame. The lift becomes
    # renderable once the belly is named as the single point of contact and the shape as an arc.
    ("superman",
     "A fantasy athlete hero lying face down on the floor and holding a superman hold, seen from "
     "the side, filling the frame. Only the belly and hips touch the ground. The chest and head "
     "are lifted clear of the floor with both arms stretched straight out in front and raised into "
     "the air, and the straight legs are lifted behind as well with the toes pointed and well off "
     "the ground, so the arched back makes the body a shallow bowl rocking on the stomach. Dark "
     "empty space is clearly visible under the hands and under the feet. The back glows with "
     "metallic silver-blue energy."),
    # "Knees hovering just above the ground" put them straight down on it — the same lift refused
    # everywhere else. Contact points counted, and the gap given a size.
    ("bear_crawl",
     "A fantasy athlete hero mid bear-crawl, seen from the side, back flat and hips low. Only four "
     "points touch the ground: the two hands, flat and spread, and the two sets of toes. Both "
     "knees are bent to a right angle and float a hand's width ABOVE the floor, with a clear strip "
     "of dark empty space visible under each kneecap. One hand and the opposite foot are lifted "
     "and reaching forward mid-step. The core and shoulders glow with electric-blue energy."),
    # Came back with both feet flat on the floor and no rotation at all. The lift gets the usual
    # treatment — a named contact point and a gap — and the twist is given as where the hands end
    # up rather than as a rotation, which is a motion.
    ("russian_twist",
     "A fantasy athlete hero seated on the floor, seen from a three-quarter front angle, leaning "
     "back so the torso makes a wide V with the thighs. The knees are bent and BOTH feet are "
     "raised until both heels hover at the same height as the knees, high in the air, with a wide "
     "band of dark floor visible underneath the calves and the heels — the seat is the only part "
     "of the body touching the floor and neither shoe is anywhere near it. The two hands are clasped together and "
     "carried right across to one side, held low beside the right hip and outside the line of the "
     "body, and the shoulders and chest have turned to follow them so the torso faces off to that "
     "side while the knees still point forward. The obliques glow with electric-blue energy."),
    ("side_plank",
     "A fantasy athlete hero holding a side plank propped on one forearm, hips lifted and body a "
     "straight diagonal line, top arm reaching to the sky; the side of the core glows with "
     "electric-blue energy."),
    ("glute_bridge",
     "A fantasy athlete hero lying on their back with knees bent and hips driven up into a "
     "straight line from shoulders to knees; the glutes and legs glow with warm golden energy, "
     "seen from the side."),
    # Came back standing flat-footed: "risen onto the balls of the feet" is a lift, and lifts need
    # a contact point and a gap before this model draws them.
    ("standing_calf_raise",
     "A fantasy athlete hero standing tall and perfectly upright, seen from the side, at the very "
     "top of a calf raise. The only part of either foot touching the ground is the ball of the "
     "foot and the toes; both heels are pushed high into the air behind, and a clear wedge of dark "
     "empty space is visible under each heel between it and the floor. The ankles are extended "
     "hard so the feet point almost straight down, the legs are locked straight and the calves "
     "bunch tight. The calves glow with warm golden energy."),
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
    # Came back as a body lying flat with the legs straight out, because "the other limbs stay
    # raised at 90 degrees" describes the half of the pose the model was happy to drop. Each of the
    # four limbs now gets its own clause: two point at the ceiling, two reach away low, and the
    # right angles are given as angles rather than as a shared afterthought.
    ("dead_bug",
     "A fantasy athlete hero lying flat on their back on the floor, seen from the side, with all "
     "four limbs held up in the air and no foot or hand anywhere touching the floor. One arm "
     "points straight up at the ceiling above the shoulder, fingers to the sky. The leg on that "
     "same side is lifted into a tabletop: the thigh stands vertical above the hip and the knee is "
     "folded to a clean right angle so the shin floats horizontal, the foot high in the air and "
     "well clear of the ground. The opposite arm is stretched back past the head and hovers a hand "
     "above the floor without landing on it. The opposite leg is stretched out long and low and "
     "hovers a hand above the floor as well, heel never touching down. Only the back, shoulders "
     "and head rest on the ground. The core glows with electric-blue energy."),
    # The legs came back apart and only part-way up. Given as a shape with an angle — a capital L
    # made by torso and legs — rather than as a raise, which is a motion.
    ("hanging_leg_raise",
     "A fantasy athlete hero hanging from a rugged stone bar overhead, seen from the side, arms "
     "completely straight and the body long beneath the bar. Both legs are clamped tightly "
     "together, knees locked, and they have come up to exactly horizontal at hip height: the feet "
     "are level with the hips and point straight out in front, so the torso and the legs meet at a "
     "sharp right angle and the whole silhouette reads as a capital letter L hanging from the bar. "
     "The feet are a long way above the ground. The abs glow with electric-blue energy."),
    ("jump_squat",
     "A fantasy athlete hero exploding upward out of a squat into a powerful jump, feet just "
     "leaving the ground with impact dust and motion streaks below; the legs glow with warm golden "
     "energy."),
    ("reverse_crunch",
     "A fantasy athlete hero lying on their back curling the hips off the floor to bring bent "
     "knees toward the chest; the lower abs glow with electric-blue energy, seen from the side."),
    # Came back as a plain forward lunge, then as a side lunge: "steps diagonally behind" is the
    # path the foot takes, and this model draws end positions. Restated as where the rear foot
    # finishes — on the far side of the front foot, its knee behind and outside the other knee —
    # and as a crossing the silhouette actually shows.
    ("curtsy_squat",
     "A fantasy athlete hero in the bottom of a curtsy squat, seen from a three-quarter front "
     "angle. The RIGHT foot is planted flat on the ground facing forward, that knee bent. The LEFT "
     "leg has been carried across behind it, so the left foot has ended up on the ground over on "
     "the RIGHT-hand side, well past the right foot, with only its toes down and the heel raised "
     "high. The left knee is bent and dropped low towards the floor, sitting behind the right calf "
     "and pointing down and to the right, so the two legs visibly cross over one another in the "
     "silhouette. The stance is narrow and twisted, never wide and open. The torso stays upright "
     "and square to the front. The legs "
     "glow with warm golden energy."),
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
    # Came back as a body floating flat in the void with nothing anchoring it, because "seen from
    # above" removed the floor and "rotated in a sweeping arc" described a motion rather than a
    # position. Both replaced: a side-on camera, the floor as a surface the back is pressed to, and
    # the rotation given as where the legs point rather than as an arc they travel.
    ("windshield_wipers",
     "A bird's-eye view looking straight down at a fantasy athlete hero lying on their back on a "
     "stone floor. Both arms are stretched out sideways in a wide T, palms flat and pressed to the "
     "floor on either side, and the shoulder blades stay flat on the ground. The legs are clamped "
     "together and completely straight, and from the hips they swing off at a sharp diagonal "
     "across the body to the athlete's left, so the two feet end up beside the left elbow — the "
     "silhouette reads as a T with both legs thrown over to one arm. The obliques glow with "
     "electric-blue energy."),
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
    # Came back standing on the ground between the bars, leaning over one of them — the same
    # refusal to hold a body up on its arms alone that `l_sit` and `wall_sit` showed. Given the
    # empty space below something to draw (the floor, seen far down between the posts) and the
    # feet a shape of their own (crossed, knees bent), the support reads.
    ("dip",
     "A fantasy athlete hero supporting their whole body high on two rugged stone parallel bars, "
     "seen from the side, a hand gripping the top of each bar. The torso hangs vertically between "
     "the bars, the elbows are bent to a right angle and point straight back behind the ribs, and "
     "the shoulders have sunk down level with the hands. The knees are bent and the ankles crossed "
     "so the feet tuck up behind, hanging in mid-air. Below the athlete the stone floor is visible "
     "far down between the bars' posts, well beneath the dangling feet, and the arms are the only "
     "thing holding the body up. The arms and chest glow with amber energy."),
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
    # Neither elbow met a knee and the hands were nowhere near the head: the pose was described as
    # an alternating motion, which this model resolves by drawing neither half of it. One frozen
    # instant instead, with each of the four limbs placed.
    ("bicycle_crunch",
     "A fantasy athlete hero lying on their back mid bicycle crunch, seen from the side, caught at "
     "one frozen instant. Both hands are laced behind the head with the elbows out wide. The LEFT "
     "knee is pulled up hard towards the chest and the RIGHT elbow has come across to meet it, the "
     "two of them touching in the middle above the stomach as the shoulders twist off the floor. "
     "At the same time the RIGHT leg is stretched out straight and low, hovering just above the "
     "ground without touching it, and the left elbow points back down at the floor behind. The abs "
     "glow with electric-blue energy."),
    ("diamond_pushup",
     "A fantasy athlete hero in a push-up with the hands close together under the chest, thumbs "
     "and index fingers forming a diamond, elbows tucked to the ribs and body a straight line; the "
     "arms and chest glow with amber energy, seen from a low front angle."),
    ("single_leg_deadlift",
     "A fantasy athlete hero balanced on one leg, hinged forward at the hip with a flat back, "
     "hands reaching toward the ground and the free leg extended straight behind; the hamstrings "
     "and back glow with warm golden energy, seen from the side."),
    # Came back as a sphinx: forearms down, chest still on the floor. "Pressed up" is an effort;
    # what decides the pose is that the arms are straight, which lifts the whole front of the body
    # and leaves a gap under the ribs — the same contact-point-plus-shape recipe as `superman`.
    ("cobra_stretch",
     "A fantasy athlete hero face down on the floor in a cobra stretch, seen from the side. Both "
     "hands are flat on the ground beside the ribs and the arms are pushing COMPLETELY STRAIGHT, "
     "elbows locked, which has lifted the whole chest and stomach high off the floor. The spine "
     "curves back in a deep arc and the head is tipped up to look forward. From the hips down "
     "nothing moves: the pelvis, thighs and the tops of the feet stay pressed flat to the ground, "
     "and the hips are the lowest point of the arc. Open dark space is visible between the chest "
     "and the floor. The chest and back glow with silver-blue energy."),
    # Came back with a single arm pointing forward: "both arms extended in opposite directions" is
    # one clause covering two limbs, and this model drops whatever is not the subject of its own
    # sentence. Each arm now gets one.
    ("warrior_pose",
     "A fantasy athlete hero in warrior II, seen from the side, feet wide apart. The legs are held "
     "in exactly a deep lunge: the front thigh has sunk until it is horizontal and parallel to the "
     "ground with the shin standing vertical above the ankle, so that hip and knee each fold to a "
     "right angle and the athlete is low, while the back leg stretches out long and straight with "
     "the foot turned out flat. The FRONT arm is stretched out horizontally forward at shoulder height, "
     "fingers reaching past the front knee. The BACK arm is stretched out horizontally backwards "
     "at exactly the same shoulder height, fingers reaching away behind. The two arms make one "
     "long straight line through the shoulders, and both are clearly drawn. The gaze follows the "
     "front hand. The legs glow with warm golden energy."),
    ("skater_hop",
     "A fantasy athlete hero mid lateral bound, landing on one bent leg with the free leg crossing "
     "behind, arms swept across the body, motion streaks trailing sideways; the legs glow with "
     "warm golden energy."),
    # Came back as a body lying flat: "lifted a few centimetres" is exactly the kind of lift this
    # model will not draw. Named as a shape instead — a shallow curve whose two ends are up and
    # whose single contact point is the small of the back — it has something to render.
    ("hollow_body_hold",
     "A fantasy athlete hero holding a hollow body position, seen from the side. The only part of "
     "the body touching the floor is the small of the lower back, pressed hard into it. Both ends "
     "of the body are raised: the head, shoulder blades and the arms stretched straight overhead "
     "are all off the ground, and the straight legs together with the pointed toes are off the "
     "ground too, so the whole silhouette curves gently upward at each end like a shallow banana "
     "balanced on its middle. A thin strip of dark empty space is visible under the shoulders and "
     "under the heels. The abs glow with electric-blue energy."),
    ("wrist_circles",
     "A fantasy athlete hero on hands and knees rocking gently forward over flat palms, fingers "
     "splayed wide on the ground and wrists visibly loaded, head neutral and gaze down; the "
     "forearms and wrists glow with fiery orange-red energy, seen from a low three-quarter angle."),
    ("cat_cow",
     "A fantasy athlete hero on hands and knees with the spine arched high toward the ceiling, "
     "head tucked and shoulder blades spread; the whole line of the spine glows with metallic "
     "silver-blue energy, seen from the side."),
    # "Threaded through the gap under the chest" kept producing a plain quadruped, because it names
    # the path the arm travels rather than where it ends up. Restated as final positions, part by
    # part: the shoulder and ear are ON the floor, and the arm lies flat ON the floor pointing
    # sideways out past the far knee. Nothing about how it got there.
    ("thread_the_needle",
     "A fantasy athlete hero kneeling on hands and knees who has rolled the upper body over to one "
     "side. That shoulder and the ear on the same side are resting flat on the ground, cheek "
     "turned up. That whole arm lies flat along the floor too, stretched straight out sideways "
     "away from the body, palm turned up towards the ceiling, and the hand comes to rest on the "
     "far side of the athlete beyond the opposite knee. The other hand stays planted on the floor "
     "by the head, and the hips stay high over the knees. The twisted upper back and the grounded "
     "shoulder glow with silver-blue energy, seen from a low three-quarter angle. The background "
     "is dark navy-black filling the whole frame, with no coloured border, halo or vignette."),
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
    # Came back as a straight-armed tabletop, indistinguishable from cat-cow at thumbnail size,
    # because nothing in the text forced the bottom of the rep. Two facts fix it, both read off an
    # anatomy plate: the elbows are bent and the chest is nearly touching the floor, and only the
    # KNEES are down — the shins are up in the air behind, which is what separates this from
    # kneeling on all fours.
    ("knee_pushup",
     "A fantasy athlete hero at the very bottom of a PUSH-UP, seen from the side: hands flat on "
     "the floor under the shoulders, elbows folded sharply back along the ribs, chest and chin "
     "hanging a fist above the ground, body one straight line, head lower than the hips. It is an "
     "ordinary push-up in every respect but one — instead of pivoting on the toes, the body pivots "
     "on the two knees, which rest together on the floor while the shins slope up into the air "
     "behind and the feet are raised clear of the ground. Everything above the knees is exactly a "
     "push-up. The chest and arms glow with soft fiery orange energy."),
    # First draw came back with the head detached from the torso and the legs a separate black
    # shape: an inverted body is where this model's anatomy breaks down, so the figure is described
    # bottom-up along one vertical axis — hands, then shoulders, then hips, then feet — rather than
    # as a named pose it has to reconstruct.
    ("wall_handstand",
     "A fantasy athlete hero upside down in a handstand against a stone wall, seen from the side. "
     "Both palms are flat on the floor a short step out from the wall, the arms are locked "
     "completely straight and vertical, the shoulders sit directly above the hands, the hips "
     "directly above the shoulders and the legs run straight up from there, so that the whole "
     "body is one single unbroken vertical column from hands to toes. The feet at the very top "
     "rest lightly against the wall. The head hangs down between the two upper arms and stays "
     "clearly joined to the neck and shoulders, facing the floor. The shoulders and arms glow with "
     "silver-blue energy."),
    ("dead_hang",
     "A fantasy athlete hero hanging at full stretch from a rugged stone bar, arms completely "
     "straight, shoulders relaxed away from the ears and feet clear of the ground; the forearms "
     "and hands glow with metallic silver-blue energy, seen from the front."),
    # First draw put the feet flat on the floor and the camera behind the athlete, which hides the
    # only thing the picture has to say. Both are pinned: side view, and the ground named as being
    # far below rather than merely absent — an unmentioned floor is one this model brings up to
    # meet the feet.
    ("negative_pullup",
     "A fantasy athlete hero hanging from a rugged stone bar, seen from the side, legs together "
     "and ankles crossed, feet swinging free a long way above the floor with nothing anywhere in "
     "the picture for them to stand on. It is exactly a dead hang but for one thing: the arms are "
     "not straight. Both elbows are folded to a sharp angle, the shoulders are drawn up close to "
     "the hands and the chin has risen level with the top of the bar, caught part-way through a "
     "slow descent. The back and biceps glow with metallic silver-blue energy."),
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
    # Four draws, four hangs below the bar — twice from behind. Two lessons applied here. The name
    # goes (see `dragon_flag`): every sentence that contained it produced the pulling half of the
    # movement instead of the finish. And the instant drawn is the lockout, where the geometry is
    # decidable — nothing but this ends in a straight-arm support on a high bar, whereas a
    # transition can always collapse back into a chin-up.
    ("muscle_up",
     "A fantasy athlete hero supporting their whole body on top of a high rugged stone bar, seen "
     "from the side, at the moment the ascent is finished. Both arms are locked completely "
     "straight and press down onto the bar, which passes UNDER the body at the level of the hips. "
     "The chest, shoulders and head are all well ABOVE the bar, and the legs hang straight down "
     "beneath it with the feet a long way above the ground. The athlete is perched on top of the "
     "bar and is not hanging underneath it at any point. The back, chest and arms glow with "
     "metallic silver-blue energy."),
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
    # Came back as a lying leg raise, which is what a dragon flag collapses into the moment the
    # hips are allowed to stay down. Same lever that rescued `single_leg_glute_bridge`: name the
    # geometry rather than the effort. Here the body is one rigid pole pivoting on the shoulders,
    # and the fact that decides it is which parts of the bench are still touched.
    # ... and the second draw put a literal dragon banner in the athlete's fist, because the move's
    # name is two nouns this model would much rather render than a posture. So the name appears
    # nowhere below: the prompt describes only the shape, and the slug carries the identity.
    ("dragon_flag",
     "A fantasy athlete hero holding a whole-body lever on a low stone bench, seen from the side. "
     "There is no banner, no flag, no cloth and no pole anywhere in the picture. Only "
     "the shoulders and the very top of the back still rest on the bench; both hands reach back "
     "over the head to grip its far edge. From the shoulders upward the entire body — back, hips, "
     "legs and feet — is one single rigid straight pole tilted steeply into the air, with the hips "
     "and the whole lower back lifted well clear of the bench and nothing but empty dark space "
     "beneath them. The body does not bend at the waist and the hips never touch the bench: the "
     "whole pole pivots on the shoulders, and it is not a leg raise. The abdominals glow with "
     "electric-blue energy."),
    # A block under the hands, same reason as `tuck_l_sit`. The flat-palmed version came back as a
    # crouch: what separates a tuck planche from squatting on your hands is the forward shoulder
    # lean and the knees being *behind* the hands, so both are stated as positions, not qualities.
    #
    # ONE block, for the reason spelled out on `l_sit`: given a spare block in a side view this one
    # stood a foot on it, which is a crouch on a step and not a balance at all.
    ("tuck_planche",
     "A fantasy athlete hero at the top of a PUSH-UP position on a single low stone block, seen "
     "from the side, arms locked dead straight — and from that starting point two things change. "
     "First the weight has shifted forward until the shoulders sit well ahead of the hands. Second "
     "the feet have left the ground completely and both knees have come up tight against the "
     "chest, so the body now floats behind the arms with the hips at about shoulder height and the "
     "toes hanging in mid-air, touching nothing. Both hands press flat on top of that one block, "
     "one directly behind the other so only the near hand shows. There is exactly ONE stone block "
     "in the entire picture — no second block, no step, no ledge — and nothing under the body but "
     "empty dark space. The shoulders and locked arms glow with silver-blue energy. No white "
     "outline, border or frame around the figure."),
]

# The three expeditions of 0041 are the one family in this folder that STYLE cannot describe.
# Every other entry above is a body against a void, because a reader mid-session has to copy a
# joint angle. Nobody needs to be taught to walk: what these three have to say is *where* — outside
# the walls, ground covered, a direction. So they take the covers' register instead (a place, edges
# falling into darkness, emptiness stated positively), and a walker in one of them is scenery at
# the scale of a merlon, not a diagram of a stride.
#
# Still square at 1280, and still in this folder: they land in the same six slots as every other
# movement, five of them square, and thumb-exercises.py reads this directory.
EXPEDITION_STYLE = (
    "Rendered as a dark-fantasy Franco-Belgian graphic-novel illustration with thick, confident "
    "black ink outlines and flat cel-shaded colour fills with hard-edged shadows. The palette is "
    "anchored in deep obsidian blue (#0B0F19) with cold rim light and high-contrast volumetric "
    "lighting; the edges of the frame fall off into darkness like a soft vignette so the art "
    "blends into a dark app background. A square 1:1 landscape composition filling the entire "
    "frame edge to edge, cinematic and immersive, the sky and the ground both given room. The "
    "artwork is unsigned, bearing no caption, no logo, no watermark and no artist's mark."
)

EXPEDITIONS = [
    ("wardens_walk",
     "A wide shot at dusk along a long stretch of village wall, the worn earth track that runs "
     "beside it leading away from the camera past the merlons and out into open moorland, one "
     "brazier burning far ahead where the wall turns, the last cold light draining out of the sky. "
     "Small in the middle distance, seen from behind and no taller than the merlons beside them, "
     "one lone walker in a plain travelling cloak carries a lantern down the track at an easy "
     "conversational pace, both feet on the ground, going nowhere in a hurry. Nothing is "
     "happening: the track simply carries on out of the frame, and the walk is the whole subject. "
     "Beyond that one small figure the wall and the moor are deserted."),
    ("messengers_run",
     "A wide shot at last light of a rutted dirt road crossing open country between two places, "
     "wooded hills behind and the small warm lights of a village showing far ahead on the plain, a "
     "leaning wooden waymarker at the roadside and mist gathering in the fields. Small in the "
     "middle distance, one lone messenger runs along the road towards those lights, seen from "
     "behind and slightly to the side, mid-stride with one foot clear of the ground, a sealed "
     "leather satchel strapped across the back and a thin plume of dust hanging where they have "
     "just passed. The distance is the subject, not the runner. The road holds nobody else."),
    # The hard one, and the reason it is written the way it is. This movement is a bicycle in the
    # real world and this world has no bicycles, so the whole picture has to be horse. Two of §8's
    # rules apply at once: a countable fact beats an adjective (four hooves, one of them down), and
    # add rather than forbid — an anatomy given in full leaves the model nothing to substitute. The
    # single blunt negative stays anyway, because this is the one failure worth discarding a draw
    # over rather than shipping.
    ("outriders_ride",
     "A wide shot at golden hour of a grass track running across rolling open downland toward far "
     "blue ridges, the country falling away for leagues on either side and a low sun raking long "
     "shadows across the turf. Along that track, seen from the side at a middle distance, a lone "
     "scout rides a real horse at a steady even canter: a large muscular animal with four legs and "
     "four hooves, a long mane streaming back off its arched neck, a full tail flowing behind, "
     "leather saddle and stirrups and bridle, reins running from the bit to the rider's hands, the "
     "forelegs reaching forward and one hind hoof still driving off the ground and throwing up "
     "turf. The rider sits deep and upright in the saddle in a plain travelling cloak, unhurried, "
     "covering ground. The horse is the only thing that carries them. There is nothing mechanical "
     "anywhere in this picture: no wheel, no cart, no machine, no vehicle of any kind. The downland "
     "is otherwise empty, no other riders and no people."),
]

if __name__ == "__main__":
    failed = run(
        [(slug, f"{pose} {STYLE}") for slug, pose in EXERCISES]
        + [(slug, f"{scene} {EXPEDITION_STYLE}") for slug, scene in EXPEDITIONS],
        out_dir=ROOT / "assets" / "images" / "exercises",
        width=1280,
        height=1280,
        suffix=".jpg",
    )
    sys.exit(1 if failed else 0)
