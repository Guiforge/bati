"""Étape 0, boucle 2 : un arbre, bloc de prompt lu tel quel dans bible.md, 1 référence (l'ancre jour).
Lancer depuis la racine du dépôt : python3 -I docs/designs/village-surroundings/stage-0/loop-2/gen_tree.py <n> [trait] [f3]
<n> 1 : flux-2-pro-preview ; avec f3 : flux-3-image (demande de Guillaume, 01/11)."""
import pathlib, re, sys
sys.path.insert(0, "scripts/iso"); sys.path.insert(0, "scripts")
import iso_loop as I
from lib import flux
from PIL import Image

N = sys.argv[1]
TRAIT = sys.argv[2] if len(sys.argv) > 2 else "nine"  # 5 px visés à S, toile 768 posée sur 410 px : 5 x 768 / 410
F3 = len(sys.argv) > 3 and sys.argv[3] == "f3"
D = I.candidate_dir("surroundings")
ANCHOR = pathlib.Path("docs/designs/village-loop/evidence/style-refs/ancre_heroes_hall_grand_jour.webp")
ref = D / "ref_ancre_640.png"
if not ref.exists():
    Image.open(ANCHOR).convert("RGB").resize((640, 800), Image.LANCZOS).save(ref)

bible = pathlib.Path("docs/designs/village-surroundings/bible.md").read_text(encoding="utf-8")
BLOCK = re.search(r"## Bloc de prompt FLUX.*?```\n(.*?)\n```", bible, re.S).group(1).replace("{TRAIT}", TRAIT)
assert "{" not in BLOCK, BLOCK
SUBJECT = (
    "Image 1 is a reference for style only, very low weight: never copy its building, take only its painting and its light. "
    "Paint one single broadleaf oak tree, sturdy and slightly exaggerated, a short thick trunk of brown bark on a small tuft "
    "of grass and two pebbles, a crown made of three or four big rounded clumps of leaves, each clump painted with its own lit "
    "top, mid tone and shaded underside, the clumps separated by ink lines, a few leaf strokes breaking the silhouette. ")
PROMPT = SUBJECT + BLOCK

if __name__ == "__main__":
    print(PROMPT)
    I.guard_endpoint(I.FLUX3 if F3 else None)
    out = D / f"s0l2_tree_{N}.png"
    if out.exists():
        sys.exit("already painted")
    batch = I.reserve(1, 0.15, f"surroundings s0 loop2 tree {N}", None)
    responses = []
    try:
        flux.generate(slug="surroundings_tree", prompt=PROMPT, out=out, width=768, height=1024, attempts=1,
                      seed=flux.seed_for("surroundings_tree_s0l2") + 1000 * int(N), references=(ref,),
                      extra={"width": 768, "height": 1024} if F3 else {"disable_pup": True}, submitted_log=responses,
                      endpoint=I.FLUX3 if F3 else None)  # comme les lots f3 de T41 : pas de graine, taille dans extra
    finally:
        print(I.settle(batch, responses))
