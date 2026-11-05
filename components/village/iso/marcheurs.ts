// The villagers' light AI (L5-T04), pure: a cost grid, A* with the Manhattan distance, and a state
// machine (choose a place of interest, walk, act) run in JS once, at the start of a wave. It gives
// each walker a list of segments (from cell, to cell, start time, duration); the screen reads the
// position from the ambient clock `c` (horloge.ts) with `positionA`, as the sails and the glints
// do. Nothing here draws, nothing is random: every pick is a hash of the day, the wave number and
// the role, so a wave replays the same and two waves differ.
//
// Depth (the hard part): a walker only changes its depth rank when its segment changes, a few
// times a wave. `rangsMarcheurs` gives its rank in ORDRE_CARTE from the segment's footprint (the
// cells of the run), with the same `derriere` rule as the buildings; IsoCarte mounts the walker at
// that rank under a stable key.

import type { BuildingCode } from "@/db/schema";
import {
  CASES,
  type Case,
  cle,
  dansLaGrille,
  emplacements,
  grilleDe,
  rempart,
  type Sol,
  sol,
} from "./isoLayout";
import { chevauche, derriere, type Emprise } from "./profondeur";
import type { Cible } from "./tapBatiment";
import {
  type Etape,
  graineJour,
  graineVie,
  type Pose,
  planVie,
  poseRepos,
  rareDuJour,
  TOTAL_MS,
} from "./vieAnimaux";

export const ROLES = [
  "smith",
  "farmer",
  "herbalist",
  "watcher",
  "sage",
  "minstrel",
  "champion",
] as const;
export type Role = (typeof ROLES)[number];

/** Cost of a cell: a path is preferred, grass is crossed at a price, the rest is closed. */
export const COUT_CHEMIN = 1;
export const COUT_HERBE = 3;
/** At most this many walkers move in one wave (DECISIONS 29/10; 4 since T26, measured under the 64 nodes). */
export const MARCHEURS_PAR_VAGUE = 4;
/** The favoured trade's draw is scaled by this before the sort (T26): it comes first more often. */
export const FAVEUR_METIER = 0.35;
/** The plan ends this long after the wave starts: a wave lasts at least 15 s (horloge.ts). */
export const HORIZON_MS = 14000;
/** A segment's depth rank is taken this long before it starts, while the walker is on the shared corner cell. */
export const AVANCE_MS = 120;

/** What a role goes between: a building, or a spot of the village. */
export type Lieu = BuildingCode | "place" | "feu" | "lisiere" | "porte";

export type StyleNom = "presse" | "rapide" | "flaneur" | "bavard";
export type Style = {
  /** Cells per second. */
  vitesse: number;
  /** Min and max stand at a place of interest, ms. */
  pause: readonly [number, number];
  /** A stop to talk half way along a long walk, ms; 0 for none. */
  halte: number;
};
export const STYLES: Record<StyleNom, Style> = {
  presse: { vitesse: 1.7, pause: [600, 1400], halte: 0 },
  // The champion's two places are 25 cells apart: only a brisk walk crosses them in a wave.
  rapide: { vitesse: 2.1, pause: [400, 900], halte: 0 },
  flaneur: { vitesse: 1.0, pause: [2500, 4500], halte: 0 },
  bavard: { vitesse: 1.3, pause: [1000, 2000], halte: 2500 },
};

export const ROLE_DEF: Record<
  Role,
  { batiment: BuildingCode; lieux: readonly Lieu[]; styles: readonly [StyleNom, StyleNom] }
> = {
  smith: { batiment: "forge", lieux: ["forge", "armory"], styles: ["presse", "flaneur"] },
  farmer: { batiment: "farm", lieux: ["farm", "windmill", "well"], styles: ["flaneur", "bavard"] },
  herbalist: {
    batiment: "druid_grove",
    lieux: ["druid_grove", "lisiere"],
    styles: ["flaneur", "bavard"],
  },
  watcher: { batiment: "watchtower", lieux: ["watchtower", "porte"], styles: ["presse", "rapide"] },
  sage: { batiment: "observatory", lieux: ["observatory", "place"], styles: ["flaneur", "bavard"] },
  minstrel: { batiment: "campfire", lieux: ["place", "feu"], styles: ["flaneur", "bavard"] },
  champion: {
    batiment: "champion_arena",
    lieux: ["champion_arena", "heroes_hall"],
    styles: ["rapide", "rapide"],
  },
};

export type Segment = {
  etat: "marcher" | "agir";
  de: Case;
  vers: Case;
  /** Start, ms after the wave starts. */
  t0: number;
  duree: number;
  /** A stop at a place it came to work at (not the head start, not a chat on the way): it gestures there (gestes.ts). */
  travail?: true;
  /**
   * Starts at the edge between two cells (the second half of a cut step): it shares no cell with the
   * segment before, so its depth rank is taken at `t0` exactly, not AVANCE_MS early.
   */
  net?: true;
  /** The stop is the party's (T26): the gesture is joy, whatever the trade (gestes.ts). */
  joie?: true;
};
export type Marcheur = { role: Role; style: StyleNom; segments: readonly Segment[] };
export type Vague = {
  numero: number;
  marcheurs: readonly Marcheur[];
  /** Where every shown role stands once the wave is over: the next wave's start. */
  fins: Partial<Record<Role, Case>>;
};

