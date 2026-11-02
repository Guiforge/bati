"""Étape 2, boucle 4 : le terrain seul (décision de Guillaume, 01/11). FLUX ne peint que le pré, le cœur usé
du village, la rivière et ses berges, le sol nu du sous-bois et la bordure. Chemins, champs et terre sous les
bâtiments restent au code et aux socles.
Lancer depuis la racine du dépôt :
  python3 -I docs/designs/village-surroundings/stage-2/terrain.py sec      # les aplats seuls
  python3 -I docs/designs/village-surroundings/stage-2/terrain.py gen      # 4 variantes, via le registre
  python3 -I docs/designs/village-surroundings/stage-2/terrain.py mesure   # mesures, planche, composites

Composite : le terrain, puis les chemins du code et les sprites des bâtiments par-dessus, au palier 12.
shortcut: les chemins sont ceux de RuesDessinees.tsx en aplats (rang 0 et sentiers isoTerre, rang 1
isoCheminClair, rang 2 et place isoPaveClair, liseré isoInk 2,4 dp à 80 %), sans les motifs de texture ni
le pavage ; une capture de l'app après l'étape 5 les remplacera."""
import concurrent.futures, json, math, pathlib, statistics, sys
sys.path.insert(0, "scripts/iso"); sys.path.insert(0, "scripts")
from PIL import Image, ImageDraw, ImageFilter

MODE = sys.argv[1]
S1 = pathlib.Path("docs/designs/village-surroundings/stage-1/loop-3")
MES = json.loads((S1 / "mesures.json").read_text()); CL = MES["classes"]
MONDE = json.loads((S1 / "monde.json").read_text())
CAND = pathlib.Path.home() / ".cache/bati-art-loop/iso/surroundings/stage2/loop-4"; CAND.mkdir(parents=True, exist_ok=True)
OUT = pathlib.Path("docs/designs/village-surroundings/stage-2/loop-4"); OUT.mkdir(parents=True, exist_ok=True)
W, H = 896, 1008
COTE, LARG = MONDE["COTE"], MONDE["LARGEUR"]
P = MONDE["parPalier"]["12"]["cadre"]; aw, ah = MONDE["aire"]; z = P["zoom"]
cx, cy = LARG / 2 - P["x"] / z, MONDE["HAUTEUR"] / 2 - P["y"] / z
CADRE = (cx - aw / z / 2, cy - ah / z / 2, cx + aw / z / 2, cy + ah / z / 2)
S = W / (CADRE[2] - CADRE[0])  # px de sortie par dp de carte
ecran = lambda gx, gy: ((gx - gy) * COTE / 2 + LARG / 2, (gx + gy) * COTE / 4)
vers = lambda x, y: ((x - CADRE[0]) * S, (y - CADRE[1]) * S)
rgb = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))

# Classes du terrain et leurs aplats.
TERRAIN = {"pre": "#6A7442", "coeur": "#8A8450", "riviere": "#4A6A7C", "sous_bois": "#4A4632", "bordure": "#3A3628"}
VERS_TERRAIN = {"pre": "pre", "champ": "pre", "desordre": "pre", "chemin": "pre", "place": "pre", "batiment": "pre",
                "eau": "riviere", "foret": "sous_bois", "bordure": "bordure"}
NOMS = list(TERRAIN)


