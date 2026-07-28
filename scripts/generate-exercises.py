#!/usr/bin/env python3
"""Generate dedicated art for the 6 generic exercises (Squat, Push-ups, Pull-ups, Wall Sit,
Plank, Crunch) that previously fell back to placeholder.jpg. Character-pose style matching the
20 themed exercise images. Same Mammouth API / model as scripts/generate-covers.py.

  MAMMOUTH_API_KEY=sk-... python3 scripts/generate-exercises.py [slug ...]

Output: 1024x768 JPG (quality 82, ~100 KB against ~850 KB for the same frame as PNG) in
assets/images/exercises/. Skips a slug that already has a .jpg *or* a .png.
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
    # --- Phase C batch: the equipment-free pulls (docs/content/missing-image.md §5) ---
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
    # --- 0023 rename batch: the old 0006 art staged a goblin, a dragon, a wizard. Same movements,
    # --- official names now, so the same lone hero as every other pose above.
    # The first pass handed this hero a war hammer and turned the lunge into a charge — hence the
    # explicit empty hands. Static hold, not a stride.
    ("lunge",
     "A fantasy athlete hero holding a static forward lunge, front knee bent to a right angle "
     "directly over the ankle and the back knee hovering just above the ground, torso tall and "
     "vertical, both hands empty and resting on the hips, carrying no weapon and no equipment; "
     "the legs glow with warm golden energy, seen from the side."),
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
        d = os.path.join(ROOT, "assets", "images", "exercises")
        out = os.path.join(d, f"{slug}.jpg")
        # The catalogue is mid-migration from PNG to JPG: skip on either, or a re-run regenerates
        # every exercise that still ships its original PNG.
        if any(os.path.exists(os.path.join(d, f"{slug}.{ext}")) for ext in ("jpg", "png")):
            print(f"skip  {slug} (exists)")
            continue
        print(f"gen   {slug} … ", end="", flush=True)
        raw = os.path.join("/tmp", f"ex_{slug}.png")
        try:
            open(raw, "wb").write(generate(scene))
            magick(raw, "-resize", "1024x768^", "-gravity", "center",
                   "-background", BG, "-extent", "1024x768", "-quality", "82", out)
            print("ok")
        except Exception as e:
            print(f"FAIL: {e}")
        time.sleep(2)


if __name__ == "__main__":
    main()