export type Carte = {
  visible: readonly (readonly boolean[])[];
  montres: readonly BuildingCode[];
  /** Cells nothing may cross (a small animal on grass). */
  obstacles?: readonly Case[];
  /** Cells nobody may stop on (a standing figurine). */
  occupees?: readonly Case[];
  /**
   * The footprints mounted on the map, back to front (what a walker's rank is measured against).
   * A run that no rank suits (it would have to be behind one thing and in front of what that thing
   * is in front of) is cut in two at its middle, until one does.
   */
  vues?: readonly Emprise[];
  /** The shown buildings' sprites and masks (tapBatiment.ts `cibles`): inhabitants avoid cells they would hide. */
  ecrans?: readonly Cible[];
  /** The small animals on show, each on its own cell (they also close it, see `obstacles`), when the ambiance lets them walk. */
  animaux?: readonly { nom: string; cellule: Case }[];
};

const egales = (a: Case, b: Case) => a[0] === b[0] && a[1] === b[1];

const COUTS: Partial<Record<Sol, number>> = {
  chemin: COUT_CHEMIN,
  pont: COUT_CHEMIN,
  herbe: COUT_HERBE,
};

/**
 * `couts[gy][gx]`: 1 on a path, 3 on grass, Infinity on water, decor, an obstacle, a building's
 * plot and a wall section's cell (built or not, so what rises later never finds a walker in it:
 * nobody walks through the wall, they go by its gates) and off the island.
 */
export function grilleCouts(carte: Carte): number[][] {
  const closes = new Set([
    ...Object.values(emplacements).flatMap((e) => e.cases.map(cle)),
    ...rempart.map(cle),
    ...(carte.obstacles ?? []).map(cle),
  ]);
  return grilleDe((gx, gy) => {
    const s = sol[gy]?.[gx];
    return s !== undefined && carte.visible[gy]?.[gx] && !closes.has(cle([gx, gy]))
      ? (COUTS[s] ?? Infinity)
      : Infinity;
  });
}