def aplats():
    lab = Image.open(S1 / "masque_palier12.png")
    x0, y0 = MES["monde"]["x0_dp"], MES["monde"]["y0_dp"]
    crop = lab.crop(tuple(round(v) for v in (CADRE[0] - x0, CADRE[1] - y0, CADRE[2] - x0, CADRE[3] - y0)))
    idx = crop.load(); cw, ch = crop.size
    masques = {n: Image.new("L", crop.size, 0) for n in NOMS}
    mp = {n: m.load() for n, m in masques.items()}
    coeur = Image.new("L", crop.size, 0); cp = coeur.load()
    for j in range(ch):
        for i in range(cw):
            c = CL[idx[i, j]]
            mp[VERS_TERRAIN[c]][i, j] = 255
            if c in ("batiment", "chemin", "place", "desordre"): cp[i, j] = 255
    # Le pont est un chemin : sous lui, la rivière continue.
    dm = ImageDraw.Draw(masques["riviere"])
    dm.polygon([(x - CADRE[0], y - CADRE[1]) for x, y in (ecran(2, 10), ecran(3, 10), ecran(3, 11), ecran(2, 11))], fill=255)
    # Le cœur usé : tout ce que le village occupe, très flouté, en une seule tache douce.
    coeur = coeur.filter(ImageFilter.GaussianBlur(30)).point(lambda v: 255 if v > 90 else 0)
    masques["coeur"] = Image.composite(coeur, Image.new("L", crop.size, 0), masques["pre"])
    masques["pre"] = Image.composite(Image.new("L", crop.size, 0), masques["pre"], coeur)
    for n in ("pre", "coeur"):  # la rivière passe par-dessus tout, pont compris
        masques[n] = Image.composite(Image.new("L", crop.size, 0), masques[n], masques["riviere"])
    doux = {n: m.resize((W, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(4)).load() for n, m in masques.items()}
    out = Image.new("RGB", (W, H)); op = out.load(); classe = Image.new("L", (W, H)); kp = classe.load()
    for j in range(H):
        for i in range(W):
            n = max(NOMS, key=lambda k: doux[k][i, j])
            op[i, j] = rgb(TERRAIN[n]); kp[i, j] = NOMS.index(n)
    return out, classe


SUJET = (
    "Image 1 is a flat colour map seen from the game's isometric camera. Repaint it as hand-painted natural terrain, keeping every "
    "zone where it is. Colour key of image 1: olive green = open meadow grass with natural variation, tufts, a few wildflowers and "
    "small bare patches, no paths, no plots, no fields, no geometric shapes; light warm khaki = the worn heart of the village, grass "
    "trampled thin, lighter and warmer, with soft irregular edges fading into the meadow; slate blue = a river with grassy banks and a "
    "few stones at the water's edge; dark olive-brown = bare forest-floor soil with moss and dead leaves, flat ground only, no trees, "
    "no bushes; darkest brown = the same forest floor in deeper shade at the edge of the world. Image 2 gives only the mood and the "
    "brushwork, very low weight: never copy its building. Paint only the terrain: no road, no path, no building, no fence, no field, "
    "no tree, no character, no prop, nothing standing up, no cast shadow. No drawn lines on the ground, colour against colour only. ")
BLOC = (
    "Franco-Belgian comic game art, three-quarter isometric view from above. No ink outline at all, soft painted edges between zones. "
    "Colour painted with visible brush strokes, two or three values per surface, matte, no gloss. Warm late-afternoon light from "
    "the upper left; the ground gets a little darker and cooler toward the edges of the picture, the centre stays lightest. "
    "Meadow #6A7442, earth #6E5941, dark earth #554232, foliage #4C7A3E, moss #435A36, ochre #C8965E, light #DEC28B, slate shadow #2E3552. "
    "The picture fills the whole frame from edge to edge. No text, no signature.")
VARIANTES = {
    "v1": "",
    "v2": " Broad, loose brush strokes, big simple shapes, very few small details.",
    "v3": " Medium brush strokes; the meadow varies in large soft patches of warmer and cooler green.",
    "v4": " The edges of the picture are clearly darker and less saturated, and the worn centre glows softly in the warm light.",
}

if MODE in ("sec", "gen"):
    ref1, ref2 = CAND / "aplats_terrain.png", CAND / "ref_ancre_640.png"
    a, k = aplats(); a.save(ref1); k.save(CAND / "classes_terrain.png")
    if not ref2.exists():
        Image.open("docs/designs/village-loop/evidence/style-refs/ancre_heroes_hall_grand_jour.webp").convert("RGB").resize((640, 800), Image.LANCZOS).save(ref2)
    if MODE == "sec":
        sys.exit(f"aplats seuls : {ref1}")
    import iso_loop as I
    from lib import flux
    I.guard_endpoint(I.FLUX3)
    outs = {v: CAND / f"terrain_{v}.png" for v in VARIANTES}
    if any(o.exists() for o in outs.values()):
        sys.exit("déjà peint : une boucle ne se rejoue jamais en place")
    batch = I.reserve(len(VARIANTES), 0.10, f"surroundings s2 loop4 terrain x{len(VARIANTES)}", None)
    responses = []

    def peindre(v):
        flux.generate(slug=f"surroundings_terrain_{v}", prompt=SUJET + BLOC + VARIANTES[v], out=outs[v], width=W, height=H,
                      attempts=1, references=(ref1, ref2), extra={"width": W, "height": H}, submitted_log=responses, endpoint=I.FLUX3)

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(peindre, VARIANTES))
    finally:
        print(I.settle(batch, responses))
    (OUT / "cadre.json").write_text(json.dumps({"cadre_dp": CADRE, "taille_px": [W, H], "palier": 12, "masques": str(S1),
                                                 "terrain": TERRAIN, "prompt_sujet": SUJET, "bloc": BLOC, "variantes": VARIANTES}, indent=1, ensure_ascii=False))
    sys.exit(0)

