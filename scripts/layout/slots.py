#!/usr/bin/env python3
"""Writes docs/designs/village/layout/slots.json (L9) and checks every quarter slot against the plan.

    python3 scripts/layout/slots.py

A quarter slot is a box [gx0, gy0, gx1, gy1] (cells, inclusive) between or around the buildings, wider than 2 cells
both ways. It must be plain grass, off every plot, off every street cell, and off every parvis: the cells
within 2 of a player building on its screen-front sides (+gx and +gy), where nothing may stand (rules 1 and 14,
"never in front of a player building within 2 tiles"). `tier` is the first village tier whose island holds the
whole box, never under 6 (rule 6). A slot with "dehors": true lies past the grid, on the painted world: it has
no cells in isoLayout.json, only a box in the same coordinates.
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
L = json.loads((ROOT / "constants/isoLayout.json").read_text())
S = json.loads((ROOT / "constants/isoSpec.json").read_text())["batiments"]
S.pop("_doc", None)
D = L["debut"]
LETTRES = "123456789abc"

# id, wanted tier (6 to 12, rule 6), box, what it holds, what stays clear
QUARTIERS = [
    ("Q1", 6, [3, -6, 8, -1], "quartier du nord, rive est, derriere la carriere et le mannequin", "la rue du nord (gx 0 et gx -1) a l'ouest, le chemin gy 2 au sud"),
    ("Q2", 10, [-7, 11, -3, 16], "quartier du sud-ouest, sous la ferme", "la ferme et son parvis au nord, la rue gx -4 a l'est"),
    ("Q3", 8, [-8, -3, -5, 2], "quartier de la clairiere ouest, au dessus de l'observatoire", "l'observatoire et son parvis au sud, la rue gx -4 a l'est"),
    ("Q4", 9, [-8, -8, -4, -5], "quartier du nord-ouest, ou la foret recule, a gauche du bosquet", "le bosquet (gx -3) garde sa foret derriere lui, jamais de maison a l'est de gx -4"),
    ("Q5", 7, [-8, 7, -5, 9], "quartier de l'ouest, le long de la rue gy 7", "la rue gy 7 au nord-est"),
    ("Q6", 7, [15, 17, 17, 19], "quartier du sud-est, hors du rempart", "le rempart au nord, la route du sud a l'ouest"),
]
# Outside the grid (painted world), west of the grove: the retreat of the forest (direction F). The grove keeps the back forest.
DEHORS = [
    ("H1", [-16, -2, -10, 3], "clairiere ouest, au dessus de l'observatoire : hameau", "l'arriere du bosquet reste en foret"),
    ("H2", [-16, 4, -10, 9], "deux fermes de la clairiere", "la lisiere sud de la clairiere"),
    ("H3", [-21, -4, -17, 3], "petit bourg marchand (deplace a l'ouest de la clairiere)", "le bosquet et sa foret arriere, jamais plus a l est que gx -10"),
]


def tier(x, y):
    c = L["paliers"][y - D][x - D]
    return None if c == "-" else LETTRES.index(c) + 1


def plots():
    out = {}
    for code, (gx, gy) in L["batiments"].items():
        w, d = S[code]["emprise"]
        out[code] = (gx, gy, w, d)
    return out


def avant(gx, gy, w, d):
    """Cells within 2 of the plot on its +gx and +gy sides, plot included."""
    return (gx, gy, gx + w + 1, gy + d + 1)


def dans(c, b):
    return b[0] <= c[0] <= b[2] and b[1] <= c[1] <= b[3]


def main():
    P = plots()
    rue = {tuple(c) for c in L.get("rue", {}).get("cases", [])}
    parvis = {code: avant(*v) for code, v in P.items() if code not in ("castle_wall", "campfire")}
    slots, bad = [], []
    for sid, voulu, box, quoi, libre in QUARTIERS:
        t = 6
        for x in range(box[0], box[2] + 1):
            for y in range(box[1], box[3] + 1):
                s = L["sol"][y - D][x - D]
                tt = tier(x, y)
                if s != ".":
                    bad.append(f"{sid} ({x},{y}) is not grass: {s!r}")
                if tt is None:
                    bad.append(f"{sid} ({x},{y}) is not on the island")
                else:
                    t = max(t, tt)
                if (x, y) in rue:
                    bad.append(f"{sid} ({x},{y}) is a street cell")
                for code, (gx, gy, w, d) in P.items():
                    if gx <= x < gx + w and gy <= y < gy + d:
                        bad.append(f"{sid} ({x},{y}) is on the plot of {code}")
                for code, b in parvis.items():
                    if dans((x, y), b):
                        bad.append(f"{sid} ({x},{y}) is in front of {code}")
        slots.append({"id": sid, "kind": "quartier", "box": box, "taille": [box[2] - box[0] + 1, box[3] - box[1] + 1],
                      "tier": voulu, "dehors": False, "contient": quoi, "libre": libre})
        if t > voulu:
            bad.append(f"{sid} opens at tier {t}, wanted {voulu}: add or fix its hull (paliers.py reads slots.json)")
    for sid, box, quoi, libre in DEHORS:
        slots.append({"id": sid, "kind": "dehors", "box": box, "taille": [box[2] - box[0] + 1, box[3] - box[1] + 1],
                      "tier": 10, "dehors": True, "contient": quoi, "libre": libre})
    for code, b in parvis.items():
        slots.append({"id": f"P-{code}", "kind": "parvis", "box": list(b), "taille": [b[2] - b[0] + 1, b[3] - b[1] + 1],
                      "tier": L["etapes"].get(code, 1), "dehors": False, "contient": "rien", "libre": f"parvis de {code}: 2 cases sur ses faces +gx et +gy"})
    (ROOT / "docs/designs/village/layout/slots.json").write_text(json.dumps({"debut": D, "slots": slots}, indent=1, ensure_ascii=False) + "\n")
    print(len(slots), "slots;", "OK" if not bad else f"{len(bad)} problems")
    print("\n".join(bad[:40]))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