const VOISINS: readonly Case[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/**
 * A*, four directions, the Manhattan distance as heuristic (the cheapest cell costs 1, so it never
 * overestimates). The cells from `depart` to `but` included, or null when the goal is closed or
 * unreachable. Ties go to the lower cell index, so the route is the same on every run.
 */
export function astar(
  couts: readonly (readonly number[])[],
  depart: Case,
  but: Case,
): Case[] | null {
  const cout = (c: Case) => couts[c[1]]?.[c[0]] ?? Infinity;
  if (cout(depart) === Infinity || cout(but) === Infinity) return null;
  const h = (c: Case) => Math.abs(c[0] - but[0]) + Math.abs(c[1] - but[1]);
  const g = new Map<number, number>([[cle(depart), 0]]);
  const avant = new Map<number, Case>();
  const ouverts: Ouvert[] = [{ c: depart, f: h(depart) }];
  const fermes = new Set<number>();
  for (let courant = sortirMeilleur(ouverts); courant; courant = sortirMeilleur(ouverts)) {
    if (fermes.has(cle(courant.c))) continue;
    if (egales(courant.c, but)) return remonter(avant, but);
    fermes.add(cle(courant.c));
    const gc = g.get(cle(courant.c)) ?? 0;
    for (const [dx, dy] of VOISINS) {
      const n: Case = [courant.c[0] + dx, courant.c[1] + dy];
      const gn = gc + cout(n);
      if (!dansLaGrille(n) || fermes.has(cle(n)) || gn >= (g.get(cle(n)) ?? Infinity)) continue;
      g.set(cle(n), gn);
      avant.set(cle(n), courant.c);
      ouverts.push({ c: n, f: gn + h(n) });
    }
  }
  return null;
}

type Ouvert = { c: Case; f: number };

/** Takes the open cell of least f out of the list, the lower cell index first on a tie. */
function sortirMeilleur(ouverts: Ouvert[]): Ouvert | undefined {
  const i = ouverts.reduce((m, o, j) => {
    const b = ouverts[m];
    return b && (o.f < b.f || (o.f === b.f && cle(o.c) < cle(b.c))) ? j : m;
  }, 0);
  return ouverts.splice(i, 1)[0];
}

function remonter(avant: ReadonlyMap<number, Case>, but: Case): Case[] {
  const route: Case[] = [but];
  for (let p = avant.get(cle(but)); p; p = avant.get(cle(p))) route.unshift(p);
  return route;
}

const chemins = (carte: Carte) => (c: Case) => {
  const s = sol[c[1]]?.[c[0]];
  return carte.visible[c[1]]?.[c[0]] === true && (s === "chemin" || s === "pont");
};

/**
 * The cells a walker may stop on at a place of interest: path cells, on the island. A building:
 * the ones touching its footprint. The square: path cells within 3 of the campfire; the fire: the
 * ones touching it. The gate: the grand-route's last cells. The edge: the path cells meeting the
 * wood or the sea nearest the druid grove (by Manhattan distance).
 */
export function casesDuLieu(lieu: Lieu, carte: Carte): Case[] {
  const ok = chemins(carte);
  const touchant = (code: BuildingCode, rayon: number) =>
    emplacements[code].cases.flatMap(([gx, gy]) =>
      VOISINS.map(([dx, dy]): Case => [gx + dx * rayon, gy + dy * rayon]),
    );
  const unique = (cs: Case[]) => [...new Map(cs.map((c) => [cle(c), c])).values()].filter(ok);
  const tri = (cs: Case[]) => cs.sort((a, b) => cle(a) - cle(b));
  if (lieu === "feu") return tri(unique(touchant("campfire", 1)));
  if (lieu === "place") {
    const [fx, fy] = emplacements.campfire.coin;
    const cs: Case[] = [];
    for (let gx = fx - 3; gx <= fx + 3; gx++)
      for (let gy = fy - 3; gy <= fy + 3; gy++)
        if (Math.abs(gx - fx) + Math.abs(gy - fy) <= 3) cs.push([gx, gy]);
    // Not the cells touching the fire: the square and the fire are two places, and a villager at
    // one has the other to go to (they used to overlap, so a minstrel at the fire had nowhere).
    const feu = new Set(unique(touchant("campfire", 1)).map(cle));
    return tri(unique(cs).filter((c) => !feu.has(cle(c))));
  }
  // The gates (FIN-DIS): the grand-route under and past the gatehouse, and the south gate's road.
  if (lieu === "porte")
    return tri(
      unique([
        // Not the cells under the gatehouse's door (17, 10) and the south gate (12, 15): a villager standing there hides the gate.
        [18, 10],
        [19, 10],
        [12, 16],
        [12, 17],
      ]),
    );
  if (lieu === "lisiere") {
    // The outer end of the path round the grove: 4 to 9 cells from it, the 3 farthest from the fire.
    const [rx, ry] = emplacements.druid_grove.coin;
    const [fx, fy] = emplacements.campfire.coin;
    const autour = (c: Case) => Math.abs(c[0] - rx) + Math.abs(c[1] - ry);
    const loin = (c: Case) => Math.abs(c[0] - fx) + Math.abs(c[1] - fy);
    const tous = unique([...CASES]).filter((c) => autour(c) >= 4 && autour(c) <= 9);
    return tous.sort((a, b) => loin(b) - loin(a) || cle(a) - cle(b)).slice(0, 3);
  }
  // The wall's own gate is `porte`: nobody stands along its footprint, where they would hide it (occlusion gate, tier 7).
  if (lieu === "castle_wall") return [];
  return tri(unique(touchant(lieu, 1)));
}

/** The roles on show: those whose building is. */
export const rolesPresents = (montres: readonly BuildingCode[]): Role[] =>
  ROLES.filter((r) => montres.includes(ROLE_DEF[r].batiment));

/** Where anyone may walk to when its own places are one, or too far: the square and the fire. */
export const LIEUX_COMMUNS: readonly Lieu[] = ["place", "feu"];

/**
 * The place of interest of a role that exist on this island, with the cells to stop on; with
 * `commun`, the shared ones too (a lone forge or farm gives its villager nowhere else to go).
 */
function lieuxDe(role: Role, carte: Carte, commun = false): [Lieu, Case[]][] {
  const propres = ROLE_DEF[role].lieux;
  const tous = commun
    ? [...propres, ...LIEUX_COMMUNS.filter((l) => !propres.includes(l))]
    : propres;
  return tous.flatMap((l) => {
    const cases = casesDuLieu(l, carte);
    return cases.length > 0 &&
      (l in emplacements ? carte.montres.includes(l as BuildingCode) : true)
      ? [[l, cases] as [Lieu, Case[]]]
      : [];
  });
}

/** [0, 1) from a string and a salt; a hash, no state. */
export function hasard(graine: string): () => number {
  let a = 2166136261;
  for (const ch of graine) a = Math.imul(a ^ ch.charCodeAt(0), 16777619);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The day number in the hero's own timezone: the seed of the day. */
export const jourDe = (ms: number, decalageMinutes: number): number =>
  Math.floor((ms - decalageMinutes * 60000) / 86400000);

/**
 * Where each shown role stands: `avec` for those that already stand somewhere, and for the others a
 * cell of one of their places by the seed of the day, never a cell another stands on (reservation).
 */
export function reposInitial(
  roles: readonly Role[],
  carte: Carte,
  jour: number,
  avec: Partial<Record<Role, Case>> = {},
): Partial<Record<Role, Case>> {
  const pris = new Set((carte.occupees ?? []).map(cle));
  const place: Partial<Record<Role, Case>> = {};
  for (const role of roles) {
    const deja = avec[role];
    if (deja) {
      place[role] = deja;
      pris.add(cle(deja));
    }
  }
  for (const role of roles) {
    if (place[role]) continue;
    const h = hasard(`${jour}:init:${role}`);
    const lieux = lieuxDe(role, carte);
    const choix = lieux[Math.floor(h() * lieux.length)];
    // The first free cell from a seeded start, wrapping; a place with no free cell tries the next.
    for (const [, cases] of choix ? [choix, ...lieux.filter((l) => l !== choix)] : []) {
      const depart = Math.floor(h() * cases.length);
      const c = cases
        .map((_, i) => cases[(depart + i) % cases.length])
        .find((x) => x && !pris.has(cle(x)));
      if (c) {
        place[role] = c;
        pris.add(cle(c));
        break;
      }
    }
  }
  return place;
}

/** The cell index ranges of a route's straight runs. */
function runs(route: readonly Case[]): [number, number][] {
  const out: [number, number][] = [];
  let debut = 0;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1];
    const b = route[i];
    const c = route[i + 1];
    if (!a || !b || !c || b[0] - a[0] !== c[0] - b[0] || b[1] - a[1] !== c[1] - b[1]) {
      out.push([debut, i]);
      debut = i;
    }
  }
  return out;
}

