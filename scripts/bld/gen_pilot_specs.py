#!/usr/bin/env python3
"""Writes the pilot maquette specs (windmill and observatory, five stages each) into
scripts/iso/blockouts/bld/, from docs/designs/village-buildings/cards/{windmill,observatory}.md.

    python3 scripts/bld/gen_pilot_specs.py

A new folder on purpose: the stages next to it (`windmill_rough.json`...) are what the app and
heights.py read today, and every glob over blockouts/ is flat (*.json), so bld/ is never seen by them.
Generated, not hand-written, because the cards ask for rings of 16 `cyl` segments, cone-stack
spheres and a tripod that nobody should type. Re-running overwrites bld/ only.

Spec extras the Blender script ignores (it reads parts with .get): `_plate` (the 2x2 ground slab that
gives every stage the same full-diamond contact), `_marker` (gag slot and keeper stand-ins, flat or
tiny). render_pilot.py drops both from the black silhouettes: the ground patch and a stand-in for a
painted figure are not the building.
"""

import json
import math
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "iso" / "blockouts" / "bld"
AXIS = [0.612, 0.612, 0.5]  # the sails' axle points at the camera (windmill_sails.json doc)


def vec(v):
    return [round(float(x) + 0.0, 4) for x in v]


def sub(a, b):
    return [x - y for x, y in zip(a, b)]


def add(a, b):
    return [x + y for x, y in zip(a, b)]


def mul(a, k):
    return [x * k for x in a]


def norm(a):
    return math.sqrt(sum(x * x for x in a))


def unit(a):
    n = norm(a)
    return [x / n for x in a]


def cross(a, b):
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]


def part(kind, mat, **kw):
    p = {"type": kind, "mat": mat}
    for k, v in kw.items():
        if k in ("at", "size", "center", "axis"):
            v = vec(v)
        elif isinstance(v, float):
            v = round(v + 0.0, 4)
        p[k] = v
    return p


def box(at, size, mat, **kw):
    return part("box", mat, at=at, size=size, **kw)


def cyl(center, r, h, mat, **kw):
    return part("cyl", mat, center=center, r=r, h=h, **kw)


def cone(center, r, r2, h, mat, **kw):
    return part("cone", mat, center=center, r=r, r2=r2, h=h, **kw)


def seg(a, b, r, mat, **kw):
    """A cylinder from point a to point b (the generated `cyl` segment the cards ask for)."""
    d = sub(b, a)
    return cyl(a, r, norm(d), mat, axis=unit(d), **kw)


def ring(center, R, normal, n, r, mat):
    """A ring of n `cyl` segments, radius R, in the plane whose normal is `normal`."""
    nrm = unit(normal)
    ref = [0, 0, 1] if abs(nrm[2]) < 0.9 else [1, 0, 0]
    e1 = unit(cross(nrm, ref))
    e2 = cross(nrm, e1)
    pts = [add(center, add(mul(e1, R * math.cos(2 * math.pi * k / n)), mul(e2, R * math.sin(2 * math.pi * k / n))))
           for k in range(n)]
    return [seg(pts[k], pts[(k + 1) % n], r, mat) for k in range(n)]


