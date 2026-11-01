"""Projection du coût FLUX de la V1 du village iso (L0-T07), et du lot 2 par modèle (L1-T20).
Sans réseau ; le prix de Klein vient de `iso_loop.klein_price` (une seule source).

    python3 scripts/iso/cost_projection.py

Modèle : un slug se peint par tentatives de CANDIDATS rendus, 3 tentatives au plus, puis HUMAN.
Chaque rendu est accepté (audit A, regard neuf, Guillaume) avec la probabilité p, indépendante.
"""

import math

from iso_loop import klein_price

CANDIDATS, MAX_TENTATIVES = 3, 3
BALANCE, BUDGET = 37.96, 40.0
# Les deux seuls prix réels du POC (budget.json) : (Mo de sortie = Mo de référence, $ par rendu).
REAL = [(896 * 1344 / 2**20, 0.075), (2688 * 1344 / 2**20, 0.135)]


def price_ceil(mp: float) -> float:
    """Hypothèse A : 0,03 $ le premier Mo de sortie, 0,015 $ chaque Mo suivant, 0,015 $ par Mo de
    référence, Mo arrondi au-dessus. Le blockout en image 1 a la taille de la toile."""
    return round(0.03 + 0.015 * (math.ceil(mp) - 1) + 0.015 * math.ceil(mp), 4)


def price_prorata(mp: float) -> float:
    """Hypothèse B : droite par les deux prix réels, au prorata des Mo (sortie + référence)."""
    (m0, c0), (m1, c1) = REAL
    slope = (c1 - c0) / (m1 - m0)
    return round(c0 + slope * (mp - m0), 4)


PRICING = {"arrondi": price_ceil, "prorata": price_prorata}

# Toiles : celles de constants/isoSpec.json, plus les emprises que le POC n'a pas encore
# (largeur (w+d)/2 x 384 + 128, hauteur estimée sur le stade le plus haut, multiple de 16).
CANVAS = {
    "2x2": (896, 1344), "tour1x1": (512, 1280), "decor1x1": (512, 768), "ailes": (768, 768),
    "2x3": (1088, 1536), "3x3": (1280, 1536), "1x3": (896, 1344), "1x2": (704, 1152),
    "planche": (1536, 512), "villageois": (1920, 768),
}
MP = {k: w * h / 2**20 for k, (w, h) in CANVAS.items()}

# Ordre du §5 : lot 2 (muscle, spéciaux, débuts, tier 3, hauts faits et route, décors, eau,
# échafaudages), puis lot 4 (planches de vie) et lot 5 (villageois).
# famille -> (éléments [(nom, slugs, toile)], scénario seul où elle est peinte ou None)
FAMILIES = {
    "Muscle": ([("forge rough+grand", 2, "2x2"), ("moulin", 3, "2x2"), ("carrière", 3, "2x2"),
                ("puits", 3, "tour1x1"), ("ferme", 3, "2x3"), ("champ de tir", 3, "2x3"),
                ("ailes du moulin (une, partagée)", 1, "ailes")], None),
    "Refaire forge_solid (si détonne)": ([("forge_solid", 1, "2x2")], "haut"),
    "Spéciaux": ([("tour du sorcier", 3, "tour1x1"), ("bosquet du druide", 3, "2x2")], None),
    "Débuts": ([("feu de camp", 3, "decor1x1"), ("tente", 3, "2x2"), ("mannequin", 3, "tour1x1")], None),
    "Tier 3": ([("tour de guet", 2, "tour1x1"), ("rempart", 2, "1x3"), ("armurerie", 2, "2x2"),
                ("fontaine", 2, "2x2"), ("observatoire", 2, "2x2"), ("grange", 2, "2x3")], None),
    "Hauts faits et route": ([("antre du dragon", 3, "3x3"), ("salle des héros", 3, "3x3"),
                              ("arène", 3, "3x3"), ("grand-route", 3, "1x2")], None),
    "Décors": ([("arbres, bosquets, rochers, buissons", 6, "decor1x1")], None),
    "Eau peinte": ([("fontaine", 1, "planche"), ("puits", 1, "planche"), ("cascade", 1, "planche")], None),
    "Échafaudages": ([("1x1", 1, "decor1x1"), ("2x2", 1, "2x2")], None),
    "Planches de vie (lot 4)": ([("flamme 6 dessins", 1, "planche"), ("bannières 3 dessins", 1, "planche"),
                                 ("fumée (si peinte)", 1, "planche")], None),
    "Villageois (lot 5)": ([("7 rôles, 10 dessins chacun", 7, "villageois")], None),
}
BUILDING_FAMILIES = ["Muscle", "Refaire forge_solid (si détonne)", "Spéciaux", "Débuts", "Tier 3",
                     "Hauts faits et route"]

