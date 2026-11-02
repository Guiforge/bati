import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import path from "node:path";
import {
  type Case,
  emplacements,
  ileVisible,
  paliers,
  rempart,
  sol,
  TAILLE,
} from "@/components/village/iso/isoLayout";
import { batiments } from "@/components/village/iso/isoSpec";
import { enveloppe, hauteurs, type Point, zoneOmbre } from "@/components/village/iso/ombres";
import { pansMontres } from "@/components/village/iso/rempart";
import raw from "@/constants/isoLayout.json";
import spec from "@/constants/isoSpec.json";
import { type BuildingCode, buildingCodes, buildingDefinitions } from "@/db/schema";
import type { VillageTier } from "@/db/village";
import heightsRaw from "@/scripts/iso/exports/heights.json";

// L0-T04. Everything is read from the real files: isoLayout.json, isoSpec.json, and blender's
// scripts/iso/exports/heights.json for the footprints, the shadows and the windmill's sails (the
// zone itself is built by components/village/iso/ombres.ts, which the demo screen draws).

const TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const satisfies readonly VillageTier[];

/** Separating axis test between two convex polygons; touching is not overlapping. */
function chevauche(a: readonly Point[], b: readonly Point[]): boolean {
  for (const poly of [a, b])
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      assert(p && q);
      const n: Point = [q[1] - p[1], p[0] - q[0]];
      const proj = (s: readonly Point[]) => s.map((v) => n[0] * v[0] + n[1] * v[1]);
      const pa = proj(a);
      const pb = proj(b);
      if (Math.max(...pa) <= Math.min(...pb) + 1e-9 || Math.max(...pb) <= Math.min(...pa) + 1e-9)
        return false;
    }
  return true;
}

const carre = ([gx, gy]: Case): Point[] => [
  [gx, gy],
  [gx + 1, gy],
  [gx + 1, gy + 1],
  [gx, gy + 1],
];

const toutes = (): Case[] =>
  Array.from({ length: TAILLE * TAILLE }, (_, i): Case => [i % TAILLE, Math.floor(i / TAILLE)]);

type Decor = { hauteurMax: number; ombre: { polygone: number[][] } };
const typesDecor: Record<string, Decor> = heightsRaw.decors;
const decors = toutes().filter(([gx, gy]) => typesDecor[sol[gy]?.[gx] ?? ""] !== undefined);
function decorDe([gx, gy]: Case): Decor {
  const d = typesDecor[sol[gy]?.[gx] ?? ""];
  assert(d);
  return d;
}

// The day constraint (isoSpec.json ambiances._doc). heights.py computed every exported shadow
// under this light. Another light's shadows are inside them only if they point the same way and
// are no longer (same azimuth, elevation as high or higher); for any other light the test falls
// back on a box bound, which is how a `jour` from another direction turns the spacing rule red.
type Lumiere = { azimuthDeg: number; elevationDeg: number };
const LUMIERE_DES_EXPORTS: Lumiere = { azimuthDeg: 225, elevationDeg: 55 };

/** Ground shift of a shadow per unit of height, in grid coordinates (Blender y = -gy). */
function decalage({ azimuthDeg, elevationDeg }: Lumiere): Point {
  const a = (azimuthDeg * Math.PI) / 180;
  const k = 1 / Math.tan((elevationDeg * Math.PI) / 180);
  return [-k * Math.cos(a), k * Math.sin(a)];
}

function dansLesExports(l: Lumiere): boolean {
  const [x, y] = decalage(l);
  const [rx, ry] = decalage(LUMIERE_DES_EXPORTS);
  return (
    Math.abs(x * ry - y * rx) < 1e-9 &&
    x * rx + y * ry >= 0 &&
    Math.hypot(x, y) <= Math.hypot(rx, ry) + 1e-9
  );
}

