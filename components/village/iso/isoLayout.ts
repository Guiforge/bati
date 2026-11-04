// The typed reader of constants/isoLayout.json, the master grid of the iso village: where each
// building stands, the path, the water, the decor, and the village tier at which each cell joins
// the island. Footprints come from isoSpec.json (`emprise`); nothing here repeats them.

import raw from "@/constants/isoLayout.json";
import { type BuildingCode, buildingCodes } from "@/db/schema";
import type { VillageTier } from "@/db/village";
import { batiments } from "./isoSpec";

export type Sol = "herbe" | "chemin" | "pont" | "eau" | "cascade" | "arbre" | "rochers" | "bosquet";

/** A cell, by its grid corner: gx to screen right-down, gy to screen left-down. */
export type Case = readonly [gx: number, gy: number];

export type Emplacement = {
  /** The footprint's corner with the smallest gx and gy. */
  coin: Case;
  emprise: readonly [number, number];
  cases: readonly Case[];
  /** Path cells from the footprint to the campfire, fixed: an early building reveals these. */
  acces: readonly Case[];
};

const SOLS: readonly Sol[] = [
  "herbe",
  "chemin",
  "pont",
  "eau",
  "cascade",
  "arbre",
  "rochers",
  "bosquet",
];
const PALIERS = "123456789abc";

/**
 * The grid runs from `DEBUT` (a negative index: the map grew up and left, 04/11 plan) to `TAILLE`
 * - 1 on both axes. `TAILLE` is still the old map's size, so its right and lower edges, and every
 * table written against them, stay where they were; only the cells before 0 are new.
 */
export const DEBUT = raw.debut;
export const TAILLE = raw.sol.length + DEBUT;
/** Cells along one side of the storage: the stride of `cle`. */
export const COTES = TAILLE - DEBUT;

/** A cell's number, unique over the whole grid (`gy * TAILLE + gx` collides with a cell of the row above once gx can be negative). */
export const cle = ([gx, gy]: readonly [number, number]) => (gy - DEBUT) * COTES + (gx - DEBUT);
export const dansLaGrille = ([gx, gy]: readonly [number, number]) =>
  gx >= DEBUT && gy >= DEBUT && gx < TAILLE && gy < TAILLE;

/** Every cell of the grid, row by row. */
export const CASES: readonly Case[] = Array.from(
  { length: COTES * COTES },
  (_, i): Case => [(i % COTES) + DEBUT, Math.floor(i / COTES) + DEBUT],
);

/**
 * A grid read as `g[gy][gx]` from `DEBUT`: indices 0 to TAILLE - 1 are the array's own, the new
 * land's negative ones are plain properties, so every `g[gy]?.[gx]` reads a cell of either. `map`,
 * `forEach` and `flatMap` see the old map only: loops over the whole grid use `CASES`.
 */
export function grilleDe<T>(lire: (gx: number, gy: number) => T): T[][] {
  const lignes: T[][] = [];
  for (let gy = DEBUT; gy < TAILLE; gy++) {
    const ligne: T[] = [];
    for (let gx = DEBUT; gx < TAILLE; gx++) ligne[gx] = lire(gx, gy);
    lignes[gy] = ligne;
  }
  return lignes;
}

const legende = new Map<string, Sol>(
  Object.entries(raw.legende).map(([ch, nom]) => {
    const sol = SOLS.find((s) => s === nom);
    if (sol === undefined || ch.length !== 1)
      throw new Error(`isoLayout.json legende: "${ch}" -> "${nom}"`);
    return [ch, sol];
  }),
);

function grille<T>(lignes: readonly string[], ou: string, lire: (ch: string) => T): T[][] {
  if (lignes.length !== COTES || lignes.some((l) => l.length !== COTES))
    throw new Error(`isoLayout.json ${ou}: ${COTES} rows of ${COTES} cells expected`);
  return grilleDe((gx, gy) => {
    const ch = lignes[gy - DEBUT]?.[gx - DEBUT] ?? "";
    try {
      return lire(ch);
    } catch {
      throw new Error(`isoLayout.json ${ou}[${gy}][${gx}]: "${ch}"`);
    }
  });
}

/** The tier each building's stages start at in the demo (carteDemo.ts `stadeDemo`): fixed data, not read from `paliers`. */
export const etapes = raw.etapes as Readonly<Partial<Record<BuildingCode, VillageTier>>>;

/** `sol[gy][gx]` */
export const sol: readonly (readonly Sol[])[] = grille(raw.sol, "sol", (ch) => {
  const s = legende.get(ch);
  if (s === undefined) throw new Error(ch);
  return s;
});

