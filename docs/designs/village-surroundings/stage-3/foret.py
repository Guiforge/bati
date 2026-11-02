"""Étape 3 : masses de forêt et bordure, en sprites séparés posés sur les masques de l'étape 1.
Lancer depuis la racine du dépôt :
  python3 -I docs/designs/village-surroundings/stage-3/foret.py gen <boucle>     # sprites FLUX 3 Image, via le registre
  python3 -I docs/designs/village-surroundings/stage-3/foret.py pose <boucle>    # détourage, trait, placement, planches

Les sprites : 4 masses (feuillus, mélangée, bouleaux clairs, forêt dense) et 2 pièces de bordure (mur de
conifères, crête rocheuse boisée). Une masse est posée sur 3,5 cases de large (168 dp, 1344 px à S) : la toile
de 1344 px est donc à l'échelle S, trait visé 5 px (bible, hiérarchie du trait), porté par dilatation.
Placement par palier (1, 6, 12) dans la forêt du masque, qui recule avec l'île (exception de la bible). L'étoile
des 8 coupes de l'étape 1 est cassée : les masses débordent de 25 dp sur le pré, ce qui referme en partie les 4
trouées diagonales, sans jamais toucher à moins de 40 dp d'un chemin, de l'eau, d'un champ ou du village."""
import concurrent.futures, importlib.util, json, math, pathlib, sys
sys.path.insert(0, "scripts/iso"); sys.path.insert(0, "scripts")
from PIL import Image, ImageChops, ImageDraw, ImageFilter

MODE, B = sys.argv[1], sys.argv[2]
ICI = pathlib.Path("docs/designs/village-surroundings")
S1 = ICI / "stage-1/loop-3"
CAND = pathlib.Path.home() / ".cache/bati-art-loop/iso/surroundings/stage3" / f"loop-{B}"; CAND.mkdir(parents=True, exist_ok=True)
OUT = ICI / f"stage-3/loop-{B}"; OUT.mkdir(parents=True, exist_ok=True)
GW, GH = 1344, 896
TRAIT_S = 5

BLOC = (ICI / "bible.md").read_text(encoding="utf-8")
import re
BLOC = re.search(r"## Bloc de prompt FLUX.*?```\n(.*?)\n```", BLOC, re.S).group(1).replace("{TRAIT}", "five")
COMMUN_B1 = (
    "Image 1 shows the hand to match: its ink, its brushwork, its light; never copy the tree itself. Image 2 gives only the mood, "
    "very low weight: never copy its building. Paint one forest mass seen from the game's isometric camera: several trees that "
    "overlap into one clump, read as a single silhouette with a varied, broken top edge. Each crown is made of big rounded clumps "
    "of leaves with a lit top on the left, a mid tone and a cool slate shaded side on the right. No single leaf drawn on its own, "
    "no floating leaves, no leaf shapes stamped on the crowns. No ground tile, no turf base, no square or diamond of grass under "
    "the trees: the trunks end directly on the backdrop. ")
# Boucle 2 : l'arbre de l'étape 0 portait le socle en losange et les feuilles tampons ; l'ancre seule en référence.
COMMUN = (
    "Image 1 gives only the mood and the brushwork, very low weight: never copy its building. Paint one forest mass seen from the "
    "game's isometric camera: several trees that overlap into one clump, read as a single silhouette with a varied, broken top edge. "
    "Each crown is made of big rounded clumps of leaves painted with brush strokes, a lit top on the left, a mid tone and a cool slate "
    "shaded side on the right. No single leaf drawn on its own, no floating leaves, no leaf icons on the crowns. The trunks and roots "
    "stand directly on the flat magenta backdrop: no grass, no soil, no ground plate, no base of any shape under the trees. ")
COMMUN = COMMUN_B1 if B == "1" else COMMUN
# Boucle 3 : seuls les 3 sprites qui gardaient un socle sont refaits, avec une autre formule ; les autres
# viennent de la boucle 2.
# Boucle 4 (après acceptation de Guillaume) : la crête sans dalle et la masse dense au trait plus fin.
# Boucle 5 : FLUX remet un sol quoi qu'on dise ; on le lui laisse, mais d'une couleur clé (cyan pur) qu'on retire
# après coup, sous la ligne des racines (découpe par clé).
REFAIRE = {"3": ("bouleaux", "dense", "bord_crete"), "4": ("dense", "bord_crete"), "5": ("dense", "bord_crete")}.get(B)
if B == "5":
    COMMUN = COMMUN.replace(
        "The trunks and roots stand directly on the flat magenta backdrop: no grass, no soil, no ground plate, no base of any shape under the trees. ",
        "The trees stand on a patch of flat, untextured, pure cyan (#00FFFF) ground, one even colour used as a key: roots and rocks sit on it, "
        "no grass, no stones, no shadow painted on the cyan. ")
