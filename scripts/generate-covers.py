#!/usr/bin/env python3
"""Generate the quest and adventure cover art.

  python3 scripts/generate-covers.py                    # every cover
  python3 scripts/generate-covers.py chop_wood the_golem

Covers are landscape scenes, not figures: they sit behind a title on the quest and adventure
cards, so they are 4:3, empty of people, and fall off into darkness at the edges to meet the app
background. The emptiness is stated positively in each scene ("the clearing is deserted") rather
than as a negative, which is what actually keeps figures out of them.

The scene descriptions below are unchanged from the version that generated the current set; only
the provider changed. See scripts/lib/flux.py for why.
"""

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from lib.flux import ROOT, run  # noqa: E402

STYLE = (
    "Rendered as a dark-fantasy Franco-Belgian graphic-novel illustration with thick, "
    "confident black ink outlines and flat cel-shaded color fills with hard-edged shadows. "
    "The palette is anchored in deep obsidian blue (#0B0F19) with electric-blue rim light and "
    "high-contrast volumetric lighting; the edges of the frame fall off into darkness like a "
    "soft vignette so the art blends into a dark app background. A full-bleed widescreen 4:3 "
    "landscape composition that fills the entire frame edge to edge, cinematic and immersive."
)

# (slug, subdir, scene) — priority order = list order. Scenes lead with shot type and end
# with a semantic emptiness negative.
COVERS = [
    ("lumber_route", "adventures",
     "A wide establishing shot of a winding dirt path threading through a misty ancient pine "
     "forest at blue hour, leading to a small clearing where a half-built wooden lean-to shelter "
     "stands beside stacked fresh-cut logs and an axe buried in a tree stump; a single warm amber "
     "lantern glows on the shelter. The forest is quiet and deserted with no people or animals — "
     "the calm start of a long journey."),
    ("the_golem", "adventures",
     "A dramatic low-angle wide shot inside a shattered mountain cavern: the colossal silhouette "
     "of a stone golem built from grey boulders looms far back in the drifting mist, red-orange "
     "magma light glowing from the cracks between its stones; broken pillars and rubble litter the "
     "foreground while cold god rays cut through the dust. The lair is empty, ominous and immense."),
    ("chop_wood", "quests",
     "A wide shot of a woodcutter's clearing at the forest edge at dawn: a large tree stump with "
     "an axe buried in it centered in frame, split logs neatly stacked, wood chips scattered across "
     "the ground, soft golden morning light filtering through tall pines. The clearing is deserted, "
     "no people."),
    ("gather_stones", "quests",
     "A wide shot of a rocky quarry at the foot of a grey cliff at dusk: heavy scattered boulders "
     "and a sturdy wooden cart half-loaded with stones, a freshly dug foundation trench in the "
     "earth, long cool shadows. The quarry is empty and still, no workers present."),
    ("raise_the_shelter", "quests",
     "A wide shot of a timber-frame shelter under construction at dusk: wooden beams and lashed "
     "scaffolding rising into a raised roof frame, coils of rope and hand tools resting on the "
     "ground, warm torchlight illuminating the worksite against a deep blue sky. The site is "
     "deserted, a sense of progress left behind, no people."),
    ("golem_strike", "quests",
     "A dramatic low-angle wide shot of a battle-scarred stone arena floor where a colossal "
     "fractured stone fist has just slammed into the ground, glowing red cracks radiating outward "
     "from the impact, dust and shattered rubble thrown into the air, the huge shadow of a golem "
     "falling across the scene. No people in frame — pure impact and aftermath."),
    ("golem_core", "quests",
     "A tight dramatic shot of a massive cracked boulder formation; at its centre a glowing "
     "red-orange crystalline core is embedded deep in the grey stone, molten magma veins spreading "
     "out through the fractures, a dark cavern receding behind. It is a rock formation, not a body "
     "— no anatomy, no figure, no person."),
    ("tower_climb", "quests",
     "A vertigo-inducing low-angle wide shot looking straight up at an impossibly tall ancient "
     "stone tower spiralling into churning dark storm clouds, worn stone stairs winding up its "
     "crumbling exterior, flashes of electric-blue lightning behind it. The stormy sky fills the "
     "entire frame edge to edge with no white borders. No people."),
    ("knight_push", "quests",
     "A wide shot of a knight's stone training courtyard at first light: worn flagstones, "
     "weathered wooden training dummies and a rack of practice weapons, faded heraldic banners "
     "hanging on the castle wall behind, a cool disciplined martial atmosphere. The courtyard is "
     "empty, no people."),
    ("shield_wall", "quests",
     "A dramatic wide shot along a fortress rampart at night: a long row of tall interlocked "
     "shields lines the stone battlement, torches flickering between them, an approaching storm "
     "gathering on the horizon beyond the walls. A resolute defensive mood, no soldiers visible — "
     "just the wall of shields."),
    ("core_forge", "quests",
     "A wide interior shot of a blacksmith's forge focused on a glowing anvil and a roaring forge "
     "fire, steel bars heating red-hot, hammers and tongs resting nearby, bright sparks flying "
     "through the dim smoky air, intense orange heat glow against deep shadow. The forge is "
     "unattended, no smith present."),
    # --- Phase C/D/E batch (docs/content/missing-image.md §5) ---
    ("squire_path", "adventures",
     "A wide establishing shot at first light of a worn footpath leaving a sleeping village, "
     "climbing gently between low stone walls toward distant pine ridges; a plain wooden training "
     "shield and a straw practice dummy lean by the gate, dew on the grass, pale gold light just "
     "touching the hills. Quiet, humble, the very beginning of a road — no people in frame."),
    ("squire_awakening", "quests",
     "A wide shot of a bare stone courtyard at dawn, a scuffed practice shield propped against a "
     "low wall beside a coil of rope and a wooden bucket, long soft shadows across worn flagstones, "
     "the keep still dark behind. Humble and unglamorous, the first morning of training — deserted, "
     "no people."),
    ("bears_road", "quests",
     "A wide shot of a steep forest trail winding upward through dense pines, thick roots crossing "
     "the path like steps, deep bear tracks pressed into the mud, cold blue mist between the trunks "
     "and a shaft of low sun ahead. The trail is empty — no animals, no people."),
    ("cellar_hauler", "quests",
     "A dramatic low-angle shot from inside a dim stone cellar looking up at a heavy timber hatch "
     "in the ceiling, a thick knotted rope hanging from it, storm light and rain spilling through "
     "the gap around its edge, crates and barrels in the shadows below. Tense and close — no people "
     "in frame."),
    ("ploughmans_vow", "quests",
     "A wide shot of a ploughed field at golden hour, deep furrows running to the horizon, a heavy "
     "wooden plough left standing in the earth with a yoke resting beside it, a stone farmhouse "
     "small in the distance. Honest, heavy, unromantic labour — the field is deserted, no people."),
    ("crows_ascent", "quests",
     "A dramatic low-angle wide shot of a sheer fortress wall rising into low cloud, iron rungs and "
     "a weathered beam jutting from the stone far above, crows wheeling around the parapet against "
     "a bruised evening sky. Vertigo and height — no climbers, no people in frame."),
    ("colossus_trial", "quests",
     "A dramatic low-angle wide shot of a vast toppled stone colossus lying face down in a desert "
     "arena, one enormous carved hand thrust up out of the sand as if holding the sky, dust drifting "
     "in hard sunlight, cracked flagstones radiating from the impact. Immense and silent — no people."),
    ("storm_of_blades", "quests",
     "A wide shot of a windswept dune ridge at dusk, dozens of swords and spears driven point-down "
     "into the sand in a long broken line, tattered banners snapping in the gale, sand streaming off "
     "the crest against a violet storm sky. Movement everywhere, no combatants — the field is empty."),
    ("serpents_coil", "quests",
     "A tight dramatic shot of the coils of an enormous stone serpent statue wound around a central "
     "pillar in a flooded temple chamber, violet mist pooling between the rings, faint light from a "
     "shaft above catching the carved scales. Pressure and constriction — a carving, not a creature; "
     "no people."),
    # Mobility quests (0024) -- rest-day sessions, so the scenes are calm by design.
    ("dawn_ritual", "quests",
     "A wide shot of a bare stone terrace on a keep's roof at first light, a single woven mat "
     "unrolled at its centre, cold mist lying in the valley below and the sun just clearing the "
     "far ridge. Stillness before anything begins -- the terrace is deserted, no people."),
    ("hearthside_unbinding", "quests",
     "A warm interior wide shot of a great hearth burning low, travelling packs and muddy boots "
     "set down beside a thick rug, firelight pooling across worn flagstones and a cloak drying on "
     "a hook. The march is over -- the room is empty, no one in frame."),
    ("handlers_vigil", "quests",
     "A quiet night shot of a workbench under a shuttered window, a pair of chalk-dusted hand "
     "wraps unrolled beside a guttering candle, a bowl of water and a whetstone within reach, "
     "moonlight edging the sill. Careful preparation -- the room is unoccupied, no people."),
]


if __name__ == "__main__":
    failed = run(
        [(f"{subdir}/{slug}", f"{scene} {STYLE}") for slug, subdir, scene in COVERS],
        out_dir=ROOT / "assets" / "images",
        width=1024,
        height=768,
        quality=88,
        suffix=".jpg",
    )
    sys.exit(1 if failed else 0)
