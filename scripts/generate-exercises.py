#!/usr/bin/env python3
"""Generate dedicated art for the 6 generic exercises (Squat, Push-ups, Pull-ups, Wall Sit,
Plank, Crunch) that previously fell back to placeholder.jpg. Character-pose style matching the
20 themed exercise images. Same Mammouth API / model as scripts/generate-covers.py.

  MAMMOUTH_API_KEY=sk-... python3 scripts/generate-exercises.py [slug ...]

Output: 1024x768 PNG in assets/images/exercises/. Skips existing files.
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

STYLE = (
    "Rendered as a dark-fantasy Franco-Belgian graphic-novel character illustration: one heroic "
    "athlete, full body in frame, thick confident black ink outlines and flat cel-shaded color "
    "fills with hard-edged shadows and glowing muscle definition. The figure is isolated on a "
    "deep obsidian blue (#0B0F19) void background with an electric-blue rim light and a soft "
    "vignette, no scenery and no text. High-contrast, dynamic and clean, a widescreen 4:3 "
    "composition with the whole body comfortably inside the frame."
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
     "A fantasy athlete hero hanging from a rugged stone bar and pulling their chin above it, "
     "back and biceps flexed and glowing with metallic silver-blue energy, seen from a slight "
     "low angle."),
    ("wall_sit",
     "A fantasy athlete hero holding a wall-sit against an invisible wall, thighs parallel to the "
     "ground, back flat and upright, forearms resting on the knees; the leg muscles glow with "
     "cool stone-grey energy and faint cracks spread under the feet."),
    ("plank",
     "A fantasy athlete hero in a perfect forearm plank, body a straight horizontal line, forearms "
     "and toes planted; the core glows with golden-white energy, calm determined expression, seen "
     "from the side."),
    ("crunch",
     "A fantasy athlete hero performing an abdominal crunch, lying on the back with knees bent and "
     "the torso curled up toward the knees, hands beside the head; the abs glow with electric-blue "
     "energy, seen from the side."),
    # --- 20 bodyweight exercises from drizzle/0010 (missing-image.md §4) ---
    # Glow color follows the exercise's seeded muscle, matching the sport-sprite palette:
    # arms=amber, back=silver-blue, chest=orange-red, abs=electric-blue, shoulder=cyan, calf=gold.
    ("chin_up",
     "A fantasy athlete hero hanging from a rugged stone bar with palms facing them, pulling up "
     "until the chin clears the bar; the back and biceps flex and glow with metallic silver-blue "
     "energy, seen from a slight low angle."),
    ("superman",
     "A fantasy athlete hero lying face down with arms and legs extended and lifted off the "
     "ground in a superman hold, the whole back arched; the back glows with metallic silver-blue "
     "energy, seen from the side."),
    ("bear_crawl",
     "A fantasy athlete hero mid bear-crawl, on hands and toes with knees hovering just above the "
     "ground and hips low, one hand and the opposite foot advancing; the core and shoulders glow "
     "with electric-blue energy, seen from the side."),
    ("russian_twist",
     "A fantasy athlete hero seated with knees bent and feet lifted, leaning back and rotating "
     "the torso to one side with hands together; the obliques glow with electric-blue energy."),
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
     "leaving the ground with impact dust and motion streaks below; the legs glow with warm "
     "golden energy."),
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
     "the ground beside the hips, legs held straight out horizontally in a rigid L-shape; the "
     "core and arms glow with electric-blue energy, seen from the side."),
    ("star_jump",
     "A fantasy athlete hero at the peak of an explosive star jump, arms and legs flung wide into "
     "a star shape mid-air with motion streaks; the whole body glows with cyan-white energy."),
    ("windshield_wipers",
     "A fantasy athlete hero lying on their back with arms stretched out to the sides and straight "
     "legs held together, rotated to one side in a sweeping arc with motion streaks; the obliques "
     "glow with electric-blue energy, seen from above."),
]


def generate(prompt):
    body = json.dumps({"model": MODEL,
                       "messages": [{"role": "user", "content": f"{prompt} {STYLE}"}]}).encode()
    req = urllib.request.Request(API, data=body, headers={
        "Authorization": f"Bearer {KEY}", "Content-Type": "application/json", "User-Agent": "curl/8.0"})
    for attempt in range(6):  # backoff on 429 / transient 5xx
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
    for slug, scene in EXERCISES:
        if only and slug not in only:
            continue
        out = os.path.join(ROOT, "assets", "images", "exercises", f"{slug}.png")
        if os.path.exists(out):
            print(f"skip  {slug} (exists)")
            continue
        print(f"gen   {slug} … ", end="", flush=True)
        raw = os.path.join("/tmp", f"ex_{slug}.png")
        try:
            open(raw, "wb").write(generate(scene))
            magick(raw, "-resize", "1024x768^", "-gravity", "center",
                   "-background", BG, "-extent", "1024x768", out)
            print("ok")
        except Exception as e:
            print(f"FAIL: {e}")
        time.sleep(2)


if __name__ == "__main__":
    main()
