#!/usr/bin/env python3
"""Windmill final round: the maquettes the card lists but gen_cartes.py never drew. Specs into scripts/iso/blockouts/bld/pilote/.

    python3 scripts/bld/gen_final_specs.py

windmill_keeper_{1,2,3}  the miller (card: guardian.at (233, 1129), a figure of 0.33 = 16 dp): one sack on a shoulder (rough,
                         solid), a sack on each shoulder (grand), two sacks bigger than him (legendary, mythic)
windmill_clan_{fanion,banniere,blason}  the clan marks, sprites of 13 x 10, 10 x 16 and 11 x 18 dp, centred where the card puts
                         `clanMark` (254, 859); the code places them, the maquette only fixes shape and size
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import gen_cartes as C  # noqa: E402
import gen_pilot_specs as G  # noqa: E402


def miller(k_sacks):
    P0 = [*C.px_to_grid(233, 1129), 0.04]
    lp = C.frame(P0, C.S)
    out = [C.tseg(lp(0, 0.0), lp(0, 0.23), 0.06, 0.045, "plaster"),  # floury apron and robe
           C.tseg(lp(0, 0.23), lp(0, 0.28), 0.045, 0.04, "canvas"),
           C.blob(lp(0, 0.32), 0.045, "plaster"),  # head
           C.tseg(lp(0, 0.34), lp(0, 0.40), 0.05, 0.0, "canvas"),  # soft cap
           G.seg(lp(0, 0.0, -0.03), lp(0.02, -0.0, -0.03), 0.02, "darkwood"), G.seg(lp(0, 0.0, 0.03), lp(0.02, 0.0, 0.03), 0.02, "darkwood")]
    if k_sacks == 1:
        out.append(C.blob(lp(-0.10, 0.26, -0.05), 0.07, "canvas"))  # one sack on the left shoulder
        out.append(G.seg(lp(-0.03, 0.24), lp(-0.07, 0.22), 0.02, "plaster"))
    elif k_sacks == 2:
        for sgn in (-1, 1):
            out.append(C.blob(lp(0.11 * sgn, 0.27, -0.05), 0.065, "canvas"))
    else:  # two sacks bigger than him, the man small under them
        for sgn in (-1, 1):
            out.append(C.blob(lp(0.17 * sgn, 0.30, -0.06), 0.13, "canvas"))
            out.append(C.tseg(lp(0.17 * sgn, 0.40, -0.06), lp(0.17 * sgn, 0.50, -0.06), 0.05, 0.02, "canvas"))  # the knotted neck
    return out


def clan(kind):
    P = [*C.px_to_grid(254, 859 + 0.5 * 235), 0.0]
    lp = C.frame(P, C.S)
    if kind == "fanion":  # 13 x 10 dp: a short pole and a streaming pennant
        return [G.seg(lp(-0.12, 0.0), lp(-0.12, 0.34), 0.012, "wood"), C.tseg(lp(-0.12, 0.30), lp(0.14, 0.26), 0.07, 0.0, "banner")]
    if kind == "banniere":  # 10 x16 dp: a hanging banner on a crossbar
        return [G.seg(lp(-0.09, 0.0, 0.0), lp(0.09, 0.0, 0.0), 0.012, "wood") if False else G.seg(lp(-0.09, 0.30), lp(0.09, 0.30), 0.012, "wood"),
                C.tseg(lp(0, 0.29), lp(0, 0.0), 0.085, 0.05, "banner"), C.tseg(lp(0, 0.0), lp(0, -0.04), 0.05, 0.0, "banner")]
    return [G.cyl(P, 0.10, 0.025, "stone", axis=G.AXIS), G.cyl(P, 0.045, 0.045, "iron", axis=G.AXIS)]  # blason: a disc and its boss


def main():
    for i in (1, 2, 3):
        C.put(f"windmill_keeper_{i}", miller(i))
    for k in ("fanion", "banniere", "blason"):
        C.put(f"windmill_clan_{k}", clan(k))


if __name__ == "__main__":
    main()