/** Every ambiance of isoSpec.json with its light, its block named or written inline. */
const lumieres: [string, Lumiere][] = Object.entries(spec.ambiances)
  .filter(([nom]) => nom !== "_doc" && nom !== "permises")
  .map(([nom, a]) => {
    const ref: unknown = (a as { lumiere?: unknown }).lumiere;
    const l = (typeof ref === "string" ? spec[ref as keyof typeof spec] : ref) as Partial<Lumiere>;
    assert(typeof l?.azimuthDeg === "number" && typeof l.elevationDeg === "number", nom);
    return [nom, { azimuthDeg: l.azimuthDeg, elevationDeg: l.elevationDeg }];
  });

/** The box of a footprint `[x0, y0]`-`[x1, y1]` up to height z, as it lands on the ground. */
const boiteAuSol = (d: Point, [x0, y0]: Point, [x1, y1]: Point, z: number): Point[] =>
  [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ].flatMap(([x = 0, y = 0]): Point[] => [
    [x, y],
    [x + z * d[0], y + z * d[1]],
  ]);

function zoneBatiment(code: BuildingCode, l: Lumiere): Point[] {
  if (dansLesExports(l)) return zoneOmbre(code);
  const h = heightsRaw.batiments[code];
  const d = decalage(l);
  const [w = 0, p = 0] = h.emprise;
  const stades: { hauteurMax: number; mobile?: { boite: number[][] }[] }[] = Object.values(
    h.stades,
  );
  const pts = stades.flatMap((s) => [
    ...boiteAuSol(d, [0, 0], [w, p], s.hauteurMax),
    ...(s.mobile ?? []).flatMap(({ boite: [a = [], b = []] }) =>
      boiteAuSol(d, [a[0] ?? 0, a[1] ?? 0], [b[0] ?? 0, b[1] ?? 0], b[2] ?? 0),
    ),
  ]);
  const [gx, gy] = emplacements[code].coin;
  return enveloppe(pts.map(([x, y]): Point => [gx + x, gy + y]));
}

function zoneDecor(c: Case, l: Lumiere): Point[] {
  const [gx, gy] = c;
  const decor = decorDe(c);
  const pts: Point[] = dansLesExports(l)
    ? decor.ombre.polygone.map(([x = 0, y = 0]): Point => [x, y])
    : boiteAuSol(decalage(l), [0, 0], [1, 1], decor.hauteurMax);
  return enveloppe(pts.map(([x, y]): Point => [gx + x, gy + y]));
}
const estChemin = ([gx, gy]: Case) => sol[gy]?.[gx] === "chemin" || sol[gy]?.[gx] === "pont";
const voisins = ([gx, gy]: Case): Case[] => [
  [gx + 1, gy],
  [gx - 1, gy],
  [gx, gy + 1],
  [gx, gy - 1],
];
const vu = (visible: boolean[][], [gx, gy]: Case) => visible[gy]?.[gx] === true;

const cle = ([gx, gy]: Case) => gy * TAILLE + gx;

/** How many cells of `cases` a flood fill from the first one cannot reach. */
function coupees(cases: readonly Case[]): number {
  const reste = new Map(cases.map((c) => [cle(c), c]));
  const file = cases.slice(0, 1);
  for (const c of file) reste.delete(cle(c));
  for (let c = file.pop(); c; c = file.pop())
    for (const n of voisins(c).filter((v) => reste.has(cle(v)))) {
      reste.delete(cle(n));
      file.push(n);
    }
  return reste.size;
}

/** Hidden cells the outside of the grid cannot reach through hidden cells: holes in the island. */
function trous(visible: boolean[][]): number {
  const cachees = toutes().filter((c) => !vu(visible, c));
  const bord = cachees.filter(
    ([gx, gy]) => Math.min(gx, gy) === 0 || Math.max(gx, gy) === TAILLE - 1,
  );
  const atteintes = new Set(bord.map(cle));
  const file = [...bord];
  for (let c = file.pop(); c; c = file.pop())
    for (const n of voisins(c).filter((v) => !vu(visible, v) && !atteintes.has(cle(v)))) {
      if (n[0] < 0 || n[1] < 0 || n[0] >= TAILLE || n[1] >= TAILLE) continue;
      atteintes.add(cle(n));
      file.push(n);
    }
  return cachees.length - atteintes.size;
}

