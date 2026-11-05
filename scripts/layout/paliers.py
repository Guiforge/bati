#!/usr/bin/env python3
"""Writes `paliers` and `etapes` of constants/isoLayout.json (L7: the village grows outward).

    python3 scripts/layout/paliers.py            # rewrite the file
    python3 scripts/layout/paliers.py --plan     # print the island of each tier, nothing written

Positions never change between tiers; only what is revealed does. A building's PLOT tier is `PLOT`
below. A cell's tier is then:
  - its plot, with 2 cells of ground round it, and its path to the fire (path cells, 1 cell round them)
    at the plot's tier; the wall's sections and the fields at theirs;
  - any other cell of the land: the tier of the nearest such cell plus one when it touches it; two cells or more away it is the
    countryside, tiers 10 to 12;
  - then the minimax pass: a cell is never earlier than the cheapest way to it from the fire, so every
    tier's island is one piece joined to the fire (a growing island never recedes by construction).
Cells outside the land stay '-'. The keys of `etapes` are the same table: the tier a building's stages
start at in the demo (stadeDemo).
"""
import heapq
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
PATH = ROOT / "constants/isoLayout.json"
SPEC = ROOT / "constants/isoSpec.json"
LETTRES = "123456789abc"

# The tier each building's plot joins the island: outward from the fire, the camp first.
PLOT = {
    "campfire": 1, "tent": 1, "training_dummy": 1, "heroes_hall": 1, "well": 1,
    "forge": 2, "archery_range": 2, "fountain": 2,
    "farm": 3, "armory": 3, "quarry": 3,
    "windmill": 4, "wizard_tower": 4,
    "barn": 5, "druid_grove": 5,
    "castle_wall": 4, "watchtower": 4,
    "observatory": 7,
    "high_road": 8, "dragon_lair": 8,
    "champion_arena": 9,
}
# The wall's stages keep starting at tier 6 (palisade through tier 6, the locked corner's look); its plot only joins earlier.
ETAPES_A_PART = {"castle_wall": 6, "watchtower": 6}
RETENUES = {(18, 13): 7, (19, 13): 8, (16, 15): 7, (11, 17): 7, (12, 17): 7, (8, 17): 8, (9, 17): 7, (10, 17): 7, (19, 10): 7, (3, 15): 7, (4, 15): 7, (5, 15): 7}
REMPART = 4  # the south corner (gate, L of wall, road, field) arrives at tier 4, where the painted `.t1-3` ground bands give way
CHAMPS = 4
MARGE_PLOT = 2
MARGE_CHEMIN = 1


def charger():
    L = json.loads(PATH.read_text())
    S = json.loads(SPEC.read_text())["batiments"]
    S.pop("_doc", None)
    return L, {k: v["emprise"] for k, v in S.items()}


