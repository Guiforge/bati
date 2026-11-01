// The small stories of the square (C1, bible §8): three scenes seen without a touch, made of the
// inhabitants the tier already holds and their painted poses. A story takes its place the tier its
// place exists (the fire, the forge, a new building), and keeps it at every tier after (`montres`
// only grows, and a story's cells are fixed by the layout, not by the crowd). It converts
// inhabitants already counted, so the crowd's size never moves. Seeded by the day, no state.
// ponytail: the roof cat (bible §8.1) and the fisherman need a drawn thing on a roof or a bridge,
// not an inhabitant; they wait for a node of their own. The "next building's site" is the newest
// building shown (Carte carries no site list), so the apprentice follows the last one built.

import type { BuildingCode } from "@/db/schema";
import type { Habitant } from "./habitants";
import { type Case, emplacements, paliers } from "./isoLayout";
import { type Carte, casesDuLieu, hasard, type Lieu, type Role } from "./marcheurs";
import type { IdPose } from "./reposTable";

export type IdHistoire = "vieux_dort" | "dispute_forge" | "apprenti_panier";

/**
 * What the old man leans on: the camp's seat log (accessoires.ts BUCHES, the one at 12.25, 9.85, in
 * cell 12,9). A sleeper sits on the ground, so it has a support or it sits on nothing (H0-10). Each
 * seat is a cell beside the log, on the square (the cells 11,11 / 11,12 / 10,11 hold figurines).
 */
export const BUCHE_DU_CAMP: Case = [12, 9];
const SIEGES_VIEUX: readonly Case[] = [
  [11, 9],
  [12, 10],
];

type Histoire = {
  id: IdHistoire;
  cellules: readonly Case[];
  pose: IdPose;
  lieu: Lieu;
  miroir?: boolean;
};

const cle = ([gx, gy]: Case) => `${gx},${gy}`;
const voisines = (a: Case, b: Case) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
const tri = (a: Case, b: Case) => a[1] - b[1] || a[0] - b[0];

/** The tier a building's last cell joins the island. */
const palierDe = (code: BuildingCode) =>
  Math.max(...emplacements[code].cases.map(([gx, gy]) => paliers[gy]?.[gx] ?? 0));

/** The story scenes this map holds, in order, on cells `libre` accepts (and no other story took). */
export function scenes(carte: Carte, libre: (c: Case) => boolean): Histoire[] {
  const sortie: Histoire[] = [];
  const prises = new Set<string>();
  const ok = (c: Case) => libre(c) && !prises.has(cle(c));
  const ajouter = (h: Histoire | undefined) => {
    if (!h) return;
    sortie.push(h);
    for (const c of h.cellules) prises.add(cle(c));
  };

  if (carte.montres.includes("campfire")) {
    const siege = SIEGES_VIEUX.find(ok);
    if (siege)
      ajouter({ id: "vieux_dort", cellules: [siege], pose: "dort", lieu: "feu", miroir: false });
  }

  if (carte.montres.includes("forge")) {
    const cs = casesDuLieu("forge", carte).filter(ok).sort(tri);
    const a = cs.find((x) => cs.some((y) => voisines(x, y)));
    const b = a && cs.find((y) => voisines(a, y));
    if (a && b)
      ajouter({ id: "dispute_forge", cellules: [a, b], pose: "discutent", lieu: "forge" });
  }

  // The newest buildings shown (not the starters), by the tier of their plot; the first with a free front cell.
  const neufs = carte.montres
    .filter((c) => palierDe(c) > 1)
    .sort((a, b) => palierDe(b) - palierDe(a) || (a < b ? -1 : 1));
  for (const neuf of neufs) {
    const { coin, emprise } = emplacements[neuf];
    const devant = ([gx, gy]: Case) => gx >= coin[0] + emprise[0] || gy >= coin[1] + emprise[1];
    // Front cells only, deepest row first (as the building site's workers, chantier.ts).
    const c = casesDuLieu(neuf, carte)
      .filter((x) => devant(x) && ok(x))
      .sort((a, b) => b[0] + b[1] - (a[0] + a[1]) || a[0] - a[1] - (b[0] - b[1]))[0];
    if (!c) continue;
    ajouter({ id: "apprenti_panier", cellules: [c], pose: "porte_panier", lieu: neuf });
    break;
  }
  return sortie;
}

/** Who plays a scene: the inhabitants on its cells first, then free ones (not in a pair), then any, in the day's order. */
function choisir(out: readonly Habitant[], ordre: readonly Habitant[], s: Histoire) {
  const { cellules } = s;
  const choisis: Habitant[] = [];
  for (const c of cellules) {
    const g =
      out.find((x) => !x.histoire && cle(x.cellule) === cle(c) && !choisis.includes(x)) ??
      // One already in that pose first: the village shows no more kinds of figure for it.
      ordre.find((x) => !x.histoire && !x.avec && x.pose === s.pose && !choisis.includes(x)) ??
      // Not the ones wearing their building's trade: a smith at the forge is better seen as a smith.
      ordre.find((x) => !x.histoire && !x.avec && !x.metier && !choisis.includes(x)) ??
      ordre.find((x) => !x.histoire && !x.avec && !choisis.includes(x)) ??
      ordre.find((x) => !x.histoire && !choisis.includes(x));
    if (g) choisis.push(g);
  }
  return choisis.length === cellules.length ? choisis : undefined;
}

/** Puts `choisis` on the scene's cells, in its pose; a half left alone by it carries a basket. */
function jouer(
  out: readonly Habitant[],
  choisis: Habitant[],
  s: Histoire,
  roleDuVoisin: (c: Case) => Role | undefined,
) {
  for (const g of choisis) {
    const ex = g.avec ? out.find((x) => x.id === g.avec) : undefined;
    if (ex && !choisis.includes(ex))
      Object.assign(ex, { pose: "porte_panier", avec: undefined, compagnon: undefined });
  }
  choisis.forEach((g, i) => {
    const c = s.cellules[i];
    if (!c) return;
    Object.assign(g, {
      cellule: c,
      lieu: s.lieu,
      pose: s.pose,
      histoire: s.id,
      metier: false,
      role: roleDuVoisin(c) ?? g.role,
      avec: undefined,
      compagnon: undefined,
      ...(s.miroir === undefined ? {} : { miroir: s.miroir }),
    });
  });
  const [a, b] = [...choisis].sort((x, y) => out.indexOf(x) - out.indexOf(y));
  if (!a || !b) return;
  a.avec = b.id;
  b.avec = a.id;
  b.compagnon = true;
}

/**
 * The inhabitants with the day's stories played, one scene after the other. `libre` says which cells
 * may hold a figure (visible, not hidden); a scene with no one left to play it is not played.
 */
export function placerHistoires(
  gens: readonly Habitant[],
  carte: Carte,
  jour: number,
  libre: (c: Case) => boolean,
  roleDuVoisin: (c: Case) => Role | undefined,
): Habitant[] {
  const h = hasard(`${jour}:histoires`);
  const out = gens.map((g) => ({ ...g }));
  const fermees = new Set([...(carte.occupees ?? []), ...(carte.obstacles ?? [])].map(cle));
  const ordre = out
    .map((g) => ({ g, k: h() }))
    .sort((a, b) => a.k - b.k)
    .map((o) => o.g);
  for (const s of scenes(carte, (c) => libre(c) && !fermees.has(cle(c)))) {
    const choisis = choisir(out, ordre, s);
    if (choisis) jouer(out, choisis, s, roleDuVoisin);
  }
  return out;
}
