"""Étape 1 : masques de blockout en coordonnées du monde, depuis les vraies données du village.

Entrée : le vidage de dump_monde.ts (le code de l'app lu tel quel, commit 891f6da2).
Sortie, dans <dossier> : un masque par palier montré (1, 6, 12), sa légende, la carte de densité,
les calques posés sur les captures, et mesures.json (alignement, ajout seul, groupes de forêt).

Lancer depuis la racine du dépôt :
  python3 -I docs/designs/village-surroundings/stage-1/masques.py <monde.json> <dossier>

Monde : dp de la carte au zoom 1 (carteDemo.ts `ecranXY`, COTE = 48 dp par case, coin gauche de la
grille en x = 0). Un pixel de masque = 1 dp, origine (X0, Y0). Un autre cadrage ne change rien aux
masques : seul le calque sur capture dépend de la caméra."""
import json, math, pathlib, re, sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = pathlib.Path(".")
CAPTURES = ROOT / "docs/designs/village-loop/iter-01-captures-b"
D = json.loads(pathlib.Path(sys.argv[1]).read_text())
OUT = pathlib.Path(sys.argv[2]); OUT.mkdir(parents=True, exist_ok=True)
COTE, LARG, HAUT = D["COTE"], D["LARGEUR"], D["HAUTEUR"]
ETENDUE = D["parPalier"]["12"]["etendue"]  # le monde que la caméra peut montrer au palier 12, zoom plancher
X0, Y0 = math.floor(ETENDUE["x0"]) - 8, math.floor(ETENDUE["y0"]) - 8
W, H = math.ceil(ETENDUE["x1"]) + 8 - X0, math.ceil(ETENDUE["y1"]) + 8 - Y0
PX_PAR_DP = 2.625
AIRE_HAUT = 1124  # première ligne de la carte dans les captures 1080 x 2400 (barre de dev au-dessus)
MONTRES = (1, 6, 12)

# Classes, de la plus basse à la plus haute (la suivante peint par-dessus).
CLASSES = [
    ("pre", (120, 140, 80)), ("champ", (214, 190, 90)), ("foret", (30, 80, 40)), ("bordure", (20, 30, 30)),
    ("desordre", (230, 120, 200)), ("place", (240, 220, 160)), ("chemin", (190, 150, 100)),
    ("eau", (60, 120, 200)), ("batiment", (200, 50, 40)),
]
IDX = {n: i for i, (n, _) in enumerate(CLASSES)}

ecran = lambda gx, gy: ((gx - gy) * COTE / 2 + LARG / 2, (gx + gy) * COTE / 4)
monde = lambda x, y: (x - X0, y - Y0)  # dp vers pixel du masque


def losange(gx, gy, w=1, h=1):
    return [ecran(gx, gy), ecran(gx + w, gy), ecran(gx + w, gy + h), ecran(gx, gy + h)]


def sous_chemins(d):
    """Les sous-chemins fermés d'un `d` SVG (M, L, Q, Z) en listes de points dp ; Q découpé en 8."""
    polys, cur, pos = [], [], (0.0, 0.0)
    for cmd, args in re.findall(r"([MLQZ])([^MLQZ]*)", d):
        n = [float(v) for v in re.findall(r"-?\d+(?:\.\d+)?(?:e-?\d+)?", args)]
        if cmd == "M":
            if cur: polys.append(cur)
            pos = (n[0], n[1]); cur = [pos]
            for i in range(2, len(n), 2): pos = (n[i], n[i + 1]); cur.append(pos)
        elif cmd == "L":
            for i in range(0, len(n), 2): pos = (n[i], n[i + 1]); cur.append(pos)
        elif cmd == "Q":
            for i in range(0, len(n), 4):
                (cx, cy), (ex, ey) = (n[i], n[i + 1]), (n[i + 2], n[i + 3])
                for k in range(1, 9):
                    t = k / 8
                    cur.append(((1 - t) ** 2 * pos[0] + 2 * (1 - t) * t * cx + t * t * ex, (1 - t) ** 2 * pos[1] + 2 * (1 - t) * t * cy + t * t * ey))
                pos = (ex, ey)
        elif cmd == "Z":
            if cur: polys.append(cur)
            cur = []
    if cur: polys.append(cur)
    return [p for p in polys if len(p) >= 3]


