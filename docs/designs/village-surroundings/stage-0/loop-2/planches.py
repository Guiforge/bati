"""Étape 0, boucle 2 : détourage décontaminé, mesures contre la bible, 3 planches au zoom 0,6.
Lancer depuis la racine du dépôt : python3 -I docs/designs/village-surroundings/stage-0/loop-2/planches.py <tree.png> <nom> [trait_S]
[trait_S] : porte le contour extérieur à ce nombre de px à S par dilatation en #0F1518 (recette de style-refs/README.md).

Échelle en jeu : une case fait 384 px à S, 128 dp au zoom 1 (constants/isoSpec.json `S`, `cellDp`),
donc au zoom 0,6 sur un téléphone de densité 2,625 : 128 x 0,6 x 2,625 / 384 = 0,525 px d'écran par px de S.
Étalonnage de nuit, valeurs commitées à 891f6da2 (AmbianceCarte.tsx + constants/rawColors.ts) :
`isoNuitSol` rgba(46, 53, 82, 0.35) posé en aplat sur tout (sol, sprites, arbre). Le voile de bord
`isoNuitVoile` rgba(15, 42, 107, 0.42) ne touche que les 30 % extérieurs de la carte, et les flaques
`isoFlaque*` seulement autour des maisons allumées : les deux sont laissés de côté (planche au centre du village)."""
import json, pathlib, statistics, sys
from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(".")
A = ROOT / "assets/images/village/iso"
ANCHOR = ROOT / "docs/designs/village-loop/evidence/style-refs/ancre_heroes_hall_grand_jour.webp"
OUT = pathlib.Path(__file__).parent
PALETTE = ["#0F1518", "#2E3552", "#554232", "#6E5941", "#C8965E", "#DEC28B", "#4C7A3E", "#435A36"]
ECRAN = 128 * 0.6 * 2.625 / 384
POSE_S = 410  # largeur posée de l'arbre à S : une case et un peu de couronne
SOL = (0x6A, 0x74, 0x42)  # isoPreSec, le pré au soleil
NUIT, NUIT_A = (46, 53, 82), 0.35
INK = 45
lum = lambda p: 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]
d2 = lambda a, b: sum((x - y) ** 2 for x, y in zip(a[:3], b[:3]))
rgb = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
magenta = lambda p: p[0] > p[1] + 40 and p[2] > p[1] + 40


def detoure(im):
    """Alpha doux par distance au fond, couleur démélangée du fond, petites îles retirées, liseré magenta repeint à l'encre."""
    im = im.convert("RGBA"); w, h = im.size; px = im.load()
    bg = tuple(int(statistics.mean(px[c][i] for c in ((2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3)))) for i in range(3))
    lo, hi = 40, 110
    for y in range(h):
        for x in range(w):
            p = px[x, y]; d = d2(p, bg) ** 0.5
            if magenta(p) and d < 200:  # ombre portée sur le fond (défaut connu de l'ancre)
                px[x, y] = (0, 0, 0, 0); continue
            a = 0.0 if d <= lo else 1.0 if d >= hi else (d - lo) / (hi - lo)
            if a == 0:
                px[x, y] = (0, 0, 0, 0)
            elif a < 1:
                c = tuple(max(0, min(255, round((p[i] - (1 - a) * bg[i]) / a))) for i in range(3))
                px[x, y] = c + (round(255 * a),)
    # plus grande zone connexe et toute île de plus de 400 px
    seen, keep = bytearray(w * h), []
    for y0 in range(h):
        for x0 in range(w):
            if seen[y0 * w + x0] or px[x0, y0][3] == 0:
                continue
            stack, comp = [(x0, y0)], []
            seen[y0 * w + x0] = 1
            while stack:
                x, y = stack.pop(); comp.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and px[nx, ny][3]:
                        seen[ny * w + nx] = 1; stack.append((nx, ny))
            keep.append(comp)
    keep.sort(key=len, reverse=True)
    dropped = sum(len(c) for c in keep[1:] if len(c) < 400)
    for c in keep[1:]:
        if len(c) < 400:
            for q in c:
                px[q] = (0, 0, 0, 0)
    # liseré : tout pixel à 2 px du vide qui tire encore au magenta devient encre
    edge = lambda x, y: any(not (0 <= x + dx < w and 0 <= y + dy < h) or px[x + dx, y + dy][3] == 0
                            for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2))
    fixed = 0
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            if p[3] and magenta(p) and edge(x, y):
                px[x, y] = (15, 21, 24, p[3]); fixed += 1
    left = sum(1 for y in range(h) for x in range(w) if px[x, y][3] and magenta(px[x, y]) and edge(x, y))
    return im.crop(im.getbbox()), {"fond": "#%02X%02X%02X" % bg, "ilots_retires_px": dropped, "liseré_repeint_px": fixed, "liseré_restant_px": left}


def trait(im):
    w, h = im.size; px = im.load(); runs = []
    for line in [[(x, y) for x in range(w)] for y in range(0, h, 2)] + [[(x, y) for y in range(h)] for x in range(0, w, 2)]:
        idx = [i for i, q in enumerate(line) if px[q][3] > 128]
        if len(idx) < 20:
            continue
        for s, st in ((idx[0], 1), (idx[-1], -1)):
            n, i = 0, s
            while 0 <= i < len(line) and px[line[i]][3] > 128 and lum(px[line[i]]) < INK:
                n += 1; i += st
            if 0 < n < 60 and 0 <= i < len(line) and px[line[i]][3] > 128:
                runs.append(n)
    q = statistics.quantiles(runs, n=4)
    return statistics.median(runs), q[0], q[2]


