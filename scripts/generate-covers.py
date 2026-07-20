#!/usr/bin/env python3
"""Generate the missing BATI cover images via the Mammouth API, priority-ordered.

Usage:
  MAMMOUTH_API_KEY=sk-... python3 scripts/generate-covers.py            # all missing
  MAMMOUTH_API_KEY=sk-... python3 scripts/generate-covers.py lumber_route chop_wood
  MODEL=gemini-2.5-flash-image ... python3 scripts/generate-covers.py   # override model

Model choice (see docs/content/missing-covers.md#models): default
`gemini-3.1-flash-image-preview` (Nano Banana 2) — best accessible on this key. Nano Banana
Pro (gemini-3-pro-image-preview) is 403; gpt-image-2 gateway-times-out (524).

Prompts follow Google's Nano Banana prompt guide: natural-language creative-director
phrasing (not tag soup), explicit shot type + lighting + composition, and *semantic*
negatives ("empty, deserted, no people") rather than "no characters".

Saves 1024x768 JPGs to assets/images/{adventures,quests}/. Skips existing files (delete a
file to regenerate). Needs `magick`/`convert` for the resize.
"""
import base64
import json
import os
import subprocess
import sys
import time
import urllib.request

API = "https://api.mammouth.ai/v1/chat/completions"
KEY = os.environ.get("MAMMOUTH_API_KEY") or os.environ.get("MAMMOUTH_KEY")
MODEL = os.environ.get("MODEL", "gemini-3.1-flash-image-preview")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG = "#0B0F19"  # DA base; used for any letterbox padding so it never pads white.

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
]


def generate(prompt):
    body = json.dumps({
        "model": MODEL,
        "messages": [{"role": "user", "content": f"{prompt} {STYLE}"}],
    }).encode()
    req = urllib.request.Request(
        API, data=body,
        headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json",
                 "User-Agent": "curl/8.0"},
    )
    with urllib.request.urlopen(req, timeout=200) as r:
        d = json.load(r)
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
    for slug, subdir, scene in COVERS:
        if only and slug not in only:
            continue
        out = os.path.join(ROOT, "assets", "images", subdir, f"{slug}.jpg")
        if os.path.exists(out):
            print(f"skip  {slug} (exists)")
            continue
        print(f"gen   {slug} … ", end="", flush=True)
        raw = os.path.join("/tmp", f"cover_{slug}.png")
        try:
            open(raw, "wb").write(generate(scene))
            # Normalize to exactly 1024x768; pad (if ever needed) with the DA base, not white.
            magick(raw, "-resize", "1024x768^", "-gravity", "center",
                   "-background", BG, "-extent", "1024x768", "-quality", "88", out)
            print("ok")
        except Exception as e:
            print(f"FAIL: {e}")
        time.sleep(2)  # ponytail: naive throttle, tune if rate-limited


if __name__ == "__main__":
    main()