def geometrie(t):
    """Polygones dp par classe précise, au palier t."""
    P = D["parPalier"][str(t)]
    vu = lambda gx, gy: 0 <= gy < 20 and 0 <= gx < 20 and P["visible"][gy][gx]
    g = {n: [] for n, _ in CLASSES}
    for code in P["montres"]:
        g["batiment"] += [losange(*c) for c in D["emplacements"][code]["cases"]]
        for s in D["sentiers"]:
            if s["code"] == code: g["chemin"] += sous_chemins(s["d"])
    for a in D["aretes"]:
        if vu(*a["de"]) and vu(*a["vers"]): g["chemin"] += sous_chemins(a["d"])
    for s in D["sorties"]:
        if vu(*s["fin"]): g["chemin"] += sous_chemins(s["d"])
    for gy, ligne in enumerate(D["sol"]):
        for gx, c in enumerate(ligne):
            if vu(gx, gy) and c in ("eau", "cascade"): g["eau"].append(losange(gx, gy))
            if vu(gx, gy) and c == "pont": g["chemin"].append(losange(gx, gy))
    # La rivière fait partie du monde dès le palier 1, sur toute sa colonne (gx 2), dans la grille comme dehors :
    # la forêt qui recule ne la découvre pas en morceaux.
    hors = [gy for gy in range(-16, 36) if not vu(2, gy)]
    pont = lambda gy: 0 <= gy < 20 and D["sol"][gy][2] == "pont"  # le pont est là dès le palier 1 lui aussi
    g["eau"] += [losange(2, gy) for gy in hors if not pont(gy)]
    g["chemin"] += [losange(2, gy) for gy in hors if pont(gy)]
    g["place"] = sous_chemins(D["place"])
    # Champs : ceux de l'app (champs.ts `champsDe`) qui restent hors de l'île finie, donc jamais mangés.
    for bx, by, bw, bh in P["champs"]["blocs"]:
        if not any(0 <= x < 20 and 0 <= y < 20 for x in range(bx, bx + bw) for y in range(by, by + bh)):
            g["champ"].append(losange(bx, by, bw, bh))
    # Désordre : l'anneau d'une case autour de chaque bâtiment debout, sur l'herbe qui le restera au palier 12.
    pris12 = {tuple(c) for code in D["parPalier"]["12"]["montres"] for c in D["emplacements"][code]["cases"]}
    for code in P["montres"]:
        cases = {tuple(c) for c in D["emplacements"][code]["cases"]}
        anneau = {(x + dx, y + dy) for x, y in cases for dx in (-1, 0, 1) for dy in (-1, 0, 1)} - cases
        for x, y in anneau:
            calme = math.hypot(x + 0.5 - 10.5, y + 0.5 - 10.5) < 3  # la place reste calme : pas de désordre à moins de 3 cases du feu
            if vu(x, y) and not calme and (x, y) not in pris12 and D["sol"][y][x] in ("herbe", "arbre", "rochers", "bosquet"):
                g["desordre"].append(losange(x, y))
    return g


def peindre(polys, img, couleur, f=monde):
    dr = ImageDraw.Draw(img)
    for p in polys:
        dr.polygon([f(*q) for q in p], fill=couleur)


def masque_classe(polys):
    m = Image.new("L", (W, H), 0); peindre(polys, m, 255); return m


# --- zones douces, une seule fois (fixes dans le monde : elles ne bougent pas avec le palier) ---------
def dist_grille(x, y):
    """Distance dp hors du losange de la grille finie (monde.ts `distIle`), négative dedans."""
    a, b = LARG / 2, HAUT / 2
    u = abs(x - a) / a + abs(y - b) / b
    return (u - 1) * (a * b) / math.hypot(a, b)


CLAIRIERE, CLAIRIERE_MIN = 80, 28  # monde.ts : la clairière s'élargit avec l'île, de 28 à 80 dp
PROFONDEUR = 300  # bordure fixe : 80 + 300 dp au-delà de l'île finie (environ 6 cases de forêt au palier 12)
BANDE_BORD = 72  # la bordure tient au moins 1,5 case contre le bord du monde
bordure, densite = Image.new("L", (W, H), 0), Image.new("L", (W, H), 0)
pb, pd = bordure.load(), densite.load()
cx, cy = ecran(10.5, 10.5)  # le feu de camp, cœur calme
for j in range(0, H):
    y = j + Y0
    for i in range(0, W):
        x = i + X0
        d = dist_grille(x, y)
        bord = min(x - ETENDUE["x0"], ETENDUE["x1"] - x, y - ETENDUE["y0"], ETENDUE["y1"] - y)
        if d >= CLAIRIERE + PROFONDEUR or bord < BANDE_BORD:
            pb[i, j] = 255
        # densité : 0 au feu de camp, 255 à la bordure ; la grille finie compte pour 60 % du chemin
        r = math.hypot((x - cx) / LARG, (y - cy) / HAUT * 2)
        pd[i, j] = 255 if pb[i, j] else min(255, int(255 * (0.6 * min(1.0, r / 0.5) + 0.4 * max(0.0, d) / (CLAIRIERE + PROFONDEUR))))