/** The point at route index `x`, a fraction of the way along a step. */
function pointA(route: readonly Case[], x: number): Case {
  const i = Math.floor(x);
  const [ax, ay] = route[i] ?? [0, 0];
  const [bx, by] = route[Math.ceil(x)] ?? [ax, ay];
  return [ax + (bx - ax) * (x - i), ay + (by - ay) * (x - i)];
}

/**
 * A run cut at its middle cell until each part has a depth rank; a single step that has none is
 * cut at the edge between its two cells (each half then stands in one cell).
 */
function decouper(
  route: readonly Case[],
  [a, b]: [number, number],
  valide: (e: Emprise) => boolean,
): [number, number][] {
  if (valide(empriseSegment({ de: pointA(route, a), vers: pointA(route, b) }))) return [[a, b]];
  const m = b - a > 1 ? a + Math.floor((b - a) / 2) : (a + b) / 2;
  if (m === a || m === b || b - a <= 0.5) return [[a, b]];
  return [...decouper(route, [a, m], valide), ...decouper(route, [m, b], valide)];
}

/** The straight runs of a route as segments (the depth rank changes at turns, and at a cut). */
function enSegments(
  route: readonly Case[],
  t0: number,
  pas: number,
  valide: (e: Emprise) => boolean,
): Segment[] {
  return runs(route)
    .flatMap((r) => decouper(route, r, valide))
    .map(([a, b]) => ({
      etat: "marcher" as const,
      de: pointA(route, a),
      vers: pointA(route, b),
      t0: t0 + a * pas,
      duree: (b - a) * pas,
      ...(Number.isInteger(a) ? {} : { net: true as const }),
    }));
}

const meilleur = <T>(xs: readonly T[], note: (x: T) => number): T | undefined =>
  xs.reduce<T | undefined>((m, x) => (m === undefined || note(x) < note(m) ? x : m), undefined);

/**
 * One wave. `depart` is where each shown role stands (the previous wave's `fins`; a role not in it
 * is placed by `reposInitial`). Up to MARCHEURS_PAR_VAGUE roles move, chosen by the seed of the
 * day and the wave number; the others stay. A mover runs the machine: wait a little, then
 * choose (a place of interest other than the one it stands at, whose route fits what is left of
 * the wave), walk (A* over the cost grid), act (stand there for its style's time), and choose
 * again while another leg fits. It ends on a free cell of a place of interest: the cells already
 * taken (the others' resting cells, earlier movers' ends, standing figurines) are never chosen.
 */
