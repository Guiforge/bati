"""Python port of components/village/iso/rues.ts (hasard, noeud, serpente, SORTIES), bit for bit, and the frozen
tile list of the south road (loupe BC). Dev only, stdlib only.

    python3 -I scripts/iso/rues_port.py            writes docs/designs/village-loop/loupes/bc/route_tuiles.json

__tests__/iso-rues.test.ts checks the TS against that file, scripts/iso/test_loupes.py checks this port against it:
the two agree through the file. Rewrite the file only when the road moves on purpose.
"""
import json
import math
import pathlib

M32 = 0xFFFFFFFF
RUES_GRAINE = 11


def imul(a, b):
    return (a * b) & M32


def hasard(gx, gy, sel, graine):
    """solVarie.hasard, bit for bit."""
    h = imul((gx + 1) & M32, 0x9E3779B1) ^ imul((gy + 1) & M32, 0x85EBCA6B)
    h ^= imul((sel + 1 + graine * 31) & M32, 0xC2B2AE35)
    h ^= h >> 15
    h = imul(h, 0x2C1B3C6D)
    h ^= h >> 12
    h = imul(h, 0x297A2D39)
    h ^= h >> 15
    return (h & M32) / 2**32


def meandre(t, ligne, sel):
    return 0.2 * math.sin(2 * math.pi * t / 7 + 2 * math.pi * hasard(ligne, sel, 68, RUES_GRAINE))


def noeud(gx, gy):
    """rues.ts noeud: a street cell's node, grid units."""
    return (gx + 0.5 + (hasard(gx, gy, 60, RUES_GRAINE) - 0.5) * 0.24 + meandre(gy, gx, 1),
            gy + 0.5 + (hasard(gx, gy, 61, RUES_GRAINE) - 0.5) * 0.24 + meandre(gx, gy, 2))


def dp(g):
    """carteDemo.ecranXY, map dp."""
    return (g[0] - g[1]) * 24 + 480, (g[0] + g[1]) * 12


def dans_carte(g):
    x, y = dp(g)
    return 20 < x < 960 - 20 and 20 < y < 480 - 20


def serpente(depart, d, derive, sel, n):
    """rues.ts serpente, bit for bit (the west and east exits)."""
    pts = [depart]
    x, y = depart
    for k in range(1, math.floor(n) + 1):
        biais = derive + (hasard(sel, k, 70, RUES_GRAINE) - 0.5) * 0.5
        x += 0.8 * (d[0] + abs(d[1]) * biais)
        y += 0.8 * (d[1] + abs(d[0]) * biais)
        if not dans_carte((x, y)):
            break
        pts.append((x, y))
    return pts


PASSAGES_SUD = [(13, 20.6), (15.5, 21), (19, 21.5), (22, 22), (24, 25), (27, 26), (29, 30), (33, 32), (36, 36)]


def courbe(pts, n=5):
    """rues.ts courbe: Catmull-Rom, first tangent along +gy, n samples a segment."""
    p0, pn, pm = pts[0], pts[-1], pts[-2]
    P = [(p0[0], p0[1] - 1)] + list(pts) + [(2 * pn[0] - pm[0], 2 * pn[1] - pm[1])]
    out = [p0]
    for i in range(1, len(P) - 2):
        a, b, c, d = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(1, n + 1):
            t = k / n
            out.append(tuple(0.5 * (2 * b[j] + (-a[j] + c[j]) * t + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * t * t
                                    + (-a[j] + 3 * b[j] - 3 * c[j] + d[j]) * t ** 3) for j in (0, 1)))
    return out


def sortie(gx, gy):
    """rues.ts SORTIES for the exit (gx, gy): the road and the track it forks into (none for the south road)."""
    depart = noeud(gx, gy)
    if gx not in (0, 19):
        return courbe([depart] + PASSAGES_SUD), []
    cap = (-1, 0) if gx == 0 else (1, 0)
    route = serpente(depart, cap, (hasard(gx, gy, 71, RUES_GRAINE) - 0.5) * 0.3, gx + gy + 1, 8 / 0.8)
    i_f = min(len(route) - 1, round(3.5 / 0.8))
    cote = -1 if hasard(gx, gy, 72, RUES_GRAINE) < 0.5 else 1
    voie = serpente(route[i_f], cap, cote * 0.55, gx + gy + 5, (8 - 3.5) / 0.8)
    return route, voie


ROOT = pathlib.Path(__file__).resolve().parents[2]
BOUTS = [(0, 10), (19, 10), (12, 19)]
PORTE_SUD = (12, 16)
# champs.ts PARCELLES, [gx0, gy0, gx1, gy1] in cells: wheat, a vegetable plot and a pasture, the wheat left of the road
PARCELLES = {"ble": [14, 23, 19.5, 26.5], "potager": [22, 14, 27, 18], "paturage": [30, 21.5, 34.5, 25.5]}


def cases(line):
    """The cells a polyline crosses, in order, sampled every 0.1 cell (no cell twice in a row)."""
    seq = []
    for a, b in zip(line, line[1:]):
        n = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1]) / 0.1))
        for k in range(n + 1):
            c = (math.floor(a[0] + (b[0] - a[0]) * k / n), math.floor(a[1] + (b[1] - a[1]) * k / n))
            if not seq or seq[-1] != c:
                seq.append(c)
    return [list(c) for c in seq]


def tuiles():
    """The frozen list: per exit its road and fork cells, and the south gate street, with the road's nodes."""
    out = {}
    for gx, gy in BOUTS:
        route, voie = sortie(gx, gy)
        out[f"{gx},{gy}"] = {
            "route": cases(route),
            "voie": cases(voie),
            "noeuds_route": [[round(a, 6), round(b, 6)] for a, b in route],
        }
    return out


if __name__ == "__main__":
    layout = json.loads((ROOT / "constants/isoLayout.json").read_text())
    rue = [[12, k] for k in range(PORTE_SUD[1], 20)]
    doc = {
        "doc": "Frozen tile list of the south road (loupe BC), from components/village/iso/rues.ts SORTIES via "
        "scripts/iso/rues_port.py. rue = the gate street (12, 16) to (12, 19), island cells; route = the road from "
        "(12, 19) screen-down to the painted ground's tip (gx + gy < 72), voie = the track it forks into; the west and "
        "east exits are listed to prove they did not move. Cells are [gx, gy]; paliers_rue = the tier each gate-street cell joins the island; parcelles = champs.ts PARCELLES, the wheat, the vegetable plot and the pasture, [gx0, gy0, gx1, gy1].",
        "gate": list(PORTE_SUD),
        "rue": rue,
        "paliers_rue": ["123456789abc".index(layout["paliers"][c[1]][c[0]]) + 1 for c in rue],
        "parcelles": PARCELLES,
        "sorties": tuiles(),
    }
    (ROOT / "docs/designs/village-loop/loupes/bc/route_tuiles.json").write_text(json.dumps(doc, indent=1) + "\n")
