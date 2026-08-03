#!/usr/bin/env python3
"""Generate the village art: 5 tier scenes, 6 sport emblems, 14 building icons.

  python3 scripts/generate-village.py               # all 25
  python3 scripts/generate-village.py tier_3 campfire

Two styles, because two jobs. The tiers are wide establishing shots of the settlement as it
grows, and carry the scene. The sprites and buildings are single objects on a void, cropped into
small round or square slots in VillageScene.tsx, so they are square, centred and isolated.

The scene descriptions below are unchanged from the version that generated the current set; only
the provider changed. See scripts/lib/flux.py for why.
"""

import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from lib.flux import ROOT, run  # noqa: E402

SCENE_STYLE = (
    "Rendered as a dark-fantasy Franco-Belgian graphic-novel illustration with thick, "
    "confident black ink outlines and flat cel-shaded color fills with hard-edged shadows. "
    "The palette is anchored in deep obsidian blue (#0B0F19) with electric-blue accents and "
    "high-contrast volumetric lighting; the frame edges fall off into darkness like a soft "
    "vignette. A full-bleed square 1:1 composition that fills the entire frame edge to edge "
    "with no white borders or letterboxing, cinematic, no characters, environment only."
)

EMBLEM_STYLE = (
    "Rendered as a small dark-fantasy comic-book emblem: one object, isolated and centered on "
    "a deep obsidian blue (#0B0F19) void background, thick black ink outlines, flat cel-shaded "
    "fills, a soft glowing rim light in the object's energy color. Full-bleed square 1:1 "
    "composition, no text, no characters, no scenery — just the glowing emblem."
)

# (slug, scene, style) — priority order = list order: tiers (base layer) before sprites (overlay).
TIERS = [
    ("tier_1",
     "A wide establishing shot of a single humble wooden cabin with a thatched roof and one "
     "warm-lit window, a thin trail of smoke rising from its stone chimney, a chopping stump "
     "and a few stacked logs beside it, standing alone in a quiet misty forest clearing at blue "
     "hour. The very first, humble beginning of a settlement."),
    ("tier_2",
     "A wide establishing shot of a small cluster of thatched-roof cottages gathered around a "
     "stone well and a low wooden fence, warm lantern light in several windows, smoke rising "
     "from a few chimneys, simple dirt paths connecting the homes, at blue hour."),
    ("tier_3",
     "A wide establishing shot of a walled market town: cobbled streets, a stone well square, "
     "timber-framed buildings with tiled roofs, a modest bell tower, banners hanging from an "
     "open gate, more structures than before but still modest, at dusk."),
    ("tier_4",
     "A wide establishing shot of a fortified city: tall stone towers and a rising keep above "
     "tiered rooftops, an arched stone bridge, glowing lantern-lit windows across many "
     "buildings, banners on the ramparts, construction scaffolding on one growing tower, at "
     "night."),
    ("tier_5",
     "A wide establishing shot of a magnificent flourishing city skyline at night: tall spires "
     "and domes glowing with warm golden light, banners and pennants everywhere, bridges strung "
     "with lanterns, a grand central palace tower crowned in radiant light — the peak of "
     "prosperity."),
    # 6-8 exist because the hero does not stop at 20. The level curve runs on at +2000 XP a
    # rung (db/userLevel.ts), so a committed player reached the old tier-5 ceiling in two or
    # three months and then watched the largest thing on the screen never change again.
    # Each of these has to read as *more* than "a bigger city": tier 5 already spent
    # "magnificent" and "the peak of prosperity", so they escalate in kind, not in degree.
    ("tier_6",
     "A wide establishing shot of a mountain-crowning citadel: concentric fortified walls "
     "climbing a peak in tiers, a cathedral-keep at the summit with buttresses and stained "
     "glass lit from within, stone aqueducts carrying water across deep ravines, switchback "
     "roads lined with braziers, storm clouds broken by moonlight below the summit."),
    # The first draft of this one came back almost monochrome: composition right, but cold
    # grey-blue throughout, with none of the warm lantern light every other tier carries. Between
    # tier 6's braziers and tier 8's gold it read as a step *down*, which is the one thing a
    # progression image must never do. The warmth is now stated rather than assumed.
    ("tier_7",
     "A wide establishing shot of a vast metropolis spanning a chasm: colossal arched bridges "
     "at several heights linking two cliff-cities, towers piercing a layer of cloud, funiculars "
     "climbing the rock face, districts receding into blue haze toward the horizon. Thousands of "
     "windows burn with warm amber lantern light, rows of golden street lamps line every bridge "
     "and terrace, and braziers glow at the bridgeheads — a warm, densely inhabited city ablaze "
     "with light against the cold blue of the gorge."),
    ("tier_8",
     "A wide establishing shot of an eternal capital beneath a shimmering aurora: impossibly "
     "tall spires of pale stone and gold, a ring of smaller islands floating in the sky around "
     "the highest tower and tethered by chains of light, cascading waterfalls falling off the "
     "city's edge into cloud, the whole skyline burning like a beacon over a dark world."),
]