# p = probabilité qu'un rendu soit accepté au bout de la chaîne (A, B, Guillaume).
SCENARIOS = {"bas": 0.20, "médian": 0.10, "haut": 0.05}


def per_slug(p: float) -> tuple[float, float]:
    """(rendus attendus, probabilité d'acceptation) d'un slug sous la règle des 3 tentatives."""
    q = (1 - p) ** CANDIDATS  # une tentative sans aucun candidat accepté
    attempts = sum(q**k for k in range(MAX_TENTATIVES))
    return CANDIDATS * attempts, 1 - q**MAX_TENTATIVES


def unbounded(p: float) -> float:
    """Rendus attendus sans plafond : des tentatives de 3 jusqu'au premier succès."""
    return CANDIDATS / (1 - (1 - p) ** CANDIDATS)


def project(pricing: str) -> dict:
    cost = {k: PRICING[pricing](mp) for k, mp in MP.items()}
    keys = [*SCENARIOS, "cap", "sans plafond haut"]
    rows, totals, accepted = [], dict.fromkeys(keys, 0.0), dict.fromkeys(SCENARIOS, 0.0)
    for family, (items, only) in FAMILIES.items():
        row = {"famille": family, "slugs": sum(n for _, n, _ in items), **dict.fromkeys(keys, 0.0)}
        for _, n, canvas in items:
            c = cost[canvas]
            row["cap"] += n * CANDIDATS * MAX_TENTATIVES * c
            row["sans plafond haut"] += n * unbounded(SCENARIOS["haut"]) * c
            for s, p in SCENARIOS.items():
                if only is None or only == s:
                    renders, ok = per_slug(p)
                    row[s] += n * renders * c
                    accepted[s] += n * ok
        for key in keys:
            totals[key] += row[key]
            row[f"cumul {key}"] = totals[key]
        rows.append(row)
    return {"cost": cost, "rows": rows, "totals": totals, "accepted": accepted}


LOT2 = [f for f in FAMILIES if f not in ("Planches de vie (lot 4)", "Villageois (lot 5)")]
# L1-T20 : taux par rendu (A puis regard neuf) relevés sur windmill_solid, un seul slug.
#   Klein : 1 sur 12 sur tout l'essai (a2 à a4), 1 sur 3 avec le prompt final (a4).
#   FLUX.2 pro : 0 sur 10 sur le moulin (POC et V1, prompt a4 compris) ; 1 sur 20 sur la forge au POC
#   (forge_solid, accepté par Guillaume), pris comme haut ; 0,01 comme bas, puisque 0 n'a pas de coût fini.
RATES = {"taux bas": {"klein": 1 / 12, "pro": 0.01}, "taux haut": {"klein": 1 / 3, "pro": 0.05}}
OPTIONS = {"Klein seul": ("klein", "klein", "klein"), "FLUX.2 pro seul": ("pro", "pro", "pro"),
           "Klein puis FLUX.2 pro (3e tentative)": ("klein", "klein", "pro")}


def per_slug_chain(chain: list[tuple[float, float]]) -> tuple[float, float]:
    """(coût attendu, probabilité d'acceptation) d'un slug dont la tentative k a le taux et le prix
    `chain[k]`, une tentative suivante seulement si aucun des CANDIDATS n'est accepté."""
    cost, reach = 0.0, 1.0
    for p, price in chain:
        cost += reach * CANDIDATS * price
        reach *= (1 - p) ** CANDIDATS
    return cost, 1 - reach


def lot2(pricing: str) -> list[dict]:
    """Le lot 2 (bâtiments, forge_solid refait, décors, eau, échafaudages) par option et par taux."""
    price = {"pro": {k: PRICING[pricing](mp) for k, mp in MP.items()},
             "klein": {k: klein_price(w, h) for k, (w, h) in CANVAS.items()}}
    out = []
    for option, models in OPTIONS.items():
        for case, rate in RATES.items():
            cost = accepted = slugs = 0.0
            for family in LOT2:
                for _, n, canvas in FAMILIES[family][0]:
                    c, ok = per_slug_chain([(rate[m], price[m][canvas]) for m in models])
                    cost, accepted, slugs = cost + n * c, accepted + n * ok, slugs + n
            out.append({"option": option, "taux": case, "coût": cost, "acceptés": accepted, "slugs": slugs})
    return out


