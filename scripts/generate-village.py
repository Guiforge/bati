#!/usr/bin/env python3
"""Generate the Village §3 art (docs/content/missing-image.md #1a/#1b): 5 tier illustrations
+ 6 sport-focus sprites, blocking dev-execution-plan.md §3 layers 1-2. Same Mammouth API /
model as scripts/generate-covers.py.

  MAMMOUTH_API_KEY=sk-... python3 scripts/generate-village.py [slug ...]

Output: 1024x1024 PNG in assets/images/village/ (square — the village badge slot in
VillageScene.tsx is a 120x120 circle, so square source art crops cleanly). Skips existing
files. Priority order = list order: tiers (layer 1, the base scene) before sprites (layer 2,
a small corner overlay).
"""
import base64
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

API = "https://api.mammouth.ai/v1/chat/completions"
KEY = os.environ.get("MAMMOUTH_API_KEY") or os.environ.get("MAMMOUTH_KEY")
MODEL = os.environ.get("MODEL", "gemini-3.1-flash-image-preview")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG = "#0B0F19"

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
    ("sport_calf",
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


def generate(prompt, style):
    body = json.dumps({"model": MODEL,
                       "messages": [{"role": "user", "content": f"{prompt} {style}"}]}).encode()
    req = urllib.request.Request(API, data=body, headers={
        "Authorization": f"Bearer {KEY}", "Content-Type": "application/json", "User-Agent": "curl/8.0"})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=200) as r:
                d = json.load(r)
            break
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 524) and attempt < 5:
                wait = 30 * (attempt + 1)
                print(f"[{e.code}, retry in {wait}s] ", end="", flush=True)
                time.sleep(wait)
                continue
            raise
    if "error" in d:
        raise RuntimeError(d["error"])
    imgs = d["choices"][0]["message"].get("images") or []
    if not imgs:
        raise RuntimeError("no image: " + (d["choices"][0]["message"].get("content") or "")[:200])
    return base64.b64decode(imgs[0]["image_url"]["url"].split(",", 1)[1])


def magick(*args):
    exe = "magick" if subprocess.run(["which", "magick"], capture_output=True).returncode == 0 else "convert"
    subprocess.run([exe, *args], check=True)


def main():
    if not KEY:
        sys.exit("Set MAMMOUTH_API_KEY")
    only = set(sys.argv[1:])
    out_dir = os.path.join(ROOT, "assets", "images", "village")
    os.makedirs(out_dir, exist_ok=True)
    all_items = (
        [(s, sc, SCENE_STYLE) for s, sc in TIERS]
        + [(s, sc, EMBLEM_STYLE) for s, sc in SPRITES]
        + [(s, sc, EMBLEM_STYLE) for s, sc in BUILDINGS]
    )
    for slug, scene, style in all_items:
        if only and slug not in only and slug.split("/")[-1] not in only:
            continue
        out = os.path.join(out_dir, f"{slug}.png")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        if os.path.exists(out):
            print(f"skip  {slug} (exists)")
            continue
        print(f"gen   {slug} … ", end="", flush=True)
        raw = os.path.join("/tmp", f"village_{slug.replace('/', '_')}.png")
        try:
            open(raw, "wb").write(generate(scene, style))
            magick(raw, "-resize", "1024x1024^", "-gravity", "center",
                   "-background", BG, "-extent", "1024x1024", out)
            print("ok")
        except Exception as e:
            print(f"FAIL: {e}")
        time.sleep(2)


if __name__ == "__main__":
    main()
