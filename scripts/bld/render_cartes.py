#!/usr/bin/env python3
"""Renders the pilot pair from the card specs (gen_cartes.py) at every rank, and checks them.

    python3 scripts/bld/render_cartes.py windmill|observatory|all OUT_ROOT [--round r1]

Writes OUT_ROOT/<building>/<round>/ (never into an existing round):
    stades/<stage>.color.png      the stage (windmill: with its own sails, X pose) on the neutral ground
    stades/<stage>.peinture.png   maquette_peinture: the tower alone, flat magenta, no ground
    stades/<stage>.sil.png, .96.png   black silhouette, and its blur at 96 dp (density 2.75)
    elements/<name>.color.png, .peinture.png   every add-on, teaser, gag, sail sheet, the ribbons
    rangs/rNN.{color,peinture,sil,96}.png   the composed rank (stage + that rank's overlays + sails at 45 degrees)
    strip.png, strip_sil.png      all ranks, phone size (470 px for the 896 canvas)
    controles.json                G-GROW, footprint, canvas, overlays, sizes in dp
Blender goes through isolib, one at a time; every render is cached in ~/.cache/bati-buildings/cartes.
"""

import argparse
import hashlib
import json
import pathlib
import sys

import render_pilot as R  # sets ART_LOOP_DIR and sys.path; imports bldtools, isolib
from PIL import Image, ImageChops, ImageDraw

import gates as Gt
import maquette_peinture as M

T, L, A = R.T, R.L, R.T.A
SPECS = R.SPECS / "pilote"
CACHE = R.CACHE / "cartes"
MAGENTA = M.MAGENTA
PX_DP = 5  # canvas px per dp on screen (cards)
PHONE = 470 / 896  # physical px of the test phone per canvas px

WM_SHEET = {"rough": "rough", "solid": "solid", "grand": "grand", "legendary": "legendary", "mythic": "legendary"}
# (rank label, stage, sails sheet, overlays in paint order). A gag stays in its slot until the next one replaces it.
WINDMILL = [
    ("r1", "rough", "rough", []),
    ("r2", "rough", "rough", ["teaser_r2", "gag_r2"]),
    ("r3", "solid", "solid", []),
    ("r4", "solid", "solid", ["teaser_r4", "gag_r4"]),
    ("r5", "grand", "grand", []),
    ("r6", "grand", "grand_chevalier", ["teaser_r6", "gag_r6"]),
    ("r7", "legendary", "legendary_chevalier", []),
    ("r8", "legendary", "legendary", ["teaser_r8", "addon_ane", "gag_r8"]),
    ("r9", "legendary", "legendary", ["teaser_r9", "addon_ane", "gag_r8"]),
    ("r10", "mythic", "legendary", ["rubans", "gag_r10"]),
]
OBSERVATORY = [
    ("p1", "rough", None, ["gag_1"]),
    ("p2", "solid", None, ["gag_2"]),
    ("p3", "grand", None, ["gag_3"]),
    ("b6", "grand", None, ["teaser_b6", "gag_3"]),
    ("b7", "legendary", None, ["gag_4"]),
    ("b9", "legendary", None, ["teaser_b9", "gag_4"]),
    ("b10", "mythic", None, ["gag_5"]),
]
STAGES = ["rough", "solid", "grand", "legendary", "mythic"]
OPENS = {"windmill": {"r1", "r3", "r5", "r7", "r10"}, "observatory": {"p1", "p2", "p3", "b7", "b10"}}
# card tables: size in dp (w, h) and box (x0, y0, x1, y1) of each sprite, for the "expected" column
EXPECT = {
    "windmill": {"teaser_r2": ((22, 16), (677, 1014, 787, 1094)), "teaser_r4": ((26, 22), (123, 958, 253, 1068)),
                 "teaser_r6": ((18, 32), (403, 250, 493, 410)), "teaser_r8": ((30, 28), (373, 200, 523, 340)),
                 "teaser_r9": ((36, 48), (358, 190, 538, 430)), "addon_ane": ((26, 18), (680, 1010, 810, 1100)),
                 "gag_r2": ((30, 22), None), "gag_r4": ((40, 22), (348, 0, 548, 0)), "gag_r6": ((16, 16), None),
                 "gag_r8": ((20, 16), None), "gag_r10": ((34, 58), None)},
    "observatory": {"teaser_b6": ((30, 44), (215, 660, 365, 880)), "teaser_b9": ((46, 48), (205, 160, 435, 400)),
                    **{f"gag_{i}": ((24, 32), None) for i in range(1, 6)}},
}
# the card's stage measures (top y, H, area in px), to compare the render with
CARD_STAGES = {
    "windmill": {"rough": (565, 627, 241e3), "solid": (417, 775, 327e3), "grand": (279, 913, 417e3),
                 "legendary": (183, 1009, 486e3), "mythic": (67, 1125, 532e3)},
    "observatory": {"rough": (553, 643, 171e3), "solid": (507, 689, 239e3), "grand": (433, 763, 274e3),
                    "legendary": (254, 942, 334e3), "mythic": (73, 1123, 407e3)},
}


