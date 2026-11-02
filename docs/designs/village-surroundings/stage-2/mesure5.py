"""Étape 2, boucle 5 : mesures des variantes (et de la mosaïque) contre leurs aplats, comme terrain.py en boucle 4.
Lancer depuis la racine du dépôt : python3 -I docs/designs/village-surroundings/stage-2/mesure5.py <aplats.png> <image.png> [...]"""
import json, statistics, sys
from PIL import Image

TERRAIN = ["#6A7442", "#8A8450", "#4A6A7C", "#4A4632", "#3A3628"]
rgb = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
PAL = [rgb(h) for h in ("#0F1518", "#2E3552", "#554232", "#6E5941", "#C8965E", "#DEC28B", "#4C7A3E", "#435A36", "#6A7442")]
d2 = lambda a, b: sum((x - y) ** 2 for x, y in zip(a, b))
lum = lambda p: 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]
ap = Image.open(sys.argv[1]).convert("RGB")
res = {}
for f in sys.argv[2:]:
    im = Image.open(f).convert("RGB"); W, H = im.size
    k = ap.resize((W, H), Image.NEAREST).load(); P = im.load()
    pts = [(x, y) for y in range(0, H, max(3, H // 300)) for x in range(0, W, max(3, W // 300))]
    cls = {q: min(range(5), key=lambda i: d2(k[q], rgb(TERRAIN[i]))) for q in pts}
    par = {}
    for q in pts: par.setdefault(cls[q], []).append(P[q])
    moy = {c: tuple(statistics.mean(p[i] for p in v) for i in range(3)) for c, v in par.items()}
    pred = {q: min(moy, key=lambda c: d2(P[q], moy[c])) for q in pts}
    tp = sum(1 for q in pts if pred[q] == 2 and cls[q] == 2)
    res[f.rsplit("/", 1)[-1]] = {
        "masque_lisible": round(sum(pred[q] == cls[q] for q in pts) / len(pts), 2),
        "riviere_rappel": round(tp / max(1, sum(cls[q] == 2 for q in pts)), 2),
        "riviere_precision": round(tp / max(1, sum(pred[q] == 2 for q in pts)), 2),
        "encre": round(sum(lum(P[q]) < 45 for q in pts) / len(pts), 3),
        "palette9_40": round(sum(min(d2(P[q], p) for p in PAL) < 1600 for q in pts) / len(pts), 2)}
print(json.dumps(res, indent=1))