/** `paliers[gy][gx]`: the village tier at which the cell joins the island, null if it never does. */
export const paliers: readonly (readonly (VillageTier | null)[])[] = grille(
  raw.paliers,
  "paliers",
  (ch) => {
    if (ch === "-") return null;
    const i = PALIERS.indexOf(ch);
    if (i < 0) throw new Error(ch);
    return (i + 1) as VillageTier;
  },
);

const estChemin = ([gx, gy]: Case) => {
  const s = sol[gy]?.[gx];
  return s === "chemin" || s === "pont";
};
const VOISINS: readonly Case[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const voisins = ([gx, gy]: Case): Case[] =>
  VOISINS.map(([dx, dy]): Case => [gx + dx, gy + dy]).filter(dansLaGrille);

function casesDe([gx, gy]: Case, [w, d]: readonly [number, number]): Case[] {
  const cases: Case[] = [];
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) cases.push([gx + i, gy + j]);
  return cases;
}

const coins: Record<BuildingCode, readonly number[]> = raw.batiments;

function coin(code: BuildingCode): Case {
  const c = coins[code] ?? [];
  const [gx, gy] = c;
  if (c.length !== 2 || gx === undefined || gy === undefined)
    throw new Error(`isoLayout.json batiments.${code}`);
  return [gx, gy];
}

const feu = casesDe(coin("campfire"), [1, 1]);

/** Breadth-first over path cells, from the footprint's neighbours to one touching the campfire. */
function acces(cases: readonly Case[]): Case[] {
  const autour = new Set(feu.flatMap(voisins).map(cle));
  const depart = cases.flatMap(voisins).filter(estChemin);
  const avant = new Map<number, Case | null>(depart.map((c) => [cle(c), null]));
  const file = [...depart];
  for (let c = file.shift(); c !== undefined; c = file.shift()) {
    if (autour.has(cle(c))) {
      const route: Case[] = [];
      for (let p: Case | null | undefined = c; p; p = avant.get(cle(p))) route.push(p);
      return route;
    }
    for (const n of voisins(c))
      if (estChemin(n) && !avant.has(cle(n))) {
        avant.set(cle(n), c);
        file.push(n);
      }
  }
  return [];
}

export const emplacements = Object.fromEntries(
  buildingCodes.map((code): [BuildingCode, Emplacement] => {
    const emprise = batiments[code].emprise;
    if (emprise === null) throw new Error(`isoSpec.json batiments.${code}.emprise is null`);
    const cases = casesDe(coin(code), emprise);
    return [code, { coin: coin(code), emprise, cases, acces: acces(cases) }];
  }),
) as Record<BuildingCode, Emplacement>;

const paire = (p: readonly number[], ou: string): Case => {
  const [gx, gy] = p;
  if (p.length !== 2 || gx === undefined || gy === undefined || !dansLaGrille([gx, gy]))
    throw new Error(`isoLayout.json ${ou}: [gx, gy] inside the grid expected`);
  return [gx, gy];
};

/**
 * castle_wall's wall sections (isoLayout.json `rempart`), one cell each. They are not in its
 * `cases`: the plot is the gatehouse, so the reveal, the shadow rule and the early island stay
 * the gatehouse's, and a section is drawn only on a cell the island already shows.
 */
export const rempart: readonly Case[] = raw.rempart.map((p, i) => paire(p, `rempart[${i}]`));

/**
 * The wall's stretches: straight runs of `rempart`, the rows' first (the south wall, cut by its
 * gate), then the columns' of what is left (the east wall, cut by the watchtower and the
 * gatehouse), each back to front. The map draws a stretch as one element of its depth order.
 */
export const troncons: readonly (readonly Case[])[] = (() => {
  const restants = new Set(rempart.map(cle));
  const tri = [...rempart].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const runs: Case[][] = [];
  /** The run of sections left from `c` on, one step (dx, dy) at a time. */
  const suivre = (c: Case, dx: number, dy: number) => {
    const run: Case[] = [c];
    for (let n: Case = [c[0] + dx, c[1] + dy]; restants.has(cle(n)); n = [n[0] + dx, n[1] + dy])
      run.push(n);
    return run;
  };
  for (const [dx, dy, min] of [
    [1, 0, 2],
    [0, 1, 1],
  ] as const)
    for (const c of tri) {
      if (!restants.has(cle(c)) || restants.has(cle([c[0] - dx, c[1] - dy]))) continue;
      const run = suivre(c, dx, dy);
      if (run.length < min) continue;
      for (const r of run) restants.delete(cle(r));
      runs.push(run);
    }
  return runs;
})();

/** The plan's fields (isoLayout.json `champs`): the corner cell and the size in cells. */
export const champsDuPlan: readonly { coin: Case; taille: readonly [number, number] }[] =
  raw.champs.map((r, i) => {
    const [gx = -1, gy = -1, w = 0, h = 0] = r;
    if (r.length !== 4 || w < 1 || h < 1) throw new Error(`isoLayout.json champs[${i}]`);
    return { coin: paire([gx, gy], `champs[${i}]`), taille: [w, h] as const };
  });