def mesures(cut):
    w, h = cut.size; px = cut.load()
    k = POSE_S / w
    med, p25, p75 = trait(cut)
    couronne = [(x, y) for y in range(0, int(h * 0.6), 2) for x in range(0, w, 2) if px[x, y][3] > 200 and lum(px[x, y]) >= INK]
    cx = w // 2
    L = [lum(px[q]) for q in couronne if q[0] < cx]; R = [lum(px[q]) for q in couronne if q[0] >= cx]
    vals = sorted(couronne, key=lambda q: lum(px[q]))
    ombre = [px[q] for q in vals[: len(vals) // 4]]  # le quart le plus sombre de la couronne
    om = tuple(int(statistics.median(p[i] for p in ombre)) for i in range(3))
    brun = sum(1 for p in ombre if p[0] > p[2] + 15) / len(ombre)
    pal = [rgb(c) for c in PALETTE]
    dist = [min(d2(px[q], c) for c in pal) ** 0.5 for q in couronne]
    return {"trait_brut_px": med, "trait_brut_quartiles": [p25, p75], "trait_pose_S_px": round(med * k, 1),
            "trait_ecran_zoom06_px": round(med * k * ECRAN, 1),
            "lum_gauche": round(statistics.mean(L)), "lum_droite": round(statistics.mean(R)),
            "ombre_mediane": "#%02X%02X%02X" % om, "ombre_part_brune": round(brun, 2),
            "palette_ecart_moyen_rgb": round(statistics.mean(dist)), "palette_part_a_moins_de_40": round(sum(d < 40 for d in dist) / len(dist), 2)}


def sprite(p):
    im = Image.open(p).convert("RGBA")
    if p == ANCHOR:
        im, _ = detoure(im)
        return im
    return im.crop(im.getbbox())


def planche(items, nuit, chemin):
    ims = [(n, i.resize((max(1, round(i.width * s * ECRAN)), max(1, round(i.height * s * ECRAN))), Image.LANCZOS)) for n, i, s in items]
    gap = 30
    H = max(i.height for _, i in ims) + 40
    W = sum(i.width for _, i in ims) + gap * (len(ims) + 1)
    b = Image.new("RGBA", (W, H), SOL + (255,)); x = gap
    for _, i in ims:
        b.alpha_composite(i, (x, H - i.height - 6)); x += i.width + gap
    if nuit:  # AmbianceCarte : isoNuitSol en aplat sur tout
        b = Image.alpha_composite(b, Image.new("RGBA", b.size, NUIT + (round(255 * NUIT_A),)))
    dr = ImageDraw.Draw(b); x = gap
    for n, i in ims:
        dr.text((x, 4), n, fill=(240, 240, 240)); x += i.width + gap
    b.convert("RGB").save(chemin)


if __name__ == "__main__":
    src, nom = pathlib.Path(sys.argv[1]), sys.argv[2]
    cut, det = detoure(Image.open(src))
    if len(sys.argv) > 3:  # contour porté au trait visé : il manque (visé / k - brut) px de toile
        k = POSE_S / cut.width
        r = max(0, round(float(sys.argv[3]) / k - trait(cut)[0]))
        if r:
            pad = Image.new("RGBA", (cut.width + 2 * r, cut.height + 2 * r)); pad.alpha_composite(cut, (r, r))
            a = pad.getchannel("A").point(lambda v: 255 if v > 128 else 0).filter(ImageFilter.MaxFilter(2 * r + 1))
            ink = Image.new("RGBA", pad.size, (15, 21, 24, 0)); ink.putalpha(a)
            cut = Image.alpha_composite(ink, pad)
        det["dilatation_px_toile"] = r
    cut.save(OUT / f"{nom}.cut.webp", lossless=True)
    m = {**det, **mesures(cut)}
    # contrôle au zoom max : 48 px du bord gauche de la couronne, x8 au plus proche
    w, h = cut.size; px = cut.load()
    y0 = h // 3; x0 = next(x for x in range(w) if px[x, y0][3])
    z = Image.new("RGBA", (48, 48), (255, 0, 255, 255))
    z.alpha_composite(cut.crop((max(0, x0 - 16), y0 - 24, max(0, x0 - 16) + 48, y0 + 24)))
    z.resize((384, 384), Image.NEAREST).convert("RGB").save(OUT / f"{nom}.bord_x8.png")
    k = POSE_S / cut.width
    arbre = (f"arbre ({nom})", cut, k)
    planche([("ancre jour", sprite(ANCHOR), 1.0), arbre], False, OUT / f"{nom}.a_jour_ancre.png")
    planche([arbre, ("moulin solid nuit", sprite(A / "windmill/solid.nuit.webp"), 1.0)], True, OUT / f"{nom}.b_nuit_moulin.png")
    planche([arbre, ("forge solid nuit", sprite(A / "forge/solid.nuit.webp"), 1.0)], True, OUT / f"{nom}.c_nuit_forge.png")
    print(json.dumps(m, ensure_ascii=False))
