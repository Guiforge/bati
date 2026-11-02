"""Étape 2 : sol peint du palier 12, 4 variantes FLUX 3 Image, depuis le masque de l'étape 1.
Lancer depuis la racine du dépôt : python3 -I docs/designs/village-surroundings/stage-2/gen_sol.py <boucle> [sec]

Image 1 : le masque du palier 12 en aplats (classes de sol seulement), recadré sur ce que la caméra
montre au palier 12 (cadrage « Cadrer » de iter-01-captures-b). Image 2 : l'ancre jour, pour l'humeur.
Boucle 1 : masques stage-1/loop-2, aplats au plus proche, prompt dans loop-1/cadre.json. Boucle 2 : masques
stage-1/loop-3, aplats adoucis (chaque classe floutée puis la plus forte gagne), emprises et désordre renommés.
Boucle 3 : le désordre peint en pré (zone d'accessoires, pas de sol), les emprises en taches arrondies
(flou de 12 px, seuil 110), et le prompt interdit les lignes dessinées au sol.
Coordonnées : la sortie couvre le rectangle monde CADRE (dp), stocké dans <sortie>.json."""
import concurrent.futures, json, pathlib, sys
sys.path.insert(0, "scripts/iso"); sys.path.insert(0, "scripts")
import iso_loop as I
from lib import flux
from PIL import Image, ImageFilter

BOUCLE = sys.argv[1]
S1 = pathlib.Path("docs/designs/village-surroundings/stage-1/loop-3")
MES = json.loads((S1 / "mesures.json").read_text())
MONDE = json.loads((S1 / "monde.json").read_text())
D = I.candidate_dir("surroundings") / "stage2" / f"loop-{BOUCLE}"; D.mkdir(parents=True, exist_ok=True)
OUT = pathlib.Path(f"docs/designs/village-surroundings/stage-2/loop-{BOUCLE}"); OUT.mkdir(parents=True, exist_ok=True)
W, H = 896, 1008  # rapport de l'aire de jeu (411 x 462 dp), multiple de 16, environ 0,9 MP

# Le cadre du palier 12, en dp du monde : l'aire de jeu divisée par le zoom, centrée par la caméra.
P = MONDE["parPalier"]["12"]["cadre"]; aw, ah = MONDE["aire"]; z = P["zoom"]
cx, cy = MONDE["LARGEUR"] / 2 - P["x"] / z, MONDE["HAUTEUR"] / 2 - P["y"] / z
CADRE = (cx - aw / z / 2, cy - ah / z / 2, cx + aw / z / 2, cy + ah / z / 2)

# Aplats du sol : chaque classe du masque, une couleur de la bible (sol seulement, rien de debout).
APLAT = {"pre": "#6A7442", "champ": "#C8965E", "foret": "#4A4632", "bordure": "#4A4632", "desordre": "#6A7442",
         "place": "#C9B48C", "chemin": "#C2944E", "eau": "#4A6A7C", "batiment": "#8A6E4E"}