# --- mesure, planche, composites -------------------------------------------------------------------
PAL = [rgb(h) for h in ("#0F1518", "#2E3552", "#554232", "#6E5941", "#C8965E", "#DEC28B", "#4C7A3E", "#435A36", "#6A7442")]
lum = lambda p: 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]
d2 = lambda a, b: sum((x - y) ** 2 for x, y in zip(a, b))
K = Image.open(CAND / "classes_terrain.png").load()
pts = [(x, y) for y in range(0, H, 3) for x in range(0, W, 3)]
res = {}
for f in sorted(CAND.glob("terrain_v*.png")):
    im = Image.open(f).convert("RGB"); Pi = im.load()
    par = {}
    for q in pts: par.setdefault(K[q], []).append(Pi[q])
    moy = {k: tuple(statistics.mean(p[i] for p in v) for i in range(3)) for k, v in par.items()}
    pred = {q: min(moy, key=lambda k: d2(Pi[q], moy[k])) for q in pts}
    r = NOMS.index("riviere")
    tp = sum(1 for q in pts if pred[q] == r and K[q] == r)
    centre = [lum(Pi[x, y]) for x, y in pts if abs(x - W / 2) < W / 6 and abs(y - H / 2) < H / 6]
    bord = [lum(Pi[x, y]) for x, y in pts if min(x, W - x) < W / 8 or min(y, H - y) < H / 8]
    sat = lambda p: max(p) - min(p)
    res[f.stem] = {"masque_lisible": round(sum(pred[q] == K[q] for q in pts) / len(pts), 2),
                   "riviere_rappel": round(tp / max(1, sum(K[q] == r for q in pts)), 2),
                   "riviere_precision": round(tp / max(1, sum(pred[q] == r for q in pts)), 2),
                   "encre": round(sum(lum(Pi[q]) < 45 for q in pts) / len(pts), 3),
                   "palette9_40": round(sum(min(d2(Pi[q], p) for p in PAL) < 1600 for q in pts) / len(pts), 2),
                   "lum_centre": round(statistics.mean(centre)), "lum_bord": round(statistics.mean(bord)),
                   "sat_centre": round(statistics.mean(sat(Pi[x, y]) for x, y in pts if abs(x - W / 2) < W / 6 and abs(y - H / 2) < H / 6)),
                   "sat_bord": round(statistics.mean(sat(Pi[x, y]) for x, y in pts if min(x, W - x) < W / 8 or min(y, H - y) < H / 8))}
(OUT / "mesures.json").write_text(json.dumps(res, indent=1))
print(json.dumps(res, indent=1))

# Chemins du code (RuesDessinees, en aplats) et sprites des bâtiments au palier 12.
import re


def polys(d):
    out, cur = [], []
    for cmd, args in re.findall(r"([MLQZ])([^MLQZ]*)", d):
        n = [float(v) for v in re.findall(r"-?\d+(?:\.\d+)?(?:e-?\d+)?", args)]
        if cmd == "M":
            if cur: out.append(cur)
            cur = [(n[i], n[i + 1]) for i in range(0, len(n), 2)]
        elif cmd == "L":
            cur += [(n[i], n[i + 1]) for i in range(0, len(n), 2)]
        elif cmd == "Q":
            for i in range(0, len(n), 4): cur += [(n[i], n[i + 1]), (n[i + 2], n[i + 3])]
        elif cmd == "Z":
            if cur: out.append(cur)
            cur = []
    if cur: out.append(cur)
    return [p for p in out if len(p) >= 3]