elif REFAIRE:
    COMMUN += ("The trees are cut out like a sticker: below and between the trunks there is only the pure magenta backdrop, "
               "the lowest painted pixels are the roots themselves. ")
SUJETS = {
    "feuillus": "A clump of six to eight broad oaks and beeches of different heights, warm olive-green crowns, a few thick trunks visible at the front. ",
    "melangee": "A mixed clump of five broadleaf trees and four tall dark firs, the firs rising above the round crowns at the back. ",
    "bouleaux": "A light grove of seven young birches, slender white trunks with black marks, small airy crowns of yellow-green leaves, gaps between them. ",
    "dense": "A dense deep-forest mass of ten to twelve trees packed tight, dark moss-green crowns, almost no trunk visible, the darkest of the forest. ",
    "bord_coniferes": "A long wall of fifteen to twenty firs and spruces packed shoulder to shoulder, very dark, almost black blue-green, no broadleaf tree, a closed edge of the world, nothing can be seen through it. ",
    "bord_crete": "A long low ridge of dark grey rocks with very dark firs growing on and behind it, a closed edge of the world, rock faces lit on the left and slate in shade on the right, no broadleaf tree. ",
}
if B in ("4", "5"):
    SUJETS["dense"] += "The black outline is thin and regular, about three pixels, thinner than usual. "
if B == "4":
    SUJETS["bord_crete"] += "The rocks and trees sit directly on the magenta backdrop: no slab, no paving, no ground plate, no base under them. "
PLANCHES = importlib.util.spec_from_file_location("planches", ICI / "stage-0/loop-2/planches.py")

if MODE == "gen":
    import iso_loop as I
    from lib import flux
    ref1 = CAND / "ref_arbre.png"
    if not ref1.exists():  # l'arbre retenu à l'étape 0, sur magenta
        a = Image.open(ICI / "stage-0/loop-2/f3_t3_trait5.cut.webp").convert("RGBA")
        f = Image.new("RGBA", (a.width + 80, a.height + 80), (255, 0, 255, 255)); f.alpha_composite(a, (40, 40)); f.convert("RGB").save(ref1)
    ref2 = CAND / "ref_ancre_640.png"
    if not ref2.exists():
        Image.open("docs/designs/village-loop/evidence/style-refs/ancre_heroes_hall_grand_jour.webp").convert("RGB").resize((640, 800), Image.LANCZOS).save(ref2)
    I.guard_endpoint(I.FLUX3)
    outs = {k: CAND / f"{k}.png" for k in (REFAIRE or SUJETS)}
    if any(o.exists() for o in outs.values()):
        sys.exit("déjà peint : une boucle ne se rejoue jamais en place")
    batch = I.reserve(len(REFAIRE or SUJETS), 0.10, f"surroundings s3 loop{B} foret x{len(REFAIRE or SUJETS)}", None)
    responses = []

    def peindre(k):
        flux.generate(slug=f"surroundings_foret_{k}", prompt=COMMUN + SUJETS[k] + BLOC, out=outs[k], width=GW, height=GH, attempts=1,
                      references=(ref1, ref2) if B == "1" else (ref2,), extra={"width": GW, "height": GH}, submitted_log=responses, endpoint=I.FLUX3)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            list(pool.map(peindre, outs))
    finally:
        print(I.settle(batch, responses))
    (OUT / "prompts.json").write_text(json.dumps({"commun": COMMUN, "sujets": SUJETS, "bloc": BLOC, "taille": [GW, GH]}, indent=1, ensure_ascii=False))
    sys.exit(0)

# --- pose -----------------------------------------------------------------------------------------
pl = importlib.util.module_from_spec(PLANCHES); PLANCHES.loader.exec_module(pl)
MES = json.loads((S1 / "mesures.json").read_text()); CL = MES["classes"]
MONDE = json.loads((S1 / "monde.json").read_text())
COTE, LARG = MONDE["COTE"], MONDE["LARGEUR"]
X0, Y0 = MES["monde"]["x0_dp"], MES["monde"]["y0_dp"]
LARGE_DP = 168  # largeur posée d'une masse ; bordure 1,3 fois plus large
K_DP = COTE / 384  # dp par px à S


