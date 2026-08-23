#!/usr/bin/env python3
"""Generate the villager cameos — seven named villagers, five poses each.

  python3 scripts/generate-villagers.py                     # the whole cast
  python3 scripts/generate-villagers.py smith_talk          # just one

The cameo layer draws one of these cut out over whatever screen is showing, so three things
matter more here than in any other family, and all three live in STYLE below:

**A flat void, not a vignette.** These get their alpha from scripts/cutout.py, which floods
inward from the four corners and stops at a contrast step. Three emblems came back on a *radial*
background and needed hand-tuned thresholds because the flood stalled halfway up the gradient.
Asking for one flat value edge to edge is what keeps `FAMILIES["villagers"]` free of overrides.

**A rim light all the way round.** The same instruction the avatars use, and it earns its keep
twice: it separates the figure from the void for the reader, and it gives the flood a bright
boundary it cannot cross. Without it a villager in dark clothing gets eaten from the shoulders in.

**No glow anywhere else.** The hero avatars (generate-avatars.py) all have energy in their eyes,
because the player is the exceptional one. A villager with glowing eyes reads as a second player
character. Plain human eyes is the single line that keeps the two casts apart, and it is worth
re-reading every time a prompt is edited.

**A world, not a wardrobe.** The medieval clause in STYLE is not decoration: without it FLUX
dresses these people in things a village forge could not make. The champion's first pass came back
in what read as a modern canvas work jacket, which is the tell that the model is drawing "tough
woman" from photographs rather than from the world the rest of the app is set in. Naming the
materials — hand-woven wool, hand-stitched leather, horn buttons, cloth belted rather than
tailored — fixes it far better than forbidding the modern version would.

Each villager is anchored to a building the village already paints, so the cast cannot drift into
inventing places that do not exist: smith/armory, watcher/watchtower, sage/observatory,
champion/champion_arena, herbalist/druid_grove, minstrel/campfire, farmer/barn. See
docs/gameplay/villagers.md.

The five poses each answer a moment the app already has, rather than being a spread for its own
sake: `talk` for guides and rest, `cheer` for a record or a victory, `urge` for the last third of
a set, `concern` for a deload the app is about to suggest, `salute` for a boss going down.

**One known suspect.** STYLE ends with "all four corners of the frame are empty background", and
one render in thirty-five answered by drawing a white comic-panel border — which cutout.py then
cleared instead of the background, tripping its own 14%-cleared guard. A re-roll fixed it, so it
was the dice rather than the prompt, but "frame" is a noun a model can draw. If it happens twice,
change the word to "picture" — and re-render the whole family, because a style block edit that
only some images were made with is a family that no longer matches its own script.

Afterwards, in this order — cutout.py rewrites the file as WebP in place, so converting later
would leave WebP bytes inside a .jpg:

    python3 scripts/to-webp.py
    python3 scripts/cutout.py --family villagers
"""

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from lib.flux import ROOT, run  # noqa: E402

# Identical for every villager, appended verbatim. Consistency across a set comes from the style
# block being the same characters every time, far more than from any single prompt being clever.
#
# The background sentence is first, and phrased as a description rather than a prohibition: that
# ordering is what took the "arrived on white paper" failure rate from roughly one render in seven
# down to nothing. See docs/content/image-style-prompt.md.
STYLE = (
    "The background is one unbroken flat field of very dark navy-black, as dark as a night sky, "
    "the same value from edge to edge, with no gradient, no vignette and no texture. "
    "Rendered as a dark-fantasy Franco-Belgian graphic-novel illustration: thick, confident black "
    "ink outlines and flat cel-shaded colour fills with hard-edged shadows and no soft "
    "airbrushing. A single figure, alone in the frame, framed from the waist up, turned a little "
    "off square to the viewer, the body cropped by the bottom edge of the frame. A crisp cool rim "
    "light runs the whole way around the silhouette and separates it cleanly from the background. "
    "The world is a pre-industrial medieval one and everything worn or carried is made by hand: "
    "hand-woven wool and undyed linen, hand-stitched leather with the thread visible, iron and "
    "brass fittings, horn and bone buttons, cloth wound and belted rather than tailored. Long "
    "tunics, hoods, layered cloth and wide leather belts. Nothing machine-made anywhere in the "
    "picture: no zips, no printed or synthetic fabric, no elastic, no flat modern seams, no tool "
    "or object a village forge could not have made. No full plate armour and no cape of office. "
    "The eyes are plain human eyes: nothing glows anywhere in the picture, no magical energy, no "
    "runes, no light coming off the figure. Tall 3:4 composition, high contrast, clean and "
    "graphic, an illustration with no lettering, no signature and no watermark; all four corners "
    "of the frame are empty background."
)

