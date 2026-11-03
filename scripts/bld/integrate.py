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
import subprocess
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


def hull(pts: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Convex hull, counter-clockwise (monotone chain)."""
    pts = sorted(set(pts))
    if len(pts) < 3:
        return pts
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])  # noqa: E731
    bas, haut = [], []
    for p in pts:
        while len(bas) >= 2 and cross(bas[-2], bas[-1], p) <= 0:
            bas.pop()
        bas.append(p)
    for p in reversed(pts):
        while len(haut) >= 2 and cross(haut[-2], haut[-1], p) <= 0:
            haut.pop()
        haut.append(p)
    return bas[:-1] + haut[:-1]


def contact(alpha: Image.Image, anchor: tuple[int, int], emprise: tuple[int, int], pas: float = 0.05) -> list[list[float]]:
    """The real ground contact: the footprint's grid points whose screen pixel is opaque on the painting (a stage
    that is only its ground patch, the rough), as a convex hull in grid units from the back corner."""
    w, d = emprise
    px = alpha.load()
    pris = []
    for i in range(int(w / pas) + 1):
        for j in range(int(d / pas) + 1):
            gx, gy = i * pas, j * pas
            x = anchor[0] + (gx - gy - (w - d)) * CELLULE / 2
            y = anchor[1] - (w + d) * CELLULE / 4 + (gx + gy) * CELLULE / 4
            if 0 <= x < alpha.width and 0 <= y < alpha.height and px[int(x), int(y)] > 128:
                pris.append((round(gx, 3), round(gy, 3)))
    h = hull(pris)
    return [list(p) for p in h] if len(h) >= 3 else [[0, 0], [w, 0], [w, d], [0, d]]


def teaser_ranks(tid: str) -> dict:
    """The rank fields of a teaser id: `r4...` is the building's own rank 4 (to 5); `b8...` an upgrade's base rank 8
    (the upgrade's own rank is then 3), the data's `fromBase` and `untilBase`."""
    m = re.match(r"([rb])(\d+)", tid)
    assert m, f"teaser id {tid}"
    n = int(m.group(2))
    if m.group(1) == "r":
        return {"fromRank": n, "untilRank": n + 1}
    return {"fromRank": 3, "untilRank": 4, "fromBase": n, "untilBase": n + 1}


UPGRADES = {"observatory", "watchtower", "armory", "barn", "castle_wall", "fountain"}  # tier 3: rule B
DEEDS = {"dragon_lair", "heroes_hall", "champion_arena"}  # four stages, ranks 1 to 5


def genre(spec: dict) -> str:
    """`ten` (ranks 1 to 10), `deed` (1 to 5), `upgrade` (own rank 1 to 3, then the base's): by building, as the
    ceilings of constants/buildingLevels.ts say."""
    return "upgrade" if spec.get("building") in UPGRADES else "deed" if spec.get("building") in DEEDS else "ten"


def teasers(spec: dict) -> list[tuple[str, dict]]:
    """(element, rank fields): a teaser stands until the next one (the next painting finishes it). An upgrade's
    `r8` is read as the base's rank 8: its own ranks stop at 3."""
    up = genre(spec) == "upgrade"
    return [(f"teaser_{t['id']}", teaser_ranks(("b" + t["id"][1:]) if up and t["id"][0] == "r" else t["id"]))
            for t in spec.get("teasers", [])
            if not t["id"].startswith("sails_")]  # the windmill's sail sheets are sprites of their own


def beat_ranks(genre_: str, rank: int) -> dict:
    """An upgrade's beats past its own rank 3 wait for the base building's rank (rule B)."""
    return {"rank": rank} if genre_ != "upgrade" or rank <= 3 else {"rank": 3, "fromBase": rank}


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


def main_block(src_txt: str | None) -> str:
    """The hand block of the data file as it stands, else an empty one the caller fills with defaults."""
    if src_txt:
        m = re.search(r"// hand:begin.*?\n(.*?)// hand:end", src_txt, re.S)
        if m:
            return m.group(1)
    return "const main = {\n  // Picked on the painting, canvas px (an offset where the name says so).\n} as const;\n"


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
    brutes = {s: Image.open(src / f"{s}.png").convert("RGBA") for s in stades}
    assert len({im.width for im in brutes.values()}) == 1, "one canvas width per family"
    # One canvas per family: the stages are bottom-aligned (the ground anchor stands MARGE above the bottom),
    # so the shorter ones get empty rows on top, up to the tallest stage (the mythic's, in practice).
    H = max(im.height for im in brutes.values())
    pad = {s: H - im.height for s, im in brutes.items()}
    tailles = set()
    reg_masques = {}
    for s in stades:
        jour = brutes[s]
        if pad[s]:
            haut = Image.new("RGBA", (jour.width, H), (0, 0, 0, 0))
            haut.paste(jour, (0, pad[s]))
            jour = haut
        tailles.add(jour.size)
        ecrire_webp(jour, dest / f"{s}.jour.webp")
        ecrire_webp(nuit(jour, None), dest / f"{s}.nuit.webp")
        reg_masques[s] = masque(jour.getchannel("A"))
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
    # a windmill's sails: a sheet per stage, turning about the hub measured by eye (measures.json `hub`)
    ailes, hubs = {}, {}
    for s in stades:
        hub = mesures[s].get("hub")
        f = src / "elements" / f"teaser_sails_{s}.png"
        if "sails" not in spec.get("anchors", []) or not hub or not f.exists():
            continue
        im = Image.open(f).convert("RGBA")
        k = hub["sails_width_px"] / im.width  # the placed width, canvas px
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        bb = im.getchannel("A").point(lambda v: 255 if v > 16 else 0).getbbox() or (0, 0, *im.size)
        centre = [round((bb[0] + bb[2]) / 2), round((bb[1] + bb[3]) / 2)]  # the cross's hub: its box's centre
        ecrire_webp(im, dest / "elements" / f"sails_{s}.jour.webp")
        ecrire_webp(nuit(im, None), dest / "elements" / f"sails_{s}.nuit.webp")
        ailes[s] = (list(im.size), centre)
        hubs[s] = [hub["x"], hub["y"] + pad[s]]
        raw = f"{rel_src}/elements/teaser_sails_{s}.raw.png"
        base = loc_el.get(raw, {})
        for amb, how in (("jour", "the sail sheet keyed from magenta, scaled to its placed width, WebP q90"),
                         ("nuit", "its night, graded offline by scripts/bld/integrate.py (famille_jour.nuit, no FLUX)")):
            prov[f"assets/images/village/iso/peints/{code}/elements/sails_{s}.{amb}.webp"] = {
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
                     f" anchor: ancre, size: taille, ombre: [], masque: masque_{s}"
                     + (f", ailes: {{ pivot: {json.dumps(hubs[s])}, pivotGrille: [0, 0, 0], echelle: 1 }}" if s in hubs else "")
                     + " },")
        L.append("    },")
    L += ["  },", "  elements: {"]
    for k, (ew, eh) in elements.items():
        L.append(f"    \"{k}\": {{ jour: require(\"@/assets/images/village/iso/peints/{code}/{k}.jour.webp\"),"
                 f" nuit: require(\"@/assets/images/village/iso/peints/{code}/{k}.nuit.webp\"), size: [{ew}, {eh}] }},")
    L += ["  },"]
    if ailes:
        L.append("  ailes: {")
        for s, (sz, c) in ailes.items():
            L.append(f"    {s}: {{")
            for amb in ("jour", "nuit"):
                L.append(f"      {amb}: {{ image: require(\"@/assets/images/village/iso/peints/{code}/elements/sails_{s}.{amb}.webp\"),"
                         f" anchor: {json.dumps(c)}, size: {json.dumps(sz)}, ombre: [] }},")
            L.append("    },")
        L.append("  },")
    L += ["};", ""]
    (ROOT / f"components/village/iso/peints/{code}.ts").parent.mkdir(parents=True, exist_ok=True)
    (ROOT / f"components/village/iso/peints/{code}.ts").write_text("\n".join(L))

    # the data file
    grand = Image.open(src / f"{'grand' if 'grand' in stades else stades[-1]}.png").convert("RGBA")
    feu = temoin_feu(grand) or [ancre[0], ancre[1] - 100]
    rough = Image.open(src / "rough.png").convert("RGBA").getchannel("A")
    emprise = tuple(json.loads((ROOT / "constants/isoSpec.json").read_text())["batiments"][code]["emprise"])
    sommet = min(mesures[s]["top_y"] + pad[s] for s in stades)
    cx = (mesures[haut]["left"] + mesures[haut]["right"]) // 2
    g_top = (mesures["grand"]["top_y"] + pad["grand"]) if "grand" in mesures else mesures[haut]["top_y"] + pad[haut]
    ancres = spec.get("anchors", [])
    kinds = {"smoke": "smoke", "magic": "magic", "windows": "fenetre", "flag": "drapeau", "wings": "aile", "water": "eau"}
    pos = {  # first guesses, canvas px: a capture decides, then the hand block below
        "gagSlot": [mesures["rough"]["left"] - 30, ancre[1] - 40],
        "teaserAt": [mesures["rough"]["right"] + 30 - ancre[0], -40],  # offset from the anchor, the rest is absolute
        "fire": feu, "smoke": [feu[0], feu[1] - 130], "magic": [cx, mesures[haut]["top_y"] + pad[haut] + 170],
        "fenetre": [ancre[0], (g_top + ancre[1]) // 2], "drapeau": [cx, g_top], "aile": hubs.get("grand") or [cx, g_top + 40],
        "eau": [ancre[0], ancre[1] - 96],
    }
    voulues = ["gagSlot", "teaserAt"] + (["fire"] if "fire" in ancres or "smoke" in ancres else []) \
        + [k for a_, k in kinds.items() if a_ in ancres]
    fichier = ROOT / f"constants/buildings/{code}.ts"
    bloc = main_block(fichier.read_text() if fichier.exists() else None)
    for k in voulues:  # a key the block lacks (an older run, a new anchor) gets its default
        if not re.search(rf"^\s*{k}:", bloc, re.M):
            bloc = bloc.replace("} as const;", f"  {k}: [{pos[k][0]}, {pos[k][1]}],\n}} as const;")
    g = genre(spec)
    depuis = {"ten": "fromRank: 10", "deed": "fromRank: 5", "upgrade": "fromRank: 3, fromBase: 10"}[g]
    lignes_ancres = [f'    {{ kind: "{kinds[x]}", at: main.{kinds[x]}, {depuis if x == "magic" else "fromRank: 1"} }},'
                     for x in ancres if x in kinds]
    gags = []
    for gg in [g_ for g_ in spec.get("gag", []) if f"elements/gag_{g_['rank']}" in elements]:  # a beat with no cut file is left out
        txt = gg["prompt"].split(" Objects alone")[0].strip()
        champs = ", ".join(f"{k}: {v}" for k, v in beat_ranks(g, gg["rank"]).items())
        gags.append(f"      {{ {champs}, beat: {json.dumps(txt[0].upper() + txt[1:] + '.')}, "
                    f"sprite: \"elements/gag_{gg['rank']}\" }},")
    ts = [f"    {{ {', '.join(f'{k}: {v}' for k, v in r.items())}, sprite: \"elements/{n}\", anchorOffset: main.teaserAt }},"
          for n, r in teasers(spec) if f"elements/{n}" in elements]
    lumiere = '  lights: [{ kind: "fire", at: main.fire, fromRank: 1 }],' if "fire" in ancres else "  lights: [],"
    out = f"""// Generated by scripts/bld/integrate.py {code}. The measures and lists below are rewritten at each run;
// the block between the markers is kept: edit the positions there (canvas px, origin top left).
import type {{ BuildingData }} from "../buildingData";

// hand:begin
{bloc}// hand:end

export const {code}: BuildingData = {{
  code: "{code}",
  // Measured on the paintings: the highest silhouette, and the ground patch's contact in grid units
  // (the opaque ground points of the rough painting, as a hull).
  mesure: {{ sommet: {sommet}, contact: {json.dumps(contact(rough, tuple(ancre), emprise))} }},
  placeholder: false,
  addOns: [],
  gag: {{
    slot: main.gagSlot,
    beats: [
{chr(10).join(gags)}
    ],
  }},
  // A fire is a soft warm pool at night, still. No painted keeper: no `guardian`.
{lumiere}
  // A painted clan mark (a pennant, a banner) is in the paintings: no code mark.
  clanMark: null,
  teasers: [
{chr(10).join(ts)}
  ],
  // What will move later: posed, drawn by nothing yet.
  ancres: [
{chr(10).join(lignes_ancres)}
  ],
}};
"""
    fichier.write_text(out)

    # the registry, the flag and the test: nothing left to wire by hand
    reg = ROOT / "components/village/iso/peints.ts"
    t = reg.read_text()
    if f"./peints/{code}\"" not in t:
        t = t.replace("// integrate:imports", f"import {{ {code} as {code}Data }} from \"@/constants/buildings/{code}\";\n"
                      f"import {{ {code} as {code}Sprites }} from \"./peints/{code}\";\n// integrate:imports")
        t = t.replace("  // integrate:entries", f"  {code}: {{ ...{code}Sprites, donnees: {code}Data }},\n  // integrate:entries")
        reg.write_text(t)
    poc = ROOT / "constants/isoPoc.ts"
    t = poc.read_text()
    if not re.search(rf"^  {code}: BUILD_LOCAL,", t, re.M):
        poc.write_text(re.sub(r"(BLD_PEINTS: [^\n]*= \{\n)", rf"\1  {code}: BUILD_LOCAL,\n", t, count=1))
    test = ROOT / f"__tests__/iso-bld-{code}.test.ts"
    if not test.exists():
        test.write_text(TEST.replace("@CODE@", code))
    # the images' fingerprint (the village's image cache and a jest test read it)
    subprocess.run(["node", "scripts/iso/empreinte-sprites.js"], cwd=ROOT, check=True)
    print(f"{code}: {len(stades)} stages, {len(elements)} elements, canvas {w}x{h}, anchor {ancre}, fire {feu}, "
          f"genre {g}. Next: npx biome check --write on the generated files, npx jest iso-bld-{code}")


TEST = """// Generated by scripts/bld/integrate.py @CODE@ (kept if it exists): the painted building's data and registry,
// and the proof that with its flag off the map is the one of today.
import { etatBatiment } from "@/components/village/iso/batiment";
import { DONNEES_BLD } from "@/components/village/iso/donneesBld";
import { opaque } from "@/components/village/iso/masque";
import { PEINTS } from "@/components/village/iso/peints";
import { @CODE@ as sprites } from "@/components/village/iso/peints/@CODE@";
import { buildingCeiling } from "@/constants/buildingLevels";
import { @CODE@ as data } from "@/constants/buildings/@CODE@";
import { BLD_PEINTS } from "@/constants/isoPoc";
import { buildingDefinitions } from "@/db/schema";

const plafond = buildingCeiling({ tier: buildingDefinitions.@CODE@.tier, code: "@CODE@" });
const rangs = Array.from({ length: plafond }, (_, i) => i + 1);
const etat = (r: number, nuit = false) =>
  etatBatiment(data, r, { nuit, rule: "B", baseRank: r === plafond ? 10 : 0 });
const vide = { pas: 8, w: 0, h: 0, bits: "" };

describe("@CODE@: flag off by default", () => {
  test("no painted entry, no engine data", () => {
    expect(BLD_PEINTS.@CODE@).toBe(false);
    expect(PEINTS.@CODE@).toBeUndefined();
    expect(DONNEES_BLD.@CODE@).toBeUndefined();
  });
});

describe("@CODE@: data and registry", () => {
  test("every stage the ranks reach is painted, on one canvas, day and night", () => {
    for (const r of rangs) expect(sprites.stades[etat(r).stage]).toBeDefined();
    const tailles = Object.values(sprites.stades).flatMap((s) => [s.jour.size, s.nuit.size]);
    expect(new Set(tailles.map((t) => t.join("x"))).size).toBe(1);
  });

  test("every sprite the data names is in the registry; nobody is painted", () => {
    const noms = [...(data.teasers ?? []).map((t) => t.sprite), ...data.gag.beats.map((b) => b.sprite)];
    for (const n of noms) expect(sprites.elements[n ?? ""]).toBeDefined();
    expect(data.guardian).toBeUndefined();
  });

  test("the measure fits the canvas and the contact is a polygon", () => {
    const [, hauteur] = Object.values(sprites.stades)[0]?.jour.size ?? [0, 0];
    expect(data.mesure?.sommet).toBeGreaterThanOrEqual(0);
    expect(data.mesure?.sommet).toBeLessThan(hauteur);
    expect((data.mesure?.contact ?? []).length).toBeGreaterThanOrEqual(3);
  });

  test("the tap reads the painting's mask: above the anchor is opaque, the canvas corner is not", () => {
    const s = Object.values(sprites.stades)[0]?.jour;
    expect(s && opaque(s.masque ?? vide, s.anchor[0], s.anchor[1] - 40)).toBe(true);
    expect(s && opaque(s.masque ?? vide, 2, 2)).toBe(false);
  });

  test("the night's lights stay out of the day, and nothing else draws them", () => {
    expect(etat(1).lights).toEqual([]);
    expect(etat(plafond, true).lights.length).toBe(data.lights.length);
  });
});
"""


if __name__ == "__main__":
    main()