rgb = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
lab = Image.open(S1 / "masque_palier12.png")  # palette indexée, index = rang dans MES["classes"]
x0, y0 = MES["monde"]["x0_dp"], MES["monde"]["y0_dp"]
crop = lab.crop(tuple(round(v) for v in (CADRE[0] - x0, CADRE[1] - y0, CADRE[2] - x0, CADRE[3] - y0)))
pal = [c for n in MES["classes"] for c in rgb(APLAT[n])] + [0] * (768 - 3 * len(MES["classes"]))
# Aplats adoucis : chaque classe en masque agrandi en bilinéaire puis flouté de 4 px, et chaque pixel prend la
# classe la plus forte. Les bords suivent la forme, sans les marches de 1 dp que FLUX recopiait (boucle 1).
idx = crop.load(); cw, ch = crop.size
presents = sorted({idx[i, j] for j in range(ch) for i in range(cw)})
doux = {}
for k in presents:
    m = Image.new("L", crop.size, 0); mp = m.load()
    for j in range(ch):
        for i in range(cw):
            if idx[i, j] == k: mp[i, j] = 255
    # Les emprises en taches arrondies : un rectangle iso uni se lit comme une parcelle labourée (boucle 2).
    rayon = 12 if MES["classes"][k] == "batiment" else 4
    seuil = 110 if rayon > 4 else 0  # seuillé : le bord rentre et les coins s'arrondissent nettement
    doux[k] = m.resize((W, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(rayon)).point(lambda v: v if v > seuil else 0).load()
out = Image.new("P", (W, H)); op = out.load()
for j in range(H):
    for i in range(W):
        op[i, j] = max(presents, key=lambda k: doux[k][i, j])
out.putpalette(pal)
ref1 = D / "blockout_palier12.png"
out.convert("RGB").save(ref1)
ANCRE = pathlib.Path("docs/designs/village-loop/evidence/style-refs/ancre_heroes_hall_grand_jour.webp")
ref2 = D / "ref_ancre_640.png"
if not ref2.exists():
    Image.open(ANCRE).convert("RGB").resize((640, 800), Image.LANCZOS).save(ref2)

SUJET = (
    "Image 1 is a flat colour map seen from the game's isometric camera. Repaint it as hand-painted ground, keeping every zone "
    "exactly where it is and the same size, so the painting lines up pixel for pixel with image 1. Colour key of image 1: "
    "olive green = meadow grass; sandy beige = dirt paths; pale cream = the village square of packed earth and a few flagstones; "
    "warm light brown = rounded patches of bare packed earth where houses will stand, flat and smooth, no furrows, no crops; "
    "ochre = ploughed fields with furrows; slate blue = river water; dark olive-brown = bare forest-floor soil with moss and dead "
    "leaves, flat ground only, no trees, no bushes, no trunks. "
    "Image 2 gives only the mood and the brushwork, very low weight: never copy its building. Paint only the ground: "
    "no building, no tree, no character, no prop, nothing standing up, no cast shadow of anything. "
    "No drawn lines on the ground: no contour around the river, the paths or the patches, colour against colour only. ")
# Bloc de bible.md, variante « sol peint » : sans contour, sans fond magenta, l'image remplit le cadre.
BLOC = (
    "Franco-Belgian comic game art, three-quarter isometric view from above. No ink outline at all, soft painted edges between zones. "
    "Colour painted with visible brush strokes, two or three values per surface, matte, no gloss. Warm late-afternoon light from "
    "the upper left; the ground gets a little darker and cooler toward the edges of the picture, the centre stays lightest. "
    "Earth #6E5941, dark earth #554232, foliage #4C7A3E, moss #435A36, ochre #C8965E, light #DEC28B, slate shadow #2E3552. "
    "The picture fills the whole frame from edge to edge. No text, no signature.")
VARIANTES = {
    "v1": "",
    "v2": " Broad, loose brush strokes, big simple shapes, very few small details.",
    "v3": " Fine brush strokes with small tufts of grass, pebbles and wheel ruts on the paths, still calm and readable.",
    "v4": " Medium brush strokes; where paths and fields meet the grass, the edges are soft and worn, never a hard line.",
}

if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[2] == "sec":
        sys.exit(f"blockout seul : {ref1}")
    I.guard_endpoint(I.FLUX3)
    outs = {k: D / f"sol_{k}.png" for k in VARIANTES}
    if any(o.exists() for o in outs.values()):
        sys.exit("déjà peint : une boucle ne se rejoue jamais en place")
    batch = I.reserve(len(VARIANTES), 0.10, f"surroundings s2 loop{BOUCLE} sol x{len(VARIANTES)}", None)
    responses = []

    def peindre(k):
        flux.generate(slug=f"surroundings_sol_{k}", prompt=SUJET + BLOC + VARIANTES[k], out=outs[k], width=W, height=H,
                      attempts=1, references=(ref1, ref2), extra={"width": W, "height": H}, submitted_log=responses,
                      endpoint=I.FLUX3)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(peindre, VARIANTES))
    finally:
        print(I.settle(batch, responses))
    (OUT / "cadre.json").write_text(json.dumps({"cadre_dp": CADRE, "taille_px": [W, H], "palier": 12, "masques": str(S1),
                                                 "prompt_sujet": SUJET, "bloc": BLOC, "variantes": VARIANTES}, indent=1, ensure_ascii=False))