export function planifierVague(
  carte: Carte,
  depart: Partial<Record<Role, Case>>,
  jour: number,
  numero: number,
  /** `fete`: the first wave after a session, the walkers gather on the square and cheer; `favori`: the dominant practice's trade. */
  options: { fete?: boolean; favori?: Role } = {},
): Vague {
  const roles = rolesPresents(carte.montres);
  const debut = reposInitial(roles, carte, jour, depart);
  const hv = hasard(`${jour}:${numero}`);
  // Seeded order; the first roles that have a leg that fits walk.
  const ordre = roles
    .map((r) => ({ r, k: hv() * (r === options.favori ? FAVEUR_METIER : 1) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.r);
  const monde: Monde = {
    carte,
    couts: grilleCouts(carte),
    pris: new Set([...(carte.occupees ?? []).map(cle), ...Object.values(debut).map(cle)]),
    valide: (e) => {
      const [lo, hi] = borneRang(carte.vues ?? [], e, true);
      return lo <= hi;
    },
  };
  const fins: Partial<Record<Role, Case>> = { ...debut };
  const marcheurs: Marcheur[] = [];
  for (const role of ordre) {
    if (marcheurs.length >= MARCHEURS_PAR_VAGUE) break;
    const depuis = debut[role];
    const graine = `${jour}:${numero}:${role}`;
    const plan =
      depuis &&
      (options.fete ? planFete(role, depuis, monde, graine) : planDe(role, depuis, monde, graine));
    if (!plan) continue;
    fins[role] = plan.fin;
    marcheurs.push({ role, style: plan.style, segments: plan.segments });
  }
  return { numero, marcheurs, fins };
}

type Monde = {
  carte: Carte;
  couts: number[][];
  pris: Set<number>;
  valide: (e: Emprise) => boolean;
};

/**
 * The machine of one walker: wait, then [choose, walk, act] while a leg fits. Null when no leg
 * does (its places are too far apart for a wave), so it stays put and takes no slot.
 */
function planDe(role: Role, depuis: Case, monde: Monde, graine: string) {
  const { carte, couts, pris, valide } = monde;
  const h = hasard(graine);
  const style = ROLE_DEF[role].styles[h() < 0.5 ? 0 : 1];
  const lieux = lieuxDe(role, carte, true);
  if (lieux.length < 2) return null;
  // With two places of its own, the shared ones are a last resort, taken when no own place fits.
  const propres = lieuxDe(role, carte);
  const siens = new Set(propres.flatMap(([, cs]) => cs.map(cle)));
  const sien = (r: readonly Case[]) => {
    const but = r.at(-1);
    return propres.length < 2 || (but !== undefined && siens.has(cle(but)));
  };
  const { vitesse, pause, halte } = STYLES[style];
  // Plus or minus 10 % of speed, per walker and wave.
  const pas = 1000 / (vitesse * (0.9 + h() * 0.2));
  const duree = (r: readonly Case[]) => (r.length - 1) * pas + (r.length > 4 ? halte : 0);
  const cout = (r: readonly Case[]) =>
    r.slice(1).reduce((somme, [gx, gy]) => somme + (couts[gy]?.[gx] ?? 0), 0);
  const delai = h() * 2000;
  const segments: Segment[] = [];
  let cellule = depuis;
  let t = 0;
  for (let jambe = 0; jambe < 4; jambe++) {
    const ici = cellule;
    const routes = lieux
      .filter(([, cs]) => !cs.some((c) => egales(c, ici)))
      .flatMap(([, cs]) => cs.filter((c) => !pris.has(cle(c))))
      .flatMap((but) => {
        const route = astar(couts, ici, but);
        return route ? [route] : [];
      });
    // The cheapest route (a seeded nudge varies the choice) that still leaves its minimal stand.
    // The first wait is only a head start: it shrinks to what the chosen route leaves, so a long
    // own route is never lost to it.
    const entrent = routes.filter((r) => t + duree(r) + pause[0] <= HORIZON_MS);
    const route = meilleur(
      // Only a first leg may fall back on them: a walker that has reached its own place stays there.
      entrent.some(sien) || jambe > 0 ? entrent.filter(sien) : entrent,
      (r) => cout(r) + h() * 4,
    );
    const but = route?.at(-1);
    if (!route || !but) break;
    const attente = jambe === 0 ? Math.min(delai, HORIZON_MS - t - duree(route) - pause[0]) : 0;
    if (attente > 0) segments.push({ etat: "agir", de: ici, vers: ici, t0: 0, duree: attente });
    const marche = marcher(route, t + attente, pas, halte, valide);
    segments.push(...marche.segments);
    const arret = Math.min(
      Math.round(pause[0] + h() * (pause[1] - pause[0])),
      HORIZON_MS - marche.fin,
    );
    segments.push({
      etat: "agir",
      de: but,
      vers: but,
      t0: marche.fin,
      duree: arret,
      travail: true,
    });
    t = marche.fin + arret;
    cellule = but;
    pris.add(cle(but));
    pris.delete(cle(ici));
  }
  return segments.length > 0 ? { style, segments, fin: cellule } : null;
}

/**
 * The party of one walker (T26): up to the square by the cheapest route that leaves a stand, then
 * joy until the wave ends; a villager already on the square cheers where it stands. Null when the
 * square is out of its reach in a wave (it stays put and takes no slot).
 */
function planFete(role: Role, depuis: Case, monde: Monde, graine: string) {
  const { carte, couts, pris, valide } = monde;
  const h = hasard(graine);
  const style = ROLE_DEF[role].styles[h() < 0.5 ? 0 : 1];
  const { vitesse, pause, halte } = STYLES[style];
  const pas = 1000 / (vitesse * (0.9 + h() * 0.2));
  const delai = h() * 1500;
  const cases = casesDuLieu("place", carte);
  const joie = (de: Case, t0: number): Segment => ({
    etat: "agir",
    de,
    vers: de,
    t0,
    duree: HORIZON_MS - t0,
    travail: true,
    joie: true,
  });
  if (cases.some((c) => egales(c, depuis)))
    return { style, segments: [joie(depuis, Math.round(delai))], fin: depuis };
  const routes = cases
    .filter((c) => !pris.has(cle(c)))
    .flatMap((but) => {
      const route = astar(couts, depuis, but);
      return route ? [route] : [];
    });
  const duree = (r: readonly Case[]) => (r.length - 1) * pas + (r.length > 4 ? halte : 0);
  const cout = (r: readonly Case[]) =>
    r.slice(1).reduce((somme, [gx, gy]) => somme + (couts[gy]?.[gx] ?? 0), 0);
  const route = meilleur(
    routes.filter((r) => duree(r) + pause[0] <= HORIZON_MS),
    (r) => cout(r) + h() * 4,
  );
  const but = route?.at(-1);
  if (!route || !but) return null;
  const attente = Math.min(delai, HORIZON_MS - duree(route) - pause[0]);
  const marche = marcher(route, attente, pas, halte, valide);
  pris.add(cle(but));
  pris.delete(cle(depuis));
  const patiente: Segment[] =
    attente > 0 ? [{ etat: "agir", de: depuis, vers: depuis, t0: 0, duree: attente }] : [];
  return {
    style,
    segments: [...patiente, ...marche.segments, joie(but, marche.fin)],
    fin: but,
  };
}

/** A route as segments from `t0`, with a stop to talk in the middle of a long one (`halte` ms). */
function marcher(
  route: readonly Case[],
  t0: number,
  pas: number,
  halte: number,
  valide: (e: Emprise) => boolean,
) {
  const mi = halte > 0 && route.length > 4 ? Math.floor((route.length - 1) / 2) : -1;
  const m = route[mi];
  if (!m)
    return { segments: enSegments(route, t0, pas, valide), fin: t0 + (route.length - 1) * pas };
  const tm = t0 + mi * pas;
  return {
    segments: [
      ...enSegments(route.slice(0, mi + 1), t0, pas, valide),
      { etat: "agir" as const, de: m, vers: m, t0: tm, duree: halte },
      ...enSegments(route.slice(mi), tm + halte, pas, valide),
    ],
    fin: tm + halte + (route.length - 1 - mi) * pas,
  };
}

/**
 * The footprint of a segment: the cells its walker's centre goes over (the centre of cell `c` is
 * `c + 0.5`, so a segment from the middle of a cell to the edge stays in that cell).
 */
export function empriseSegment(s: Pick<Segment, "de" | "vers">): Emprise {
  const cases = (k: 0 | 1): [number, number] => {
    const u0 = Math.min(s.de[k], s.vers[k]) + 0.5;
    const u1 = Math.max(s.de[k], s.vers[k]) + 0.5;
    const lo = Math.floor(u0);
    return [lo, Math.max(lo, Math.ceil(u1) - 1)];
  };
  const [x0, x1] = cases(0);
  const [y0, y1] = cases(1);
  return { coin: [x0, y0], emprise: [x1 - x0 + 1, y1 - y0 + 1] };
}

/**
 * The index of the segment whose depth rank a walker takes at `t` ms into the wave: the next one
 * AVANCE_MS early, except a `net` one (it starts at a cell edge), which is taken at its `t0`.
 */
export function indiceSegment(segments: readonly Segment[], t: number): number {
  "worklet";
  let k = 0;
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (s && s.t0 - (s.net ? 0 : AVANCE_MS) <= t) k = i;
  }
  return k;
}

/** Where a walker is at `t` ms into the wave, as a cell centre in grid units, and whether it walks. */
export function positionA(
  segments: readonly Segment[],
  t: number,
): { x: number; y: number; marche: boolean } {
  "worklet";
  let k = 0;
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (s && s.t0 <= t) k = i;
  }
  const s = segments[k];
  if (!s) return { x: 0, y: 0, marche: false };
  const u = s.etat === "agir" || s.duree <= 0 ? 1 : Math.min(1, Math.max(0, (t - s.t0) / s.duree));
  return {
    x: s.de[0] + (s.vers[0] - s.de[0]) * u + 0.5,
    y: s.de[1] + (s.vers[1] - s.de[1]) * u + 0.5,
    marche: s.etat === "marcher" && u > 0 && u < 1,
  };
}