def sha(*parts):
    h = hashlib.sha1()
    for p in parts:
        h.update(p if isinstance(p, bytes) else str(p).encode())
    return h.hexdigest()[:12]


def render(spec: dict | pathlib.Path):
    """(RGBA, anchor info) of a spec, cached by its content and by iso_blockout.py."""
    CACHE.mkdir(parents=True, exist_ok=True)
    if isinstance(spec, pathlib.Path):
        spec = json.loads(spec.read_text())
    text = json.dumps(spec, sort_keys=True)
    key = sha(text, (R.ROOT / "scripts" / "iso" / "iso_blockout.py").read_bytes())
    png = CACHE / f"r-{key}.rgba.png"
    if not png.exists():
        src = CACHE / f"r-{key}.json"
        src.write_text(text)
        L.blender(src, png, socle_shadow=False)
    return Image.open(png).convert("RGBA"), json.loads(png.with_name(png.name.replace(".png", "") + ".anchor.json").read_text())


def spec_of(name):
    return json.loads((SPECS / f"{name}.json").read_text())


def bare_of(spec, tag=None, layer=None):
    keep = [p for p in spec["parts"] if not (p.get("_plate") or p.get("_marker"))
            and (tag is None or p.get("_tag") == tag) and (layer is None or p.get("layer") == layer)]
    return dict(spec, parts=keep)


def neutral(im):
    out = Image.new("RGB", im.size, T.BG)
    out.paste(im, (0, 0), im.getchannel("A"))
    return out


def magenta(im):
    out = Image.new("RGB", im.size, MAGENTA)
    out.paste(im, (0, 0), im.getchannel("A"))
    return out


def over(*layers):
    base = layers[0].copy()
    for im in layers[1:]:
        base = Image.alpha_composite(base, im)
    return base


def mask(im):
    return A.binary(im.getchannel("A"))


def bbox_dp(im):
    b = im.getchannel("A").point(lambda v: 255 if v >= 128 else 0).getbbox()
    return None if b is None else {"px": [b[2] - b[0], b[3] - b[1]], "dp": [round((b[2] - b[0]) / PX_DP, 1), round((b[3] - b[1]) / PX_DP, 1)],
                                   "box": list(b)}


