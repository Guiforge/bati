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


def serpente(depart, d, derive, sel, n, lateral=None, onde=None, reste=dans_carte):
    """rues.ts serpente, bit for bit: lateral defaults to the axis across the heading, onde = (amplitude, period)."""
    lateral = lateral or (abs(d[1]), abs(d[0]))
    pts = [depart]
    x, y = depart
    phase = 2 * math.pi * hasard(sel, 0, 73, RUES_GRAINE) if onde else 0
    for k in range(1, math.floor(n) + 1):
        vague = onde[0] * math.sin(2 * math.pi * k / onde[1] + phase) if onde else 0
        biais = derive + (hasard(sel, k, 70, RUES_GRAINE) - 0.5) * 0.5 + vague
        x += 0.8 * (d[0] + lateral[0] * biais)
        y += 0.8 * (d[1] + lateral[1] * biais)
        if not reste((x, y)):
            break
        pts.append((x, y))
    return pts


FIN_SUD, DERIVE_SUD, PAS_SUD = 72, 0.17, 40


def sortie(gx, gy):
    """rues.ts SORTIES for the exit (gx, gy): the road and the track it forks into."""
    sud = gx not in (0, 19)
    cap = (-1, 0) if gx == 0 else (1, 0) if gx == 19 else (1, 1)
    allure = dict(lateral=(1, -1), reste=lambda g: g[0] + g[1] < FIN_SUD) if sud else {}
    depart = noeud(gx, gy)
    derive = DERIVE_SUD if sud else (hasard(gx, gy, 71, RUES_GRAINE) - 0.5) * 0.3
    route = serpente(depart, cap, derive, gx + gy + 1, PAS_SUD if sud else 8 / 0.8,
                     onde=(0.5, 12) if sud else None, **allure)
    i_f = min(len(route) - 1, round(3.5 / 0.8))
    cote = -1 if hasard(gx, gy, 72, RUES_GRAINE) < 0.5 else 1
    voie = serpente(route[i_f], cap, cote * 0.55, gx + gy + 5, (8 - 3.5) / 0.8, **allure)
    return route, voie


ROOT = pathlib.Path(__file__).resolve().parents[2]
BOUTS = [(0, 10), (19, 10), (12, 19)]
PORTE_SUD = (12, 16)
# champs.ts PARCELLES, [gx0, gy0, gx1, gy1] in cells: wheat, a vegetable plot and a pasture, all right of the road
PARCELLES = {"ble": [21, 19.5, 26, 23.5], "potager": [22.5, 13, 26.5, 16], "paturage": [27.5, 21.5, 31.5, 25]}


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