SPRITES = [
    ("sport_arms",
     "A single stylized woodcutter's axe standing upright with its blade buried in a tree "
     "stump, a couple of split logs resting beside it, glowing with warm amber-brown wood "
     "energy."),
    ("sport_back",
     "A single stylized pickaxe leaning against a small stack of quarried grey stone blocks, "
     "glowing with cool stone-grey energy."),
    ("sport_chest",
     "A single stylized blacksmith's anvil with a small glowing forge fire beside it, "
     "radiating fiery orange-red energy."),
    ("sport_abs",
     "A single stylized wave-shaped rune carved into a smooth stone tablet, a few water "
     "droplets suspended around it, glowing with electric-blue energy."),
    ("sport_shoulder",
     "A single stylized swirling wind-rune emblem, light cyan-white wind wisps spiraling "
     "around it."),
    # assetMap.ts keys this "legs" and requires sport_legs.png. Named sport_calf here, the
    # script produced a file nothing loaded and never produced the one the village needs.
    ("sport_legs",
     "A single stylized sheaf of golden wheat tied with twine, standing upright, glowing with "
     "warm golden-yellow energy."),
]

# Village building icons (docs/content/missing-image.md §0). The 6 muscle buildings
# (archery_range/quarry/forge/well/windmill/farm) reuse SPRITES above via
# getSportSpriteAsset — zero new assets, "layer don't paint". These 14 are the ones with no
# existing art: db/schema.ts buildingDefinitions tier 1 (starter), tier 2 style-unlocked, tier 3
# (upgrades of the muscle buildings, same glow color but a grander structure), tier 4 (legendary).
BUILDINGS = [
    # Tier 1 — starter, always unlocked
    ("buildings/campfire",
     "A single stylized campfire ringed with stones, warm orange-yellow flames dancing "
     "upward, a few sparks drifting off, glowing with cozy warm-orange energy."),
    ("buildings/tent",
     "A single stylized adventurer's canvas tent, entrance flap open, a warm lantern glowing "
     "just inside, guy-ropes staked into the ground."),
    ("buildings/training_dummy",
     "A single stylized wooden training pell wrapped in worn straw padding, a few practice "
     "sword nicks visible, standing upright on a round base."),
    # Tier 2 — style-unlocked (calisthenics / yoga)
    ("buildings/wizard_tower",
     "A single stylized narrow spiraling stone wizard's tower, a glowing purple crystal orb "
     "hovering above its pointed roof, faint arcane runes on the stonework."),
    ("buildings/druid_grove",
     "A single stylized ring of ancient standing stones wreathed in glowing emerald-green "
     "vines and moss, a sacred grove clearing at its center."),
    # Tier 3 — advanced upgrades, one per muscle building (grander structure, same glow color)
    ("buildings/watchtower",
     "A single stylized tall wooden watchtower with an archer's platform at the top, a bow "
     "and quiver resting against the rail, glowing with warm amber-brown energy — an upgraded, "
     "grander version of a simple archery range."),
    ("buildings/castle_wall",
     "A single stylized fortified stone castle-wall section with crenellated battlements and "
     "a corner turret, glowing with cool stone-grey energy — an upgraded, grander version of a "
     "simple quarry."),
    ("buildings/armory",
     "A single stylized stone armory building with weapon racks flanking its doorway, a "
     "glowing forge-fire visible inside, radiating fiery orange-red energy — an upgraded, "
     "grander version of a simple forge."),
    ("buildings/fountain",
     "A single stylized ornate stone fountain with tiered basins and cascading water, glowing "
     "with electric-blue energy — an upgraded, grander version of a simple well."),
    ("buildings/observatory",
     "A single stylized stone observatory tower with a telescope silhouette in its open dome, "
     "swirling cyan-white wind wisps around it — an upgraded, grander version of a simple "
     "windmill."),
    ("buildings/barn",
     "A single stylized large wooden barn with stacked golden hay bales beside its open "
     "doors, glowing with warm golden-yellow energy — an upgraded, grander version of a simple "
     "farm."),
    # Tier 4 — legendary, unlocked by major milestones
    ("buildings/dragon_lair",
     "A single stylized dark cave mouth carved into a mountainside, molten orange cracks "
     "glowing along the rock and deep claw-gouges in the stone, ember light spilling out."),
    ("buildings/heroes_hall",
     "A single stylized grand stone hall with banners flanking its entrance and a "
     "laurel-wreathed trophy pedestal out front, glowing with warm golden light."),
    ("buildings/champion_arena",
     "A single stylized circular stone gladiator arena with tiered stone seating, torches "
     "lit around its rim, glowing with warm amber torchlight."),
]


if __name__ == "__main__":
    failed = run(
        [(slug, f"{scene} {SCENE_STYLE}") for slug, scene in TIERS]
        + [(slug, f"{scene} {EMBLEM_STYLE}") for slug, scene in SPRITES]
        + [(slug, f"{scene} {EMBLEM_STYLE}") for slug, scene in BUILDINGS],
        out_dir=ROOT / "assets" / "images" / "village",
        width=1024,
        height=1024,
        suffix=".png",
    )
    sys.exit(1 if failed else 0)