def sheet_bbox_dp(spec_name, scale):
    """The extent of a sails sheet's rects part (patch, knight) once on the canvas."""
    spec = spec_of(spec_name)
    out = {}
    for p in spec["parts"]:
        if "rects" not in p:
            continue
        import math
        pts = []
        for blade, d0, d1, u0, u1 in p["rects"]:
            a = math.radians(45 + 90 * blade)
            d, n = (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))
            pts += [(d[0] * da + n[0] * ua, d[1] * da + n[1] * ua) for da, ua in ((d0, u0), (d1, u0), (d1, u1), (d0, u1))]
        w = (max(x for x, _ in pts) - min(x for x, _ in pts)) * 271.5 * scale
        h = (max(y for _, y in pts) - min(y for _, y in pts)) * 271.5 * scale
        out[p["mat"]] = [round(w / PX_DP, 1), round(h / PX_DP, 1)]
    return out


class Building:
    def __init__(self, code, ranks, out):
        self.code, self.ranks, self.out = code, ranks, out
        self.tower = {}  # stage -> (bare RGBA, info)
        self.plated = {}
        self.sheets = {}
        self.over = {}

    # ---- renders
    def load(self):
        for st in STAGES:
            spec = spec_of(f"{self.code}_{st}")
            self.plated[st] = render(spec)
            self.tower[st] = render(bare_of(spec))
        if self.code == "windmill":
            for name in ("rough", "solid", "grand", "grand_chevalier", "legendary_chevalier", "legendary"):
                self.sheets[name] = render(SPECS / f"windmill_sails_{name}.json")[0]
            rub = spec_of("windmill_rubans")
            self.over["rubans_behind"] = render(bare_of(rub, layer="behind"))[0]
            self.over["rubans_front"] = render(bare_of(rub, layer="sousAiles"))[0]
            self.over["rubans"] = render(rub)[0]
        names = {n for _, _, _, ov in self.ranks for n in ov if n != "rubans"}
        for n in sorted(names):
            self.over[n] = render(bare_of(spec_of(f"{self.code}_{n}")))[0]

    def sails(self, stage, sheet, plus=False):
        info = self.tower[stage][1]
        return R.sails_composite(Image.new("RGBA", self.tower[stage][0].size), self.sheets[sheet], info["pivot"], info["sailsScale"], plus)

    def compose(self, stage, sheet, overlays, paint=False):
        """tower, overlays (the ribbons' front half under the gag), sails at 45 degrees."""
        tower = self.tower[stage][0]
        if paint:
            tower = M.render_rgba(f"pilote/{self.code}_{stage}")
        layers = [tower]
        if "rubans" in overlays:
            layers = [self.over["rubans_behind"], tower, self.over["rubans_front"]]
        for n in overlays:
            if n != "rubans":
                layers.append(self.over[n])
        if sheet:
            layers.append(self.sails(stage, sheet))
        return over(*layers)


