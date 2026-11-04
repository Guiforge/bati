// The small lives of the map, pure side (drawn and moved by petitsDetails.tsx): fireflies and the
// cloud shadows. Everything is a function of the ambient clock `c` and of the wave start
// (horloge.ts `Depart`), with a seed per wave (no pure chance): same wave, same flight. A gesture
// lasts one cycle and starts and ends on a cycle boundary, hidden (opacity 0): the clock rests on
// a boundary outside a wave, with reduced motion and unfocused, so nothing is ever caught mid-way.

import { ecranXY } from "./carteDemo";
import { CYCLE_MS } from "./horloge";
import { emplacements, lieux } from "./isoLayout";

export const GRAINE_VIVANT = 20261030;

/** A number in [0, 1) from the seed, the wave `n` and a purpose `k`: same input, same number. */
export function hasard(n: number, k: number): number {
  "worklet";
  let x = Math.imul(
    GRAINE_VIVANT ^ Math.imul(n + 1, 0x9e3779b1) ^ Math.imul(k + 1, 0x85ebca6b),
    0x27d4eb2d,
  );
  x ^= x >>> 15;
  x = Math.imul(x, 0x2c1b3c6d);
  x ^= x >>> 12;
  return (x >>> 0) / 4294967296;
}

// --- Cloud shadows ---------------------------------------------------------------------------

/** One crossing of the map, ms of the clock (bible §5: 40 to 60 s). */
export const NUAGE_MS = 50000;
/**
 * The two shadows (OmbresNuages.tsx): the height of their path as a share of the map's, their
 * half-size in dp, and where in the crossing each stands at clock 0 (half a crossing apart).
 */
export const NUAGES = [
  { y: 0.36, rx: 300, ry: 120, decalage: 0.15 },
  { y: 0.62, rx: 230, ry: 95, decalage: 0.65 },
] as const;
/** The wind: the shadows go right and a little down the screen, the way the smoke leans. */
const NUAGE_PENTE = 0.12;

/**
 * Where shadow `i` stands at clock `c` over a map `largeur` dp wide: from a full patch off its left
 * edge to a full patch off its right one, then again (the jump back happens off the map).
 */
export function nuageA(c: number, i: number, largeur: number): { x: number; y: number } {
  "worklet";
  const n = NUAGES[i] ?? NUAGES[0];
  const v = (c / NUAGE_MS + n.decalage) % 1;
  const x = -2 * n.rx + v * (largeur + 4 * n.rx);
  return { x, y: (x - largeur / 2) * NUAGE_PENTE };
}

// --- Fireflies ---------------------------------------------------------------------------------

export const NOMBRE_LUCIOLES = 10;
/** The group's drift, half-width in dp: small, a firefly stays over its cell. */
export const DERIVE_LUCIOLES = 2;
/** The patch of ground they hover over, in cells: the canal (column 2) and the trees beside it. */
export const ZONE_LUCIOLES = lieux.lucioles;

/** Groups of fireflies, one animated node and one glow rhythm each (petitsDetails.tsx). */
export const GROUPES_LUCIOLES = 2;

/** The cells a firefly keeps off: every building's footprint and a ring of one cell round it, where a sail or a roof stands over the ground. */
const CASES_BATIES: ReadonlySet<string> = new Set(
  Object.values(emplacements).flatMap(({ cases }) =>
    cases.flatMap(([gx, gy]) =>
      [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) => `${gx + dx},${gy + dy}`)),
    ),
  ),
);

/** Whether a grid point lies on a building's footprint or its ring: no firefly there. */
export const sousBatiment = (gx: number, gy: number): boolean =>
  CASES_BATIES.has(`${Math.floor(gx)},${Math.floor(gy)}`);

/** Whether a grid point is drawn over the windmill's sails (a sprite taller than its footprint): the ground point shows on screen where the sails turn. */
export const sousAiles = (gx: number, gy: number): boolean => {
  const [x, y] = ecranXY([gx, gy]);
  return ZONE_LUCIOLES.evite.some(([cx, cy, r]) => Math.hypot(x - cx, y - cy) < r);
};

/**
 * Where the fireflies hover, in grid units; fixed. Each sits on a cell the island shows and no
 * building covers (two dozen seeded tries per firefly, none placed if all miss), so none floats over
 * the void or in front of a sail. They are dealt in turn to the groups.
 */
export function lucioles(
  visible: readonly (readonly boolean[])[],
): { gx: number; gy: number; r: number; groupe: number }[] {
  const [x0, x1] = ZONE_LUCIOLES.gx;
  const [y0, y1] = ZONE_LUCIOLES.gy;
  return Array.from({ length: NOMBRE_LUCIOLES }, (_, i) => {
    for (let t = 0; t < 24; t++) {
      const gx = x0 + (x1 - x0) * hasard(100 + i, 3 * t);
      const gy = y0 + (y1 - y0) * hasard(100 + i, 3 * t + 1);
      if (visible[Math.floor(gy)]?.[Math.floor(gx)] && !sousBatiment(gx, gy) && !sousAiles(gx, gy))
        return [
          { gx, gy, r: 1.6 + 0.8 * hasard(100 + i, 3 * t + 2), groupe: i % GROUPES_LUCIOLES },
        ];
    }
    return [];
  }).flat();
}

/**
 * A group's glow at clock `c`: group 0 beats twice a cycle, group 1 three times (sin^2 of a whole
 * number of half turns: out on every boundary, and the two peak apart), with a drift of a few dp,
 * opposite for the second. Zero opacity and no offset on every cycle boundary (the rest pose).
 */
export function lueurLucioles(c: number, groupe = 0): { opacite: number; dx: number; dy: number } {
  "worklet";
  const u = (c % CYCLE_MS) / CYCLE_MS;
  const b = Math.sin(Math.PI * (2 + groupe) * u);
  return {
    opacite: 0.9 * b * b,
    dx: (groupe % 2 ? -1 : 1) * DERIVE_LUCIOLES * Math.sin(2 * Math.PI * u),
    dy: (DERIVE_LUCIOLES / 2) * Math.sin(4 * Math.PI * u),
  };
}
