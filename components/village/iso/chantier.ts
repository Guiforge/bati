// The building site played before a building's new stage (L6-T02, criterion 8): scaffolding round
// the old stage, two or three villagers who come to strike, a little dust, then the growth layer
// (IsoCroissance) fades the new stage in. Pure: where the villagers stand and which scaffold fits.
// IsoVillage owns the sequence (its `croissance` prop is the one entry; `onCroissanceFinie` is
// the end callback, called once, after the new stage is shown: L6-T13 writes the claimed stage there).

import type { BuildingCode } from "@/db/schema";
import { type Case, emplacements } from "./isoLayout";
import { type Carte, casesDuLieu, hasard, type Role, rolesPresents } from "./marcheurs";

/**
 * How long the site stands, ms, counted from the tap (the camera moves meanwhile): the new stage
 * shows when it ends (T37: under 2 s on the device, which adds about 0.9 s of renders to this);
 * the whole scene ends one cross-fade later. A tap on the map ends it at once.
 */
export const CHANTIER_MS = 1000;
/** The scaffold stays this long into the cross-fade, ms: longer than a decode, shorter than the fade (T03). */
export const ECHAFAUDAGE_APRES_MS = 120;
/** One strike (raise and fall), ms: 200 so that three, and the return upright, fit in the site. */
export const COUP_MS = 200;
/** The swing back upright after the last blow, ms. */
export const RETOUR_COUP_MS = COUP_MS * 0.3;
/** Villagers striking per site, and how far apart their strikes fall, ms. */
export const OUVRIERS_MAX = 3;
export const DECALAGE_OUVRIER_MS = 130;
/**
 * Strikes each villager makes: the last villager's last blow, and its return upright, end before
 * the site does (at 390 ms the return was cut 47 ms short and the villager snapped upright).
 */
export const COUPS = Math.floor(
  (CHANTIER_MS - (OUVRIERS_MAX - 1) * DECALAGE_OUVRIER_MS - RETOUR_COUP_MS) / COUP_MS,
);
/** When villager `i`'s strike `k` (0-based) lands, ms from the site's start: at the end of its cycle. */
export const impact = (i: number, k: number) => i * DECALAGE_OUVRIER_MS + (k + 1) * COUP_MS;
/** The dust node's run (Poussiere): `u` goes from 0 to COUPS linearly, from the first villager's first blow. */
export const POUSSIERE_DEBUT_MS = impact(0, 0);
export const POUSSIERE_DUREE_MS = COUPS * COUP_MS;
/** The dust node's `u` at `t` ms from the site's start (what its timing gives). */
export const uAuTemps = (t: number) =>
  Math.min(COUPS, Math.max(0, ((t - POUSSIERE_DEBUT_MS) * COUPS) / POUSSIERE_DUREE_MS));
/**
 * How long one puff of dust lasts, ms: gone 40 ms before the next blow, and the last one, raised
 * by the first villager's last blow, ends with the site.
 */
export const BOUFFEE_MS = Math.min(COUP_MS - 40, CHANTIER_MS - impact(0, COUPS - 1));

/**
 * One puff of dust and its chip of stone at the foot of the site, from `u`: the strikes of the
 * first villager counted since its first blow (0 at it, COUPS after its last; the dust node runs
 * `u` linearly from its first impact). A puff bursts at each blow and is gone before the next.
 */
export function bouffee(u: number): { opacite: number; echelle: number; y: number } {
  "worklet";
  const q = ((u - Math.floor(u)) * COUP_MS) / BOUFFEE_MS;
  if (u <= 0 || u >= COUPS || q >= 1) return { opacite: 0, echelle: 1, y: 0 };
  const e = 1 - (1 - q) * (1 - q);
  return { opacite: 0.95 * (1 - q), echelle: 0.55 + 0.65 * e, y: -10 * e };
}

/** Index key of the scaffold that fits a footprint: 1 x 1 for a hut, else the 2 x 2 (shortcut: a larger plot wears the 2 x 2 at its front corner; the painted sizes wait for Guillaume). */
export const echafaudageDe = (code: BuildingCode): string => {
  const [w, h] = emplacements[code].emprise;
  return `echafaudage/${w === 1 && h === 1 ? "1x1" : "2x2"}.nuit.webp`;
};

const cle = ([gx, gy]: Case) => `${gx},${gy}`;

/**
 * Who strikes where: for each site in turn, two or three roles on free path cells touching the
 * building, never a cell another villager stands on, one cell per villager, a role at one site only.
 * `fins` is where every role stands at rest. Seeded by the day; fewer when the plot has no room.
 */
export function ouvriersChantiers(
  sites: readonly BuildingCode[],
  carte: Carte,
  fins: Partial<Record<Role, Case>>,
  jour: number,
): Partial<Record<Role, Case>> {
  const pris = new Set([...(carte.occupees ?? []), ...Object.values(fins)].map(cle));
  const libres = rolesPresents(carte.montres);
  const ouvriers: Partial<Record<Role, Case>> = {};
  for (const site of sites) {
    const h = hasard(`${jour}:chantier:${site}`);
    // Front cells only, deepest row first, then left to right: a villager beside or behind the
    // site is hidden by the scaffold's posts (T02b-qa, twice). Fewer villagers when they are taken.
    const { coin, emprise } = emplacements[site];
    const devant = ([gx, gy]: Case) => gx >= coin[0] + emprise[0] || gy >= coin[1] + emprise[1];
    const cases = casesDuLieu(site, carte)
      .filter((c) => devant(c) && !pris.has(cle(c)))
      .sort((a, b) => b[0] + b[1] - (a[0] + a[1]) || a[0] - a[1] - (b[0] - b[1]));
    const k = Math.min(2 + Math.floor(h() * 2), cases.length, libres.length);
    for (let i = 0; i < k; i++) {
      // The roles by the day's seed.
      const c = cases[i];
      const role = libres.splice(Math.floor(h() * libres.length), 1)[0];
      if (!c || !role) continue;
      ouvriers[role] = c;
      pris.add(cle(c));
    }
  }
  return ouvriers;
}

/** The puff that closes a site (AUDIT-DA 36): one inked volute at the foot, swelling and gone in half a second. */
export const POP_MS = 520;

/** The pop at progress `t` (0 to 1): swells and fades while it settles back to the ground; hidden at 0 and at 1. */
export function pop(t: number): { opacite: number; echelle: number; y: number } {
  "worklet";
  if (t <= 0 || t >= 1) return { opacite: 0, echelle: 0.6, y: 0 };
  const e = 1 - (1 - t) * (1 - t);
  return { opacite: 0.95 * (1 - t), echelle: 0.6 + 0.9 * e, y: -14 * (1 - e) };
}