def main():
    L, emp = charger()
    debut = L["debut"]
    n = len(L["sol"])
    cases = [(x, y) for y in range(debut, debut + n) for x in range(debut, debut + n)]
    sol = {(x, y): L["sol"][y - debut][x - debut] for x, y in cases}
    # Land: the cells that had a tier ('-' stays '-').
    terre = {c for c in cases if L["paliers"][c[1] - debut][c[0] - debut] != "-"}
    coin = L["batiments"]

    def plot(code):
        gx, gy = coin[code]
        w, d = emp[code]
        return [(gx + i, gy + j) for i in range(w) for j in range(d)]

    def voisins(c):
        return [(c[0] + dx, c[1] + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if (c[0] + dx, c[1] + dy) in sol]

    def chemin(c):
        return sol.get(c) in ("#", "=")

    feu = plot("campfire")
    autour = {v for f in feu for v in voisins(f)}

    def acces(cs):
        dep = [v for c in cs for v in voisins(c) if chemin(v)]
        prev = {d: None for d in dep}
        q = list(dep)
        while q:
            c = q.pop(0)
            if c in autour:
                r, p = [], c
                while p:
                    r.append(p)
                    p = prev[p]
                return r
            for v in voisins(c):
                if chemin(v) and v not in prev:
                    prev[v] = c
                    q.append(v)
        return []

    def disque(c, m):
        return [(c[0] + dx, c[1] + dy) for dx in range(-m, m + 1) for dy in range(-m, m + 1)]

    brut = {}  # cell -> earliest hull tier

    def poser(cs, t, m):
        for c in cs:
            for v in disque(c, m):
                if v in terre and brut.get(v, 99) > t:
                    brut[v] = t

    for code, t in PLOT.items():
        cs = plot(code)
        poser(cs, t, MARGE_PLOT)
        poser(acces(cs), t, MARGE_CHEMIN)
    # A plot never joins before its own tier, whatever hull of a neighbour reaches it.
    for code, t in PLOT.items():
        for c in plot(code):
            brut[c] = t
    if "rue" in L:  # the street's cells (scripts/layout/rue.py) join with the first building they lead to
        poser([tuple(p) for p in L["rue"]["cases"]], L["rue"]["palier"], 1)
    poser([tuple(p) for p in L["rempart"]], REMPART, 1)
    for gx, gy, w, h in L["champs"]:
        poser([(gx + i, gy + j) for i in range(w) for j in range(h)], CHAMPS, 1)

    # Rule 6: the quarter slots inside the village (docs/designs/village/layout/slots.json, written by slots.py) open
    # from tier 6 and up: the box with 1 cell round it, and the shortest way over land to what is already there.
    slots = ROOT / "docs/designs/village/layout/slots.json"
    if slots.exists():
        for sl in sorted((x for x in json.loads(slots.read_text())["slots"] if x["kind"] == "quartier"), key=lambda x: x["tier"]):
            x0, y0, x1, y1 = sl["box"]
            boite = [(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]
            dedans = {v for c in boite for v in disque(c, 1)}
            prev, q, fin = {c: None for c in boite}, list(boite), None
            while q and fin is None:
                c = q.pop(0)
                for v in voisins(c):
                    if v in terre and v not in prev:
                        prev[v] = c
                        if brut.get(v, 99) <= sl["tier"] and v not in dedans:
                            fin = v
                            break
                        q.append(v)
            poser(boite, sl["tier"], 1)
            while fin is not None:
                if brut.get(fin, 99) > sl["tier"]:
                    brut[fin] = sl["tier"]
                fin = prev[fin]
    # The two path bits beside the south gate that the locked crop `porte` (tier 6) never showed: held at their old tiers.
    for c, t in RETENUES.items():
        if c in terre:
            brut[c] = t
    # The rest: the nearest hull cell's tier plus the distance (Chebyshev), cap 12.
    pts = list(brut.items())
    t0 = {}
    for c in terre:
        if c in brut:
            t0[c] = brut[c]
        else:
            d, t = min((max(abs(c[0] - p[0]), abs(c[1] - p[1])), tp) for p, tp in pts)
            # next to a hull: one tier after it; two or more away it is the countryside, 10 to 12
            t0[c] = min(12, t + 1) if d == 1 else min(12, max(t + d, 9 + min(3, d - 1)))

    # Minimax from the fire: tier(c) = min over paths from the fire of the max of t0 along them.
    tier = {}
    tas = [(1, c) for c in feu]
    while tas:
        t, c = heapq.heappop(tas)
        if c in tier:
            continue
        tier[c] = t
        for v in voisins(c):
            if v in terre and v not in tier:
                heapq.heappush(tas, (max(t, t0[v]), v))

    assert set(tier) == terre, f"unreachable land: {sorted(terre - set(tier))[:5]}"
    rows = ["".join(LETTRES[tier[(x, y)] - 1] if (x, y) in tier else "-" for x in range(debut, debut + n)) for y in range(debut, debut + n)]

    if "--plan" in sys.argv:
        for t in (1, 3, 6, 9, 12):
            print(f"tier {t}: {sum(1 for v in tier.values() if v <= t)} cells")
        return
    L["paliers"] = rows
    L["etapes"] = {**PLOT, **ETAPES_A_PART}
    PATH.write_text(json.dumps(L, indent=2, ensure_ascii=False) + "\n")
    print("paliers and etapes written;", {t: sum(1 for v in tier.values() if v <= t) for t in (1, 3, 6, 9, 12)})


if __name__ == "__main__":
    main()
