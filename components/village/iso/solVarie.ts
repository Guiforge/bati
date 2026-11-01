// What makes the vector ground uneven: a colour variant per cell, a few small decals, pebbles where
// grass meets the path, and a dusk over the island's rim. Pure and static (nothing here animates):
// every pick is a hash of the cell and the biome's seed, so a redraw gives the same ground, and
// another biome (isoSpec.json `variantes`) gives other colours, weights and seeds.
//
// What depends on the biome and the cell only (variant, decal, pebbles) is a table built once at
// load; what depends on the island (the rim) is `bordsDe`, called once per island by the map.

import { buildingCodes } from "@/db/schema";
import { DECORS_EN_IMAGE } from "./carteDemo";
import { type Case, emplacements, sol, TAILLE } from "./isoLayout";
import {
  type Biome,
  biomes,
  GENRES_DECAL,
  type GenreDecal,
  type TokenCouleur,
  type VarianteSol,
  type VariantesSpec,
} from "./isoSpec";

/** A decal in cell coordinates: `a` along gx and `b` along gy, both inside the cell's middle. */
export type DecalPose = { genre: GenreDecal; a: number; b: number; rot: number };

export type DetailCase = {
  /** The variant colour of a grass or path cell (a decor image's cell is grass); null elsewhere. */
  teinte: TokenCouleur | null;
  decal: DecalPose | null;
  /** Pebbles on a grass cell's sides that touch the path: cell coordinates and a size factor. */
  galets: readonly (readonly [u: number, v: number, taille: number])[];
};
const VIDE: DetailCase = { teinte: null, decal: null, galets: [] };

/** T39: the ink width of the ground (rim, pebbles, decals), map units: the sprites carry 8 px of ink at 384 px a cell, so 1.2 at 48 units a cell. */
export const ENCRE_SOL = 1.2;

/** Selectors of the hash, one per pick, so two picks on a cell are independent. */
const SEL = { teinte: 1, chance: 2, genre: 3, a: 4, b: 5, rot: 6, bruit: 7, galet: 10 } as const;