def analyse(b: Building, steps, rank_images):
    """The controls. steps: the G-GROW input; rank_images: label -> composed RGBA."""
    c = {}
    seq = []
    for label, st, sheet, ov in b.ranks:
        kind = "stage" if label in OPENS[b.code] else "rank"
        seq.append((label, kind, mask(rank_images[label])))
    problems = Gt.grow(seq, margin=1)
    rows, prev, prev_stage = [], None, None
    for label, kind, m in seq:
        area, h, box = Gt.measure(m)
        row = {"rang": label, "type": kind, "aire": area, "H": h, "haut_y": box[1], "bbox": list(box)}
        if prev_stage is not None and kind == "stage":
            pa, ph, _ = Gt.measure(prev_stage)
            row["croissance_aire"] = round(area / pa - 1, 4)
            row["croissance_H"] = round(h / ph - 1, 4)
            row["ok"] = area >= pa * 1.15 or h >= ph * 1.10
        if prev is not None and kind == "rank":
            xor = A.count(ImageChops.difference(prev, m))
            row["xor"] = round(xor / max(area, Gt.measure(prev)[0]), 4)
            row["ok"] = row["xor"] >= 0.015
        rows.append(row)
        prev = m
        if kind == "stage":
            prev_stage = m
    c["g_grow"] = {"seuils": "stade: +15 % d'aire ou +10 % de H; rang: XOR >= 1,5 %", "problemes": problems, "rangs": rows}
    # the pure stages (tower + its sails, no overlay), against the card's table
    stg, prevm, prow = [], None, []
    for st in STAGES:
        im = b.compose(st, WM_SHEET[st] if b.code == "windmill" else None, [])
        m = mask(im)
        area, h, box = Gt.measure(m)
        row = {"stade": st, "aire": area, "H": h, "haut_y": box[1], "carte": dict(zip(("haut_y", "H", "aire"), CARD_STAGES[b.code][st]))}
        if prevm is not None:
            pa, ph, _ = Gt.measure(prevm)
            row["croissance_aire"], row["croissance_H"] = round(area / pa - 1, 4), round(h / ph - 1, 4)
            row["ok"] = area >= pa * 1.15 or h >= ph * 1.10
        prow.append(row)
        stg.append((st, "stage", m))
        prevm = m
    c["g_grow_stades_nus"] = {"problemes": Gt.grow(stg, margin=1), "stades": prow}
    # footprint: contact mask and anchor of the plated renders against rough
    ref, ref_anchor = T.contact(b.cache_path("rough"))
    fp = {}
    for st in STAGES:
        m, anchor = T.contact(b.cache_path(st))
        fp[st] = {"iou": round(A.iou(m, ref), 4), "ancre": list(anchor), "ancre_ecart_px": max(abs(anchor[0] - ref_anchor[0]), abs(anchor[1] - ref_anchor[1]))}
        info = b.plated[st][1]
        spec = spec_of(f"{b.code}_{st}")
        ground, air = [], []
        for vol, part in zip(info["volumes"], spec["parts"]):
            v = vol["vertices"]
            out = min(p[0] for p in v) < -1e-4 or max(p[0] for p in v) > 2 + 1e-4 or min(p[1] for p in v) < -1e-4 or max(p[1] for p in v) > 2 + 1e-4
            if out and not part.get("_marker"):
                (air if min(p[2] for p in v) > 0.2 else ground).append(f"{part['type']} {part.get('mat')} z{min(p[2] for p in v):.2f}")
        fp[st]["hors_emprise_au_sol"] = ground
        fp[st]["hors_emprise_en_l_air"] = air
        bare = mask(b.tower[st][0])
        plate = mask(b.plated[st][0])
        band = Image.new("L", bare.size, 0)
        draw = ImageDraw.Draw(band)
        bb = bare.getbbox()
        for x in range(bb[0], bb[2]):
            col = bare.crop((x, 0, x + 1, bare.height)).getbbox()
            if col:
                draw.line((x, max(0, col[3] - 12), x, col[3] - 1), fill=255)
        n = A.count(band)
        fp[st]["bas_du_batiment_dans_la_dalle"] = round(A.count(ImageChops.multiply(band, A.dilate(plate, 2))) / max(n, 1), 4)
    c["empreinte"] = {"seuils": "IoU >= 0,98, ancre a 1 px, rien au sol hors 2 x 2", "stades": fp,
                      "ok": all(v["iou"] >= 0.98 and v["ancre_ecart_px"] <= 1 and not v["hors_emprise_au_sol"] for v in fp.values())}
    return c


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("which")
    ap.add_argument("root", type=pathlib.Path)
    ap.add_argument("--round", default="r1")
    a = ap.parse_args(argv)
    for code, ranks in (("windmill", WINDMILL), ("observatory", OBSERVATORY)):
        if a.which in (code, "all"):
            run(code, ranks, a.root / code / a.round)
    return 0


