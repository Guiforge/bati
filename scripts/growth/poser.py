#!/usr/bin/env python3
"""G11: the painted quarter pieces, stumps and countryside, laid in the real scene.

    poser.py          writes components/village/iso/pieces.ts (the table the props path reads) and copies the finals' webp
                      into assets/images/village/iso/accessoires/ as piece_<id>.webp and piece_<id>.nuit.webp

Starting positions come from montage_plan.py (the montage that worked, its protect mask resolving every piece against the player's
buildings). A piece is a prop: an image, a foot (a grid point, the bottom of the picture) and a first tier. Frame of the montage:
foyer=campfire zoom 0.45, 1.18125 px a dp, the campfire [12, 11] at (540, 1255). No FLUX, 0 $."""
import json
import math
import pathlib
import statistics
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "growth"))
import montage_plan as MP
import numpy as np
from PIL import Image

FIN = MP.FIN
FINAL = ROOT / "docs/designs/village/growth/scratch/final"
ASSETS = ROOT / "assets/images/village/iso/accessoires"
OUT = ROOT / "components/village/iso/piecesPosees.ts"
K = MP.K  # frame px a dp
HX, HY = MP.HX, MP.HY
PIED_K = 212 / 220  # the props' foot, a share of the canvas height (alentours.ts TOILE_ACCESSOIRE)
MARGE = 0.5  # cells of ground left clear round a countryside piece
MAX_PX_DP = 4.5  # native px a dp kept in the copied files (the props' own is 4.17)

# every id of the finals that reaches the scene
FINALS = ["A1a", "A1b", "A1c", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "B5", "B6", "bourg_F_v1", "ferme3_F_v1", "ferme3_F_v2",
          "ferme4_F_v1", "hameau1_F_v2", "hameau2_F_v1", "copeaux_1", "copeaux_2", "mat", "souche_1", "souche_2", "souche_3", "souche_4", "souche_5"]


def lum(im):
    a = np.asarray(im).astype(float)
    return float((0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2])[a[..., 3] > 200].mean())


def lift(im, g, k=1.0):
    """A levels curve of exponent g (under 1 lifts), faded out under the ink line (luma 25 to 70) so the outline keeps its black; roofs warmed a touch. Alpha untouched."""
    a = np.asarray(im).astype(float)
    rgb = a[..., :3]
    y = (0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2])[..., None]
    t = np.clip((y - 25 * k) / (45 * k), 0, 1)
    t = t * t * (3 - 2 * t)
    up = 255 * (rgb / 255) ** g * np.array([1.05, 1.0, 0.94])
    out = rgb + (np.minimum(up, 255) - rgb) * t
    return Image.fromarray(np.dstack([out, a[..., 3]]).clip(0, 255).astype(np.uint8), "RGBA")


def gamma_for(im, target, k=1.0):
    """The exponent that brings the picture's mean luminance to `target` (bisection)."""
    lo, hi = 0.3, 1.0
    for _ in range(18):
        mid = (lo + hi) / 2
        lo, hi = (mid, hi) if lum(lift(im, mid, k)) > target else (lo, mid)
    return (lo + hi) / 2


def a_median(suf=".jour.webp"):
    return statistics.median(lum(Image.open(FINAL / f"{i}{suf}").convert("RGBA")) for i in FINALS if i.startswith(("A", "B")))


def ident(i):
    return "piece_" + i.lower()


def info(i):
    return json.loads((FINAL / f"{i}.json").read_text())["size"]


def grid(x, y):
    """Frame px to a grid point (corners)."""
    u = (x - MP.CX) / HX + 1
    v = (y - MP.CY) / HY + 23
    return ((u + v) / 2, (v - u) / 2)


def fit(i, wmax, hmax):
    w, h = info(i)
    f = min(wmax / w, hmax / h)
    return w * f, h * f


# ---------------------------------------------------------------- the montage's pieces, as finals
SIZE = {k: v for k, v in MP.SIZES.items()} | {"ma": (40, 100)}  # the mast: a tall thin piece
TRY = {"N1", "N2", "N3", "N4", "N5", "N6", "Q6"}
# a quarter piece the gates dropped or moved, by (quarter, first tier, rounded montage gx, gy): None drops it, a pair moves it
EDITS = {}
if (ROOT / "scripts/growth/poser_edits.json").exists():
    for k, v in json.loads((ROOT / "scripts/growth/poser_edits.json").read_text()).items():
        EDITS[k] = v

# the order is the draw order of the table; a camp's stump, a retreat's, the quarters' and the countryside's
STUMPS_PX = json.loads((ROOT / "scripts/growth/poser_stumps.json").read_text()) if (ROOT / "scripts/growth/poser_stumps.json").exists() else []
# (first tier, id, frame px centre, mirror)
FARM = json.loads((ROOT / "scripts/growth/poser_f.json").read_text()) if (ROOT / "scripts/growth/poser_f.json").exists() else []


