"""Étape 2, boucle 5 : le terrain seul refait sur la disposition du jour (HEAD), sur tout ce que la caméra peut
montrer, à 3 px par dp : FLUX peint la bande où le terrain se voit, en tuiles qui se recouvrent ; au-delà (la
bordure, sous le mur de conifères), un sous-bois sombre fait en code.
Lancer depuis la racine du dépôt (le vidage et les masques d'abord, voir stage-2/log.md) :
  python3 -I docs/designs/village-surroundings/stage-2/terrain5.py aplats              # les aplats du monde entier
  python3 -I docs/designs/village-surroundings/stage-2/terrain5.py heros               # 4 variantes du cadre d'ouverture du palier 12
  python3 -I docs/designs/village-surroundings/stage-2/terrain5.py tuiles <variante>   # les 9 tuiles de la bande, un échantillon de la variante en référence
  python3 -I docs/designs/village-surroundings/stage-2/terrain5.py assemble            # mosaïque, étalonnage, tuiles de l'app

Même recette que la boucle 4 (5 classes : pré, cœur usé, rivière, sous-bois, bordure), deux changements :
- le prompt ne dit plus « bords plus sombres » : chaque tuile aurait sa vignette. L'assombrissement des bords est
  posé une seule fois sur la mosaïque, par la carte de densité de l'étape 1 ;
- FLUX 3 Image ne prend pas de graine et plafonne à 4,19 MP avec des références : 3 x 3 tuiles de 2048 px sur la
  bande (essai 1 : 3 x 4 sur tout le monde, voir loop-5/gate.md), recouvrement d'environ 590 px, chacune avec ses
  aplats et un échantillon de matière de la variante retenue ; à l'assemblage, chaque tuile est recalée (moyenne et
  écart type par canal) sur ce qui est déjà peint, puis fondue en rampe linéaire sur tout le recouvrement."""
import concurrent.futures, json, pathlib, sys
sys.path.insert(0, "scripts/iso"); sys.path.insert(0, "scripts")
from PIL import Image, ImageChops, ImageFilter, ImageStat

MODE = sys.argv[1]
CACHE = pathlib.Path.home() / ".cache/bati-art-loop/iso/surroundings/stage2/loop-5"
MAS = CACHE / "masques"
OUT = pathlib.Path("docs/designs/village-surroundings/stage-2/loop-5"); OUT.mkdir(parents=True, exist_ok=True)
APP = pathlib.Path("assets/images/village/iso/sol")
MES = json.loads((MAS / "mesures.json").read_text()); CL = MES["classes"]
MONDE = json.loads((CACHE / "monde.json").read_text())
X0, Y0, WD, HD = MES["monde"]["x0_dp"], MES["monde"]["y0_dp"], MES["monde"]["w"], MES["monde"]["h"]
PX = 3.0  # px par dp de la mosaïque
MW, MH = round(WD * PX), round(HD * PX)  # 4968 x 6456
T = 2048  # côté d'une tuile FLUX (4,19 MP, le plafond avec références)
COLS, ROWS = 3, 3
# La bande peinte : toutes les rangées de la carte où il y a autre chose que la bordure, plus 40 dp, en px de mosaïque.
_lab = Image.open(MAS / "masque_palier12.png"); _idx = Image.frombytes("L", _lab.size, _lab.tobytes())
_hors = _idx.point(lambda v: 0 if v < len(CL) and CL[v] == "bordure" else 255).getbbox()
BANDE_Y0 = max(0, round((_hors[1] - 40) * PX)); BANDE_Y1 = min(MH, round((_hors[3] + 40) * PX))
PASX, PASY = (MW - T) / (COLS - 1), (BANDE_Y1 - BANDE_Y0 - T) / (ROWS - 1)
COUPE_W, COUPE_H = MW // 3, MH // 4  # tuiles de l'app : la mosaïque en 3 x 4, sans recouvrement
rgb = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
TERRAIN = {"pre": "#6A7442", "coeur": "#8A8450", "riviere": "#4A6A7C", "sous_bois": "#4A4632", "bordure": "#3A3628"}
VERS = {"pre": "pre", "champ": "pre", "desordre": "pre", "chemin": "pre", "place": "pre", "batiment": "pre",
        "eau": "riviere", "foret": "sous_bois", "bordure": "bordure"}
NOMS = list(TERRAIN)
COTE, LARG = MONDE["COTE"], MONDE["LARGEUR"]
ecran = lambda gx, gy: ((gx - gy) * COTE / 2 + LARG / 2, (gx + gy) * COTE / 4)