def run(code, ranks, out):
    if out.exists() and any(out.iterdir()):
        raise SystemExit(f"{out} is not empty: a round is never overwritten")
    for d in ("stades", "elements", "rangs"):
        (out / d).mkdir(parents=True, exist_ok=True)
    b = Building(code, ranks, out)

    def cache_path(st):  # the plated render's cached file, for T.contact
        spec = spec_of(f"{code}_{st}")
        key = sha(json.dumps(spec, sort_keys=True), (R.ROOT / "scripts" / "iso" / "iso_blockout.py").read_bytes())
        return CACHE / f"r-{key}.rgba.png"

    b.cache_path = cache_path
    b.load()
    sil_files = {}

    def save_sil(im, prefix):
        T.silhouette_of(mask(im), str(prefix))

    # stages
    for st in STAGES:
        sheet = WM_SHEET[st] if code == "windmill" else None
        full = b.compose(st, sheet, [])
        neutral(full).save(out / "stades" / f"{st}.color.png", optimize=True)
        pe = M.render_rgba(f"pilote/{code}_{st}")
        magenta(pe).save(out / "stades" / f"{st}.peinture.png", optimize=True)
        save_sil(full, out / "stades" / st)
    # elements: add-ons, teasers, gags, sail sheets, ribbons
    for n, im in b.over.items():
        if n in ("rubans_behind", "rubans_front"):
            continue
        neutral(im).save(out / "elements" / f"{n}.color.png", optimize=True)
        magenta(M.render_rgba(f"pilote/{code}_{n}")).save(out / "elements" / f"{n}.peinture.png", optimize=True)
    for n, im in b.sheets.items():
        neutral(im).save(out / "elements" / f"sails_{n}.color.png", optimize=True)
        magenta(M.render_rgba(f"pilote/windmill_sails_{n}")).save(out / "elements" / f"sails_{n}.peinture.png", optimize=True)
    # ranks
    rank_images = {}
    for label, st, sheet, ov in ranks:
        full = b.compose(st, sheet, ov)
        rank_images[label] = full
        neutral(full).save(out / "rangs" / f"{label}.color.png", optimize=True)
        paint = b.compose(st, sheet, ov, paint=True)
        magenta(paint).save(out / "rangs" / f"{label}.peinture.png", optimize=True)
        save_sil(full, out / "rangs" / label)
    ctl = analyse(b, ranks, rank_images)
    # canvas: every composed rank inside, nothing above y = 64, sails in the + pose too
    canvas = {"seuil": "dans le canevas (marge 1 px), haut >= 64", "rangs": {}}
    for label, st, sheet, ov in ranks:
        box = Gt.measure(mask(rank_images[label]))[2]
        row = {"bbox": list(box), "ok": box[0] >= 1 and box[1] >= 64 and box[2] <= 895 and box[3] <= 1343}
        if sheet:
            plus = b.sails(st, sheet, plus=True).getchannel("A").point(lambda v: 255 if v >= 128 else 0).getbbox()
            row["ailes_plus_bbox"] = list(plus)
            row["ok"] = row["ok"] and plus[0] >= 1 and plus[1] >= 64 and plus[2] <= 895 and plus[3] <= 1343
        canvas["rangs"][label] = row
    ctl["canevas"] = canvas
    # overlays: part of the composed silhouette they cover
    sur = {"seuil": "<= 25 % de la silhouette, 3 surcouches au plus", "rangs": {}}
    for label, st, sheet, ov in ranks:
        total = A.count(mask(rank_images[label]))
        areas = {n: A.count(mask(b.over[n])) for n in ov}
        part = sum(areas.values()) / total
        sur["rangs"][label] = {"surcouches": list(ov), "aires_px": areas, "part": round(part, 4), "ok": part <= 0.25 and len(ov) <= 3}
    ctl["surcouches"] = sur
    # sizes in dp
    dp = {"seuils": "teaser >= 16 dp de haut, ajout et figure >= 14 dp de haut, caleçon >= 10 dp, rubans <= 10,9 dp", "elements": {}}
    for n, im in b.over.items():
        if n.startswith("rubans_"):
            continue
        row = bbox_dp(im)
        exp = EXPECT[code].get(n)
        if exp:
            row["carte_dp"] = list(exp[0])
            if exp[1] and exp[1][3]:
                row["carte_boite"] = list(exp[1])
        if n.startswith("teaser"):
            row["ok"] = row["dp"][1] >= 16
        if n != "rubans":
            figs = {}
            spec = spec_of(f"{code}_{n}")
            for tg in sorted({p["_tag"] for p in spec["parts"] if p.get("_tag")}):
                f = bbox_dp(render(bare_of(spec, tag=tg))[0])
                figs[tg] = f["dp"]
            if figs:
                row["figures_dp"] = figs
                row["figures_ok"] = all(h >= 14 for _, h in figs.values())
                row["ok"] = row["figures_ok"] and len(figs) <= 2
        dp["elements"][n] = row
    if code == "windmill":
        rub = spec_of("windmill_rubans")
        rmax = max(p["r"] for p in rub["parts"])
        dp["elements"]["rubans"]["epaisseur_dp"] = round(2 * rmax * 271.5 / PX_DP, 1)
        dp["elements"]["rubans"]["ok"] = dp["elements"]["rubans"]["epaisseur_dp"] <= 10.9
        dp["caleçon_dp"] = sheet_bbox_dp("windmill_sails_rough", WM_SCALE_ROUGH(b))
        dp["chevalier_sur_aile_px_ecran"] = {"grand": round(76 * b.tower["grand"][1]["sailsScale"], 1),
                                             "legendary": round(73 * b.tower["legendary"][1]["sailsScale"], 1)}
    ctl["tailles_dp"] = dp
    (out / "controles.json").write_text(json.dumps(ctl, indent=1, ensure_ascii=False) + "\n")
    strips(b, rank_images, out)
    summary(ctl)


