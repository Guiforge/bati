"""Sonde de peinture 00 (Mara 31/10): heroes_hall grand repeint dans le style de la bible, nuit puis jour dore.
Refs: blockout vert + 5 sprites Bati de evidence/style-refs, jamais un autre jeu. Run: python3 -I scripts/iso/sonde00.py"""
import json, pathlib, sys
sys.path.insert(0, "scripts/iso"); sys.path.insert(0, "scripts")
import iso_loop as I
from lib import flux
from PIL import Image

SLUG = "heroes_hall_grand"
REFS = pathlib.Path("docs/designs/village-loop/evidence/style-refs")
NAMES = ["forge_solid", "forge_grand", "heroes_hall_grand", "barn_solid", "windmill_solid"]
tmp = I.candidate_dir(SLUG) / "p0refs"; tmp.mkdir(exist_ok=True)
refs = [I.L.RENDERS / f"{SLUG}.green.png"]
for n in NAMES:
    im = Image.open(REFS / f"{n}.nuit.webp").convert("RGBA")
    bg = Image.new("RGBA", im.size, (0, 255, 0, 255)); bg.alpha_composite(im)
    bg.convert("RGB").save(tmp / f"{n}.png"); refs.append(tmp / f"{n}.png")

HEAD = ("Image 1 is a flat blockout that fixes the exact silhouette, the three-quarter isometric camera angle, the framing and "
        "the footprint of one building: paint exactly this building, every part in the same place and at the same size, filling "
        "the same area of the picture. Images 2 to 6 are paintings of other buildings of the same village, shown only for the "
        "hand: take from them the visible brush strokes, the earthy warm palette and the thick uniform black ink outline of #0F1518; "
        "copy no building from them, and leave behind the dark square slab they stand on. "
        "The building is a stout stone hall with a very tall gabled roof of rust-red clay tiles (#9A4E32) painted stroke by stroke, "
        "a small windowed cupola on the ridge, a portico of two thick columns with round shields in crimson (#8A2432), "
        "a plank door, timber framing and cream plaster (#C9B48C) on a low wing, many small windows, "
        "crimson cloth banners with a heraldic crest hanging on the front, and a stone statue of a standing hero. "
        "Its plinth of warm stone (#8C7A66) ends in grass: tufts of olive grass (#6A7442), pebbles and beaten earth (#7A5A38) "
        "spill over the edge, with no square slab. Around the building stand barrels, crates, a lantern on a wooden post, "
        "a rack of weapons and a few wood piles; every object is inked. "
        "The painting shows brush strokes everywhere, two or three values in every surface, wood in #6B4A2E, "
        "edges slightly broken, the same black ink line of #0F1518 about eight pixels thick on everything, thinner on inner lines. "
        "The building is stout and slightly exaggerated, about fifteen percent smaller in mass than image 1 so it stays inside its footprint. ")
NIGHT = ("It is a golden dusk turned to night: the windows, the lantern and the door glow warm amber (#F0A848), a pool of amber light lies on the ground in front, "
         "the left faces and the roof take a soft warm light, the right faces are in cold slate shadow (#2E3552), and the ground keeps colour, mossy green and muted ochre. ")
DAY = ("It is a golden late afternoon: warm light (#F2E2B4) comes from the left, so the left faces and the left roof slopes are bright cream-gold with touches of "
       "#F0A848 on the roof edges, the right faces are in cool slate shadow (#2E3552), and the colours of image 1 are only a guide to shape, "
       "painted again in these daytime colours. ")
TAIL = ("Everything outside the building, its plinth, its grass patch and its props is the flat, pure chroma-green (#00FF00) studio backdrop: no sky, no horizon, no hill, no ground plane beyond the small irregular patch of grass and earth around the plinth. "
        "The building stands alone on a flat studio backdrop of pure chroma green (#00FF00), evenly lit, that fills the whole picture edge to edge; "
        "it meets the green in its black ink line, and the grass tufts at its base keep a dark olive tone so they stay apart from the green. "
        "The artwork is unsigned and wordless.")
FIRST = "A flat, pure chroma-green (#00FF00) studio backdrop fills the whole picture from edge to edge, all four corners included, and one building stands alone on it. "
PROMPTS = {"p0n": FIRST + HEAD + NIGHT + TAIL, "p0j": FIRST + HEAD + DAY + TAIL}
info = json.loads((I.L.RENDERS / f"{SLUG}.anchor.json").read_text(encoding="utf-8"))
size = tuple(info["size"])
I.guard_endpoint()
outs = {k: I.candidate_dir(SLUG) / f"{k}a3_c0.png" for k in PROMPTS}
if any(o.exists() for o in outs.values()):
    sys.exit("sonde already painted: never re-rolled in place")
batch = I.reserve(2, 0.50, "sonde00 heroes_hall_grand", None)
responses = []
try:
    for k, out in outs.items():
        flux.generate(slug=SLUG, prompt=PROMPTS[k], out=out, width=size[0], height=size[1], attempts=1,
                      seed=flux.seed_for(SLUG + "_" + k), references=tuple(refs), extra={"width": size[0], "height": size[1], "disable_pup": True},
                      submitted_log=responses)
finally:
    print(json.dumps(I.settle(batch, responses), indent=2))
for k, out in outs.items():
    if out.exists():
        side = json.loads(out.with_suffix(".json").read_text(encoding="utf-8"))
        with Image.open(flux.ORIGINALS / side["signed_original"]["file"]) as im:
            side["original_size"] = list(im.size)
        out.with_suffix(".json").write_text(json.dumps(side, indent=2, ensure_ascii=False))