def final_of(concept):
    return concept.split("_")[0]  # A1a_v1 -> A1a


def piece_rows():
    prot = MP.protect_mask()
    base = MP.frame(12)
    rows, dropped = [], []
    for raw in (r for r in MP.pieces_A() if r[6] != "N1"):  # the market is placed by hand (n1)
        kept, drop = MP.resolve([raw], prot, "A", base)
        if kept:
            rows += kept
        elif raw[6] in TRY:  # the montage's hull is a guess: the atelier's gates judge these (N cells, Guillaume: yes wherever no hook is covered)
            first, last, name, size, pos, mirror, why = raw
            rows.append((first, last, name, size, pos, mirror, why, None))
        else:
            dropped += drop
    out = []
    for first, last, name, size, (gx, gy), mirror, why, _xy in rows:
        i = final_of(name)
        key = f"{why}:{first}:{round(gx, 1)}:{round(gy, 1)}"
        if key in EDITS:
            if EDITS[key] is None:
                continue
            gx, gy = EDITS[key]
        wpx, hpx = fit(i, *SIZE[i[:2]])
        out.append(dict(id=i, key=key, first=first, last=last, gx=gx, gy=gy, mirror=mirror, w=wpx, h=hpx, why=why, hors=not why.startswith("N")))
    return out, dropped


N1_FEET = {"stall": (9.5, 12.5), "stall2": (8.3, 13.1), "hall": (8.6, 12.7)}  # grid points: where the picture's bottom stands (etal_1 stood on [9, 12])


def at_foot(i, key, first, last, foot, mirror=False):
    """A piece placed by its foot (the picture's bottom), for the market: the plate's centre is where `foot` says less the picture's own drop."""
    w, h = fit(i, *SIZE[i[:2]])
    shift = 0.38 * h / (2 * HY)
    return dict(id=i, key=key, first=first, last=last, gx=foot[0] - shift, gy=foot[1] - shift, mirror=mirror, w=w, h=h, why="N1", hors=False)


def n1():
    """N1 by hand: the stall replaces etal_1 in place from 8, a second beside it at 9, the hall of 11 in place of both."""
    return [
        at_foot("A4", "N1:8", 8, 10, N1_FEET["stall"]),
        at_foot("A4", "N1:9", 9, 10, N1_FEET["stall2"], mirror=True),
        at_foot("A7", "N1:11", 11, FIN, N1_FEET["hall"]),
    ]


MAT_FOOT = (15.5, 12.1)  # the square's centre: the free cell between the fountain, the campfire and the street, off every path and hook


def mat():
    """The festive mast of the square (scripts/growth/mat.py), from tier 10: a free cell, by its foot."""
    return at_foot("mat", "M:10", 10, FIN, MAT_FOOT) | dict(why="M")


def stump_rows():
    out = []
    for first, i, (x, y), mirror, *rest in STUMPS_PX:
        wpx = 15 if i.startswith("souche") else 11
        w, h = info(i)
        gx, gy = (x, y) if rest == ["g"] else grid(x, y)  # a 5th item "g": the position is a grid point, not a frame pixel
        out.append(dict(id=i, key=f"S:{first}:{round(gx, 1)}:{round(gy, 1)}", first=first, last=FIN, gx=gx, gy=gy, mirror=mirror, w=wpx, h=wpx * h / w, why="S", hors=True))
    return out


def farm_rows():
    out = []
    for first, last, i, width, (x, y), *rest in FARM:
        w, h = info(i)
        gx, gy = grid(x, y)
        out.append(dict(id=i, key=f"F:{first}:{i}", first=first, last=last, gx=gx, gy=gy, mirror=False, w=width, h=width * h / w, why="F", hors=True))
    return out


# ---------------------------------------------------------------- the file
def foot(r):
    """The picture's bottom (its lowest opaque row: the canvas is padded) as a grid point."""
    # montage: top = y - 0.62 h, so the bottom lies 0.38 h under the plate's centre.
    shift = 0.38 * r["h"] / (2 * HY)  # in cells, added to gx and gy: screen y grows by 2 HY a unit of both
    return r["gx"] + shift, r["gy"] + shift


def entry(r):
    """One prop: the foot's cell for the depth order (the gate and the engine read the same one), the foot itself."""
    px, py = foot(r)
    parts = [f'nom: "{ident(r["id"])}"', f"case: [{math.floor(px)}, {math.floor(py)}]", f"pied: [{px:.2f}, {py:.2f}]", f"palier: {r['first']}"]
    if r["last"] != FIN:
        parts.append(f"avant: {r['last'] + 1}")
    if r["mirror"]:
        parts.append("flip: true")
    if r["hors"]:
        parts.append("hors: true")
    return "  { " + ", ".join(parts) + " },"