# Written without pronouns, so one line serves every villager and the pose reads as the same
# gesture across the cast rather than four differently-described gestures.
POSES = {
    "talk": (
        "Standing square and still, one hand raised and open at chest height mid-sentence, "
        "mouth open, speaking to the viewer."
    ),
    "cheer": (
        "Both arms raised high in a short, restrained cheer, chin up, head tilted back a little, "
        "shouting towards the viewer."
    ),
    "urge": (
        "Leaning in towards the viewer, weight well forward, one fist clenched at chest height "
        "and the other hand beckoning, jaw set, shouting one short word of encouragement."
    ),
    "concern": (
        "Standing still, head tilted a little to one side and brows drawn together, one open hand "
        "held out low in a small cautioning gesture, mouth closed, watching the viewer quietly."
    ),
    "salute": (
        "Standing straight and formal, one fist pressed flat over the heart and the head bowed "
        "slightly, eyes up and steady on the viewer, mouth closed, in a mark of respect."
    ),
}

# The named cast. Solid, nameable objects rather than professions in the abstract: "a rugged stone
# bar" once rendered as a barbell with stone plates, and "an invisible wall" simply cannot be
# drawn. An apron and a hammer can.
CAST = {
    "smith": (
        "A broad-shouldered village blacksmith, a man in his fifties in a scorched brown leather "
        "apron over a rolled-up linen shirt, forearms bare, scarred and streaked with soot, a "
        "short iron-grey beard and a shaved head. A heavy blacksmith's hammer hangs from his belt. "
        "His expression is flat and hard to impress, the face of someone who has judged a great "
        "deal of metal."
    ),
    "watcher": (
        "A lean woman watchkeeper in her thirties in a hooded oilcloth cloak worn back off the "
        "head, a quilted gambeson beneath it and a brass spyglass on a strap across her chest. "
        "Dark hair pulled back tight, a thin scar across one cheekbone. Her expression is level "
        "and unhurried, someone used to seeing things arrive before anyone else does."
    ),
    "sage": (
        "A very old village scholar, a bald clean-shaven man with a deeply lined face and heavy "
        "copper-rimmed spectacles, wearing a plain dark woollen robe with ink-stained cuffs. A "
        "small brass astrolabe hangs on a cord at his chest. His expression is patient and dry, "
        "the calm of someone who has already seen how most things end."
    ),
    # This one is rewritten, not re-rolled. "A weathered woman veteran fighter … a broken nose and
    # an old scar through one eyebrow … a sleeveless padded arming jacket" came back Content
    # Moderated for Violence three times on the same seed, while `champion_cheer` went through on
    # the first attempt — same subject, different gesture. An error that survives a change of seed
    # is the prompt, not the dice (docs/content/image-style-prompt.md), and here it was an
    # inventory of injuries. The character is intact without it: what makes her read as a veteran
    # is the muscle, the wraps and the way she looks at you, not the list of what has hit her.
    "champion": (
        "A weathered woman in her forties who runs the village training ground, close-cropped "
        "grey-blonde hair and a lined, sun-darkened face. She wears a sleeveless padded canvas "
        "jacket over bare, heavily muscled arms, her forearms wrapped in worn linen strips. Her "
        "expression is brief and evaluating, one professional sizing up another."
    ),
    "herbalist": (
        "A small, sharp-eyed old woman who keeps the village's remedies, a linen coif tied under "
        "her chin over grey hair and a heavy wool overdress. A wide leather belt carries a row of "
        "stoppered clay bottles and cloth pouches, and a bundle of dried herbs is tucked through "
        "it. Her hands are stained green at the fingertips. Her expression is brisk and knowing, "
        "someone who has heard every excuse before."
    ),
    "minstrel": (
        "A slight young man who sings for the village, a patched wool hood pushed back off tousled "
        "hair, a much-mended tunic belted with rope and a small pear-shaped wooden lute slung on a "
        "strap across his back. His expression is bright and delighted, halfway into telling a "
        "story he already knows the ending of."
    ),
    "farmer": (
        "A broad, weather-beaten woman in her forties who works the village fields, a linen coif "
        "over dark hair, a coarse wool dress with the sleeves rolled above the elbows and a heavy "
        "sacking apron. Forearms thick and sun-darkened, hands cracked with work. Her expression "
        "is calm and entirely unimpressed by hardship."
    ),
}

if __name__ == "__main__":
    items = [
        (f"{name}_{pose}", f"{subject} {gesture} {STYLE}")
        for name, subject in CAST.items()
        for pose, gesture in POSES.items()
    ]
    failed = run(
        items,
        out_dir=ROOT / "assets" / "images" / "villagers",
        width=768,
        height=1024,
        suffix=".jpg",
    )
    sys.exit(1 if failed else 0)