/**
 * Problems with one island: in pieces, with a hole, its path split, or a standing building the
 * path does not reach.
 */
function problemesIle(visible: boolean[][], debout: readonly BuildingCode[]): string[] {
  const ile = toutes().filter((c) => vu(visible, c));
  const chemin = ile.filter(estChemin);
  const problemes = [
    ...(coupees(ile) > 0 ? [`island in pieces, ${coupees(ile)} cells cut off`] : []),
    ...(trous(visible) > 0 ? [`island with ${trous(visible)} cells of hole`] : []),
    ...(coupees(chemin) > 0 ? [`path split, ${coupees(chemin)} cells cut off`] : []),
  ];
  const surChemin = new Set(chemin.map(cle));
  for (const code of debout) {
    const cases = emplacements[code].cases;
    if (!cases.every((c) => vu(visible, c))) problemes.push(`${code} not on the island`);
    else if (!cases.some((c) => voisins(c).some((n) => surChemin.has(cle(n)))))
      problemes.push(`${code} not reached by the path`);
  }
  return problemes;
}

// The three exceptions of the plan (docs/designs/village-loop/disposition-plan.md § Contraintes).
/**
 * Exception 1: castle_wall is the gatehouse, and the grand-route goes through it. Its middle
 * cell is a path under the footprint, so walkers, streets and the access search pass the gate.
 */
const porteDuRempart = (gx: number, gy: number) => {
  const { coin } = emplacements.castle_wall;
  return gx === coin[0] && gy === coin[1] + 1;
};
const hauteurMax = (code: BuildingCode) =>
  Math.max(...Object.values(heightsRaw.batiments[code].stades).map((s) => s.hauteurMax));
/**
 * Exception 2: a building lower than the wall may shadow castle_wall. The wall runs along gy and
 * its +gx face is the one the camera sees; a shadow cast from the west lands on its back face,
 * hidden behind the wall it falls on. Exception 3: castle_wall and watchtower ignore each
 * other's shadow, they are two links of the same wall line and stand against each other on purpose.
 */
const ombreToleree = (de: BuildingCode, sur: BuildingCode) =>
  (sur === "castle_wall" && hauteurMax(de) < hauteurMax("castle_wall")) ||
  (de === "castle_wall" && sur === "watchtower") ||
  (de === "watchtower" && sur === "castle_wall");

const surIleDeBase = (t: VillageTier) =>
  buildingCodes.filter((code) =>
    emplacements[code].cases.every(([gx, gy]) => {
      const p = paliers[gy]?.[gx];
      return p != null && p <= t;
    }),
  );