# Clairières de la forêt, depuis le feu de camp vers le bord du monde : la route (les deux sens), la
# rivière (les deux sens) et 4 trouées sur les diagonales de la grille, soit 8 coupes et 8 masses au plus.
couloirs = Image.new("L", (W, H), 0); dr = ImageDraw.Draw(couloirs)


def trouee(a, b, largeur, graine):
    """Une clairière de a vers b (dp) : un chapelet de disques qui serpente et respire, pas une avenue droite."""
    lx, ly = b[0] - a[0], b[1] - a[1]; n = math.hypot(lx, ly); nx, ny = -ly / n, lx / n
    for k in range(121):
        t = k / 120
        o = 0.5 * COTE * math.sin(12.0 * t + graine) + 0.25 * COTE * math.sin(26.0 * t + 2 * graine)
        r = largeur / 2 * (0.75 + 0.35 * math.sin(18.0 * t + 3 * graine))
        x, y = a[0] + lx * t + nx * o, a[1] + ly * t + ny * o
        dr.ellipse([monde(x - r, y - r), monde(x + r, y + r)], fill=255)


COUPES = [((1, 0), 2.0), ((-1, 0), 2.0), ((0, 1), 2.0), ((0, -1), 2.0), ((1, 1), 1.5), ((-1, -1), 1.5), ((1, -1), 1.5), ((-1, 1), 1.5)]
for k, ((sx, sy), larg) in enumerate(COUPES):
    if sy == 0:  # la route, sur la rangée gy 10
        a, b = ecran(10.5, 10.5), ecran(10.5 + 40 * sx, 10.5)
    elif sx == 0:  # la rivière, sur la colonne gx 2
        a, b = ecran(2.5, 10.5), ecran(2.5, 10.5 + 40 * sy)
    else:
        a, b = ecran(10.5, 10.5), ecran(10.5 + 30 * sx, 10.5 + 30 * sy)
    trouee(a, b, larg * COTE, k)


def proche(t, r):
    """L'île du palier t grossie de r dp (monde.ts `distCases` <= r) : chaque case devient un losange plus grand."""
    m = Image.new("L", (W, H), 0); dm = ImageDraw.Draw(m)
    k = 1 + r / ((COTE / 2) * (COTE / 4) / math.hypot(COTE / 2, COTE / 4))
    for gy, ligne in enumerate(D["parPalier"][str(t)]["visible"]):
        for gx, v in enumerate(ligne):
            if v:
                ccx, ccy = ecran(gx + 0.5, gy + 0.5); a, b = COTE / 2 * k, COTE / 4 * k
                dm.polygon([monde(ccx - a, ccy), monde(ccx, ccy - b), monde(ccx + a, ccy), monde(ccx, ccy + b)], fill=255)
    return m


def foret_de(t):
    """La forêt du palier t : entre la clairière de l'île et la bordure, hors clairières et champs. Elle recule
    quand l'île grandit : la seule exception à « rien ne disparaît » (décision de Guillaume, 01/11)."""
    n = sum(map(sum, D["parPalier"][str(t)]["visible"]))
    clair = CLAIRIERE_MIN + (CLAIRIERE - CLAIRIERE_MIN) * min(1.0, n / 400)
    f = ImageChops.invert(ImageChops.lighter(proche(t, clair), bordure))
    f = ImageChops.subtract(ImageChops.subtract(f, couloirs), masque_classe(geometrie(t)["champ"]))
    return sans_eclats(f)


