"""Étape 0, boucle 1 : un seul arbre test, 1 référence (l'ancre jour), fond magenta, via le registre iso_loop.
Lancer depuis la racine du dépôt : python3 -I docs/designs/village-surroundings/stage-0/loop-1/gen_tree.py <n>"""
import pathlib, sys
sys.path.insert(0, "scripts/iso"); sys.path.insert(0, "scripts")
import iso_loop as I
from lib import flux
from PIL import Image

N = sys.argv[1]
D = I.candidate_dir("surroundings")
ANCHOR = pathlib.Path("docs/designs/village-loop/evidence/style-refs/ancre_heroes_hall_grand_jour.webp")
ref = D / "ref_ancre_640.png"  # 0,5 MP au lieu de 2 : l'entrée se paie aussi
if not ref.exists():
    Image.open(ANCHOR).convert("RGB").resize((640, 800), Image.LANCZOS).save(ref)

BLOCK = (
    "Hand-painted Belgian comic game art, three-quarter isometric view from above, matching image 1's brushwork. "
    "Thick regular black ink outline (#0F1518) around the whole silhouette, about eight pixels, thinner inner lines. "
    "Visible brush strokes, two or three values per surface, matte, no gloss, no gradient sheen. "
    "Warm late-afternoon light from the upper left: left and top surfaces lit warm (#DEC28B, #C8965E), "
    "right side in cool slate shadow (#2E3552). Earth #6E5941, dark earth #554232, foliage #4C7A3E, moss #435A36. "
    "No cast shadow outside the object's own base. One object alone, centred, on a flat uniform pure magenta (#FF00FF) "
    "backdrop from edge to edge, all four corners. No text, no signature.")
SUBJECT = (
    "Image 1 is a reference for style only, very low weight: never copy its building, take only its painting and its light. "
    "Paint one single broadleaf oak tree, sturdy and slightly exaggerated, a short thick trunk of brown bark on a small tuft "
    "of grass and two pebbles, a crown made of three or four big rounded clumps of leaves, each clump painted with its own lit "
    "top, mid tone and shaded underside, the clumps separated by ink lines, a few leaf strokes breaking the silhouette. ")
PROMPT = SUBJECT + BLOCK

if __name__ == "__main__":
    I.guard_endpoint()
    out = D / f"s0l1_tree_{N}.png"
    if out.exists():
        sys.exit("already painted")
    batch = I.reserve(1, 0.15, f"surroundings s0 tree {N}", None)
    responses = []
    try:
        flux.generate(slug="surroundings_tree", prompt=PROMPT, out=out, width=768, height=1024, attempts=1,
                      seed=flux.seed_for("surroundings_tree_s0") + 1000 * int(N), references=(ref,),
                      extra={"disable_pup": True}, submitted_log=responses)
    finally:
        print(I.settle(batch, responses))
