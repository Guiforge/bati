"""Painting references of T40: the rest poses of the inhabitants, written to repos/ (argv[1] to override).

Same format as T36 lot D (gen_peinture.py, whose `fit` and primitives are copied here: that file runs on
import): `villager` canvas, camera and `light` of the villagers, own `pxScale` and `anchorPx` so the subject,
centred, stands 80 % of the canvas height (94 % of its width at most), ink 12 px. The people are neutral
(cloth `canvas`, skin `plaster`, legs `darkwood`): the app recolours the cloth per trade and per day, the
painter paints the trade's look. Every pose is built from joints (`person`), in the body's frame:
a across (its right is +a), b forward, z up; `yaw` turns the body (0 faces the viewer, 90 faces screen right).

POSES lists, per pose, where it stands and from which tier it may be drawn (a proposal for habitants.ts).
"""

import json
import math
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "exports"))
import heights as Hg  # noqa: E402

OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "repos"
FRONT_LIGHT = [0.55, 0.55, 0.63]
F, SIDE = (math.sqrt(0.5), math.sqrt(0.5)), (math.sqrt(0.5), -math.sqrt(0.5))
INK_PX = 12
ISO = json.loads((HERE.parent.parent.parent / "constants" / "isoSpec.json").read_text())
FILL, WIDE = 0.80, 0.94
SKIN, CLOTH, LEG = "plaster", "canvas", "darkwood"


def fit(parts, canvas):
    o = 1.0 if ISO["canvases"][canvas]["anchor"] == "footprintBottom" else 0.5
    pts = [(((x - y) * ISO["S"] / 2), ((x + y - 2 * o) * ISO["S"] / 4 - z * ISO["pxPerUnit"] * math.sin(math.radians(60))))
           for q in parts for x, y, z in Hg.part_vertices(q)]
    x0, x1, y0, y1 = min(p[0] for p in pts), max(p[0] for p in pts), min(p[1] for p in pts), max(p[1] for p in pts)
    w, h = ISO["canvases"][canvas]["w"], ISO["canvases"][canvas]["h"]
    k = min((FILL * h - INK_PX) / (y1 - y0), (WIDE * w - INK_PX) / (x1 - x0))
    return round(k, 3), [round(w / 2 - k * (x0 + x1) / 2), round(h / 2 - k * (y0 + y1) / 2)]


def r(v):
    return round(v, 4) + 0.0


class Frame:
    """A body frame: origin (s0, f0) on the view's axes, turned by yaw degrees."""

    def __init__(self, s0=0.0, f0=0.0, yaw=0.0):
        self.s0, self.f0, self.yaw = s0, f0, yaw
        c, s = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))
        self.fwd = (c * F[0] + s * SIDE[0], c * F[1] + s * SIDE[1])
        self.acr = (c * SIDE[0] - s * F[0], c * SIDE[1] - s * F[1])

    def pt(self, p):
        a, b, z = p
        ox = 0.5 + self.f0 * F[0] + self.s0 * SIDE[0]
        oy = 0.5 + self.f0 * F[1] + self.s0 * SIDE[1]
        return [r(ox + a * self.acr[0] + b * self.fwd[0]), r(oy + a * self.acr[1] + b * self.fwd[1]), r(z)]

    def cone(self, p, q, r1, r2, mat):
        a, b = self.pt(p), self.pt(q)
        d = [b[i] - a[i] for i in range(3)]
        n = math.sqrt(sum(x * x for x in d))
        return {"type": "cone", "center": a, "r": r(r1), "r2": r(r2), "h": r(n), "axis": [r(x / n) for x in d], "mat": mat}

    def cyl(self, p, q, rad, mat):
        c = self.cone(p, q, rad, rad, mat)
        c["type"] = "cyl"
        del c["r2"]
        return c

    def blob(self, p, rad, h, mat):
        a, b, z = p
        c = self.pt(p)
        return [{"type": "cone", "center": c, "r": r(rad * 0.7), "r2": r(rad), "h": r(h * 0.4), "mat": mat},
                {"type": "cone", "center": [c[0], c[1], r(z + h * 0.4)], "r": r(rad), "r2": r(rad * 0.5), "h": r(h * 0.6), "mat": mat}]

    def box(self, centre, depth, width, height, mat):
        """depth along b, width along a, centred on `centre` (z = the bottom)."""
        a, b, z = centre
        c = self.pt(centre)
        return {"type": "box", "at": [r(c[0] - depth / 2), r(c[1] - width / 2), r(z)], "size": [r(depth), r(width), r(height)],
                "mat": mat, "rotZ": r(45 - self.yaw)}


