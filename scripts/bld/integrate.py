#!/usr/bin/env python3
"""Buildings track, step E.5: the mechanical part of integrating one painted building. No FLUX, 0 $, rerunnable.

    python3 -I scripts/bld/integrate.py <code> [--src DIR]

DIR defaults to the main worktree's docs/designs/village-buildings/<code>/final/ (git-ignored paintings:
rough|solid|grand|legendary|mythic.png, measures.json, provenance.json, elements/<name>.png + <name>.raw.png).
The spec is scripts/bld/final/<code>.json (teasers, gag ranks, anchors).

It writes:
1. assets/images/village/iso/peints/<code>/<stade>.jour.webp and .nuit.webp (one canvas for the family) and
   elements/<name>.jour.webp, .nuit.webp (shrunk to one size rule), and their entries in scripts/provenance.json.
   The night is the day grade of scripts/iso/famille_jour.py (`nuit`), same alpha.
2. components/village/iso/peints/<code>.ts: the sprites' registry (generated, do not edit).
3. constants/buildings/<code>.ts: the building's data. The block between `hand:begin` and `hand:end` holds the
   positions picked on the painting (gag slot, teaser spot, fire, smoke, magic): defaults at the first run, then
   kept as you edited them. Everything else is rewritten.
4. the two registry lines in components/village/iso/peints.ts (the flag, in constants/isoPoc.ts, is yours to add).
"""

import argparse
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "iso"))
from PIL import Image  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parents[2]
MAIN = pathlib.Path("/home/guiforge/Documents/code/bati/.claude/worktrees/iso")
STADES = ["rough", "solid", "grand", "legendary", "mythic"]
MARGE = 64  # isoSpec anchorMarginPx: the ground anchor stands this far above the canvas bottom
CELLULE = 384  # isoSpec S: a cell's width in canvas px
TEASER_PX, GAG_PX = 170, 150  # longest side of an element once placed: 21 and 19 dp, over the 16 dp floor
LICENCE = "BFL Developer Terms §3.b (EU §4.b): the API account holder owns the output, personal or commercial use"


def masque(alpha: Image.Image, pas: int = 8) -> dict:
    """The tap mask as tapBatiment reads it: one bit per `pas` block, hex rows (4 bits a char), generous at the edge."""
    w, h = (alpha.width + pas - 1) // pas, (alpha.height + pas - 1) // pas
    petit = alpha.point(lambda v: 255 if v > 0 else 0).resize((w, h), Image.BOX).point(lambda v: 255 if v > 0 else 0)
    larg = (w + 3) // 4 * 4
    lignes = ["".join("1" if petit.getpixel((x, y)) else "0" for x in range(w)).ljust(larg, "0") for y in range(h)]
    bits = "".join(format(int(r[i:i + 4], 2), "x") for r in lignes for i in range(0, larg, 4))
    return {"pas": pas, "w": w, "h": h, "bits": bits}


def contact(largeur_sol: float) -> list[list[float]]:
    """The ground contact in grid units from the footprint's back corner: the cell's diamond, shrunk to the patch."""
    k = min(1.0, largeur_sol / CELLULE)
    a, b = 0.5 - k / 2, 0.5 + k / 2
    return [[round(a, 3), round(a, 3)], [round(b, 3), round(a, 3)], [round(b, 3), round(b, 3)], [round(a, 3), round(b, 3)]]


def teasers(spec: dict) -> list[tuple[str, int, int]]:
    """(element, fromRank, untilRank): a teaser stands from its rank until the next one (the next painting finishes it)."""
    return [(f"teaser_{t['id']}", int(t["id"][1:]), int(t["id"][1:]) + 1) for t in spec.get("teasers", [])]


def temoin_feu(grand: Image.Image) -> list[int] | None:
    """The hearth: the centroid of the orange fire pixels low on the painting (the pit under the cauldron)."""
    px = grand.convert("RGBA").load()
    bas = grand.height - MARGE - 200
    pts = [(x, y) for y in range(bas, grand.height - MARGE) for x in range(grand.width)
           if px[x, y][3] > 200 and px[x, y][0] > 200 and 80 < px[x, y][1] < 175 and px[x, y][2] < 90]
    return [round(sum(p[0] for p in pts) / len(pts)), round(sum(p[1] for p in pts) / len(pts))] if pts else None


def provenance(prov: dict, loc: dict, cible: str, source: str, how: str) -> None:
    e = loc.get(source) or {}
    prov[cible] = {"model": f"{e.get('model', 'flux-3-image')} ({e.get('provider', 'Black Forest Labs direct API')})",
                   "derived_from": source, "how": how, "licence": e.get("licence", LICENCE)}


def ecrire_webp(im: Image.Image, dest: pathlib.Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "WEBP", quality=90, method=6)


