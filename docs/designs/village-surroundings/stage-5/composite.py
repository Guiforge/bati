"""Étape 5 : planches de contrôle des alentours peints, sans appareil (aucun appel FLUX).
Lancer depuis la racine du dépôt :
  python3 -I docs/designs/village-surroundings/stage-5/composite.py <monde.json> <alentours.json> <dossier>
<monde.json> : le vidage de l'étape 1 (stage-1/stub_rn.mjs) sur le code du jour ; <alentours.json> : dump_alentours.mjs.
Vue « Cadrer » de chaque palier (1080 x 1213 px, densité 2,625), de jour : le terrain peint, les chemins du code en
aplats (shortcut: sans leurs textures, comme stage-2/terrain.py), la forêt, les bâtiments et les accessoires triés par
le pied (shortcut: le tri de l'app est par emprise ; ici par y du pied, assez pour juger la composition)."""
import json, pathlib, re, sys
from PIL import Image, ImageDraw

MONDE = json.loads(pathlib.Path(sys.argv[1]).read_text())
AL = json.loads(pathlib.Path(sys.argv[2]).read_text())
OUT = pathlib.Path(sys.argv[3]); OUT.mkdir(parents=True, exist_ok=True)
A = pathlib.Path("assets/images/village/iso")
COTE, LARG, HAUT = MONDE["COTE"], MONDE["LARGEUR"], MONDE["HAUTEUR"]
TERRAIN = (132.1739130434783, -150.66022544283408, 827.8260869565217, 630.6602254428341)
K_DP = COTE / 384


def polys(d):
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


def planche(t, W=1080, H=1213, nom=None):
    P = AL[str(t)]["cadre"]; aw, ah = MONDE["aire"]; z = P["zoom"]; s = z * 2.625
    cx, cy = LARG / 2 - P["x"] / z, HAUT / 2 - P["y"] / z
    x0, y0 = cx - aw / z / 2, cy - ah / z / 2
    vers = lambda x, y: ((x - x0) * s, (y - y0) * s)
    im = Image.new("RGBA", (W, H), (0x50, 0x4C, 0x3F, 255))
    terr = Image.open(A / "sol/terrain.webp").convert("RGBA")
    a, b = vers(TERRAIN[0], TERRAIN[1]); c, d = vers(TERRAIN[2], TERRAIN[3])
    tw, th = round(c - a), round(d - b)
    if tw > 0 and th > 0:
        im.alpha_composite(terr.resize((tw, th), Image.BICUBIC), (round(a), round(b))) if a >= 0 and b >= 0 else \
            im.paste(terr.resize((tw, th), Image.BICUBIC), (round(a), round(b)), terr.resize((tw, th), Image.BICUBIC))
    dr = ImageDraw.Draw(im, "RGBA")
    TE = {0: "#7A5A38", 1: "#6E5434", 2: "#7C7058"}
    rgb = lambda hx: tuple(int(hx[i:i + 2], 16) for i in (1, 3, 5))
    vis = MONDE["parPalier"][str(t)]["visible"]; vu = lambda gx, gy: 0 <= gy < 20 and 0 <= gx < 20 and vis[gy][gx]
    mont = MONDE["parPalier"][str(t)]["montres"]
    bandes = [(e["d"], TE[e["classe"]]) for e in MONDE["aretes"] if vu(*e["de"]) and vu(*e["vers"])]
    bandes += [(x["d"], TE[0]) for x in MONDE["sentiers"] if x["code"] in mont]
    bandes += [(x["d"], TE[0]) for x in MONDE["sorties"] if vu(*x["fin"])] + [(MONDE["place"], TE[2])]
    for dd, col in bandes:
        for p in polys(dd): dr.polygon([vers(*q) for q in p], fill=rgb(col))
    objets = []
    for m in AL[str(t)]["masses"]:
        spr = Image.open(A / f"foret/{m['nom']}.webp").convert("RGBA")
        objets.append((m["y"] - 1000, spr, m["x"], m["y"], 168 * m["echelle"] / spr.width))  # sous les bâtiments
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
    for acc in AL[str(t)]["accessoires"]:
        spr = Image.open(A / f"accessoires/{acc['nom']}.webp").convert("RGBA")
        px, py = acc["pied"]
        kk = 57.6 / spr.width
        objets.append((py + 0.1, spr, px, py + (220 - 212) * kk, kk))
    for _, spr, x, y, k in sorted(objets, key=lambda o: o[0]):
        w_, h_ = max(1, round(spr.width * k * s)), max(1, round(spr.height * k * s))
        px, py = vers(x, y)
        if px + w_ / 2 < 0 or px - w_ / 2 > W or py < 0 or py - h_ > H: continue
        im.alpha_composite(spr.resize((w_, h_), Image.LANCZOS), (round(px - w_ / 2), round(py - h_)))
    im.convert("RGB").save(OUT / (nom or f"palier{t}.webp"), quality=86)


for t in (1, 6, 12):
    planche(t)
