// Draw order of the sprites standing on the grid, back to front. Sorting by gx + gy of a corner
// is wrong as soon as footprints differ in size (a 3 x 1 in front of a 1 x 1 can have the smaller
// corner sum), so the order is a topological sort of "lies wholly behind" between footprints.

import type { Case } from "./isoLayout";

export type Emprise = { coin: Case; emprise: readonly [number, number] };

/**
 * `a` is behind `b` when its footprint ends, along gx or along gy, where `b`'s begins: the front
 * of the scene is large gx + gy. Two footprints separated both ways (one ahead along gx, the other
 * along gy) sit side by side on screen, so neither is behind.
 */
export function derriere(a: Emprise, b: Emprise): boolean {
  const avantX = a.coin[0] + a.emprise[0] <= b.coin[0];
  const avantY = a.coin[1] + a.emprise[1] <= b.coin[1];
  const apresX = b.coin[0] + b.emprise[0] <= a.coin[0];
  const apresY = b.coin[1] + b.emprise[1] <= a.coin[1];
  return (avantX || avantY) && !(apresX || apresY);
}

/** Whether `a` and `b` share at least one cell. */
export function chevauche(a: Emprise, b: Emprise): boolean {
  return (
    a.coin[0] < b.coin[0] + b.emprise[0] &&
    b.coin[0] < a.coin[0] + a.emprise[0] &&
    a.coin[1] < b.coin[1] + b.emprise[1] &&
    b.coin[1] < a.coin[1] + a.emprise[1]
  );
}

/**
 * The "lies behind" edges, counted once (n^2): the lisiere brings the scene to a few hundred
 * objects, and re-scanning the remaining ones at every step was n^3.
 */
function aretes<K extends string>(cles: readonly K[], objets: Readonly<Record<K, Emprise>>) {
  const derriereLui = new Map<K, number>(cles.map((k) => [k, 0]));
  const devant = new Map<K, K[]>(cles.map((k) => [k, []]));
  for (const a of cles)
    for (const b of cles)
      if (a !== b && derriere(objets[a], objets[b])) {
        derriereLui.set(b, (derriereLui.get(b) ?? 0) + 1);
        devant.get(a)?.push(b);
      }
  return { derriereLui, devant };
}

/** Back to front (Kahn's algorithm); ties go to the smaller far-corner gx + gy, then the key. */
export function ordreProfondeur<K extends string>(objets: Readonly<Record<K, Emprise>>): K[] {
  // `sort` on fresh arrays, not `toSorted`: the app's Hermes lacks it (.biome/plugins/noMissingHermesApi.grit).
  const cles = (Object.keys(objets) as K[]).sort();
  const loin = (k: K) =>
    objets[k].coin[0] + objets[k].emprise[0] + objets[k].coin[1] + objets[k].emprise[1];
  const { derriereLui, devant } = aretes(cles, objets);
  const restants = new Set(cles);
  const ordre: K[] = [];
  while (restants.size > 0) {
    const libres = [...restants].filter((k) => derriereLui.get(k) === 0);
    // A cycle cannot happen between footprints that do not overlap; if one did, fall back on depth.
    const suivant = (libres.length > 0 ? libres : [...restants]).sort(
      (a, b) => loin(a) - loin(b) || (a < b ? -1 : 1),
    )[0];
    if (suivant === undefined) break;
    ordre.push(suivant);
    restants.delete(suivant);
    for (const b of devant.get(suivant) ?? []) derriereLui.set(b, (derriereLui.get(b) ?? 0) - 1);
  }
  return ordre;
}