describe("isoLayout.json, the master grid (L0-T03)", () => {
  test("all 21 buildings are placed, once", () => {
    expect(Object.keys(raw.batiments).toSorted()).toEqual([...buildingCodes].toSorted());
  });

  test("footprints in isoSpec.json are blender's, from heights.json", () => {
    for (const code of buildingCodes) {
      expect([code, batiments[code].emprise]).toEqual([code, hauteurs[code]?.emprise]);
      expect(emplacements[code].cases).toHaveLength(
        (hauteurs[code]?.emprise ?? []).reduce((a, b) => a * b, 1),
      );
    }
  });

  test("every footprint is on grass, on the island, inside the grid, and alone", () => {
    const pris = new Map<string, BuildingCode>();
    for (const code of buildingCodes)
      for (const [gx, gy] of emplacements[code].cases) {
        expect([code, gx >= 0 && gy >= 0 && gx < TAILLE && gy < TAILLE]).toEqual([code, true]);
        expect([code, sol[gy]?.[gx]]).toEqual([code, porteDuRempart(gx, gy) ? "chemin" : "herbe"]);
        expect([code, paliers[gy]?.[gx] != null]).toEqual([code, true]);
        expect([code, pris.get(`${gx},${gy}`)]).toEqual([code, undefined]);
        pris.set(`${gx},${gy}`, code);
      }
  });

  test("every moving part that casts a shadow comes with its polygon", () => {
    const sans = Object.entries(hauteurs).flatMap(([code, h]) =>
      Object.values(h.stades).flatMap((s) =>
        (s.mobile ?? []).filter((m) => m.ombrePortee && !m.ombre).map((m) => `${code} ${m.nom}`),
      ),
    );
    expect(sans).toEqual([]);
  });

  test("isoSpec.json has at least one ambiance light, and nuit's is the one the exports used", () => {
    expect(lumieres.map(([nom]) => nom)).toContain("nuit");
    expect(lumieres.find(([nom]) => nom === "nuit")?.[1]).toEqual(LUMIERE_DES_EXPORTS);
  });

  // Footprints and decor never move with the tier, so an overlap anywhere is an overlap at the
  // tier both are shown, early buildings included.
  test.each(lumieres)(
    "under the %s light, no building's shadow, at any stage, sails swept, falls on another building or decor",
    (_, l) => {
      const touches = buildingCodes.flatMap((code) => {
        const zone = zoneBatiment(code, l);
        const sur = (c: Case) => chevauche(zone, carre(c));
        return [
          ...buildingCodes
            .filter(
              (autre) =>
                autre !== code && !ombreToleree(code, autre) && emplacements[autre].cases.some(sur),
            )
            .map((autre) => `${code} -> ${autre}`),
          ...decors.filter(sur).map((d) => `${code} -> decor ${d}`),
        ];
      });
      expect(touches).toEqual([]);
    },
  );

  test.each(lumieres)(
    "under the %s light, no decor's shadow falls on a building or on other decor",
    (_, l) => {
      const touches = decors.flatMap((d) => {
        const zone = zoneDecor(d, l);
        const sur = (c: Case) => chevauche(zone, carre(c));
        return [
          ...buildingCodes
            .filter((code) => emplacements[code].cases.some(sur))
            .map((code) => `decor ${d} -> ${code}`),
          ...decors
            .filter((autre) => cle(autre) !== cle(d) && sur(autre))
            .map((autre) => `decor ${d} -> decor ${autre}`),
        ];
      });
      expect(touches).toEqual([]);
    },
  );

  // heights.py measures a stage from its blockout when one exists; a blockout added (lot 1) and
  // heights.py not rerun leaves an estimate in heights.json that may be lower than the real thing.
  test("heights.json is not stale: every stage with a blockout is measured from it", () => {
    const MOBILES = new Set(["windmill_sails"]); // moving parts, read with their building
    const dossier = path.join(__dirname, "../scripts/iso/blockouts");
    const fichiers = readdirSync(dossier)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.slice(0, -".json".length))
      .filter((nom) => !MOBILES.has(nom));
    expect(fichiers.length).toBeGreaterThan(0);
    const sources: Record<string, { stades: Record<string, { source: string }> }> =
      heightsRaw.batiments;
    const perimes = fichiers.filter((nom) => {
      const i = nom.lastIndexOf("_");
      return sources[nom.slice(0, i)]?.stades[nom.slice(i + 1)]?.source !== "blockout";
    });
    expect(perimes).toEqual([]);
  });

  // The buildings-track specs (scripts/iso/blockouts/bld/) are read apart from `batiments`:
  // iso-spec.test.ts keeps its 200 px of free height for the stages in `batiments`, and the pilot
  // maquettes go higher (3.8 and 4.02 against 2.96 in 2x2). Here the only limit is the canvas, with
  // the real top of the parts. The 200 px threshold stays Guillaume's call.
  const dansLeCanevas = (m: { sommetPx: number }) => m.sommetPx >= 0;
  test("buildings-track specs are measured, and each fits its canvas", () => {
    const dossier = path.join(__dirname, "../scripts/iso/blockouts/bld");
    const stems = readdirSync(dossier)
      .filter((f) => f.endsWith(".json") && !f.startsWith("windmill_sails"))
      .map((f) => f.slice(0, -".json".length))
      .toSorted();
    const mesures: Record<
      string,
      Record<string, { canevas: string; hauteurMax: number; sommetPx: number }>
    > = heightsRaw.batimentsBld;
    const lus = Object.entries(mesures)
      .flatMap(([code, stades]) => Object.keys(stades).map((st) => `${code}_${st}`))
      .toSorted();
    expect(lus).toEqual(stems);
    // heights.py projects every part (anchor, pxPerUnit, gx, gy, z) into `sommetPx`, the py of the
    // highest point in the canvas; there is no margin at the top, so it must stay at 0 or more.
    for (const [code, stades] of Object.entries(mesures))
      for (const [stade, m] of Object.entries(stades)) {
        expect({ code, stade, assez: dansLeCanevas(m) }).toEqual({ code, stade, assez: true });
      }
  });

  test("the canvas check fails on a spec whose top really leaves the canvas", () => {
    expect(dansLeCanevas({ sommetPx: -0.1 })).toBe(false);
    expect(dansLeCanevas({ sommetPx: -48.6 })).toBe(false);
    expect(dansLeCanevas({ sommetPx: 0 })).toBe(true);
    // The old corner-based bound (3.81 units) would have failed this one; the true top is inside.
    expect(heightsRaw.batimentsBld.observatory.mythic.hauteurMax).toBeGreaterThan(3.81);
    expect(dansLeCanevas(heightsRaw.batimentsBld.observatory.mythic)).toBe(true);
  });

  test("no shadow hangs over the void: it lands on cells already there when its plot is", () => {
    const vide: string[] = [];
    for (const code of buildingCodes) {
      const zone = zoneOmbre(code);
      const plot = Math.max(...emplacements[code].cases.map(([gx, gy]) => paliers[gy]?.[gx] ?? 99));
      const base = paliers.map((l) => l.map((p) => p !== null && p <= plot));
      for (const c of toutes())
        if (chevauche(zone, carre(c)) && !vu(base, c)) vide.push(`${code} over ${c}`);
    }
    expect(vide).toEqual([]);
  });

  test("at every tier the island is one piece without a hole, its path one piece reaching every plot there", () => {
    for (const t of TIERS) {
      expect([t, problemesIle(ileVisible(t, []), surIleDeBase(t))]).toEqual([t, []]);
    }
  });

  // db/village.ts derives each building from the journal (getVillageBuildings) and the village
  // tier from the hero level (getVillageTier); neither reads the other, so any building can stand
  // at tier 1. The starters (tier 1 in the schema) always stand (deriveLevel clamps them to level
  // 1 at least). So each case is: the starters, one building, and the building a tier-3 upgrade
  // needs at level 3 before it can exist; then all 21 at once. Any other set reveals a union of
  // these: plots and paths that each reach the campfire, so the island and the path stay in one
  // piece, and ileVisible fills any hole such a union closes around.
  test("a building standing at any tier is on a whole island, reached by a connected path", () => {
    const depart = buildingCodes.filter((code) => buildingDefinitions[code].tier === 1);
    for (const t of TIERS) {
      for (const code of buildingCodes) {
        const prerequis = buildingDefinitions[code].prerequisiteBuilding;
        const debout = [...depart, code, ...(prerequis ? [prerequis] : [])];
        expect([t, code, problemesIle(ileVisible(t, debout), debout)]).toEqual([t, code, []]);
      }
      expect([t, problemesIle(ileVisible(t, buildingCodes), buildingCodes)]).toEqual([t, []]);
    }
  });

  // L1-T17 (items 33, 34): a path touching a plot only on its back edges (-gx, -gy) lies behind the
  // sprite on screen, so the arena read as standing on grass (its path ran along gx 10, behind it).
  // Every building is reached on a front edge (+gx or +gy) by a path cell there at its plot's tier,
  // except those of DERRIERE.
  // shortcut: a ratchet, not yet the rule for all 21: the buildings of DERRIERE are reached from
  // behind only; whether they get a front path is a composition call for Guillaume at H1 (the map
  // was validated at H0). The second test fails as soon as one gets a front path: take it out of
  // DERRIERE then, never add one.
  const DERRIERE: readonly BuildingCode[] = []; // L1-T24: the replanned map serves all 21 on a front edge
  const servieDevant = (code: BuildingCode) => {
    const { coin, emprise, cases } = emplacements[code];
    const plot = Math.max(...cases.map(([gx, gy]) => paliers[gy]?.[gx] ?? 99));
    const devant: Case[] = [
      ...Array.from({ length: emprise[1] }, (_, j): Case => [coin[0] + emprise[0], coin[1] + j]),
      ...Array.from({ length: emprise[0] }, (_, i): Case => [coin[0] + i, coin[1] + emprise[1]]),
    ];
    return devant.some((c) => estChemin(c) && (paliers[c[1]]?.[c[0]] ?? 99) <= plot);
  };
  test("every building outside DERRIERE has a path on a visible edge at its plot's tier", () => {
    expect(buildingCodes.filter((code) => !DERRIERE.includes(code) && !servieDevant(code))).toEqual(
      [],
    );
  });
  test("every building of DERRIERE still has none, so the ratchet tightens when one gets it", () => {
    expect(DERRIERE.filter(servieDevant)).toEqual([]);
  });

  test("its whole shadow comes with a building that stands early", () => {
    for (const t of TIERS)
      for (const code of buildingCodes) {
        const visible = ileVisible(t, [code]);
        const zone = zoneOmbre(code);
        const dehors = toutes().filter((c) => chevauche(zone, carre(c)) && !vu(visible, c));
        expect([t, code, dehors]).toEqual([t, code, []]);
      }
  });

  test("the island only grows: with the tier, and with each building that stands", () => {
    const sousEnsemble = (a: boolean[][], b: boolean[][]) =>
      toutes().every((c) => !vu(a, c) || vu(b, c));
    for (const [avant, t] of TIERS.slice(1).map((t, i) => [TIERS[i] ?? 1, t] as const)) {
      expect([t, sousEnsemble(ileVisible(avant, []), ileVisible(t, []))]).toEqual([t, true]);
      for (const code of buildingCodes)
        expect([t, code, sousEnsemble(ileVisible(avant, [code]), ileVisible(t, [code]))]).toEqual([
          t,
          code,
          true,
        ]);
    }
    for (const t of TIERS)
      expect([t, sousEnsemble(ileVisible(t, []), ileVisible(t, buildingCodes))]).toEqual([t, true]);
  });

  test("tier 12 is the whole island, and the island is inside the grid", () => {
    const final = ileVisible(12, buildingCodes);
    for (const c of toutes()) expect([c, vu(final, c)]).toEqual([c, paliers[c[1]]?.[c[0]] != null]);
    const horsIle = toutes().filter(([gx, gy]) => paliers[gy]?.[gx] == null);
    expect(horsIle.filter(([gx, gy]) => sol[gy]?.[gx] !== "herbe")).toEqual([]);
    expect(final).toHaveLength(TAILLE);
    for (const ligne of final) expect(ligne).toHaveLength(TAILLE);
  });

  test("the waterfall pours off the island's edge", () => {
    const cascades = toutes().filter(([gx, gy]) => sol[gy]?.[gx] === "cascade");
    expect(cascades.length).toBeGreaterThan(0);
    for (const c of cascades)
      expect([c, voisins(c).some(([gx, gy]) => paliers[gy]?.[gx] == null)]).toEqual([c, true]);
  });

  // FIN-DIS § Croissance: each plot is on the island at its target tier at the latest.
  const CIBLE: Record<BuildingCode, VillageTier> = {
    campfire: 1,
    tent: 1,
    training_dummy: 1,
    heroes_hall: 1,
    farm: 2,
    forge: 2,
    archery_range: 2,
    well: 2,
    quarry: 3,
    windmill: 3,
    wizard_tower: 4,
    druid_grove: 4,
    fountain: 4,
    armory: 5,
    barn: 5,
    castle_wall: 6,
    watchtower: 6,
    observatory: 6,
    high_road: 8,
    dragon_lair: 8,
    champion_arena: 9,
  };
  test("every plot is on the island by its tier of the plan", () => {
    const tard = buildingCodes.filter(
      (code) =>
        !emplacements[code].cases.every(([gx, gy]) => (paliers[gy]?.[gx] ?? 99) <= CIBLE[code]),
    );
    expect(tard).toEqual([]);
  });

  test("the wall sections are on grass, off every footprint, on the island, in one line with the gatehouse", () => {
    const pris = new Set(buildingCodes.flatMap((c) => emplacements[c].cases.map(cle)));
    for (const c of rempart) {
      expect([c, sol[c[1]]?.[c[0]], pris.has(cle(c)), paliers[c[1]]?.[c[0]] != null]).toEqual([
        c,
        "herbe",
        false,
        true,
      ]);
    }
    // A section touches another, the gatehouse or the watchtower; the south gate is the one gap.
    const ligne = new Set([
      ...rempart.map(cle),
      ...emplacements.castle_wall.cases.map(cle),
      ...emplacements.watchtower.cases.map(cle),
    ]);
    expect(rempart.filter((c) => !voisins(c).some((n) => ligne.has(cle(n))))).toEqual([]);
    expect(new Set(rempart.map(cle)).size).toBe(rempart.length);
  });

  test("a wall section is shown only when its cell is: its tier never comes before the ground", () => {
    for (const t of TIERS) {
      const visible = ileVisible(t, buildingCodes);
      const montres = pansMontres(visible, buildingCodes);
      expect([t, montres.filter((c) => !vu(visible, c))]).toEqual([t, []]);
      expect([t, pansMontres(visible, ["campfire"])]).toEqual([t, []]);
    }
  });

  // Iteration 3 (Guillaume: "the observatory is a bit too hidden"): nothing taller stands in front
  // of it on the screen. A box is the footprint's diamond, topped by its highest stage; in sprite px
  // (isoSpec.json cellToScreen), a unit of height being S * sqrt(6) / 4.
  test("no taller building in front of the observatory covers more than a quarter of its screen box", () => {
    const boite = (code: BuildingCode) => {
      const { coin, emprise } = emplacements[code];
      const h = Math.max(
        ...Object.values(heightsRaw.batiments[code].stades).map((s) => s.hauteurMax),
      );
      const dp = (h * spec.S * Math.sqrt(6)) / 4;
      const ecranXY = ([gx, gy]: Point): Point => [
        ((gx - gy) * spec.S) / 2,
        ((gx + gy) * spec.S) / 4,
      ];
      const [gx, gy] = coin;
      const [w, p] = emprise;
      return {
        h,
        devant: gx + w + gy + p,
        x0: ecranXY([gx, gy + p])[0],
        x1: ecranXY([gx + w, gy])[0],
        y0: ecranXY([gx, gy])[1] - dp,
        y1: ecranXY([gx + w, gy + p])[1],
      };
    };
    const obs = boite("observatory");
    const aire = (obs.x1 - obs.x0) * (obs.y1 - obs.y0);
    const masques = buildingCodes
      .filter((c) => c !== "observatory")
      .map((c) => ({ c, b: boite(c) }))
      .filter(({ b }) => b.h > obs.h && b.devant > obs.devant)
      .map(({ c, b }) => ({
        c,
        part:
          (Math.max(0, Math.min(obs.x1, b.x1) - Math.max(obs.x0, b.x0)) *
            Math.max(0, Math.min(obs.y1, b.y1) - Math.max(obs.y0, b.y0))) /
          aire,
      }))
      .filter(({ part }) => part > 0.25);
    expect(masques).toEqual([]);
  });
});