/**
 * The sprite's side of a segment: mirrored or not. `dos` is always false: the back views are grey
 * blockouts, not painted (qa-audit3), so a walker going away shows its painted front, mirrored.
 * shortcut: lift this when the backs are painted: villageois_{champion,farmer,herbalist,minstrel,sage,smith,watcher}_dos.
 */
export function orientation(s: Pick<Segment, "de" | "vers">): { dos: boolean; miroir: boolean } {
  const dx = s.vers[0] - s.de[0];
  const dy = s.vers[1] - s.de[1];
  if (dx > 0) return { dos: false, miroir: false };
  if (dy > 0) return { dos: false, miroir: true };
  if (dx < 0) return { dos: false, miroir: true };
  return { dos: false, miroir: false };
}

/** The side the walker shows in segment `k`: that of its last walk so far, facing the viewer before any. */
export function orientationA(
  segments: readonly Segment[],
  k: number,
): { dos: boolean; miroir: boolean } {
  for (let i = Math.min(k, segments.length - 1); i >= 0; i--) {
    const s = segments[i];
    if (s?.etat === "marcher") return orientation(s);
  }
  return { dos: false, miroir: false };
}

/**
 * The ranks a footprint can take in `ordre` (back to front): from `lo`, right after the last one
 * behind it, to `hi`, the first one it is behind. `lo <= hi` is a rank that suits, `lo > hi` none.
 * With `dessus`, a footprint `m` shares cells with lies under it (a walker on the bridge's image).
 */