SUJET = (
    "Image 1 is a flat colour map seen from the game's isometric camera. Repaint it as hand-painted natural terrain, keeping every "
    "zone where it is. Colour key of image 1: olive green = open meadow grass with natural variation, tufts, a few wildflowers and "
    "small bare patches, no paths, no plots, no fields, no geometric shapes; light warm khaki = the worn heart of the village, grass "
    "trampled thin, lighter and warmer, with soft irregular edges fading into the meadow; slate blue = a river with grassy banks and a "
    "few stones at the water's edge; dark olive-brown = bare forest-floor soil with moss and dead leaves, flat ground only, no trees, "
    "no bushes; darkest brown = the same forest floor in deeper shade at the edge of the world. Image 2 gives only the mood and the "
    "brushwork, very low weight: never copy its building or its layout. Paint only the terrain: no road, no path, no building, no fence, "
    "no field, no tree, no character, no prop, nothing standing up, no cast shadow. No drawn lines on the ground, colour against colour only. ")
BLOC = (
    "Franco-Belgian comic game art, three-quarter isometric view from above. No ink outline at all, soft painted edges between zones. "
    "Colour painted with visible brush strokes, two or three values per surface, matte, no gloss. Warm late-afternoon light from "
    "the upper left, even over the whole picture, no vignette. "
    "Meadow #6A7442, earth #6E5941, dark earth #554232, foliage #4C7A3E, moss #435A36, ochre #C8965E, light #DEC28B, slate shadow #2E3552. "
    "The picture fills the whole frame from edge to edge. No text, no signature.")
TUILE = ("Image 1 fixes the layout exactly, zone by zone, edge to edge: follow its shapes and nothing else. Image 2 is only a small "
         "swatch of the painting to match, its brushwork and its colours; never copy its shapes. ")
VARIANTES = {
    "v1": "",
    "v2": " Broad, loose brush strokes, big simple shapes, very few small details.",
    "v3": " Medium brush strokes; the meadow varies in large soft patches of warmer and cooler green.",
    "v4": " Fine, calm brush strokes, small tufts and flowers scattered sparsely, large quiet areas between them.",
}


def aplats():
    """Les aplats du monde entier à 1 px par dp, adoucis : chaque classe floutée de 4 dp, la plus forte gagne."""
    lab = Image.open(MAS / "masque_palier12.png")
    idx = Image.frombytes("L", lab.size, lab.tobytes())
    m = {n: idx.point(lambda v, n=n: 255 if v < len(CL) and VERS[CL[v]] == n else 0) for n in NOMS if n != "coeur"}
    village = idx.point(lambda v: 255 if v < len(CL) and CL[v] in ("batiment", "chemin", "place", "desordre") else 0)
    coeur = village.filter(ImageFilter.GaussianBlur(30)).point(lambda v: 255 if v > 90 else 0)
    # le pont est un chemin : sous lui, la rivière continue
    from PIL import ImageDraw
    ImageDraw.Draw(m["riviere"]).polygon([(x - X0, y - Y0) for x, y in (ecran(2, 10), ecran(3, 10), ecran(3, 11), ecran(2, 11))], fill=255)
    m["coeur"] = ImageChops.multiply(coeur, m["pre"].point(lambda v: 1 if v else 0).point(lambda v: v * 255))
    m["pre"] = ImageChops.subtract(m["pre"], coeur)
    for n in ("pre", "coeur"):
        m[n] = ImageChops.subtract(m[n], m["riviere"])
    doux = {n: v.filter(ImageFilter.GaussianBlur(4)).load() for n, v in m.items()}
    out = Image.new("RGB", (WD, HD)); op = out.load()
    for j in range(HD):
        for i in range(WD):
            op[i, j] = rgb(TERRAIN[max(NOMS, key=lambda k: doux[k][i, j])])
    out.save(CACHE / "aplats_monde.png")
    return out


def cadre12():
    """Le cadre d'ouverture du palier 12 sur HEAD, dp du monde."""
    P = MONDE["parPalier"]["12"]["cadre"]; aw, ah = MONDE["aire"]; z = P["zoom"]
    cx, cy = LARG / 2 - P["x"] / z, MONDE["HAUTEUR"] / 2 - P["y"] / z
    return (cx - aw / z / 2, cy - ah / z / 2, cx + aw / z / 2, cy + ah / z / 2)