/** [0, 1) from the cell, a pick and the biome's seed: an integer hash (no random, no state). */
export function hasard(gx: number, gy: number, sel: number, graine: number): number {
  let h = Math.imul(gx + 1, 0x9e3779b1) ^ Math.imul(gy + 1, 0x85ebca6b);
  h ^= Math.imul(sel + 1 + graine * 31, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 2 ** 32;
}

/**
 * Smooth value noise in [0, 1): a hash on the lattice of period `periode` cells, interpolated with
 * a smoothstep, so cells a few apart get near values and the field forms patches of that size.
 */
export function bruit(gx: number, gy: number, periode: number, graine: number): number {
  const x = gx / periode;
  const y = gy / periode;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const lisse = (t: number) => t * t * (3 - 2 * t);
  const fx = lisse(x - ix);
  const fy = lisse(y - iy);
  const h = (a: number, b: number) => hasard(a, b, SEL.bruit, graine);
  const haut = h(ix, iy) * (1 - fx) + h(ix + 1, iy) * fx;
  const bas = h(ix, iy + 1) * (1 - fx) + h(ix + 1, iy + 1) * fx;
  return haut * (1 - fy) + bas * fy;
}

/**
 * A cell's variant of `liste` (dark to light): the patch noise, stretched because an interpolated
 * noise hugs the middle, with the per-cell hash as a small nudge.
 */
export function teinteDe(gx: number, gy: number, liste: readonly VarianteSol[], v: VariantesSpec) {
  const n = bruit(gx, gy, v.tache, v.graine);
  const u = 0.5 + (n - 0.5) * 1.7 + (hasard(gx, gy, SEL.teinte, v.graine) - 0.5) * 0.2;
  return choisir(liste, Math.min(0.999, Math.max(0, u))).couleur;
}

/** The entry `u` (in [0, 1)) lands on, by weight. */
export function choisir<T extends { poids: number }>(liste: readonly T[], u: number): T {
  const total = liste.reduce((s, e) => s + e.poids, 0);
  let reste = u * total;
  for (const e of liste) {
    reste -= e.poids;
    if (reste < 0) return e;
  }
  return liste[liste.length - 1] as T;
}

const cle = ([gx, gy]: Case) => gy * TAILLE + gx;
/** Every footprint of every building, shown or not: a decal never lands under one. */
export const SOUS_BATIMENT: ReadonlySet<number> = new Set(
  buildingCodes.flatMap((code) => emplacements[code].cases.map(cle)),
);
const brut = (gx: number, gy: number) => sol[gy]?.[gx];
const estChemin = (gx: number, gy: number) => brut(gx, gy) === "chemin" || brut(gx, gy) === "pont";

/** The colour variant of a plot (a building's earth), one per plot, drawn by its corner cell. */
export const terreDe = (gx: number, gy: number, v: VariantesSpec): TokenCouleur =>
  choisir<VarianteSol>(v.terre, hasard(gx, gy, SEL.teinte, v.graine)).couleur;

/**
 * Pebbles along the sides of a grass cell that touch the path (the path's cell may join later):
 * three slots a side, each kept about a third of the time, jittered along the side, in from the edge and in
 * size, so the border is broken and uneven.
 */
function galetsDe(gx: number, gy: number, v: VariantesSpec) {
  const cotes: [number, number, (t: number, e: number) => [number, number]][] = [
    [0, -1, (t, e) => [t, e]],
    [0, 1, (t, e) => [t, 1 - e]],
    [-1, 0, (t, e) => [e, t]],
    [1, 0, (t, e) => [1 - e, t]],
  ];
  const h = (sel: number) => hasard(gx, gy, SEL.galet + sel, v.graine);
  return cotes.flatMap(([dx, dy, point], c) =>
    estChemin(gx + dx, gy + dy)
      ? [0, 1, 2].flatMap((k) => {
          const n = (c * 5 + k) * 4;
          // AUDIT-DA 9: three slots a side and a third kept (was five and 45 %): no more rosary.
          if (h(n) >= 0.33) return [];
          const [u, w] = point((k + 0.1 + 0.8 * h(n + 1)) / 3, 0.04 + 0.16 * h(n + 2));
          return [[u, w, 0.6 + 0.7 * h(n + 3)] as const];
        })
      : [],
  );
}

/** How much of the biome's decal rate a cell keeps: 1 at the middle of the grid, 0.35 at the rim (L6-T18). */
export function densite(gx: number, gy: number): number {
  const dx = Math.abs(gx - (TAILLE - 1) / 2);
  const dy = Math.abs(gy - (TAILLE - 1) / 2);
  const t = (Math.max(dx, dy) + Math.min(dx, dy) / 2) / (TAILLE * 0.72);
  return 1 - 0.65 * Math.min(1, t);
}

/** A decal on a plain grass or path cell, at the biome's rate for that place; null for most cells. */
function decalDe(gx: number, gy: number, v: VariantesSpec, chemin: boolean, ailleurs: boolean) {
  if (SOUS_BATIMENT.has(cle([gx, gy]))) return null;
  const taux = (ailleurs ? v.chanceBord : v.chance) * densite(gx, gy);
  if (hasard(gx, gy, SEL.chance, v.graine) >= taux) return null;
  const genres = GENRES_DECAL.filter((g) => !chemin || v.decals[g].surChemin).map((g) => ({
    g,
    poids: v.decals[g].poids,
  }));
  const genre = choisir(genres, hasard(gx, gy, SEL.genre, v.graine)).g;
  // Tufts and flowers stand upright; stones and leaves lie any way.
  const couche = genre === "caillou" || genre === "feuille" || genre === "rocaille";
  return {
    genre,
    a: 0.3 + 0.4 * hasard(gx, gy, SEL.a, v.graine),
    b: 0.3 + 0.4 * hasard(gx, gy, SEL.b, v.graine),
    rot: couche ? Math.round(hasard(gx, gy, SEL.rot, v.graine) * 60 - 30) : 0,
  } satisfies DecalPose;
}

/** What a cell holds whatever the island: depends on the biome and the cell only. */
export function detailCase(gx: number, gy: number, v: VariantesSpec): DetailCase {
  const s = brut(gx, gy);
  const plain = s === "herbe" || s === "chemin";
  // A decor drawn as an image stands on grass (carteDemo.ts `DECORS_EN_IMAGE`).
  const herbe = plain ? s === "herbe" : s !== undefined && DECORS_EN_IMAGE.has(s);
  const liste = herbe ? v.herbe : s === "chemin" ? v.chemin : null;
  const prochePiste =
    estChemin(gx - 1, gy) ||
    estChemin(gx + 1, gy) ||
    estChemin(gx, gy - 1) ||
    estChemin(gx, gy + 1);
  return {
    teinte: liste ? teinteDe(gx, gy, liste, v) : null,
    // Decals: plain grass or path only, never under a building or on a decor's cell.
    decal: plain ? decalDe(gx, gy, v, s === "chemin", herbe && prochePiste) : null,
    galets: s === "herbe" && !SOUS_BATIMENT.has(cle([gx, gy])) ? galetsDe(gx, gy, v) : [],
  };
}

const table = (b: Biome): readonly DetailCase[] =>
  Array.from({ length: TAILLE * TAILLE }, (_, i) =>
    detailCase(i % TAILLE, Math.floor(i / TAILLE), biomes[b].variantes),
  );
const TABLES: Record<Biome, readonly DetailCase[]> = {
  defaut: table("defaut"),
  defautNuit: table("defautNuit"),
};

/** What the ground adds to a cell in a biome: a read of the table built at load. */
export const detail = (biome: Biome, gx: number, gy: number): DetailCase =>
  TABLES[biome][cle([gx, gy])] ?? VIDE;

/** Land cells that may darken at the rim: grass, path, and the grass under a decor image. */
export const estTerre = (gx: number, gy: number) => {
  const s = brut(gx, gy);
  return s === "herbe" || s === "chemin" || (s !== undefined && DECORS_EN_IMAGE.has(s));
};

/**
 * How many cells each land cell is from the island's edge (1 to 3, else 0), indexed `gy * TAILLE +
 * gx`, for the island `visible[gy][gx]`: once per island, not per tile. Off the grid is off the
 * island.
 */
export function bordsDe(visible: readonly (readonly boolean[])[]): Uint8Array {
  const bords = new Uint8Array(TAILLE * TAILLE);
  const dehors = (gx: number, gy: number) => visible[gy]?.[gx] !== true;
  // Whether a cell of the ring at distance `r` is off the island.
  const anneau = (gx: number, gy: number, r: number) =>
    Array.from(
      { length: (2 * r + 1) ** 2 },
      (_, k) => [(k % (2 * r + 1)) - r, Math.floor(k / (2 * r + 1)) - r] as const,
    )
      .filter(([dx, dy]) => Math.max(Math.abs(dx), Math.abs(dy)) === r)
      .some(([dx, dy]) => dehors(gx + dx, gy + dy));
  for (let gy = 0; gy < TAILLE; gy++)
    for (let gx = 0; gx < TAILLE; gx++)
      // A stream cell too (T22): the stream is drawn under the rim's dusk, which darkens it like the lawn.
      if (!dehors(gx, gy) && (estTerre(gx, gy) || brut(gx, gy) === "eau"))
        bords[cle([gx, gy])] = ([1, 2, 3] as const).find((r) => anneau(gx, gy, r)) ?? 0;
  return bords;
}

type Pt = readonly [number, number];
type Poly = readonly Pt[];
const ellipse = (cx: number, cy: number, rx: number, ry: number): Poly =>
  Array.from(
    { length: 8 },
    (_, k): Pt => [cx + rx * Math.cos((k * Math.PI) / 4), cy + ry * Math.sin((k * Math.PI) / 4)],
  );

/** Each decal's polygons in dp about its foot. */
const FORMES: Record<GenreDecal, readonly Poly[]> = {
  // Four solid blades, no outline: thin leaning triangles on a shared foot.
  touffe: [
    [
      [-2.2, 0],
      [-1, 0],
      [-3.4, -4.6],
    ],
    [
      [-1.2, 0],
      [0.2, 0],
      [-0.8, -6.6],
    ],
    [
      [-0.2, 0],
      [1.2, 0],
      [1.2, -5.8],
    ],
    [
      [1, 0],
      [2.3, 0],
      [3.4, -4.2],
    ],
  ],
  // AUDIT-DA 11: a four-petal flower on a short stem (the old stem and cap read as a mushroom pictogram).
  fleur: [
    [
      [-0.35, 0],
      [-0.35, -2.6],
      [0.35, -2.6],
      [0.35, 0],
    ],
    ellipse(-1.7, -4.2, 1.6, 1.2),
    ellipse(1.7, -4.2, 1.6, 1.2),
    ellipse(0, -5.9, 1.2, 1.6),
    ellipse(0, -2.9, 1.2, 1.1),
  ],
  caillou: [ellipse(0, 0, 3, 1.8), ellipse(4.8, 1.4, 1.6, 1)],
  // A bush: three round clumps, the middle one higher.
  buisson: [ellipse(-3.2, -2, 3, 2.4), ellipse(3.2, -2, 3, 2.4), ellipse(0, -4, 3.6, 3)],
  // Tall grass: five long blades, wider spread than a tuft.
  herbeHaute: [
    [
      [-4, 0],
      [-2.6, 0],
      [-5.6, -8],
    ],
    [
      [-2.2, 0],
      [-0.8, 0],
      [-2.2, -11],
    ],
    [
      [-0.8, 0],
      [0.6, 0],
      [0.4, -12.5],
    ],
    [
      [0.6, 0],
      [2, 0],
      [3, -10],
    ],
    [
      [2.2, 0],
      [3.8, 0],
      [5.8, -7],
    ],
  ],
  // A rock pile: a big boulder with two small ones against it.
  rocaille: [ellipse(0, -2, 4.2, 3), ellipse(-5.2, 0, 2.2, 1.6), ellipse(5.4, 0.4, 2.4, 1.7)],
  feuille: [
    [
      [-3, 0],
      [-1.5, -1.6],
      [1.5, -1.6],
      [3, 0],
      [1.5, 1.6],
      [-1.5, 1.6],
    ],
  ],
};

/** An irregular pebble about (x, y), half-axes `rx` and `ry` in dp: seven corners, each pushed in or out by a hash of its place. */
export function dessinGalet(x: number, y: number, rx: number, ry: number): string {
  const r = (n: number) => Math.round(n * 100) / 100;
  const pts = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * 2 * Math.PI;
    const k = 0.75 + 0.5 * hasard(Math.round(x), Math.round(y), 90 + i, 3);
    return `${r(x + rx * k * Math.cos(a))},${r(y + ry * k * Math.sin(a))}`;
  });
  return `M${pts.join("L")}Z`;
}

/** A decal's `d` at screen point (x, y), turned by `rot` degrees: the pose is in the path, no transform. */
export function dessinDecal(genre: GenreDecal, x: number, y: number, rot: number): string {
  const c = Math.cos((rot * Math.PI) / 180);
  const s = Math.sin((rot * Math.PI) / 180);
  const r = (n: number) => Math.round(n * 100) / 100;
  return FORMES[genre]
    .map(
      (poly) =>
        `M${poly.map(([px, py]) => `${r(x + px * c - py * s)},${r(y + px * s + py * c)}`).join("L")}Z`,
    )
    .join("");
}