def source(k):
    """Le sprite de cette boucle, sinon celui de la boucle d'avant (boucle 3 : seuls 3 sont refaits)."""
    for b in range(int(B), 0, -1):
        f = CAND.parent / f"loop-{b}" / f"{k}.png"
        if f.exists():
            return f
    return None


def socle(cut):
    """Nombre moyen de taches opaques par ligne dans les 15 % du bas : des troncs en font plusieurs (3,9 à 5,4 en
    boucle 2), un socle en losange ou en dalle une seule (1,0 à 1,1)."""
    w, h = cut.size; a = cut.getchannel("A").load(); runs = []
    for y in range(int(h * 0.85), h):
        r, prev, n = 0, False, 0
        for x in range(w):
            on = a[x, y] > 128; n += on
            if on and not prev: r += 1
            prev = on
        if n: runs.append(r)
    return sum(runs) / max(1, len(runs))


def coupe(k):
    """Détourage décontaminé, puis contour extérieur porté à TRAIT_S px à S (la toile est à l'échelle S)."""
    cut, det = pl.detoure(Image.open(source(k)))
    if source(k).parent.name == "loop-5":  # découpe par clé : le sol cyan part, ses bords deviennent encre
        cyan = lambda q: q[1] > 140 and q[2] > 140 and q[0] < 130
        px = cut.load(); w, h = cut.size; retires = 0
        for y in range(h):
            for x in range(w):
                q = px[x, y]
                if q[3] and cyan(q):
                    px[x, y] = (0, 0, 0, 0); retires += 1
        # Le liseré d'encre du losange cyan et les miettes d'ombre restent : une ouverture de 7 px (érosion puis
        # dilatation de l'alpha) efface tout ce qui est plus fin, les troncs et les rochers tiennent.
        a = cut.getchannel("A")
        ouvert = a.point(lambda v: 255 if v > 128 else 0).filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7))
        cut.putalpha(ImageChops.multiply(a, ouvert))
        cut = cut.crop(cut.getbbox())
        det["cle_cyan_px_retires"] = retires
    det["source"] = str(source(k).parent.name)
    brut = pl.trait(cut)[0]
    r = max(0, round(TRAIT_S - brut))
    if r:
        pad = Image.new("RGBA", (cut.width + 2 * r, cut.height + 2 * r)); pad.alpha_composite(cut, (r, r))
        a = pad.getchannel("A").point(lambda v: 255 if v > 128 else 0).filter(ImageFilter.MaxFilter(2 * r + 1))
        ink = Image.new("RGBA", pad.size, (15, 21, 24, 0)); ink.putalpha(a)
        cut = Image.alpha_composite(ink, pad)
    det.update({"trait_brut_px_S": brut, "dilatation_px": r, "trait_final_px_S": pl.trait(cut)[0]})
    return cut, det


SPR, DET = {}, {}
for k in SUJETS:
    if source(k):
        SPR[k], DET[k] = coupe(k)
        DET[k]["socle_taches_par_ligne"] = round(socle(SPR[k]), 2)
        SPR[k].save(OUT / f"{k}.cut.webp", quality=90)
        if DET[k]["socle_taches_par_ligne"] < 2:  # un socle : jamais posé, une masse propre le remplace
            DET[k]["rejete"] = True
REMPLACE = {"bouleaux": "feuillus", "dense": "melangee", "bord_crete": "bord_coniferes", "feuillus": "melangee", "melangee": "feuillus", "bord_coniferes": "bord_crete"}
for k in list(SPR):
    if DET[k].get("rejete"):
        r = REMPLACE[k]
        if r in SPR and not DET[r].get("rejete"):
            SPR[k] = SPR[r]
        else:
            del SPR[k]


def h(i, j, sel):
    """Hasard fixe par point (pas de random : la forêt est la même à chaque visite)."""
    x = math.sin(i * 127.1 + j * 311.7 + sel * 74.7) * 43758.5453
    return x - math.floor(x)