def composantes(m, seuil=4000):
    """Zones connexes (4-voisins) de plus de `seuil` px, sur une copie réduite x4 pour aller vite."""
    p = m.resize((W // 4, H // 4), Image.NEAREST); w, h = p.size; a = p.load()
    vu, out = bytearray(w * h), []
    for j in range(h):
        for i in range(w):
            if a[i, j] and not vu[j * w + i]:
                pile, n = [(i, j)], 0; vu[j * w + i] = 1
                while pile:
                    x, y = pile.pop(); n += 1
                    for u, v in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                        if 0 <= u < w and 0 <= v < h and a[u, v] and not vu[v * w + u]:
                            vu[v * w + u] = 1; pile.append((u, v))
                out.append(n * 16)
    return sorted([n for n in out if n >= seuil], reverse=True)


def sans_eclats(m, seuil=15000):
    """Retire les bouts de forêt de moins de `seuil` px (environ 26 cases) : une masse se lit, un éclat non."""
    p = m.resize((W // 4, H // 4), Image.NEAREST); w, h = p.size; a = p.load()
    garde = Image.new("L", (w, h), 0); g = garde.load(); vu = bytearray(w * h)
    for j in range(h):
        for i in range(w):
            if a[i, j] and not vu[j * w + i]:
                pile, comp = [(i, j)], []; vu[j * w + i] = 1
                while pile:
                    x, y = pile.pop(); comp.append((x, y))
                    for u, v in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                        if 0 <= u < w and 0 <= v < h and a[u, v] and not vu[v * w + u]:
                            vu[v * w + u] = 1; pile.append((u, v))
                if len(comp) * 16 >= seuil:
                    for q in comp: g[q] = 255
    return ImageChops.multiply(m, garde.resize((W, H), Image.NEAREST))


def fermee(b):
    """La bordure ferme-t-elle le monde : depuis le feu de camp, sans la traverser, on n'atteint jamais le cadre."""
    p = b.resize((W // 4, H // 4), Image.NEAREST); w, h = p.size; a = p.load()
    i0, j0 = int((cx - X0) / 4), int((cy - Y0) / 4)
    vu = bytearray(w * h); pile = [(i0, j0)]; vu[j0 * w + i0] = 1
    while pile:
        x, y = pile.pop()
        if x in (0, w - 1) or y in (0, h - 1):
            return False
        for u, v in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if not a[u, v] and not vu[v * w + u]:
                vu[v * w + u] = 1; pile.append((u, v))
    return True


G12 = geometrie(12)
# Ce que le palier 12 prend au sol : un accessoire posé là disparaîtrait plus tard, donc jamais de désordre dessus.
RESERVE12 = masque_classe(G12["chemin"] + G12["place"] + G12["eau"] + G12["batiment"])


def labels(t):
    g = geometrie(t)
    lab = Image.new("L", (W, H), IDX["pre"])
    for n, _ in CLASSES[1:]:
        if n == "foret": lab.paste(IDX["foret"], mask=FORETS[t])
        elif n == "bordure": lab.paste(IDX["bordure"], mask=bordure)
        elif n == "desordre": lab.paste(IDX[n], mask=ImageChops.subtract(masque_classe(g[n]), RESERVE12))
        else: peindre(g[n], lab, IDX[n])
    return lab, g


PAL = [c for _, col in CLASSES for c in col] + [0] * (768 - 3 * len(CLASSES))
FORETS = {t: foret_de(t) for t in range(1, 13)}
mes = {"monde": {"x0_dp": X0, "y0_dp": Y0, "w": W, "h": H, "dp_par_px": 1, "etendue_palier12": ETENDUE},
       "classes": [n for n, _ in CLASSES], "foret_groupes_px": {t: composantes(FORETS[t], 1) for t in MONTRES},
       "bordure_fermee": fermee(bordure)}
labs = {}
for t in range(1, 13):
    labs[t], _ = labels(t)
# Ajout seul : un pixel d'une classe autre que le pré au palier t garde sa classe à tout palier suivant.
perte, detail, avance = {}, {}, {}
for t in range(1, 12):
    a, b = labs[t].load(), labs[t + 1].load(); n = 0
    for j in range(0, H, 2):
        for i in range(0, W, 2):
            # un bâtiment qui pousse sur le sol, c'est de la croissance ; la lisière qui recule aussi (exception écrite)
            if a[i, j] not in (IDX["pre"], IDX["foret"]) and a[i, j] != b[i, j] and b[i, j] != IDX["batiment"]:
                n += 1; k = f"{CLASSES[a[i, j]][0]}>{CLASSES[b[i, j]][0]}"; detail[k] = detail.get(k, 0) + 4
            if a[i, j] != IDX["foret"] and b[i, j] == IDX["foret"]:  # la forêt n'avance jamais
                avance[t] = avance.get(t, 0) + 4
    perte[f"{t}->{t + 1}"] = n * 4
mes["ajout_seul_px_perdus"] = perte
mes["ajout_seul_detail"] = detail
mes["foret_qui_avance_px"] = avance

for t in MONTRES:
    lab = labs[t].copy(); lab.putpalette(PAL); lab.save(OUT / f"masque_palier{t}.png")
ImageChops.invert(densite).save(OUT / "densite.png")  # blanc : calme et clair ; noir : chargé et sombre

# Légende
leg = Image.new("RGB", (260, 24 * len(CLASSES) + 8), (20, 20, 20)); dl = ImageDraw.Draw(leg)
for k, (n, col) in enumerate(CLASSES):
    dl.rectangle((8, 8 + 24 * k, 28, 26 + 24 * k), fill=col); dl.text((36, 12 + 24 * k), n, fill=(230, 230, 230))
leg.save(OUT / "legende.png")


# --- calques sur les captures ---------------------------------------------------------------------
def vers_capture(t, dx=0.0, dy=0.0, s=1.0):
    P = D["parPalier"][str(t)]; z = P["cadre"]["zoom"] * s; aw, ah = D["aire"]
    tx, ty = P["cadre"]["x"], P["cadre"]["y"]
    return lambda x, y: ((aw / 2 + tx + z * (x - LARG / 2)) * PX_PAR_DP + dx, (ah / 2 + ty + z * (y - HAUT / 2)) * PX_PAR_DP + AIRE_HAUT + dy)


def verdeur(im):
    """g - (r + b) / 2 par pixel : l'herbe est verte, les chemins et la place ne le sont pas."""
    r, g, b = im.split()
    return ImageChops.subtract(g, ImageChops.add(r, b, scale=2.0), offset=128)


align = {}
for t in MONTRES:
    cap = Image.open(CAPTURES / f"palier-{t}-jour.png").convert("RGB")
    g = geometrie(t)
    v = verdeur(cap); vp = v.load()
    sol_plat = g["chemin"] + g["place"]

    def score(dx, dy, s):
        m = Image.new("L", cap.size, 0); peindre(sol_plat, m, 255, vers_capture(t, dx, dy, s))
        m = m.crop((0, AIRE_HAUT, 1080, 2337))
        bbox = m.getbbox()
        if not bbox: return 999, 0
        hist = v.crop((0, AIRE_HAUT, 1080, 2337)).histogram(mask=m)
        n = sum(hist)
        return sum(k * c for k, c in enumerate(hist)) / n, n

    base, n = score(0, 0, 1)
    meilleur = min(((score(dx, dy, s)[0], dx, dy, s) for s in (0.97, 1.0, 1.03) for dx in range(-12, 13, 3) for dy in range(-12, 13, 3)))
    # contraste : la même mesure sur l'anneau de 12 px autour des chemins (de l'herbe, en principe)
    m = Image.new("L", cap.size, 0); peindre(sol_plat, m, 255, vers_capture(t))
    anneau = ImageChops.subtract(m.filter(ImageFilter.MaxFilter(25)), m)
    ha = v.histogram(mask=anneau); herbe = sum(k * c for k, c in enumerate(ha)) / max(1, sum(ha))
    align[t] = {"verdeur_chemins_a_0": round(base - 128, 1), "verdeur_anneau_herbe": round(herbe - 128, 1),
                "meilleur_decalage_px": [meilleur[1], meilleur[2]], "meilleure_echelle": meilleur[3],
                "verdeur_au_meilleur": round(meilleur[0] - 128, 1), "px_mesures": n}
    # calque : capture, puis les classes précises en contour, forêt et bordure en voile
    lab = labs[t]; f = vers_capture(t)
    zone = cap.copy(); calque = Image.new("RGBA", cap.size, (0, 0, 0, 0)); dc = ImageDraw.Draw(calque)
    # zones douces : on renvoie le masque monde vers l'écran par une affine
    z = D["parPalier"][str(t)]["cadre"]["zoom"] * PX_PAR_DP
    ox, oy = f(X0, Y0)
    inv = (1 / z, 0, -ox / z, 0, 1 / z, -oy / z)
    for n, alpha in (("foret", 110), ("bordure", 150), ("champ", 90)):
        mm = (FORETS[t] if n == "foret" else bordure if n == "bordure" else masque_classe(g["champ"])).transform(cap.size, Image.AFFINE, inv, Image.NEAREST)
        couche = Image.new("RGBA", cap.size, CLASSES[IDX[n]][1] + (alpha,)); couche.putalpha(mm.point(lambda q: alpha if q else 0))
        calque = Image.alpha_composite(calque, couche); dc = ImageDraw.Draw(calque)
    for n in ("desordre", "place", "chemin", "eau", "batiment"):
        for p in g[n]:
            dc.polygon([f(*q) for q in p], outline=CLASSES[IDX[n]][1] + (255,), width=3)
    zone = Image.alpha_composite(zone.convert("RGBA"), calque).crop((0, AIRE_HAUT, 1080, 2337))
    zone.convert("RGB").save(OUT / f"calque_palier{t}.webp", quality=85)
mes["alignement"] = align
(OUT / "mesures.json").write_text(json.dumps(mes, indent=1, ensure_ascii=False))
print(json.dumps(mes, indent=1, ensure_ascii=False))