TEINTE = {0: "#7A5A38", 1: "#6E5434", 2: "#7C7058"}  # rawColors isoTerre, isoCheminClair, isoPaveClair
vis = MONDE["parPalier"]["12"]["visible"]; vu = lambda gx, gy: 0 <= gy < 20 and 0 <= gx < 20 and vis[gy][gx]
bandes = [(polys(a["d"]), TEINTE[a["classe"]]) for a in MONDE["aretes"] if vu(*a["de"]) and vu(*a["vers"])]
bandes += [(polys(s["d"]), TEINTE[0]) for s in MONDE["sentiers"]] + [(polys(s["d"]), TEINTE[0]) for s in MONDE["sorties"]]
bandes += [(polys(MONDE["place"]), TEINTE[2])]
A = pathlib.Path("assets/images/village/iso")


def sprites():
    out = []
    for code in MONDE["parPalier"]["12"]["montres"]:
        e = MONDE["emplacements"][code]
        for st in ("grand", "solid", "rough"):
            f = A / code / f"{st}.nuit.webp"
            if f.exists(): break
        else:
            continue
        meta = json.loads(f.with_suffix(".json").read_text())  # grand.nuit.webp -> grand.nuit.json
        k = COTE / 384 / meta.get("pxScale", 1)
        ax, ay = ecran(e["coin"][0] + e["emprise"][0], e["coin"][1] + e["emprise"][1])
        out.append((e["coin"][0] + e["coin"][1] + e["emprise"][0] + e["emprise"][1], f, ax - meta["anchor"][0] * k, ay - meta["anchor"][1] * k, k))
    return sorted(out)


def composite(fond):
    im = fond.convert("RGBA"); dr = ImageDraw.Draw(im, "RGBA")
    for ps, _ in bandes:  # le liseré, sous toutes les bandes
        for p in ps: dr.polygon([vers(*q) for q in p], fill=(15, 21, 24, 204), outline=(15, 21, 24, 204), width=max(1, round(2.4 * S)))
    for ps, t in bandes:
        for p in ps: dr.polygon([vers(*q) for q in p], fill=rgb(t))
    for _, f, x, y, k in sprites():
        s = Image.open(f).convert("RGBA"); s = s.resize((max(1, round(s.width * k * S)), max(1, round(s.height * k * S))), Image.LANCZOS)
        im.alpha_composite(s, tuple(round(v) for v in vers(x, y)))
    return im.convert("RGB")


ims = [("aplats", Image.open(CAND / "aplats_terrain.png").convert("RGB"))] + [(f.stem, Image.open(f).convert("RGB")) for f in sorted(CAND.glob("terrain_v*.png"))]
w, h = W // 2, H // 2
pl = Image.new("RGB", (len(ims) * (w + 10), 2 * h + 48), (20, 20, 20)); dr = ImageDraw.Draw(pl)
for k, (n, i) in enumerate(ims):
    pl.paste(i.resize((w, h), Image.LANCZOS), (k * (w + 10), 24)); dr.text((k * (w + 10) + 4, 6), n, fill=(230, 230, 230))
    c = composite(i); c.save(OUT / f"composite_{n}.webp", quality=88)
    pl.paste(c.resize((w, h), Image.LANCZOS), (k * (w + 10), h + 48)); dr.text((k * (w + 10) + 4, h + 30), f"{n} + chemins du code + sprites", fill=(230, 230, 230))
    if n != "aplats": i.save(OUT / f"{n}.webp", quality=90)
pl.save(OUT / "planche.webp", quality=88)
# Avant / après : la capture du palier 12 (aire de la carte) contre le meilleur composite, même cadre.
cap = Image.open("docs/designs/village-loop/iter-01-captures-b/palier-12-jour.png").convert("RGB").crop((0, 1124, 1080, 2337)).resize((W, H), Image.LANCZOS)
cap.save(OUT / "avant_palier12.webp", quality=88)
