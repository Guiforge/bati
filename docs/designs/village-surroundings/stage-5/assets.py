"""Étape 5 : les images des alentours peints, prêtes pour l'app (aucun appel FLUX, tout part des étapes 2 à 4).
Lancer depuis la racine du dépôt :
  python3 -I docs/designs/village-surroundings/stage-5/assets.py

Une taille de toile par famille (le cliquet des tailles d'image de __tests__/iso-perf-compteur.test.tsx compte les
tailles de vue, une par famille) ; chaque objet est posé à sa vraie taille dans la toile, pied en bas au milieu, et
components/village/iso/alentours.ts reprend ces nombres (TOILE_*). La nuit des objets posés au-dessus de
l'étalonnage de AmbianceCarte (accessoires, souris, premier plan) est cuite ici : #2E3552 à 35 %, comme isoNuitSol.

shortcut: le terrain reste à 896 x 1008 (1,3 px par dp de carte) : l'original FLUX n'existe pas plus grand. Le
redemander en 2K, ou en tuiles, quand il sera repeint sur la nouvelle disposition.
"""
import pathlib
from PIL import Image, ImageDraw, ImageFilter

ICI = pathlib.Path("docs/designs/village-surroundings")
SORTIE = pathlib.Path("assets/images/village/iso")
CACHE = pathlib.Path.home() / ".cache/bati-art-loop/iso/surroundings"
NUIT = (0x2E, 0x35, 0x52)
ENCRE = (0x0F, 0x15, 0x18)


def melange(im, c, t):
    """`c` posé à l'opacité `t` sur les pixels de `im`, alpha gardé."""
    a = im.getchannel("A")
    fond = Image.new("RGB", im.size, c)
    out = Image.blend(im.convert("RGB"), fond, t).convert("RGBA")
    out.putalpha(a)
    return out