/** How far around an early building the ground comes with it: its widest shadow is under 2 cells. */
const MARGE_EN_AVANCE = 2;

/**
 * Which cells are on the island, `visible[gy][gx]`, for a village tier and the buildings standing.
 * A building can stand before its plot's tier (db/village.ts derives buildings from the journal,
 * never from the tier), so its plot, the ground around it and its path to the campfire come early.
 * What a standing building brings is fixed, whatever the tier, so the island only ever grows.
 * Pass every building of level > 0, the three starters included. A pocket of sea the island
 * closes around is filled: the island never has a hole.
 */
export function ileVisible(palier: VillageTier, debout: Iterable<BuildingCode>): boolean[][] {
  const visible = grilleDe((gx, gy) => {
    const p = paliers[gy]?.[gx];
    return p != null && p <= palier;
  });
  const montrer = ([gx, gy]: Case, marge: number) => {
    for (let x = gx - marge; x <= gx + marge; x++)
      for (let y = gy - marge; y <= gy + marge; y++) {
        const ligne = visible[y];
        if (ligne && dansLaGrille([x, y]) && paliers[y]?.[x] !== null) ligne[x] = true;
      }
  };
  for (const code of debout) {
    const e = emplacements[code];
    for (const c of e.cases) montrer(c, MARGE_EN_AVANCE);
    for (const c of e.acces) montrer(c, 1);
  }
  return sansTrou(visible);
}

/** Only the building's plot and `marge` cells round it: the ground of a capture that shows it alone. */
export function ileSeule(code: BuildingCode, marge = 2): boolean[][] {
  const visible = grilleDe(() => false);
  for (const [gx, gy] of emplacements[code].cases)
    for (let x = gx - marge; x <= gx + marge; x++)
      for (let y = gy - marge; y <= gy + marge; y++) {
        const ligne = visible[y];
        if (ligne && paliers[y]?.[x] != null) ligne[x] = true;
      }
  return visible;
}

/** Every hidden cell the outside of the grid cannot reach through hidden cells joins the island. */
function sansTrou(visible: boolean[][]): boolean[][] {
  const dehors = grilleDe(() => false);
  const file: Case[] = [];
  const entrer = ([gx, gy]: Case) => {
    const ligne = dehors[gy];
    if (ligne && dansLaGrille([gx, gy]) && !ligne[gx] && visible[gy]?.[gx] === false) {
      ligne[gx] = true;
      file.push([gx, gy]);
    }
  };
  for (let i = DEBUT; i < TAILLE; i++) {
    entrer([i, DEBUT]);
    entrer([i, TAILLE - 1]);
    entrer([DEBUT, i]);
    entrer([TAILLE - 1, i]);
  }
  for (let c = file.pop(); c; c = file.pop()) for (const n of voisins(c)) entrer(n);
  return grilleDe(
    (gx, gy) =>
      visible[gy]?.[gx] === true || (dehors[gy]?.[gx] === false && paliers[gy]?.[gx] !== null),
  );
}

/** Named places of the small lives (isoLayout.json `lieux`): read by vivant.ts, checked here. */
export const lieux = (() => {
  const { lucioles } = raw.lieux;
  const [gx0, gx1] = lucioles.gx;
  const [gy0, gy1] = lucioles.gy;
  if (gx0 === undefined || gx1 === undefined || gy0 === undefined || gy1 === undefined)
    throw new Error("isoLayout.json lieux.lucioles: gx and gy need two bounds");
  if (!(gx0 < gx1 && gy0 < gy1)) throw new Error("isoLayout.json lieux.lucioles: empty zone");
  const evite = lucioles.evite.map(([x, y, r]) => {
    if (x === undefined || y === undefined || r === undefined || r <= 0)
      throw new Error("isoLayout.json lieux.lucioles.evite: a disc is [x, y, radius]");
    return [x, y, r] as const;
  });
  return {
    lucioles: { gx: [gx0, gx1], gy: [gy0, gy1], evite } as const,
  };
})();

/**
 * The roof points where a bird lands (isoLayout.json `toits`), by painted stage `<code>_<stade>`:
 * a point of the ridge's top edge, in sprite px.
 */
export const toits: ReadonlyMap<string, readonly [u: number, v: number]> = new Map(
  Object.entries(raw.toits).flatMap(([cle, p]) =>
    Array.isArray(p) && p.length === 2 && typeof p[0] === "number" && typeof p[1] === "number"
      ? [[cle, [p[0], p[1]] as const] as const]
      : [],
  ),
);