export function borneRang(
  ordre: readonly Emprise[],
  m: Emprise,
  dessus = false,
): [lo: number, hi: number] {
  let lo = 0;
  let hi = ordre.length;
  for (let k = ordre.length - 1; k >= 0; k--) {
    const e = ordre[k];
    if (e && (derriere(e, m) || (dessus && chevauche(e, m))) && lo === 0) lo = k + 1;
    if (e && derriere(m, e)) hi = k;
  }
  return [lo, hi];
}

/**
 * For each walker, its index in the list `ordre` (back to front) before which it is mounted,
 * 0 to ordre.length: after every footprint behind it, before every one it is behind. Walkers go
 * in by far corner, and one never lands before a walker behind it.
 */
export function rangsMarcheurs(ordre: readonly Emprise[], marcheurs: readonly Emprise[]): number[] {
  const loin = (e: Emprise) => e.coin[0] + e.emprise[0] + e.coin[1] + e.emprise[1];
  const rangs: number[] = marcheurs.map(() => 0);
  const par = marcheurs
    .map((_, i) => i)
    .sort((a, b) => loin(marcheurs[a] as Emprise) - loin(marcheurs[b] as Emprise) || a - b);
  const places: number[] = [];
  for (const i of par) {
    const m = marcheurs[i] as Emprise;
    let [lo] = borneRang(ordre, m, true);
    for (const j of places)
      if (derriere(marcheurs[j] as Emprise, m)) lo = Math.max(lo, rangs[j] ?? 0);
    rangs[i] = lo;
    places.push(i);
  }
  return rangs;
}

// --- The small animals (L5-T10) ----------------------------------------------------------------
// An animal walks a short loop in a wave: from its place to a free grass cell beside it, a pause,
// and back. It keeps its own slot in the depth order (it is never remounted), so the loop only
// stands if that slot is a rank that suits both cells. The cells it uses are reserved against the
// villagers for the whole wave, whose plan is made first: no cell is ever shared, at any instant.

/** What an animal walks in one wave: its segments, from its place and back to it. */
export type Bete = {
  nom: string;
  segments: readonly Segment[];
  /** Its behaviours of the wave (vieAnimaux.ts): which pose it shows when. */
  vie: readonly Etape[];
  /** The pose it holds outside them and between waves. */
  repos: Pose;
};

/** The pose an animal holds between waves for the day (T31). */
export const reposDuJour = (jour: number, nom: string): Pose =>
  poseRepos(nom, hasard(graineJour(jour, nom, "repos"))());

/** The rare act is played in one wave of the first FENETRE_RARE planned after the map is mounted, on a rare day. */
export const FENETRE_RARE = 5;
/** Which wave since mount (0 first) plays the animal's rare act today, by the seed of the day. */
export const vagueRare = (jour: number, nom: string): number =>
  Math.floor(hasard(`${jour}:${nom}:rarevague`)() * FENETRE_RARE);
/** Whether the wave `rang` since mount plays the rare act: a rare day, and that one wave only (a surprise, not a routine). */
export const rareLe = (jour: number, nom: string, rang: number) =>
  rareDuJour(hasard(graineJour(jour, nom, "rare"))()) && rang === vagueRare(jour, nom);
/** At most this many animals walk in one wave. */
export const BETES_PAR_VAGUE = 2;
/** Cells per second: a hen's or a cat's amble, unhurried (T27: was 1.1). */
const VITESSE_BETE = 0.75;
/** Share of waves in which a second animal walks too. */
const CHANCE_DEUX_BETES = 0.35;

/** The cells a segment covers. */
function casesDeSegment(s: Pick<Segment, "de" | "vers">): Case[] {
  const { coin, emprise } = empriseSegment(s);
  return Array.from(
    { length: emprise[0] * emprise[1] },
    (_, i): Case => [coin[0] + (i % emprise[0]), coin[1] + Math.floor(i / emprise[0])],
  );
}

/**
 * Whether an animal on `ici`, mounted at its own slot among `vues`, may also go to `la`: the slot
 * must be a rank that suits the two cells together (the same rule as a walker's rank).
 */