def person(fr, hip, chest, head, knees, feet, elbows, hands, cloth=CLOTH, skin=SKIN, k=1.0):
    """Hips to chest as a tunic, a faceted head, arms and legs through their joints. Left = -a, right = +a."""
    p = [fr.cone(hip, chest, 0.07 * k, 0.062 * k, cloth)]
    shoulder = [(chest[0] + s * 0.07 * k, chest[1], chest[2] - 0.02) for s in (-1, 1)]
    neck = (head[0], head[1], head[2] - 0.05)
    p.append(fr.cone(chest, neck, 0.026, 0.022, skin))
    p += fr.blob((head[0], head[1], head[2] - 0.04), 0.046, 0.085, skin)
    for i, s in enumerate((-1, 1)):
        h = (hip[0] + s * 0.035, hip[1], hip[2])
        p.append(fr.cone(h, knees[i], 0.03, 0.024, LEG))
        p.append(fr.cone(knees[i], feet[i], 0.024, 0.02, LEG))
        p.append(fr.cone(shoulder[i], elbows[i], 0.022 * k, 0.019, cloth))
        p.append(fr.cone(elbows[i], hands[i], 0.019, 0.017, skin))
    return p


STAND = dict(hip=(0, 0, 0.2), chest=(0, 0, 0.33), head=(0, 0, 0.43),
             knees=((-0.035, 0, 0.1), (0.035, 0, 0.1)), feet=((-0.035, 0, 0.0), (0.035, 0, 0.0)),
             elbows=((-0.09, 0, 0.25), (0.09, 0, 0.25)), hands=((-0.095, 0, 0.17), (0.095, 0, 0.17)))


def stand(fr, **kw):
    return person(fr, **{**STAND, **kw})


# --- the poses ------------------------------------------------------------------------------------
def dort():  # sits on the ground, back to a wall (the building's), head dropped on the chest, arms crossed
    fr = Frame()
    p = person(fr, hip=(0, 0, 0.05), chest=(0, -0.035, 0.2), head=(0.02, -0.01, 0.285),
               knees=((-0.04, 0.1, 0.1), (0.04, 0.1, 0.1)), feet=((-0.045, 0.2, 0.015), (0.045, 0.2, 0.015)),
               elbows=((-0.085, 0.0, 0.12), (0.085, 0.0, 0.12)), hands=((0.035, 0.05, 0.15), (-0.035, 0.05, 0.145)))
    p.append(fr.box((0, -0.125, 0.0), 0.04, 0.3, 0.34, "stone"))  # the wall at his back (a cut of the building's)
    return p


def assis_tonneau():  # sits on a barrel, hands on his knees, feet hanging
    fr = Frame()
    p = [fr.cone((0, 0, 0.0), (0, 0, 0.17), 0.09, 0.09, "wood"), fr.cone((0, 0, 0.05), (0, 0, 0.065), 0.093, 0.093, "iron"),
         fr.cone((0, 0, 0.12), (0, 0, 0.135), 0.093, 0.093, "iron")]
    p += person(fr, hip=(0, 0, 0.19), chest=(0, -0.01, 0.32), head=(0, 0.005, 0.42),
                knees=((-0.04, 0.1, 0.2), (0.04, 0.1, 0.2)), feet=((-0.04, 0.11, 0.04), (0.04, 0.11, 0.04)),
                elbows=((-0.09, 0.03, 0.25), (0.09, 0.03, 0.25)), hands=((-0.045, 0.1, 0.225), (0.045, 0.1, 0.225)))
    return p