def ball(center, R, n, mat, band_mat=None, **kw):
    """A sphere as a stack of n cone frustums (the card's workaround); the two around the equator
    take band_mat when given."""
    cx, cy, cz = center
    out = []
    for i in range(n):
        p0, p1 = math.radians(-90 + 180 * i / n), math.radians(-90 + 180 * (i + 1) / n)
        m = band_mat if band_mat and i in (n // 2 - 1, n // 2) else mat
        out.append(cone([cx, cy, cz + R * math.sin(p0)], max(R * math.cos(p0), 0.001), max(R * math.cos(p1), 0.0),
                        R * (math.sin(p1) - math.sin(p0)), m, **kw))
    return out


def plate():
    return box([0, 0, 0], [2, 2, 0.04], "stone", _plate=True)


def write(name, parts, **extra):
    OUT.mkdir(parents=True, exist_ok=True)
    body = json.dumps({"canvas": "building2x2", **extra}, separators=(", ", ": "))[:-1]
    lines = ",\n".join("  " + json.dumps(p, separators=(", ", ": ")) for p in parts)
    (OUT / f"{name}.json").write_text(body + ',\n "parts": [\n' + lines + "\n ]\n}\n", encoding="utf-8")


# ---------------------------------------------------------------- windmill

WINDMILL = {
    # stage: fut r0, r1, h | cap base z, r, top z, mat | pivot, sails scale, sail width
    "rough": dict(f=(0.66, 0.54, 1.04), cap=(1.2, 0.74, 1.7, "thatch"), pivot=(1.4, 1.4, 1.5), scale=0.85, width=0.30),
    "solid": dict(f=(0.66, 0.52, 1.54), cap=(1.7, 0.78, 2.32, "thatch"), pivot=(1.49, 1.49, 2.08), scale=1.0, width=0.30),
    "grand": dict(f=(0.66, 0.50, 2.0), cap=(2.16, 0.84, 2.88, "tile"), pivot=(1.54, 1.54, 2.59), scale=1.15, width=0.30),
    "legendary": dict(f=(0.66, 0.48, 2.29), cap=(2.45, 0.88, 3.17, "tile"), pivot=(1.55, 1.55, 2.88), scale=1.18, width=0.50),
    "mythic": dict(f=(0.66, 0.48, 2.29), cap=(2.45, 0.88, 3.17, "tile"), pivot=(1.55, 1.55, 2.88), scale=1.18, width=0.50),
}
WM_ORDER = list(WINDMILL)


def windmill(stage):
    s = WINDMILL[stage]
    k = WM_ORDER.index(stage)
    r0, r1, fh = s["f"]
    zc, rc, ztop, cmat = s["cap"]

    def rf(z):
        return r0 + (r1 - r0) * (z - 0.16) / fh

    P = [plate(),
         cyl([1, 1, 0.04], 0.78, 0.12, "stone"),
         cone([1, 1, 0.16], r0, r1, fh, "stone"),
         cone([1, 1, zc], rc, 0.04, ztop - zc, cmat)]
    # door on +y with its step, window on +x
    P.append(box([0.82, 1.62, 0.16], [0.36, 0.06, 0.55], "darkwood", accroche="porte"))
    P.append(box([0.78, 1.64, 0.16], [0.44, 0.14, 0.05], "stone"))
    P.append(box([1 + rf(0.85) - 0.03, 0.9, 0.73], [0.06, 0.2, 0.24], "amber"))
    # axle toward the camera, ending at the sails' pivot
    P.append(cyl(sub(s["pivot"], mul(AXIS, 0.46)), 0.08, 0.46, "wood" if stage == "rough" else "iron", axis=AXIS))
    # tail pole: foot (1.88, 0.12) to the underside of the cap at (1.45, 0.55), and two struts
    P.append(seg([1.88, 0.12, 0.04], [1.45, 0.55, zc - 0.02], 0.08, "wood"))
    for sgn in (-1, 1):
        a = math.radians(-45 + sgn * 15)
        zs = zc - 0.4
        P.append(seg([1 + (rf(zs) - 0.01) * math.cos(a), 1 + (rf(zs) - 0.01) * math.sin(a), zs],
                     [1 + 0.70 * math.cos(a), 1 + 0.70 * math.sin(a), zc - 0.02], 0.04, "wood"))
    if k >= 1:  # capstan at the pole's foot, sack pile, pennant mast
        P.append(cyl([1.82, 0.18, 0.04], 0.16, 0.12, "wood"))
        P.append(box([1.66, 0.16, 0.16], [0.32, 0.04, 0.04], "wood"))
        P.append(box([1.80, 0.02, 0.2], [0.04, 0.32, 0.04], "wood"))
        P.append(cone([0.4, 1.82, 0.04], 0.14, 0.10, 0.16, "canvas"))
        P.append(cone([0.4, 1.82, 0.2], 0.10, 0.05, 0.14, "canvas"))
        P.append(cone([0.6, 1.8, 0.04], 0.10, 0.06, 0.14, "canvas"))
        mast_top = {1: 2.8, 2: 3.3, 3: 3.7, 4: 3.8}[k]
        P.append(cyl([1, 1, ztop - 0.02], 0.035, mast_top - ztop + 0.02, "iron" if k == 4 else "wood"))
        pz = mast_top - (0.2 if k < 3 else 0.45)
        P.append(box([1.03, 0.985, pz], [0.3, 0.02, 0.15], "banner"))
    if k >= 2:  # gallery with rail, oven and chimney, banner
        P.append(cyl([1, 1, 1.40], 0.80, 0.05, "wood"))
        for i in range(16):
            if i == 14:  # the tail pole passes here
                continue
            a = math.radians(22.5 * i)
            P.append(cyl([1 + 0.77 * math.cos(a), 1 + 0.77 * math.sin(a), 1.45], 0.025, 0.22, "wood"))
        pts = [[1 + 0.77 * math.cos(math.radians(22.5 * i)), 1 + 0.77 * math.sin(math.radians(22.5 * i)), 1.65]
               for i in range(16)]
        for i in range(16):
            if i in (13, 14):
                continue
            P.append(seg(pts[i], pts[(i + 1) % 16], 0.025, "wood"))
        P.append(box([0.44, 1.57, 0.9], [0.22, 0.05, 0.5], "banner"))
        P.append(box([0.08, 1.28, 0.04], [0.38, 0.38, 0.36], "stone"))
        P.append(cyl([0.18, 1.5, 0.4], 0.12, 0.85, "stone", accroche="cheminee"))
        P.append(box([0.2, 1.64, 0.1], [0.14, 0.04, 0.14], "amber"))
    if k >= 3:  # vane (a plain arrow toward the screen) and the carved crest
        d = [0.7071, 0.7071, 0]
        P.append(cyl([1 - 0.45 * d[0], 1 - 0.45 * d[1], 3.55], 0.03, 0.9, "iron", axis=d))
        P.append(cone([1 + 0.45 * d[0], 1 + 0.45 * d[1], 3.55], 0.07, 0.0, 0.16, "iron", axis=d))
        P.append(box([1 - 0.4 * d[0] - 0.1, 1 - 0.4 * d[1] - 0.01, 3.45], [0.2, 0.02, 0.2], "iron", rotZ=45))
        P.append(box([0.9, 1.57, 0.8], [0.2, 0.05, 0.24], "amber" if k == 4 else "plaster"))
    # stand-ins: the keeper (card: cyl r 0.08 h 0.33 at (0.72, 1.76)) and the gag slot, a flat disc
    P.append(cyl([0.72, 1.76, 0.04], 0.08, 0.33, "banner", _marker="gardien"))
    P.append(cyl([1.7, 1.7, 0.04], 0.295, 0.01, "banner", _marker="gag"))
    write(f"windmill_{stage}", P, pivot=vec(s["pivot"]), sailsScale=s["scale"])
    (OUT / f"windmill_sails_{stage}.json").write_text(
        json.dumps({"canvas": "sails", "parts": [
            {"type": "sails", "length": 1.25, "width": s["width"], "hub": 0.09, "mat": "canvas"}]}) + "\n",
        encoding="utf-8")


# ---------------------------------------------------------------- observatory

OB_ORDER = ["rough", "solid", "grand", "legendary", "mythic"]
TIP_XY = (0.5, 1.84)  # card: (0.5, 1.85); 0.01 less keeps the tip ring inside the 2x2
FOOT_XY = (1.1, 1.1)
HU = unit([TIP_XY[0] - FOOT_XY[0], TIP_XY[1] - FOOT_XY[1], 0])  # horizontal direction of the telescope
DIAG = 0.7071


def telescope(foot_z, tip_z, r_start, mat, sleeve=False, foot_xy=FOOT_XY, tip_xy=TIP_XY):
    foot = [foot_xy[0], foot_xy[1], foot_z]
    tip = [tip_xy[0], tip_xy[1], tip_z]
    d = sub(tip, foot)
    L, u = norm(d), unit(d)
    radii = [r_start + (0.13 - r_start) * i / 3 for i in range(4)]
    P = [cone(add(foot, mul(d, i / 3)), radii[i], radii[i + 1], L / 3 * 1.02, mat, axis=u) for i in range(3)]
    for i in (1, 2, 3):  # a ring at each joint and at the end
        P.append(cyl(sub(add(foot, mul(d, i / 3)), mul(u, 0.02)), 0.16, 0.04, "iron", axis=u))
    P.append(cyl(sub(foot, mul(u, 0.2)), 0.12, 0.2, "iron", axis=u))  # counterweight
    if sleeve:  # a sleeve over the last 0.34 of the tube, so the tip reads thick in black
        P.append(cyl(sub(tip, mul(u, 0.34)), 0.16, 0.34, "iron", axis=u))
    return P


def sky_map(z0, c=(1.6, 0.6)):
    """Sky map on an easel (rough) or fixed to the terrace (solid on), at the right edge (1.6, 0.6);
    from legendary on it moves to (1.65, 0.95), where the column and the titan no longer hide behind it."""
    P = [box([c[0] - 0.2, c[1] - 0.015, z0 + 0.13], [0.4, 0.03, 0.34], "canvas", rotZ=-45)]
    for off in (-0.12, 0.12):
        P.append(cyl([c[0] + off * DIAG, c[1] - off * DIAG, z0], 0.02, 0.13, "wood"))
    return P


def observatory(stage):
    k = OB_ORDER.index(stage)
    P = [plate()]
    P.append(box([0.84, 1.82, 0.04], [0.32, 0.06, 0.38 if k == 0 else 0.55], "darkwood", accroche="porte"))
    if k == 0:
        P.append(cyl([1, 1, 0.04], 0.85, 0.46, "stone"))
        P.append(cyl([1, 1, 0.5], 0.8, 0.03, "wood"))
        apex = add([FOOT_XY[0], FOOT_XY[1], 1.55], mul(unit([TIP_XY[0] - FOOT_XY[0], TIP_XY[1] - FOOT_XY[1], 1.0]), 0.16))
        for lx, ly in ((0.746, 1.454), (1.454, 0.746), (0.26, 0.68)):  # tripod, apex at z 1.666
            P.append(seg([lx, ly, 0.53], apex, 0.05, "wood"))
        P += telescope(1.55, 2.55, 0.09, "wood")
        P += sky_map(0.53)
    else:
        P.append(cyl([1, 1, 0.04], 0.85, 0.96, "stone"))
        P.append(box([1.82, 0.82, 0.45], [0.06, 0.2, 0.28], "amber"))
        P.append(box([1.22, 1.76, 0.45], [0.16, 0.06, 0.28], "amber"))
        P += sky_map(1.0, (1.65, 0.95) if k >= 3 else (1.6, 0.6))
        # neck r 0.60 on the drum, then a round dome on the same centre: the step shows in black
        P.append(cyl([1.1, 1.1, 1.0], 0.60, 0.45, "stone"))
        for z, ra, rb, h in ((1.45, 0.60, 0.52, 0.30), (1.75, 0.52, 0.30, 0.22), (1.97, 0.30, 0.0, 0.08)):
            P.append(cone([1.1, 1.1, z], ra, rb, h, "iron", roof=True))
        P += telescope(1.1, {1: 2.8}.get(k, 3.2), 0.075, "darkwood" if k == 1 else "plaster", sleeve=k >= 2)
        if k == 1:  # pennant on the dome's apex
            P.append(cyl([1.1, 1.1, 2.05], 0.025, 0.55, "iron"))
            P.append(box([1.12, 1.09, 2.40], [0.26, 0.02, 0.12], "banner"))
        else:  # the slit and the shutters are paint only; pennant on the terrace
            P.append(cyl([1.7, 1.25, 1.0], 0.025, 0.75, "iron"))
            P.append(box([1.72, 1.24, 1.55], [0.26, 0.02, 0.12], "banner"))
            P.append(box([0.42, 1.66, 0.42], [0.18, 0.05, 0.45], "banner"))  # banner on the drum, left of the door
    if k == 3:  # short thick column on a wide plinth, a large low armillary with two planets
        P.append(cyl([1.30, 0.5, 1.0], 0.26, 0.12, "stone"))
        P.append(cyl([1.30, 0.5, 1.12], 0.2, 0.48, "stone"))
        sc = [1.34, 0.52, 2.30]
        P.append(seg([1.30, 0.5, 1.55], [1.34, 0.52, 1.88], 0.07, "stone"))
        for n in ([DIAG, DIAG, 0], [0, 0, 1], [0.5, -0.5, DIAG]):
            P += ring(sc, 0.42, n, 16, 0.035, "iron")
        P += ball(sc, 0.1, 4, "iron")
        P += ball([sc[0], sc[1], sc[2] + 0.5], 0.1, 6, "plaster")  # planet 1, on top
        P += ball([sc[0] + 0.5, sc[1] + 0.05, sc[2] - 0.05], 0.07, 6, "banner")  # planet 2, on the right
    if k == 4:  # the seated titan (a mannequin) and a solid globe, with air around head and arms
        T, G = [1.30, 0.35], [1.42, 0.47, 3.62]
        P.append(cyl([T[0], T[1], 1.0], 0.20, 0.4, "stone"))
        P.append(cone([T[0], T[1], 1.4], 0.16, 0.26, 0.8, "tile", roof=False))
        P += ball([T[0], T[1], 2.42], 0.15, 6, "tile", roof=False)  # head
        P.append(seg([T[0], T[1], 1.62], [1.76, 0.18, 1.55], 0.13, "tile", roof=False))  # thigh
        P.append(seg([1.76, 0.18, 1.55], [1.76, 0.18, 0.04], 0.10, "tile", roof=False))  # shin
        P.append(box([1.62, 0.08, 0.04], [0.32, 0.20, 0.12], "tile", roof=False))  # foot
        for sh, el, ha in (([1.50, 0.22, 2.12], [1.85, 0.22, 2.55], [1.68, 0.27, 3.28]),
                           ([1.10, 0.48, 2.12], [0.90, 0.80, 2.75], [1.14, 0.74, 3.3])):
            P.append(seg(sh, el, 0.10, "tile", roof=False))
            P.append(seg(el, ha, 0.10, "tile", roof=False))
        P += ball(G, 0.40, 8, "plaster", band_mat="iron")
    if k >= 3:  # the crest above the door: carved, then lit
        P.append(box([0.92, 1.83, 0.7], [0.16, 0.05, 0.2], "amber" if k == 4 else "plaster"))
    P.append(cyl([0.22, 1.78, 0.04], 0.21, 0.01, "banner", _marker="gag"))
    write(f"observatory_{stage}", P)


if __name__ == "__main__":
    for st in WM_ORDER:
        windmill(st)
    for st in OB_ORDER:
        observatory(st)
    print(f"{len(list(OUT.glob('*.json')))} specs in {OUT}")