export function rangDeBeteValide(vues: readonly Emprise[], ici: Case, la: Case): boolean {
  if (vues.length === 0) return true;
  const i = vues.findIndex(
    (e) => e.coin[0] === ici[0] && e.coin[1] === ici[1] && e.emprise[0] === 1 && e.emprise[1] === 1,
  );
  if (i < 0) return false;
  const reste = vues.filter((_, j) => j !== i);
  const [lo, hi] = borneRang(reste, {
    coin: [Math.min(ici[0], la[0]), Math.min(ici[1], la[1])],
    emprise: [Math.abs(ici[0] - la[0]) + 1, Math.abs(ici[1] - la[1]) + 1],
  });
  return lo <= i && i <= hi;
}

/**
 * The animals' walks of a wave, planned after the villagers' (`vague`): one or two animals, by the
 * seed of the day and the wave number, each to a free grass cell next to its place, kept only if
 * the island shows it and its depth slot suits it. No cell a villager stands on or crosses in
 * this wave, nor another animal's, is ever chosen.
 */
export function planifierAnimaux(
  carte: Carte,
  vague: Vague,
  jour: number,
  numero: number,
  rang = 0,
): Bete[] {
  const betes = carte.animaux ?? [];
  if (betes.length === 0) return [];
  const couts = grilleCouts(carte);
  const pris = new Set<number>([
    ...(carte.occupees ?? []).map(cle),
    ...(carte.obstacles ?? []).map(cle),
    ...betes.map((b) => cle(b.cellule)),
    ...Object.values(vague.fins).map(cle),
    ...vague.marcheurs.flatMap((m) => m.segments.flatMap(casesDeSegment)).map(cle),
  ]);
  const h = hasard(`${jour}:${numero}:betes`);
  const voulues = h() < CHANCE_DEUX_BETES ? BETES_PAR_VAGUE : 1;
  const ordre = betes
    .map((b) => ({ b, k: h() }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.b);
  const sortie: Bete[] = [];
  for (const b of ordre) {
    if (sortie.length >= voulues) break;
    const [gx, gy] = b.cellule;
    const libres = VOISINS.map(([dx, dy]): Case => [gx + dx, gy + dy]).filter(
      (c) =>
        sol[c[1]]?.[c[0]] === "herbe" &&
        (couts[c[1]]?.[c[0]] ?? Infinity) !== Infinity &&
        !pris.has(cle(c)) &&
        rangDeBeteValide(carte.vues ?? [], b.cellule, c),
    );
    const but = libres[Math.floor(h() * libres.length)];
    // Drawn whether or not it is used, so one animal's choice never shifts another's.
    const pas = 1000 / (VITESSE_BETE * (0.9 + h() * 0.2));
    if (!but) continue;
    // The walk is the plan's own step (T31): when it starts and how long it lasts come from it.
    const vie = planVie(b.nom, hasard(graineVie(jour, numero, b.nom)), {
      marche: true,
      rare: rareLe(jour, b.nom, rang),
    });
    const marche = vie.find((e) => e.marche);
    if (!marche) continue;
    const attente = marche.t0;
    const arret = marche.duree - 2 * pas;
    pris.add(cle(but));
    sortie.push({
      nom: b.nom,
      vie,
      repos: reposDuJour(jour, b.nom),
      segments: [
        { etat: "agir", de: b.cellule, vers: b.cellule, t0: 0, duree: attente },
        { etat: "marcher", de: b.cellule, vers: but, t0: attente, duree: pas },
        { etat: "agir", de: but, vers: but, t0: attente + pas, duree: arret },
        { etat: "marcher", de: but, vers: b.cellule, t0: attente + pas + arret, duree: pas },
      ],
    });
  }
  return sortie;
}

/**
 * The animals that do not walk in this wave: they stay on their cell and live their behaviours
 * (a cat that yawns, a hen that scratches) through the same pose nodes, so none stands dead.
 */
export function viesSansMarche(
  carte: Carte,
  marcheuses: readonly Bete[],
  jour: number,
  numero: number,
  rang = 0,
): Bete[] {
  return (carte.animaux ?? [])
    .filter((a) => !marcheuses.some((b) => b.nom === a.nom))
    .map((a) => ({
      nom: a.nom,
      vie: planVie(a.nom, hasard(graineVie(jour, numero, a.nom)), {
        marche: false,
        rare: rareLe(jour, a.nom, rang),
      }),
      repos: reposDuJour(jour, a.nom),
      segments: [{ etat: "agir", de: a.cellule, vers: a.cellule, t0: 0, duree: TOTAL_MS }],
    }));
}

/**
 * Which way a walker faces on screen at `t` ms into the wave: 1 towards the right, -1 towards the
 * left, from its last walk so far (right before any). The screen's x is gx - gy.
 */
export function sensEcranA(segments: readonly Segment[], t: number): 1 | -1 {
  "worklet";
  let sens: 1 | -1 = 1;
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (!s || s.t0 > t) break;
    if (s.etat === "marcher") sens = s.vers[0] - s.de[0] - (s.vers[1] - s.de[1]) >= 0 ? 1 : -1;
  }
  return sens;
}