def copy_images(widths):
    """The finals' webp, named as the props are. A picture past MAX_PX_DP native px a dp is brought down to it (the bourg is 6 px a dp), and every
    one gets transparent rows under its lowest opaque row so that row sits at the props' foot line (PIED_K of the canvas): the anchor gate reads it.
    -> {name: (width dp, height dp of the padded canvas)}."""
    ASSETS.mkdir(parents=True, exist_ok=True)
    toiles = {}
    # the countryside is painted near black: lifted to the quarters' median, by day and by night (the night's ink line is darker, so its fade is scaled)
    cibles = {".jour.webp": (a_median() * 0.97, 1.0), ".nuit.webp": (a_median(".nuit.webp") * 0.97, 0.45)}
    print("A median luminance", {k: round(a_median(k), 1) for k in cibles})
    for i in FINALS:
        if ident(i) not in widths:
            continue
        wdp = widths[ident(i)]
        for suf in (".jour.webp", ".nuit.webp"):
            im = Image.open(FINAL / f"{i}{suf}").convert("RGBA")
            if "_F_" in i:
                cible, k = cibles[suf]
                avant = lum(im)
                im = lift(im, gamma_for(im, cible, k), k)
                print(f"  {i}{suf}: luminance {avant:.1f} -> {lum(im):.1f} (target {cible:.1f})")
            f = min(1.0, MAX_PX_DP * wdp / im.width)
            if f < 1:
                im = im.resize((round(im.width * f), round(im.height * f)), Image.LANCZOS)
            canvas = Image.new("RGBA", (im.width, round(im.height / PIED_K)), (0, 0, 0, 0))
            canvas.paste(im, (0, 0))
            canvas.save(ASSETS / (ident(i) + (".webp" if suf == ".jour.webp" else ".nuit.webp")), "WEBP", quality=88, method=6)
            toiles[ident(i)] = (round(wdp, 1), round(wdp * canvas.height / canvas.width, 1))
    return toiles