def main_block(code: str, src_txt: str | None, defaut: str) -> str:
    """The hand block of the data file as it stands, else the defaults."""
    if src_txt:
        m = re.search(r"// hand:begin.*?\n(.*?)// hand:end", src_txt, re.S)
        if m:
            return m.group(1)
    return defaut


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("code")
    ap.add_argument("--src", type=pathlib.Path)
    a = ap.parse_args()
    code = a.code
    src = a.src or MAIN / f"docs/designs/village-buildings/{code}/final"
    spec = json.loads((ROOT / f"scripts/bld/final/{code}.json").read_text())
    mesures = json.loads((src / "measures.json").read_text())
    loc = json.loads((src / "provenance.json").read_text())
    loc_el = json.loads((src / "elements/provenance.json").read_text()) if (src / "elements/provenance.json").exists() else {}
    from famille_jour import nuit  # the day grade of the family, no FLUX

    rel_src = f"docs/designs/village-buildings/{code}/final"
    dest = ROOT / f"assets/images/village/iso/peints/{code}"
    prov_path = ROOT / "scripts/provenance.json"
    prov = json.loads(prov_path.read_text())
    stades = [s for s in STADES if (src / f"{s}.png").exists()]
    assert stades, f"no painting in {src}"
    tailles = set()
    reg_stades, reg_masques = {}, {}
    for s in stades:
        jour = Image.open(src / f"{s}.png").convert("RGBA")
        tailles.add(jour.size)
        ecrire_webp(jour, dest / f"{s}.jour.webp")
        ecrire_webp(nuit(jour, None), dest / f"{s}.nuit.webp")
        reg_masques[s] = masque(jour.getchannel("A"))
        reg_stades[s] = jour.size
        de = mesures[s]["from"]
        provenance(prov, loc, f"assets/images/village/iso/peints/{code}/{s}.jour.webp", f"{rel_src}/{de}",
                   "the final painting of the stage placed on the family canvas, re-encoded WebP q90")
        provenance(prov, loc, f"assets/images/village/iso/peints/{code}/{s}.nuit.webp", f"{rel_src}/{de}",
                   "its night, graded offline by scripts/bld/integrate.py (famille_jour.nuit, no FLUX)")
    assert len(tailles) == 1, f"one canvas per family, got {tailles}"
    (w, h), = tailles
    ancre = [w // 2, h - MARGE]
    # elements: teasers and gag beats, shrunk so the longest side is TEASER_PX / GAG_PX
    elements = {}
    for nom in [t[0] for t in teasers(spec)] + [f"gag_{g['rank']}" for g in spec.get("gag", [])]:
        f = src / "elements" / f"{nom}.png"
        if not f.exists():
            print(f"!! {nom}: no cut file, skipped")
            continue
        im = Image.open(f).convert("RGBA")
        cible = TEASER_PX if nom.startswith("teaser") else GAG_PX
        k = min(1.0, cible / max(im.size))
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
        ecrire_webp(im, dest / "elements" / f"{nom}.jour.webp")
        ecrire_webp(nuit(im, None), dest / "elements" / f"{nom}.nuit.webp")
        elements[f"elements/{nom}"] = list(im.size)
        raw = f"{rel_src}/elements/{nom}.raw.png"
        base = loc_el.get(raw, {})
        for amb, how in (("jour", "the element keyed from magenta, shrunk to its map size, WebP q90"),
                         ("nuit", "its night, graded offline by scripts/bld/integrate.py (famille_jour.nuit, no FLUX)")):
            prov[f"assets/images/village/iso/peints/{code}/elements/{nom}.{amb}.webp"] = {
                "model": f"{base.get('model', 'flux-3-image')} ({base.get('provider', 'Black Forest Labs direct API')})",
                "derived_from": raw, "how": how, "licence": base.get("licence", LICENCE)}
    prov_path.write_text(json.dumps(dict(sorted(prov.items())), indent=2, ensure_ascii=False) + "\n")

    # the sprites' registry
    haut = max(stades, key=STADES.index)
    L = [f"// Generated by scripts/bld/integrate.py {code}: do not edit.", 'import type { PeintBld } from "../peints";', ""]
    for s in stades:
        m = reg_masques[s]
        L.append(f"const masque_{s} = {{ pas: {m['pas']}, w: {m['w']}, h: {m['h']}, bits: \"{m['bits']}\" }};")
    L += ["", f"const ancre = [{ancre[0]}, {ancre[1]}] as const;", f"const taille = [{w}, {h}] as const;", "",
          f"export const {code}: Omit<PeintBld, \"donnees\"> = {{", "  stades: {"]
    for s in stades:
        L.append(f"    {s}: {{")
        for amb in ("jour", "nuit"):
            L.append(f"      {amb}: {{ image: require(\"@/assets/images/village/iso/peints/{code}/{s}.{amb}.webp\"),"
                     f" anchor: ancre, size: taille, ombre: [], masque: masque_{s} }},")
        L.append("    },")
    L += ["  },", "  elements: {"]
    for k, (ew, eh) in elements.items():
        L.append(f"    \"{k}\": {{ jour: require(\"@/assets/images/village/iso/peints/{code}/{k}.jour.webp\"),"
                 f" nuit: require(\"@/assets/images/village/iso/peints/{code}/{k}.nuit.webp\"), size: [{ew}, {eh}] }},")
    L += ["  },", "};", ""]
    (ROOT / f"components/village/iso/peints/{code}.ts").parent.mkdir(parents=True, exist_ok=True)
    (ROOT / f"components/village/iso/peints/{code}.ts").write_text("\n".join(L))

    # the data file
    grand = Image.open(src / f"{'grand' if 'grand' in stades else stades[-1]}.png").convert("RGBA")
    feu = temoin_feu(grand) or [ancre[0], ancre[1] - 100]
    sol = mesures["rough"]["right"] - mesures["rough"]["left"] if "rough" in mesures else CELLULE
    sommet = min(mesures[s]["top_y"] for s in stades)
    defaut = (f"const main = {{\n  // Picked on the painting, canvas px (the building's anchor is {ancre}).\n"
              f"  gagSlot: [{mesures['rough']['left'] - 30}, {ancre[1] - 40}],\n"
              f"  teaserAt: [{mesures['rough']['right'] + 30 - ancre[0]}, -40],\n"
              f"  fire: [{feu[0]}, {feu[1]}],\n  smoke: [{feu[0]}, {feu[1] - 130}],\n"
              f"  magic: [{(mesures[haut]['left'] + mesures[haut]['right']) // 2}, {mesures[haut]['top_y'] + 170}],\n"
              "  magicFrom: 10, // the rank that opens the mythic stage (5 for a deed)\n"
              "} as const;\n")
    fichier = ROOT / f"constants/buildings/{code}.ts"
    bloc = main_block(code, fichier.read_text() if fichier.exists() else None, defaut)
    ancres = spec.get("anchors", [])
    lignes_ancres = [f'    {{ kind: "{x}", at: main.{x}, fromRank: {"main.magicFrom" if x == "magic" else 1} }},' for x in ancres if x in ("smoke", "magic")]
    gags = []
    for g in spec.get("gag", []):
        txt = g["prompt"].split(" Objects alone")[0].strip()
        gags.append(f"      {{ rank: {g['rank']}, beat: {json.dumps(txt[0].upper() + txt[1:] + '.')}, "
                    f"sprite: \"elements/gag_{g['rank']}\" }},")
    ts = [f"    {{ fromRank: {a_}, untilRank: {b_}, sprite: \"elements/{n}\", anchorOffset: main.teaserAt }},"
          for n, a_, b_ in teasers(spec)]
    out = f"""// Generated by scripts/bld/integrate.py {code}. The measures and lists below are rewritten at each run;
// the block between the markers is kept: edit the positions there (canvas px, origin top left).
import type {{ BuildingData }} from "../buildingData";

// hand:begin
{bloc}// hand:end

export const {code}: BuildingData = {{
  code: "{code}",
  // Measured on the paintings: the highest silhouette, and the patch's contact in grid units.
  mesure: {{ sommet: {sommet}, contact: {json.dumps(contact(sol))} }},
  placeholder: false,
  addOns: [],
  gag: {{
    slot: main.gagSlot,
    beats: [
{chr(10).join(gags)}
    ],
  }},
  // The fire breathes at night on the hearth. No painted keeper: no `guardian`.
  lights: [{{ kind: "fire", at: main.fire, fromRank: 1 }}],
  // The solid stage paints its own pennant: no code mark.
  clanMark: null,
  teasers: [
{chr(10).join(ts)}
  ],
  // What will move later (smoke, magic): anchors only, no animation yet.
  ancres: [
{chr(10).join(lignes_ancres)}
  ],
}};
"""
    fichier.write_text(out)

    # the registry line
    reg = ROOT / "components/village/iso/peints.ts"
    t = reg.read_text()
    if f"./peints/{code}\"" not in t:
        t = t.replace("// integrate:imports", f"import {{ {code} as {code}Data }} from \"@/constants/buildings/{code}\";\n"
                      f"import {{ {code} as {code}Sprites }} from \"./peints/{code}\";\n// integrate:imports")
        t = t.replace("  // integrate:entries", f"  {code}: {{ ...{code}Sprites, donnees: {code}Data }},\n  // integrate:entries")
        reg.write_text(t)
    print(f"{code}: {len(stades)} stages, {len(elements)} elements, canvas {w}x{h}, anchor {ancre}, fire {feu}")


if __name__ == "__main__":
    main()