def sauve(im, chemin, q=82):
    chemin.parent.mkdir(parents=True, exist_ok=True)
    im.save(chemin, quality=q, method=6)
    print(chemin, im.size, chemin.stat().st_size // 1024, "Ko")


# --- Sol : le terrain retenu (étape 2, boucle 4, v1), bords fondus sur 24 px vers isoSolPeintFond.
terrain = Image.open(CACHE / "stage2/loop-4/terrain_v1.png").convert("RGBA")
w, h = terrain.size
F = 24
alpha = Image.new("L", (w, h), 0)
d = ImageDraw.Draw(alpha)
for i in range(F):
    d.rectangle((i, i, w - 1 - i, h - 1 - i), outline=round(255 * (i + 1) / F))
d.rectangle((F, F, w - 1 - F, h - 1 - F), fill=255)
terrain.putalpha(alpha)
sauve(terrain, SORTIE / "sol/terrain.webp", 80)

# --- Forêt : les 6 masses du kit (étape 3, boucle 5), toile 448 x 384, largeur pleine, pied en bas.
TW, TH = 448, 384
for nom in ("feuillus", "melangee", "bouleaux", "dense", "bord_coniferes", "bord_crete"):
    m = Image.open(ICI / f"stage-3/loop-5/{nom}.cut.webp").convert("RGBA")
    k = min(TW / m.width, TH / m.height)
    m = m.resize((round(m.width * k), round(m.height * k)), Image.LANCZOS)
    toile = Image.new("RGBA", (TW, TH))
    toile.alpha_composite(m, ((TW - m.width) // 2, TH - m.height))
    sauve(toile, SORTIE / f"foret/{nom}.webp")
    if nom in ("feuillus", "dense"):
        # Premier plan : hors de la lumière du village, plus sombre que la forêt, et sa nuit.
        plan = melange(toile, ENCRE, 0.35)
        sauve(plan, SORTIE / f"foret/plan_{nom}.webp")
        sauve(melange(plan, NUIT, 0.45), SORTIE / f"foret/plan_{nom}.nuit.webp")

# --- Accessoires : toile 240 x 220 px pour 57,6 x 52,8 dp (4,1667 px par dp), pied à (120, 212), ombre de
# contact en #2E3552 à 40 % (jamais peinte par FLUX : posée ici, par le code).
AW, AH, PIED = 240, 220, 212
PX_DP = AW / 57.6
CASES = {  # largeur de la plus large variante, en cases (stage-4/props.py KIT)
    "tonneaux": 0.45, "caisses": 0.45, "tas_de_bois": 0.8, "sacs_de_grain": 0.45, "bottes_de_foin": 0.6,
    "ratelier": 0.6, "lanterne": 0.3, "cloture": 1.0, "poteau_indicateur": 0.4, "menhir": 0.5, "etal": 1.2,
    "linge": 1.2, "charrette": 1.0, "outils": 0.5, "potager": 1.0, "epouvantail": 0.4, "poulailler": 1.0,
    "chat": 0.3, "pecheur": 0.4, "charrette_cassee": 1.0, "sieste": 0.5, "renard": 0.35,
}
UTILISES = [
    "caisses_1", "caisses_2", "sacs_de_grain_1", "sacs_de_grain_2", "sacs_de_grain_3", "tas_de_bois_1",
    "tas_de_bois_2", "tonneaux_1", "tonneaux_2", "tonneaux_3", "lanterne_1", "lanterne_2", "bottes_de_foin_1",
    "bottes_de_foin_2", "potager_1", "poulailler_2", "epouvantail_2", "charrette_1", "charrette_2", "linge_1",
    "outils_1", "outils_3", "ratelier_1", "ratelier_2", "etal_1", "menhir_1", "menhir_2", "menhir_3",
    "poteau_indicateur_1", "cloture_1", "chat_1", "pecheur_1", "charrette_cassee_1", "sieste_1", "renard_1",
]
L2 = ICI / "stage-4/loop-2"
for nom in UTILISES:
    base = nom.rsplit("_", 1)[0]
    plus_large = max(Image.open(f).width for f in L2.glob(f"{base}_[0-9].webp"))
    v = Image.open(L2 / f"{nom}.webp").convert("RGBA")
    k = CASES[base] * 48 * PX_DP / plus_large
    v = v.resize((max(1, round(v.width * k)), max(1, round(v.height * k))), Image.LANCZOS)
    k2 = min(1, (AW - 4) / v.width, (PIED - 2) / v.height)
    if k2 < 1:
        v = v.resize((round(v.width * k2), round(v.height * k2)), Image.LANCZOS)
    toile = Image.new("RGBA", (AW, AH))
    ow = round(v.width * 0.8)
    oh = max(4, round(ow * 0.3))
    ombre = Image.new("RGBA", (AW, AH))
    ImageDraw.Draw(ombre).ellipse(
        (AW / 2 - ow / 2, PIED - oh / 2, AW / 2 + ow / 2, PIED + oh / 2), fill=NUIT + (102,))
    toile.alpha_composite(ombre.filter(ImageFilter.GaussianBlur(1.5)))
    toile.alpha_composite(v, ((AW - v.width) // 2, PIED - v.height))
    sauve(toile, SORTIE / f"accessoires/{nom}.webp")
    sauve(melange(toile, NUIT, 0.35), SORTIE / f"accessoires/{nom}.nuit.webp")

# --- Animaux : bandes de 4 images, image 64 x 56 px pour 16 x 14 dp (4 px par dp).
FW, FH = 64, 56
for nom, cases, nuit, pied in (
    ("souris_grise", 0.19, True, True), ("souris_brune", 0.19, True, True), ("souris_noire", 0.19, True, True),
    ("oiseau", 0.25, False, False),
):
    images = [Image.open(L2 / f"{nom}_{i}.webp").convert("RGBA") for i in range(1, 5)]
    k = min(cases * 48 * 4 / max(i.width for i in images), (FH - 4) / max(i.height for i in images))
    bande = Image.new("RGBA", (4 * FW, FH))
    for j, im in enumerate(images):
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        y = FH - 3 - im.height if pied else (FH - im.height) // 2
        bande.alpha_composite(im, (j * FW + (FW - im.width) // 2, y))
    sauve(bande, SORTIE / f"animaux/{nom}.webp", 88)
    if nuit:
        sauve(melange(bande, NUIT, 0.35), SORTIE / f"animaux/{nom}.nuit.webp", 88)
