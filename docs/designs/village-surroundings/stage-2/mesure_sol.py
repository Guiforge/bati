"""Étape 2 : mesure les variantes de sol contre le masque, et monte la planche.
Lancer depuis la racine du dépôt : python3 -I docs/designs/village-surroundings/stage-2/mesure_sol.py <boucle>

Pour chaque variante : la moyenne de couleur de chaque classe du masque dans la peinture, puis la part
des pixels plus proches de la moyenne de leur classe que de toute autre (le masque se lit-il encore),
le rappel et la précision des chemins, la part d'encre (luminance < 45), la part dans la palette de la
bible, et la luminance du centre contre celle du bord (centre calme et clair, bords plus sombres)."""
import json, pathlib, statistics, sys
from PIL import Image, ImageDraw

B = sys.argv[1]

CAND = pathlib.Path.home() / ".cache/bati-art-loop/iso/surroundings/stage2" / f"loop-{B}"
OUT = pathlib.Path(f"docs/designs/village-surroundings/stage-2/loop-{B}")
cadre = json.loads((OUT / "cadre.json").read_text())
S1 = pathlib.Path(cadre.get("masques", "docs/designs/village-surroundings/stage-1/loop-2"))
MES = json.loads((S1 / "mesures.json").read_text()); CL = MES["classes"]
x0, y0 = MES["monde"]["x0_dp"], MES["monde"]["y0_dp"]
c = cadre["cadre_dp"]; W, H = cadre["taille_px"]
lab = Image.open(S1 / "masque_palier12.png").crop(tuple(round(v) for v in (c[0] - x0, c[1] - y0, c[2] - x0, c[3] - y0))).resize((W, H), Image.NEAREST)
L = lab.load()
PAL = [(int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)) for h in
       ("#0F1518", "#2E3552", "#554232", "#6E5941", "#C8965E", "#DEC28B", "#4C7A3E", "#435A36")]
lum = lambda p: 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]
d2 = lambda a, b: sum((x - y) ** 2 for x, y in zip(a, b))
res = {}
for f in sorted(CAND.glob("sol_v*.png")):
    im = Image.open(f).convert("RGB"); P = im.load()
    pts = [(x, y) for y in range(0, H, 3) for x in range(0, W, 3)]
    par = {}
    for q in pts: par.setdefault(L[q], []).append(P[q])
    moy = {k: tuple(statistics.mean(p[i] for p in v) for i in range(3)) for k, v in par.items()}
    bon = sum(1 for q in pts if min(moy, key=lambda k: d2(P[q], moy[k])) == L[q])
    ch = CL.index("chemin")
    pred = [min(moy, key=lambda k: d2(P[q], moy[k])) == ch for q in pts]
    vrai = [L[q] == ch for q in pts]
    tp = sum(a and b for a, b in zip(pred, vrai))
    centre = [lum(P[x, y]) for x, y in pts if abs(x - W / 2) < W / 6 and abs(y - H / 2) < H / 6]
    bord = [lum(P[x, y]) for x, y in pts if min(x, W - x) < W / 8 or min(y, H - y) < H / 8]
    res[f.stem] = {"masque_lisible": round(bon / len(pts), 2), "chemins_rappel": round(tp / max(1, sum(vrai)), 2),
                   "chemins_precision": round(tp / max(1, sum(pred)), 2), "encre": round(sum(lum(P[q]) < 45 for q in pts) / len(pts), 3),
                   "palette_40": round(sum(min(d2(P[q], p) for p in PAL) < 1600 for q in pts) / len(pts), 2),
                   "lum_centre": round(statistics.mean(centre)), "lum_bord": round(statistics.mean(bord))}
(OUT / "mesures.json").write_text(json.dumps(res, indent=1))
print(json.dumps(res, indent=1))

# Planche : le masque en aplats, puis les variantes, à mi-taille, avec leur nom.
ims = [("masque", Image.open(CAND / "blockout_palier12.png").convert("RGB"))] + [(f.stem, Image.open(f).convert("RGB")) for f in sorted(CAND.glob("sol_v*.png"))]
w, h = W // 2, H // 2
pl = Image.new("RGB", (len(ims) * (w + 10), h + 24), (20, 20, 20)); dr = ImageDraw.Draw(pl)
for k, (n, i) in enumerate(ims):
    pl.paste(i.resize((w, h), Image.LANCZOS), (k * (w + 10), 24)); dr.text((k * (w + 10) + 4, 6), n, fill=(230, 230, 230))
pl.save(OUT / "planche.webp", quality=88)
for n, i in ims[1:]:  # chaque variante en pleine taille, pour juger le pinceau
    i.save(OUT / f"{n}.webp", quality=90)
