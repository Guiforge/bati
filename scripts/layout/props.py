#!/usr/bin/env python3
"""Moves the props of components/village/iso/alentours.ts ACCESSOIRES with the buildings the plan moved (L12/L13).

    python3 scripts/layout/props.py          # prints the new table's changes, writes nothing
    python3 scripts/layout/props.py --write  # rewrites the cells in alentours.ts

A prop that names a moved `batiment` follows it by the building's move (its old corner to its new one). The camp's props
(no building) follow the tent, or are placed on the nearest valid grass cell round the fire. A cell is valid when it is on the
island at tier 12, grass, off every plot, street and quarter slot, and off the front zone (2 cells on +gx and +gy) of every
building but its own. Props that cannot stay valid take the nearest valid cell to their wanted one.
"""
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
TS = ROOT / "components/village/iso/alentours.ts"
L = json.loads((ROOT / "constants/isoLayout.json").read_text())
S = json.loads((ROOT / "constants/isoSpec.json").read_text())["batiments"]
S.pop("_doc")
D = L["debut"]
OLD = json.loads(subprocess.run(["/usr/bin/git", "show", "85d449d1f~1:constants/isoLayout.json"], cwd=ROOT, capture_output=True, text=True, check=True).stdout)["batiments"]
NEW = L["batiments"]
DELTA = {k: (NEW[k][0] - OLD[k][0], NEW[k][1] - OLD[k][1]) for k in NEW if NEW[k] != OLD[k]}
SLOTS = [s["box"] for s in json.loads((ROOT / "docs/designs/village/layout/slots.json").read_text())["slots"] if s["kind"] == "quartier"]
# Camp props without a building: they follow the tent, or the fire.
SUIT_TENTE = {"caisses_2", "sacs_de_grain_2"}
PRES_DU_FEU = {"tas_de_bois_2", "tonneaux_1", "lanterne_1"}
A_PART = {"sieste_1": (4, 10)}


def plot(code):
    gx, gy = NEW[code]
    w, d = S[code]["emprise"]
    return [(gx + i, gy + j) for i in range(w) for j in range(d)]


def avant(code):
    gx, gy = NEW[code]
    w, d = S[code]["emprise"]
    return (gx, gy, gx + w + 1, gy + d + 1)


RUE = {tuple(c) for c in L.get("rue", {}).get("cases", [])}
PLOTS = {c for code in NEW for c in plot(code)}


def valide(c, propre=None, pris=()):
    x, y = c
    if not (D <= x < D + len(L["sol"]) and D <= y < D + len(L["sol"])):
        return False
    if L["paliers"][y - D][x - D] == "-" or L["sol"][y - D][x - D] != ".":
        return False
    if c in PLOTS or c in pris:
        return False
    for b in SLOTS:
        if b[0] <= x <= b[2] and b[1] <= y <= b[3]:
            return False
    for code in NEW:
        if code in (propre, "castle_wall", "campfire"):
            continue
        a = avant(code)
        if a[0] <= x <= a[2] and a[1] <= y <= a[3]:
            return False
    return True


def proche(voulu, propre, pris):
    for r in range(0, 8):
        cs = [(voulu[0] + dx, voulu[1] + dy) for dx in range(-r, r + 1) for dy in range(-r, r + 1) if max(abs(dx), abs(dy)) == r]
        cs.sort(key=lambda c: abs(c[0] - voulu[0]) + abs(c[1] - voulu[1]))
        for c in cs:
            if valide(c, propre, pris):
                return c
    return voulu


def main():
    src = TS.read_text()
    pris = set()
    lignes = []
    for m in re.finditer(r'\{ nom: "(\w+)", case: \[(-?\d+), (-?\d+)\]([^}\n]*)\}', src):
        nom, x, y, reste = m.group(1), int(m.group(2)), int(m.group(3)), m.group(4)
        if "hors: true" in reste or "sur:" in reste or "pied:" in reste:
            continue
        bat = re.search(r'batiment: "(\w+)"', reste)
        bat = bat.group(1) if bat else None
        voulu = (x, y)
        proche_ancien = bat in DELTA and max(abs(x - OLD[bat][0] - 1), abs(y - OLD[bat][1] - 1)) <= 5
        if proche_ancien:
            voulu = (x + DELTA[bat][0], y + DELTA[bat][1])
        elif nom in SUIT_TENTE:
            voulu = (x + DELTA["tent"][0], y + DELTA["tent"][1])
        elif nom in PRES_DU_FEU:
            voulu = (3, 9)
        elif nom in A_PART:
            voulu = A_PART[nom]
        c = proche(voulu, bat, pris) if (voulu != (x, y) or not valide((x, y), bat, pris)) else (x, y)
        pris.add(c)
        if c != (x, y):
            lignes.append((nom, (x, y), c, m.span(2)[0], m.span(3)[1], m.start()))
    for nom, a, b, *_ in lignes:
        print(f"{nom}: {a} -> {b}")
    if "--write" in sys.argv:
        out = src
        for nom, a, b, s0, s1, ms in sorted(lignes, key=lambda t: -t[5]):
            seg = out[ms:s1 + 1]
            seg2 = seg.replace(f"[{a[0]}, {a[1]}]", f"[{b[0]}, {b[1]}]", 1)
            out = out[:ms] + seg2 + out[s1 + 1:]
        TS.write_text(out)
        print("written")


main()