def WM_SCALE_ROUGH(b):
    return b.tower["rough"][1]["sailsScale"]


def strips(b, rank_images, out):
    w, h = round(896 * PHONE), round(1344 * PHONE)
    labels = [r[0] for r in b.ranks]
    col = Image.new("RGB", (w * len(labels), h), T.BG)
    sil = Image.new("RGB", (w * len(labels), h * 2), (255, 255, 255))
    for i, lab in enumerate(labels):
        col.paste(neutral(rank_images[lab]).resize((w, h), Image.LANCZOS), (i * w, 0))
        ImageDraw.Draw(col).text((i * w + 6, 6), lab, fill=(0, 0, 0))
        sil.paste(Image.open(out / "rangs" / f"{lab}.sil.png").resize((w, h), Image.LANCZOS), (i * w, 0))
        small = Image.open(out / "rangs" / f"{lab}.96.png")
        sil.paste(small, (i * w + (w - small.width) // 2, h + (h - small.height) // 2))
        ImageDraw.Draw(sil).text((i * w + 6, 6), lab, fill=(0, 0, 0))
    col.save(out / "strip.png", optimize=True)
    sil.save(out / "strip_sil.png", optimize=True)


def summary(ctl):
    g = ctl["g_grow"]
    print("G-GROW rangs:", g["problemes"] or "ok")
    for r in g["rangs"]:
        print(" ", {k: r[k] for k in ("rang", "aire", "H", "haut_y") + tuple(k for k in ("croissance_aire", "croissance_H", "xor", "ok") if k in r)})
    print("G-GROW stades nus:", ctl["g_grow_stades_nus"]["problemes"] or "ok")
    print("empreinte ok:", ctl["empreinte"]["ok"], {k: (v["iou"], v["ancre_ecart_px"]) for k, v in ctl["empreinte"]["stades"].items()})
    print("canevas:", {k: v["ok"] for k, v in ctl["canevas"]["rangs"].items()})
    print("surcouches:", {k: (v["part"], v["ok"]) for k, v in ctl["surcouches"]["rangs"].items()})
    print("dp:", {k: (v["dp"], v.get("ok")) for k, v in ctl["tailles_dp"]["elements"].items()})


if __name__ == "__main__":
    sys.exit(main())