def fits(rows: list, key: str, money: float) -> str:
    """Dernière famille, dans l'ordre, dont le cumul tient encore dans `money`."""
    inside = [r["famille"] for r in rows if r[f"cumul {key}"] <= money + 1e-9]
    return inside[-1] if inside else "rien"


def self_check(results: dict) -> None:
    for pricing in PRICING.values():  # les deux hypothèses redonnent les deux prix réels
        for mp, real in REAL:
            assert abs(pricing(mp) - real) < 1e-3, (pricing, mp, real)
    assert price_ceil(MP["2x3"]) == 0.075 and abs(price_prorata(MP["2x3"]) - 0.087) < 1e-3
    assert per_slug(1.0) == (3.0, 1.0)
    renders, ok = per_slug(0.0)
    assert renders == 9 and ok == 0  # un slug jamais accepté coûte exactement le plafond
    assert abs(unbounded(1.0) - 3) < 1e-9
    buildings = sum(n for f in BUILDING_FAMILIES for _, n, c in FAMILIES[f][0] if c != "ailes")
    assert buildings == 57, buildings  # 56 stades à peindre + forge_solid refait
    for result in results.values():
        t = result["totals"]
        assert t["bas"] < t["médian"] < t["haut"] < t["cap"] < t["sans plafond haut"], t
    assert all(results["prorata"]["totals"][k] >= results["arrondi"]["totals"][k] - 1e-9
               for k in results["arrondi"]["totals"])
    # L1-T20 : la chaîne à taux et prix constants redonne per_slug ; un rendu sûr coûte une tentative.
    for p in (0.01, 0.1, 0.5):
        renders, ok = per_slug(p)
        cost, ok2 = per_slug_chain([(p, 1.0)] * MAX_TENTATIVES)
        assert abs(cost - renders) < 1e-9 and abs(ok - ok2) < 1e-9, (p, cost, renders)
    assert per_slug_chain([(1.0, 0.011), (0.5, 0.075)]) == (CANDIDATS * 0.011, 1.0)
    assert klein_price(*CANVAS["2x2"]) == 0.011  # le prix facturé sur windmill_solid (L1-T08)
    assert price_ceil(MP["2x2"]) == price_prorata(MP["2x2"]) == 0.075  # facturé au POC et en L1-T20


def main() -> None:
    results = {name: project(name) for name in PRICING}
    self_check(results)
    for s, p in SCENARIOS.items():
        renders, ok = per_slug(p)
        print(f"{s} p={p}: {renders:.2f} rendus/slug, acceptation {ok:.1%}, sans plafond {unbounded(p):.2f}")
    head = [*SCENARIOS, "cap", "sans plafond haut"]
    for name, result in results.items():
        print(f"\n== prix {name} : {result['cost']}")
        print(" | ".join(["famille", "slugs", *head]))
        for r in result["rows"]:
            print(" | ".join([r["famille"], str(r["slugs"])] +
                             [f"{r[k]:.2f} ({r[f'cumul {k}']:.2f})" for k in head]))
        print("Totaux :", {k: round(v, 2) for k, v in result["totals"].items()})
        print("Acceptés attendus :", {k: round(v, 1) for k, v in result["accepted"].items()})
        for s in [*SCENARIOS, "cap"]:
            per = f"{result['totals'][s] / result['accepted'][s]:.3f} $ par accepté ; " if s in SCENARIOS else ""
            print(f"{s}: {per}tient dans {BALANCE} $ jusqu'à « {fits(result['rows'], s, BALANCE)} », "
                  f"dans {BUDGET} $ jusqu'à « {fits(result['rows'], s, BUDGET)} »")
    print(f"\n== Lot 2 par option (L1-T20), taux {RATES}")
    print("prix FLUX.2 pro | option | taux | coût $ | acceptés / slugs | HUMAN | $ par accepté")
    for name in PRICING:
        for r in lot2(name):
            print(f"{name} | {r['option']} | {r['taux']} | {r['coût']:.2f} | {r['acceptés']:.1f} / {r['slugs']:.0f} | "
                  f"{r['slugs'] - r['acceptés']:.1f} | {r['coût'] / r['acceptés']:.3f}")


if __name__ == "__main__":
    main()