def placements(t):
    lab = Image.open(S1 / f"masque_palier{t}.png"); w, hh = lab.size
    petit = lambda m: m.resize((w // 4, hh // 4), Image.NEAREST)
    idx = Image.frombytes("L", lab.size, lab.tobytes())  # les indices de classe, pas les couleurs de la palette
    cls = lambda *ns: idx.point(lambda v: 255 if v < len(CL) and CL[v] in ns else 0)
    foret = petit(cls("foret")); bord = petit(cls("bordure"))
    garde = petit(cls("chemin", "eau", "champ", "batiment", "place", "desordre")).filter(ImageFilter.MaxFilter(21))  # 40 dp
    proche = foret.filter(ImageFilter.MaxFilter(13))  # 25 dp de débord sur le pré
    # Devant le village (plus bas à l'écran), une masse monte de toute sa hauteur : son pied doit rester à
    # au moins 130 dp sous tout ce que le village occupe. Le village est étiré vers le bas de 130 dp.
    village = petit(cls("chemin", "batiment", "place", "desordre", "champ"))
    ombre = village.copy()
    for dy in range(2, 34, 2):
        ombre = ImageChops.lighter(ombre, ImageChops.offset(village, 0, dy))
    garde = ImageChops.lighter(garde, ombre)
    F, Bd, G, P = foret.load(), bord.load(), garde.load(), proche.load()
    out, pas = [], 72  # une masse tous les 72 dp, décalée au hasard (56 faisait un tapis, boucle 2)
    for j in range(0, hh, pas):
        for i in range(0, w, pas):
            x = i + (h(i, j, 1) - 0.5) * pas; y = j + (h(i, j, 2) - 0.5) * pas * 0.6
            a, b = int(x) // 4, int(y) // 4
            if not (0 <= a < w // 4 and 0 <= b < hh // 4) or G[a, b]:
                continue
            if Bd[a, b]:
                out.append(("bord_coniferes" if h(i, j, 3) < 0.65 else "bord_crete", x + X0, y + Y0, 1.3))
            elif F[a, b] or (P[a, b] and h(i, j, 4) < 0.5):
                prof = 1.0 if F[a, b] else 0.0
                r = h(i, j, 5)
                k = ("bouleaux" if r < 0.35 else "feuillus" if r < 0.8 else "melangee") if not prof else \
                    ("dense" if r < 0.45 else "melangee" if r < 0.75 else "feuillus")
                # taille au hasard fixe ; jamais de miroir : il mettrait la lumière à droite
                out.append((k, x + X0, y + Y0, 0.75 + 0.5 * h(i, j, 6)))
    return sorted(out, key=lambda p: p[2])  # le plus haut d'abord : profondeur iso


def composite(t, fond, sprites_village=True):
    """La vue « Cadrer » du palier t, en pixels d'écran (1080 x 1213, densité 2,625)."""
    P = MONDE["parPalier"][str(t)]["cadre"]; aw, ah = MONDE["aire"]; z = P["zoom"]; s = z * 2.625
    cx, cy = LARG / 2 - P["x"] / z, MONDE["HAUTEUR"] / 2 - P["y"] / z
    x0, y0 = cx - aw / z / 2, cy - ah / z / 2
    W, H = 1080, 1213
    vers = lambda x, y: ((x - x0) * s, (y - y0) * s)
    # le terrain retenu (étape 2, v1) couvre le cadre du palier 12 ; on le recale dans ce cadre-ci
    c12 = json.loads((ICI / "stage-2/loop-4/cadre.json").read_text())["cadre_dp"]
    terr = Image.open(pathlib.Path.home() / ".cache/bati-art-loop/iso/surroundings/stage2/loop-4/terrain_v1.png").convert("RGB")
    k12 = terr.width / (c12[2] - c12[0])
    box = ((x0 - c12[0]) * k12, (y0 - c12[1]) * k12, (x0 - c12[0] + aw / z) * k12, (y0 - c12[1] + ah / z) * k12)
    im = terr.transform((W, H), Image.EXTENT, box, Image.BICUBIC).convert("RGBA")
    dr = ImageDraw.Draw(im, "RGBA")
    TE = {0: "#7A5A38", 1: "#6E5434", 2: "#7C7058"}
    rgb = lambda hx: tuple(int(hx[i:i + 2], 16) for i in (1, 3, 5))
    vis = MONDE["parPalier"][str(t)]["visible"]; vu = lambda gx, gy: 0 <= gy < 20 and 0 <= gx < 20 and vis[gy][gx]
    bandes = [(a["d"], TE[a["classe"]]) for a in MONDE["aretes"] if vu(*a["de"]) and vu(*a["vers"])]
    mont = MONDE["parPalier"][str(t)]["montres"]
    bandes += [(s_["d"], TE[0]) for s_ in MONDE["sentiers"] if s_["code"] in mont] + [(s_["d"], TE[0]) for s_ in MONDE["sorties"] if vu(*s_["fin"])]
    bandes += [(MONDE["place"], TE[2])]
    for d, _ in bandes:
        for p in pl_polys(d): dr.polygon([vers(*q) for q in p], fill=(15, 21, 24, 204), outline=(15, 21, 24, 204), width=max(1, round(2.4 * s)))
    for d, c in bandes:
        for p in pl_polys(d): dr.polygon([vers(*q) for q in p], fill=rgb(c))
    # forêt et bâtiments, triés ensemble par la profondeur (le pied le plus haut d'abord)
    objets = []
    for k, x, y, e in placements(t):
        spr = SPR.get(k)
        if spr is None: continue
        larg = LARGE_DP * e
        objets.append((y, spr, x, y, larg / spr.width))
    A = pathlib.Path("assets/images/village/iso")
    for code in mont:
        e = MONDE["emplacements"][code]
        for st in ("grand", "solid", "rough"):
            f = A / code / f"{st}.nuit.webp"
            if f.exists(): break
        else:
            continue
        meta = json.loads(f.with_suffix(".json").read_text()); kk = K_DP / meta.get("pxScale", 1)
        gx, gy = e["coin"][0] + e["emprise"][0], e["coin"][1] + e["emprise"][1]
        ax, ay = (gx - gy) * COTE / 2 + LARG / 2, (gx + gy) * COTE / 4
        spr = Image.open(f).convert("RGBA")
        objets.append((ay, spr, ax - meta["anchor"][0] * kk + spr.width * kk / 2, ay - meta["anchor"][1] * kk + spr.height * kk, kk))
    for _, spr, x, y, k in sorted(objets, key=lambda o: o[0]):
        w_, h_ = max(1, round(spr.width * k * s)), max(1, round(spr.height * k * s))
        px, py = vers(x, y)
        if px + w_ / 2 < 0 or px - w_ / 2 > W or py < 0 or py - h_ > H: continue
        im.alpha_composite(spr.resize((w_, h_), Image.LANCZOS), (round(px - w_ / 2), round(py - h_)))
    return im.convert("RGB")


def pl_polys(d):
    out, cur = [], []
    for cmd, args in re.findall(r"([MLQZ])([^MLQZ]*)", d):
        n = [float(v) for v in re.findall(r"-?\d+(?:\.\d+)?(?:e-?\d+)?", args)]
        if cmd == "M":
            if cur: out.append(cur)
            cur = [(n[i], n[i + 1]) for i in range(0, len(n), 2)]
        elif cmd == "L": cur += [(n[i], n[i + 1]) for i in range(0, len(n), 2)]
        elif cmd == "Q":
            for i in range(0, len(n), 4): cur += [(n[i], n[i + 1]), (n[i + 2], n[i + 3])]
        elif cmd == "Z":
            if cur: out.append(cur)
            cur = []
    if cur: out.append(cur)
    return [p for p in out if len(p) >= 3]


mes = {"sprites": DET, "placements": {}}
for t in (1, 6, 12):
    pts = placements(t); mes["placements"][t] = {k: sum(1 for p in pts if p[0] == k) for k in SUJETS}
    composite(t, None).save(OUT / f"palier{t}.webp", quality=88)
# planche des sprites, sur le pré
tiles = [SPR[k] for k in SUJETS if k in SPR]
if tiles:
    hmax = 300; ims = [s_.resize((round(s_.width * hmax / s_.height), hmax), Image.LANCZOS) for s_ in tiles]
    p_ = Image.new("RGBA", (sum(i.width for i in ims) + 20 * (len(ims) + 1), hmax + 40), (0x6A, 0x74, 0x42, 255)); x = 20
    d_ = ImageDraw.Draw(p_)
    for k, i in zip([k for k in SUJETS if k in SPR], ims):
        p_.alpha_composite(i, (x, 30)); d_.text((x, 6), k, fill=(15, 21, 24)); x += i.width + 20
    p_.convert("RGB").save(OUT / "sprites.webp", quality=88)
(OUT / "mesures.json").write_text(json.dumps(mes, indent=1, ensure_ascii=False))
print(json.dumps(mes, indent=1, ensure_ascii=False))