def balaie():  # leans on a long broom, the bristles on the ground in front of him
    fr = Frame(yaw=35)
    base, top = (0.07, 0.2, 0.0), (0.03, 0.05, 0.42)

    def along(t):
        return tuple(base[i] + t * (top[i] - base[i]) for i in range(3))
    p = [fr.cone(base, top, 0.011, 0.011, "wood"), fr.cone(base, (0.07, 0.2, 0.11), 0.05, 0.012, "thatch")]
    p += stand(fr, hip=(0, 0, 0.2), chest=(0, 0.03, 0.33), head=(0, 0.065, 0.42),
               knees=((-0.035, 0.0, 0.1), (0.035, 0.03, 0.1)), feet=((-0.035, -0.02, 0.0), (0.035, 0.05, 0.0)),
               elbows=((-0.07, 0.1, 0.24), (0.1, 0.1, 0.25)), hands=(along(0.5), along(0.72)))
    return p


def porte_panier():  # a big basket on the hip, the other arm out for balance
    fr = Frame()
    p = fr.blob((0.13, 0.03, 0.06), 0.085, 0.1, "wood")
    p.append(fr.cone((0.075, 0.03, 0.17), (0.185, 0.03, 0.17), 0.009, 0.009, "wood"))  # the handle's bar
    p += stand(fr, chest=(-0.012, 0, 0.33), head=(-0.01, 0, 0.43),
               elbows=((-0.15, 0.02, 0.27), (0.12, 0.02, 0.26)), hands=((-0.2, 0.04, 0.2), (0.13, 0.03, 0.17)))
    return p


def range_caisses():  # bent over, lifting a crate; two more stacked beside him
    fr = Frame()
    p = [fr.box((0, 0.22, 0.14), 0.15, 0.17, 0.12, "wood"), fr.box((-0.22, 0.02, 0.0), 0.14, 0.17, 0.11, "darkwood"),
         fr.box((-0.22, 0.02, 0.11), 0.13, 0.15, 0.1, "wood")]
    p += person(fr, hip=(0, -0.03, 0.2), chest=(0, 0.09, 0.3), head=(0, 0.16, 0.34),
                knees=((-0.035, 0.03, 0.1), (0.035, 0.03, 0.1)), feet=((-0.04, 0.0, 0.0), (0.04, 0.0, 0.0)),
                elbows=((-0.1, 0.13, 0.25), (0.1, 0.13, 0.25)), hands=((-0.08, 0.22, 0.2), (0.08, 0.22, 0.2)))
    return p


def puise():  # at the well: the full bucket on the curb, one hand on its handle, the other on his hip
    fr = Frame(yaw=-20)
    p = [fr.box((0, 0.32, 0.0), 0.2, 0.44, 0.13, "stone"), fr.cone((0.05, 0.31, 0.13), (0.05, 0.31, 0.2), 0.04, 0.045, "wood"),
         fr.cone((0.05, 0.31, 0.2), (0.05, 0.31, 0.2 + 0.004), 0.045, 0.045, "darkwood")]
    p += person(fr, hip=(0, -0.01, 0.2), chest=(0, 0.06, 0.32), head=(0, 0.11, 0.41),
                knees=((-0.035, 0.02, 0.1), (0.035, 0.03, 0.1)), feet=((-0.035, 0.0, 0.0), (0.035, 0.02, 0.0)),
                elbows=((-0.11, 0.03, 0.24), (0.09, 0.14, 0.25)), hands=((-0.075, 0.02, 0.19), (0.06, 0.25, 0.23)))
    return p


def lit():  # reads a parchment held in both hands, head bowed, a rolled end hanging
    fr = Frame()
    p = [fr.box((0, 0.125, 0.25), 0.012, 0.13, 0.11, "banner"),
         fr.cyl((-0.068, 0.125, 0.25), (0.068, 0.125, 0.25), 0.011, "plaster"),
         fr.cyl((-0.068, 0.125, 0.36), (0.068, 0.125, 0.36), 0.011, "plaster")]
    p += stand(fr, chest=(0, 0.015, 0.33), head=(0, 0.04, 0.415),
               elbows=((-0.1, 0.05, 0.25), (0.1, 0.05, 0.25)), hands=((-0.065, 0.12, 0.3), (0.065, 0.12, 0.3)))
    return p