def tuile_box(c, r):
    """La tuile (c, r) : son rectangle en px de mosaïque."""
    x, y = round(c * PASX), BANDE_Y0 + round(r * PASY)
    return (x, y, x + T, y + T)


def generer(jobs, label):
    import iso_loop as I
    from lib import flux
    I.guard_endpoint(I.FLUX3)
    if any(o.exists() for o, *_ in jobs):
        sys.exit("déjà peint : une boucle ne se rejoue jamais en place")
    batch = I.reserve(len(jobs), 0.30, label, None)
    responses = []

    def un(job):
        out, prompt, refs, w, h = job
        flux.generate(slug=f"surroundings_terrain5_{out.stem}", prompt=prompt, out=out, width=w, height=h, attempts=1,
                      references=refs, extra={"width": w, "height": h}, submitted_log=responses, endpoint=I.FLUX3)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(un, jobs))
    finally:
        print(I.settle(batch, responses))


ANCRE = CACHE / "ref_ancre_640.png"
if MODE == "aplats":
    a = aplats(); a.resize((WD // 3, HD // 3)).save(OUT / "aplats_monde.webp", quality=88)
    sys.exit(0)
if MODE == "heros":
    if not ANCRE.exists():
        Image.open("docs/designs/village-loop/evidence/style-refs/ancre_heroes_hall_grand_jour.webp").convert("RGB").resize((640, 800), Image.LANCZOS).save(ANCRE)
    a = Image.open(CACHE / "aplats_monde.png"); c = cadre12()
    ref = CACHE / "aplats_heros.png"
    a.crop(tuple(round(v) for v in (c[0] - X0, c[1] - Y0, c[2] - X0, c[3] - Y0))).resize((944, 1056), Image.BILINEAR).save(ref)
    generer([(CACHE / f"heros_{k}.png", SUJET + BLOC + v, (ref, ANCRE), 944, 1056) for k, v in VARIANTES.items()], "surroundings s2 loop5 heros x4")
    json.dump({"cadre_dp": c, "taille_px": [944, 1056]}, open(OUT / "heros_cadre.json", "w"))
    sys.exit(0)
if MODE == "tuiles":
    v = sys.argv[2]
    a = Image.open(CACHE / "aplats_monde.png").resize((MW, MH), Image.BILINEAR)
    # Essai 1 (tuile 11) : la variante entière en image 2 imposait sa composition, la tuile recopiait le cadre du
    # héros au lieu de ses aplats. Image 2 n'est plus qu'un échantillon de matière (rebord du cœur, pré, sous-bois),
    # trop petit pour porter une mise en page.
    heros = CACHE / f"echantillon2_{v}.png"
    if not heros.exists():  # essai 2 : pré et sous-bois seulement (le rebord du cœur faisait inventer des cœurs)
        Image.open(CACHE / f"heros_{v}.png").convert("RGB").crop((60, 700, 460, 1056)).resize((640, 570)).save(heros)
    jobs = []
    for r in range(ROWS):
        for c in range(COLS):
            if sys.argv[3:] and f"{r}{c}" not in sys.argv[3:]:
                continue  # une tuile d'abord, pour lire son coût avant les 11 autres
            if (CACHE / f"bande_{r}{c}.png").exists():
                continue
            ref = CACHE / f"aplats_b{r}{c}.png"; a.crop(tuile_box(c, r)).save(ref)
            jobs.append((CACHE / f"bande_{r}{c}.png", TUILE + SUJET + BLOC + VARIANTES[v], (ref, heros), T, T))
    generer(jobs, f"surroundings s2 loop5 tuiles x{len(jobs)}")
    sys.exit(0)
if MODE == "assemble":
    import random
    # le fond : le sous-bois et la bordure des aplats, agrandis, avec un grain doux (fait en code, pas en FLUX)
    a = Image.open(CACHE / "aplats_monde.png").resize((MW, MH), Image.BILINEAR)
    grain = Image.effect_noise((MW // 24, MH // 24), 10).resize((MW, MH), Image.BICUBIC).filter(ImageFilter.GaussianBlur(8))
    base = Image.merge("RGB", [ImageChops.add(ch, grain, scale=1.0, offset=-128) for ch in a.split()])
    peint = Image.new("RGB", (MW, MH)); deja = Image.new("L", (MW, MH), 0); ecarts = {}
    for r in range(ROWS):
        for c in range(COLS):
            box = tuile_box(c, r)
            t = Image.open(CACHE / f"bande_{r}{c}.png").convert("RGB")
            m = deja.crop(box)
            if m.getbbox():  # recalage : moyenne et écart type par canal, sur ce qui est déjà peint
                s1 = ImageStat.Stat(peint.crop(box), m); s2 = ImageStat.Stat(t, m)
                k = [(m1, d1 / max(1.0, d2), m2) for m1, d1, m2, d2 in zip(s1.mean, s1.stddev, s2.mean, s2.stddev)]
                ecarts[f"{r}{c}"] = [round(m1 - m2) for m1, _, m2 in k]
                t = Image.merge("RGB", [ch.point(lambda q, m1=m1, g=g, m2=m2: max(0, min(255, round(m1 + (q - m2) * g)))) for ch, (m1, g, m2) in zip(t.split(), k)])
            # rampe sur tout le recouvrement avec la tuile de gauche et celle du dessus
            ox = T - round(PASX) if c > 0 else 0; oy = T - round(PASY) if r > 0 else 0
            rx = Image.linear_gradient("L").rotate(90).resize((ox, T)) if ox else None  # 0 à gauche, 255 à droite
            al = Image.new("L", (T, T), 255)
            if ox: al.paste(ImageChops.darker(al.crop((0, 0, ox, T)), rx), (0, 0))
            if oy:
                ry = Image.linear_gradient("L").resize((T, oy))
                al.paste(ImageChops.darker(al.crop((0, 0, T, oy)), ry), (0, 0))
            peint.paste(t, box[:2], al)
            deja.paste(255, box)
    # FLUX garde ce qui n'est pas la bordure ; la bordure (sous le mur de conifères) vient du fond fait en code, où FLUX
    # inventait des prés (essai 1 et tuiles 00, 02). Fondu de 120 px, toujours à l'intérieur de la bande.
    ab = Image.open(CACHE / "aplats_monde.png").resize((MW, MH), Image.NEAREST).load()
    gb = rgb(TERRAIN["bordure"])
    mb = Image.new("L", (MW // 4, MH // 4), 0); pm = mb.load()
    for y in range(MH // 4):
        for x in range(MW // 4):
            if ab[x * 4, y * 4] != gb and BANDE_Y0 + 150 < y * 4 < BANDE_Y1 - 150: pm[x, y] = 255
    garde = mb.filter(ImageFilter.MinFilter(31)).resize((MW, MH), Image.BILINEAR).filter(ImageFilter.GaussianBlur(40))
    mos = Image.composite(peint, base, garde)
    # assombrissement des bords, une seule fois : densité de l'étape 1 (blanc calme, noir chargé), 0 à 25 %
    dens = Image.open(MAS / "densite.png").convert("L").resize((MW, MH), Image.BILINEAR).filter(ImageFilter.GaussianBlur(20))
    poids = dens.point(lambda v: int((255 - v) * 0.25))
    mos = Image.composite(Image.new("RGB", (MW, MH), (0x2E, 0x35, 0x52)), mos, poids)
    mos.save(CACHE / "mosaique.png")
    mos.resize((MW // 6, MH // 6), Image.LANCZOS).save(OUT / "mosaique_apercu.webp", quality=88)
    # tuiles de l'app : 3 x 4, toutes de la même taille, le bord extérieur du monde fondu sur 32 px
    APP.mkdir(parents=True, exist_ok=True)
    fondu = Image.new("L", (MW, MH), 0); fondu.paste(255, (32, 32, MW - 32, MH - 32)); fondu = fondu.filter(ImageFilter.BoxBlur(16))
    for r in range(4):
        for c in range(3):
            b = (c * COUPE_W, r * COUPE_H, (c + 1) * COUPE_W, (r + 1) * COUPE_H)
            t = mos.crop(b).convert("RGBA"); t.putalpha(fondu.crop(b))
            t.save(APP / f"terrain_{r}{c}.webp", quality=78, method=6)
    json.dump({"ecarts_couleur": ecarts, "mosaique_px": [MW, MH], "px_par_dp": PX, "bande_px": [BANDE_Y0, BANDE_Y1],
               "tuile_app_px": [COUPE_W, COUPE_H], "tuile_app_dp": [COUPE_W / PX, COUPE_H / PX], "monde_dp": [X0, Y0, WD, HD]},
              open(OUT / "assemblage.json", "w"), indent=1)
    print(open(OUT / "assemblage.json").read())