def main():
    rows, dropped = piece_rows()
    allrows = rows + n1() + [mat()] + stump_rows() + farm_rows()
    # what the atelier's gates refused (a piece under 50 % visible, a hook covered), by picture and the cell its foot stands on, with the reason
    drops = json.loads((ROOT / "scripts/growth/poser_drops.json").read_text()) if (ROOT / "scripts/growth/poser_drops.json").exists() else []
    gone = {(i, cx, cy) for i, cx, cy, _why in drops}
    allrows = [r for r in allrows if (ident(r["id"]), *(math.floor(v) for v in foot(r))) not in gone]
    # villagers walk and stop on path and bridge cells (marcheurs.ts `chemins`): neither the cell a piece's plate stands on nor the one its foot
    # (its bottom edge, the cell the depth order reads) stands on may be one. A piece on one is moved up the screen by up to 3/5 of a cell, else left out.
    D, sol = MP.LAYOUT["debut"], MP.LAYOUT["sol"]

    def chemin(c):
        x, y = c[0] - D, c[1] - D
        return 0 <= y < len(sol) and 0 <= x < len(sol[0]) and sol[y][x] in "#="

    def cases(r):
        if r["why"] == "M":  # a tall mast: the picture's middle hangs in the air, only its foot stands on the ground
            return [tuple(math.floor(v) for v in foot(r))]
        return [(math.floor(r["gx"]), math.floor(r["gy"])), tuple(math.floor(v) for v in foot(r))]

    kept = []
    for r in allrows:
        if any(chemin(c) for c in cases(r)):
            gx, gy = r["gx"], r["gy"]
            for dx, dy in [(0, -0.3), (-0.3, 0), (-0.3, -0.3), (0, -0.6), (-0.6, 0), (-0.6, -0.6)]:
                r["gx"], r["gy"] = gx + dx, gy + dy
                if not any(chemin(c) for c in cases(r)):
                    print("  moved off a path cell:", r["id"], "tier", r["first"], (round(gx, 1), round(gy, 1)), "->", (round(r["gx"], 1), round(r["gy"], 1)))
                    break
            else:
                print("  on a path cell, left out:", r["id"], "tier", r["first"], (round(gx, 1), round(gy, 1)))
                continue
        kept.append(r)
    allrows = [r for r in kept if (ident(r["id"]), *(math.floor(v) for v in foot(r))) not in gone]  # the drops again, by the cell a moved piece ended on
    toiles = copy_images({ident(r["id"]): r["w"] / K for r in allrows})
    # one canvas per picture, the widest drawn: an id drawn at two sizes would be a second picture; the table keeps the first
    lines = []
    lines.append("// GENERATED by scripts/growth/poser.py (growth G11): the painted quarter pieces, the stumps and the countryside, laid on the real grid.")
    lines.append("// A piece is a prop (alentours.ts Accessoire): an image, a foot (the bottom of the picture) and a first tier; `avant` is the tier a piece")
    lines.append("// leaves for the one that replaces it in place. Decor only: never tapped, never counted, never the clan mark.")
    lines.append('import type { VillageTier } from "@/db/village";')
    lines.append("")
    names = sorted(toiles)
    lines.append("export const NOMS_PIECES = [" + ", ".join(f'"{n}"' for n in names) + "] as const;")
    lines.append("export type NomPiece = (typeof NOMS_PIECES)[number];")
    lines.append("")
    lines.append("/** Each picture's canvas, dp: its own ratio, its width the one the montage fitted. */")
    lines.append("export const TOILES_PIECES: Record<NomPiece, { w: number; h: number }> = {")
    for n in names:
        lines.append(f"  {n}: {{ w: {toiles[n][0]}, h: {toiles[n][1]} }},")
    lines.append("};")
    lines.append("")
    lines.append("export type Piece = {")
    lines.append("  nom: NomPiece;")
    lines.append("  case: readonly [number, number];")
    lines.append("  pied: readonly [number, number];")
    lines.append("  palier: VillageTier;")
    lines.append("  avant?: VillageTier;")
    lines.append("  flip?: true;")
    lines.append("  hors?: true;")
    lines.append("};")
    lines.append("")
    lines.append("/** The forest keeps off these boxes (grid cells: corner, size) from the tier: the countryside's room, margin included. */")
    lines.append("export const DEGAGES_FORET: readonly { palier: VillageTier; box: readonly [number, number, number, number] }[] = [")
    for r in sorted((r for r in allrows if r["why"] == "F"), key=lambda r: r["first"]):
        rad = r["w"] / (2 * HX) * 0.6 + MARGE
        lines.append(f"  {{ palier: {r['first']}, box: [{r['gx'] - rad:.1f}, {r['gy'] - rad:.1f}, {2 * rad:.1f}, {2 * rad:.1f}] }},")
    lines.append("];")
    lines.append("")
    lines.append("/** The boxes the forest keeps off at a tier: none goes back, so each tier holds the ones before it. */")
    lines.append("export const degagesForet = (palier: number) =>")
    lines.append("  DEGAGES_FORET.filter((d) => d.palier <= palier).map((d) => d.box);")
    lines.append("")
    lines.append("export const PIECES: readonly Piece[] = [")
    # back to front (the far corner of the cell): the depth insertion (IsoCarteDemo placerDecor) takes props in table order, and a pair it meets front first it cannot mend
    for r in sorted(allrows, key=lambda r: (r["gx"] + r["gy"], r["gx"], r["first"])):
        lines.append(entry(r))
    lines.append("];")
    OUT.write_text("\n".join(lines) + "\n")
    img = ["// GENERATED by scripts/growth/poser.py (growth G11). Metro needs every require spelled out: one entry per picture, day and night.",
           'import type { NomPiece } from "./piecesPosees";', "", "export const IMAGES_PIECES: Record<NomPiece, { jour: number; nuit: number }> = {"]
    for n in names:
        img.append(f"  {n}: {{")
        img.append(f'    jour: require("@/assets/images/village/iso/accessoires/{n}.webp"),')
        img.append(f'    nuit: require("@/assets/images/village/iso/accessoires/{n}.nuit.webp"),')
        img.append("  },")
    img.append("};")
    (OUT.parent / "piecesImages.ts").write_text("\n".join(img) + "\n")
    stumps = [r for r in allrows if r["why"] == "S"]
    print(f"{len(allrows)} entries, {len(dropped)} dropped by the montage's own check, {len(stumps)} stump entries")
    for d in dropped:
        print("  dropped:", d)
    # what stands, by place: scratch/fixe2/posees.txt (the plate's cell, the first tier, the tier it leaves for its replacement)
    par = {}
    for r in allrows:
        par.setdefault(r["why"], []).append(f"{r['id']} {math.floor(r['gx'])},{math.floor(r['gy'])} from {r['first']}" + (f" to {r['last']}" if r["last"] != FIN else ""))
    (ROOT / "docs/designs/village/growth/scratch/fixe2/posees.txt").write_text("\n".join(f"{k} ({len(v)}): " + "; ".join(v) for k, v in sorted(par.items())) + "\n")


if __name__ == "__main__":
    main()