def regarde_loin():  # elbows on a fence, chin up, one foot crossed behind the other
    fr = Frame(yaw=20)
    p = [fr.box((-0.2, 0.17, 0.0), 0.035, 0.035, 0.28, "darkwood"), fr.box((0.2, 0.17, 0.0), 0.035, 0.035, 0.28, "darkwood"),
         fr.box((0, 0.17, 0.2), 0.025, 0.46, 0.03, "wood"), fr.box((0, 0.17, 0.1), 0.025, 0.46, 0.03, "wood")]
    p += stand(fr, hip=(0, -0.02, 0.2), chest=(0, 0.06, 0.32), head=(0.01, 0.1, 0.43),
               knees=((-0.035, -0.02, 0.1), (0.035, 0.0, 0.1)), feet=((-0.035, -0.05, 0.0), (0.02, 0.0, 0.0)),
               elbows=((-0.09, 0.14, 0.24), (0.09, 0.14, 0.24)), hands=((-0.055, 0.17, 0.235), (0.055, 0.17, 0.235)))
    return p


def joue_chat():  # crouches and holds a hand out to a cat sitting in front of him
    fr = Frame(yaw=-25)
    cat = fr.blob((0.11, 0.3, 0.0), 0.05, 0.1, "stone")
    cat += [fr.cone((0.11 + s, 0.3, 0.095), (0.11 + s, 0.305, 0.13), 0.014, 0.0, "stone") for s in (-0.022, 0.022)]
    cat.append(fr.cone((0.15, 0.27, 0.012), (0.17, 0.24, 0.05), 0.014, 0.01, "stone"))
    p = person(fr, hip=(0, -0.05, 0.1), chest=(0, 0.0, 0.24), head=(0, 0.04, 0.335),
               knees=((-0.06, 0.07, 0.15), (0.06, 0.07, 0.15)), feet=((-0.06, 0.0, 0.0), (0.06, 0.0, 0.0)),
               elbows=((-0.09, 0.07, 0.16), (0.09, 0.1, 0.15)), hands=((-0.05, 0.1, 0.13), (0.1, 0.2, 0.1)))
    return p + cat


def discutent():  # a pair, one image: they face each other in profile, one gestures, the other listens
    left, right = Frame(-0.17, 0, 90), Frame(0.17, 0, -90)
    p = stand(left, chest=(0, 0.015, 0.33), head=(0, 0.035, 0.43),
              elbows=((-0.09, 0.09, 0.3), (0.09, -0.01, 0.24)), hands=((-0.07, 0.16, 0.37), (0.095, 0.0, 0.17)))
    p += stand(right, chest=(0, 0.015, 0.33), head=(0, 0.03, 0.42),
               elbows=((-0.09, 0.03, 0.26), (0.09, 0.0, 0.25)), hands=((-0.045, 0.08, 0.33), (0.07, 0.04, 0.2)))
    return p


# slug: (builder, where it stands, from which tier)
POSES = {
    "repos_balaie": (balaie, "devant la porte d'un bâtiment", 1),
    "repos_assis_tonneau": (assis_tonneau, "près du feu de camp, sur la place", 1),
    "repos_porte_panier": (porte_panier, "sur la place, sur un chemin", 1),
    "repos_lit": (lit, "sur la place, ou devant une porte", 3),
    "repos_joue_chat": (joue_chat, "près du chat (là où il s'assoit)", 4),
    "repos_dort": (dort, "contre un mur de bâtiment", 5),
    "repos_discutent": (discutent, "sur la place ou à un carrefour de chemins (paire)", 6),
    "repos_range_caisses": (range_caisses, "devant la ferme ou la grange", 7),
    "repos_puise": (puise, "au puits (le puits fournit la margelle, celle-ci est en maquette)", 8),
    "repos_regarde_loin": (regarde_loin, "contre une clôture, au bord du village", 9),
}

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for slug, (build, where, tier) in POSES.items():
        parts = [{**q, "roof": False} for q in build()]
        spec = {"canvas": "villager", "parts": parts, "light": FRONT_LIGHT}
        px, anchor = fit(parts, "villager")
        spec |= {"pxScale": px, "anchorPx": anchor, "lineScale": r(INK_PX / (8 * px))}
        (OUT / f"{slug}.json").write_text(json.dumps(spec) + "\n")
        print(f"{slug:22s} parts {len(parts):3d} pxScale {px} tier {tier}  {where}")
