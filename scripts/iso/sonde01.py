"""Sonde 00, reprise (Mara 31/10): heroes_hall grand, jour dore seulement, fond magenta, 2 refs (blockout, puis p0ja3 en humeur).
Run: python3 -I scripts/iso/sonde01.py <tentative>   (ecrit p0jb<tentative>_c0.png)"""
import json, pathlib, sys
sys.path.insert(0, "scripts/iso"); sys.path.insert(0, "scripts")
import iso_loop as I
from lib import flux
from PIL import Image

SLUG, N = "heroes_hall_grand", sys.argv[1]
D = I.candidate_dir(SLUG)
mood = D / "p0jb_mood.png"
cut = Image.open(D / "p0ja3_c0.adaptive.cut.png").convert("RGBA")
bg = Image.new("RGBA", cut.size, (255, 0, 255, 255)); bg.alpha_composite(cut); bg.convert("RGB").save(mood)
refs = (I.L.RENDERS / f"{SLUG}.png", mood)  # magenta blockout first, mood second
PROMPT = (
    "A flat, fully saturated, full-brightness pure magenta (#FF00FF) studio backdrop, evenly lit and untouched by the golden light, fills the whole picture from edge to edge, all four corners included, and one building stands alone on it. "
    "Image 1 is a flat blockout that fixes the exact silhouette, the three-quarter isometric camera angle, the framing, the footprint and the mass: "
    "paint exactly this building, wide and low, keeping the blockout's portico of two thick columns, its gabled roof with the small windowed cupola, and its mass, with no tower and no spire. "
    "Image 2 has a very low weight: take only its golden-hour mood and colours from it, never its shape. "
    "The hall is dressed stone in warm stone (#8C7A66) with shadow stone (#584A3E), cream plaster (#C9B48C), rust-red clay tiles (#9A4E32) painted stroke by stroke, "
    "a plank door, round shields on the columns, many small windows. On the portico roof stands the stone statue of a hero holding a raised sword on its plinth, as in image 1. "
    "Crimson cloth banners with a small Bati crest hang on two poles in front. Around it: barrels, a crate, a lantern on a wooden post, a rack of weapons. "
    "The plinth of warm stone ends in grass, pebbles and packed earth (#7A5A38) with ochre (#C2944E) touches, with no dark square slab. "
    "Golden late afternoon: warm light (#F2E2B4) comes from the left, so left faces and left roof slopes are bright, right faces are in cool shadow (#2E3552). "
    "Visible brush strokes everywhere, two or three values per surface. A thick regular black ink outline of #0F1518 about eight pixels wide around everything, thinner inner lines. "
    "No cast shadow outside the base: the backdrop stays perfectly flat magenta. No pink, no violet anywhere in the building. The artwork is unsigned and wordless.")
info = json.loads((I.L.RENDERS / f"{SLUG}.anchor.json").read_text(encoding="utf-8"))
size = tuple(info["size"])
I.guard_endpoint()
out = D / f"p0jba{N}_c0.png"
if out.exists():
    sys.exit("already painted")
batch = I.reserve(1, 0.50, f"sonde01 heroes_hall_grand b{N}", None)
responses = []
try:
    flux.generate(slug=SLUG, prompt=PROMPT, out=out, width=size[0], height=size[1], attempts=1,
                  seed=flux.seed_for(SLUG + "_p0jb") + 1000 * int(N), references=refs,
                  extra={"width": size[0], "height": size[1], "disable_pup": True}, submitted_log=responses)
finally:
    print(json.dumps(I.settle(batch, responses), indent=2))
side = json.loads(out.with_suffix(".json").read_text(encoding="utf-8"))
with Image.open(flux.ORIGINALS / side["signed_original"]["file"]) as im:
    side["original_size"] = list(im.size)
out.with_suffix(".json").write_text(json.dumps(side, indent=2, ensure_ascii=False))
