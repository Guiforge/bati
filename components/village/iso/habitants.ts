// The inhabitants of the village (T26), pure: the standing villagers that come with the tier, in
// addition to the seven trades (marcheurs.ts). They wear the existing villagers' sprites, recoloured
// by the app (Habitant in IsoCarteDemo.tsx), stand on readable places (the square, the gate, in front
// of a door) and never move in a wave: no animated node at rest, none in a wave. They gather on the
// square only in reduced motion (`rassembler`), where nothing walks. Everything here is a hash of
// the day: no state, no chance.

import { type Animal, practiceOfAnimal } from "@/db/crestRules";
import type { BuildingCode } from "@/db/schema";
import { COTE, ecranXY } from "./carteDemo";
import { type IdHistoire, placerHistoires } from "./histoires";
import { type Case, emplacements } from "./isoLayout";
import { type Carte, casesDuLieu, hasard, type Lieu, type Role } from "./marcheurs";
import { derriere, type Emprise } from "./profondeur";
import { type IdPose, POSES_REPOS, type PoseRepos } from "./reposTable";
import { type Cible, opaque } from "./tapBatiment";

/** The trades an inhabitant may look like: those with a pool of ordinary lines (`villagers.<role>.rest`). */
export const ROLES_HABITANTS: readonly Role[] = [
  "smith",
  "farmer",
  "herbalist",
  "sage",
  "minstrel",
];

/**
 * The trade each building lends to the inhabitants standing nearest it (T42). A building missing here
 * (quarry, well, tent, dummy, archery range...) has no trade of its own: its neighbours get a random one.
 * ponytail: no archer sprite yet, so archery_range falls back; give it "archer" once the sprite exists.
 */
export const ROLE_DU_BATIMENT: Partial<Record<BuildingCode, Role>> = {
  forge: "smith",
  armory: "smith",
  farm: "farmer",
  barn: "farmer",
  windmill: "farmer",
  druid_grove: "herbalist",
  watchtower: "watcher",
  castle_wall: "watcher",
  observatory: "sage",
  wizard_tower: "sage",
  campfire: "minstrel",
  champion_arena: "champion",
  heroes_hall: "champion",
};

/** The nearest shown building to `c` (Manhattan, to its footprint); the first in layout order on a tie. */
export function batimentLePlusProche(c: Case, montres: readonly BuildingCode[]) {
  let meilleur: { code: BuildingCode; d: number } | undefined;
  for (const code of montres) {
    const d = Math.min(...emplacements[code].cases.map((x) => distance(x, c)));
    if (!meilleur || d < meilleur.d || (d === meilleur.d && code < meilleur.code))
      meilleur = { code, d };
  }
  return meilleur?.code;
}
const roleDuVoisin = (c: Case, carte: Carte): Role | undefined => {
  const b = batimentLePlusProche(c, carte.montres);
  return b && ROLE_DU_BATIMENT[b];
};

export type Habitant = {
  id: string;
  cellule: Case;
  /** The trade whose sprite it wears, and whose lines it says. */
  role: Role;
  /** Drawn from a building and wearing its trade (T42): its sprite shows it, so only a pose made for that building replaces it (`donnerPoses`). */
  metier?: boolean;
  miroir: boolean;
  /** The group it was drawn from: the square, the gate or a building (a pose picks its place by it). */
  lieu: Lieu;
  /** Its resting pose (reposTable.ts), drawn instead of the standing sprite; none = standing. */
  pose?: IdPose;
  /** The other half of a talking pair. */
  avec?: string;
  /** The second of a pair draws nothing: the first draws both. */
  compagnon?: boolean;
  /** The small story it plays (histoires.ts): its cell, pose and place come from the scene. */
  histoire?: IdHistoire;
};

/** Three at tier 1, twelve at tier 12, a step or so per tier between. */
export const nombreHabitants = (palier: number): number =>
  Math.round(3 + ((Math.min(12, Math.max(1, palier)) - 1) * 9) / 11);

const cle = ([gx, gy]: Case) => `${gx},${gy}`;

/**
 * Where the inhabitants of tier `palier` stand: the places in front of a door, the gate and the
 * square, taken in turn in a seeded order, never on a cell of `carte.occupees` or `carte.obstacles`.
 * Fewer than asked when the island has no more free place of interest.
 */
export function placerHabitants(
  palier: number,
  carte: Carte,
  jour: number,
  favori?: Role,
): Habitant[] {
  const h = hasard(`${jour}:habitants`);
  const melange = <T>(xs: readonly T[]): T[] =>
    xs
      .map((x) => ({ x, k: h() }))
      .sort((a, b) => a.k - b.k)
      .map((o) => o.x);
  const pris = new Set([...(carte.occupees ?? []), ...(carte.obstacles ?? [])].map(cle));
  const groupes = melange<Lieu>(["place", "porte", ...carte.montres]).map((lieu) => ({
    lieu,
    cs: melange(casesDuLieu(lieu, carte)),
  }));
  const voulus = nombreHabitants(palier);
  const sortie: Habitant[] = [];
  // One cell from each group in turn, so the crowd is spread over the village, not stacked at one door.
  while (sortie.length < voulus) {
    const avant = sortie.length;
    for (const { lieu, cs } of groupes) {
      const c = cs.find((x) => !pris.has(cle(x)) && visible(x, carte));
      if (!c || sortie.length >= voulus) continue;
      pris.add(cle(c));
      // Drawn even when a neighbour decides: the stream stays the one every village already has.
      const tire = ROLES_HABITANTS[Math.floor(h() * ROLES_HABITANTS.length)] ?? "smith";
      const voisin = roleDuVoisin(c, carte);
      const role = voisin ?? tire;
      // The cloth tint's draw, kept though nothing reads it any more: dropping it would shift the stream and move every villager.
      h();
      sortie.push({
        id: `h${sortie.length}`,
        cellule: c,
        role,
        metier: voisin !== undefined && !LIEUX_SOL.includes(lieu),
        miroir: h() < 0.5,
        lieu,
      });
    }
    if (sortie.length === avant) break;
  }
  if (favori) metierDeVocation(sortie, favori);
  return placerHistoires(
    donnerPoses(sortie, palier, carte, jour),
    carte,
    jour,
    (c) => visible(c, carte),
    (c) => roleDuVoisin(c, carte),
  );
}

/** G1: the vocation's trade takes every other tradeless villager by the hall of heroes. Same headcount and cells, no draw. */
function metierDeVocation(gens: Habitant[], favori: Role) {
  for (const g of gens)
    if (!g.metier && Number(g.id.slice(1)) % 2 === 0 && distanceSalle(g.cellule) <= 8)
      g.role = favori;
}
const distanceSalle = (c: Case) => {
  const [x, y] = emplacements.heroes_hall.coin;
  return Math.abs(c[0] - x) + Math.abs(c[1] - y);
};
const LIEUX_SOL: readonly Lieu[] = ["place", "porte", "feu", "lisiere"];
const convient = (p: PoseRepos, lieu: Lieu) =>
  p.lieux.includes(lieu) || (p.lieux.includes("batiment") && !LIEUX_SOL.includes(lieu));
/**
 * A pose made for this very building (the crates at the farm). The other poses are one anonymous
 * figure each (a sweeper, a sleeper): a villager standing at a building with a trade keeps its own
 * sprite instead, or every forge had a sweeper at its door (qa-audit2: no smith, no sage seen).
 * The square and the gate keep every pose: they hold the pair and the barrel.
 */
const propreAuLieu = (p: PoseRepos, lieu: Lieu) => p.lieux.includes(lieu);
const distance = (a: Case, b: Case) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

/** The most of a figure a building drawn in front of it may hide before its cell is left out. */
export const COUVERT_MAX = 0.3;

/**
 * The share of a standing figure's box at `cellule` hidden by the buildings drawn after it (those it
 * lies behind, profondeur.ts `derriere`), read on their opaque masks.
 */
export function couverture(cellule: Case, ecrans: readonly Cible[]): number {
  const moi = { coin: cellule, emprise: [1, 1] } as const;
  const devant = ecrans.filter((b) => {
    const e = emplacements[b.code];
    return derriere(moi, { coin: e.coin, emprise: e.emprise });
  });
  if (devant.length === 0) return 0;
  const [px, py] = ecranXY([cellule[0] + 0.5, cellule[1] + 0.5]);
  let caches = 0;
  for (let i = 0; i < 5; i++)
    for (let j = 0; j < 9; j++) {
      const x = px + (i / 4 - 0.5) * TOUCHE_L;
      const y = py - (j / 8) * TOUCHE_H;
      if (
        devant.some((b) =>
          opaque(
            b.masque,
            ((x - b.rect.x) / b.rect.w) * b.taille[0],
            ((y - b.rect.y) / b.rect.h) * b.taille[1],
          ),
        )
      )
        caches++;
    }
  return caches / 45;
}
const visible = (c: Case, carte: Carte) => couverture(c, carte.ecrans ?? []) <= COUVERT_MAX;

/** Which front face of `lieu`'s building the cell stands right against: "x" (+gx side), "y" (+gy side). */
function faceDuMur(c: Case, lieu: Lieu): "x" | "y" | undefined {
  // The fire has no wall: leaning on it is sitting on nothing (H0-10).
  if (lieu === "campfire") return undefined;
  const e = (emplacements as Partial<Record<string, (typeof emplacements)[BuildingCode]>>)[lieu];
  if (!e) return undefined;
  const [cx, cy] = e.coin;
  const [w, d] = e.emprise;
  if (c[0] === cx + w && c[1] >= cy && c[1] < cy + d) return "x";
  if (c[1] === cy + d && c[0] >= cx && c[0] < cx + w) return "y";
  return undefined;
}

type Duo = { j: number; cellule: Case };
const LIEUX_PAIRE = POSES_REPOS.find((p) => p.id === "discutent")?.lieux ?? [];

/** A partner for `out[i]`: a free habitant of a fitting place, brought to a free cell beside it. */
function partenaire(out: readonly Habitant[], i: number, carte: Carte): Duo | undefined {
  const g = out[i];
  if (!g || !LIEUX_PAIRE.includes(g.lieu)) return undefined;
  const prises = new Set(
    [...(carte.occupees ?? []), ...(carte.obstacles ?? []), ...out.map((o) => o.cellule)].map(cle),
  );
  const cellule = casesDuLieu(g.lieu, carte).find(
    (c) => distance(c, g.cellule) === 1 && !prises.has(cle(c)) && visible(c, carte),
  );
  const j = out.findIndex((o, k) => k !== i && !o.pose && LIEUX_PAIRE.includes(o.lieu));
  return cellule && j >= 0 ? { j, cellule } : undefined;
}

/** The poses that suit `g` now: its tier, its place, and what they need beside it. */
function posesPossibles(g: Habitant, palier: number, chats: readonly Case[], duo?: Duo) {
  const exigence = {
    chat: chats.some((c) => distance(c, g.cellule) <= 2),
    voisin: !!duo,
    mur: faceDuMur(g.cellule, g.lieu) !== undefined,
  };
  return POSES_REPOS.filter(
    (p) =>
      p.palier <= palier &&
      convient(p, g.lieu) &&
      (!g.metier || propreAuLieu(p, g.lieu)) &&
      (p.exige === undefined || exigence[p.exige]),
  );
}

/** Makes `out[i]` and `out[duo.j]` a pair; the lower index draws it, at the middle of the two cells. */
function accoupler(out: Habitant[], i: number, duo: Duo, pose: IdPose, carte: Carte) {
  const [g, autre] = [out[i], out[duo.j]];
  if (!g || !autre) return;
  autre.pose = pose;
  autre.cellule = duo.cellule;
  autre.role = roleDuVoisin(duo.cellule, carte) ?? autre.role;
  autre.lieu = g.lieu;
  const [a, b] = i < duo.j ? [g, autre] : [autre, g];
  a.avec = b.id;
  b.avec = a.id;
  b.compagnon = true;
}

/**
 * One resting pose per inhabitant (T40), by the seed of the day: a pose taken where it fits (a sleeper
 * by a building's wall, a sweeper at a door, the drawer at the well), a different one each time while
 * any is left, and the talking pair on two neighbouring cells. A pose that finds no place falls back on
 * one that does; the standing sprite stays when none does.
 */
export function donnerPoses(
  gens: readonly Habitant[],
  palier: number,
  carte: Carte,
  jour: number,
): Habitant[] {
  const h = hasard(`${jour}:poses`);
  const out = gens.map((g) => ({ ...g }));
  const chats = (carte.animaux ?? []).filter((a) => a.nom === "chat").map((a) => a.cellule);
  const pris = new Set<IdPose>();
  const ordre = out
    .map((_, i) => ({ i, k: h() }))
    .sort((a, b) => a.k - b.k)
    .map((o) => o.i);
  for (const i of ordre) {
    const g = out[i];
    if (!g || g.pose) continue;
    const duo = partenaire(out, i, carte);
    const ok = posesPossibles(g, palier, chats, duo);
    const neuves = ok.filter((p) => !pris.has(p.id));
    const pool = neuves.length > 0 ? neuves : ok;
    const p = pool[Math.floor(h() * pool.length)];
    if (!p) continue;
    pris.add(p.id);
    g.pose = p.id;
    // The sleeper faces out, mirrored to the wall's side: the right-hand face (+gx) or the left-hand one (+gy).
    if (p.exige === "mur") g.miroir = faceDuMur(g.cellule, g.lieu) === "x";
    if (p.exige === "voisin" && duo) accoupler(out, i, duo, p.id, carte);
  }
  return out;
}

/**
 * Who still holds its pose when the map shows `presents` instead of `origine` (a party gathers some on
 * the square, a trade takes a cell): one that moved stands up, and so does its talking partner.
 */
export function garderPoses(
  presents: readonly Habitant[],
  origine: readonly Habitant[],
): Habitant[] {
  const ici = new Map(presents.map((g) => [g.id, g]));
  const intact = (g: Habitant | undefined) => {
    const o = origine.find((x) => x.id === g?.id);
    return (
      g !== undefined &&
      o !== undefined &&
      o.cellule[0] === g.cellule[0] &&
      o.cellule[1] === g.cellule[1]
    );
  };
  return presents.map((g) =>
    g.pose && intact(g) && (!g.avec || intact(ici.get(g.avec)))
      ? g
      : { ...g, pose: undefined, avec: undefined, compagnon: undefined },
  );
}

/**
 * The trade of each practice: the hero's dominant practice (the animal on the statue) makes this
 * trade walk and work more often. The boar has no practice, so no favourite.
 */
export const METIER_DE_PRATIQUE = {
  strength: "smith",
  calisthenics: "champion",
  yoga: "herbalist",
  run: "watcher",
  ride: "farmer",
} as const satisfies Record<string, Role>;
export const metierFavori = (animal: Animal | undefined): Role | undefined => {
  const p = animal ? practiceOfAnimal(animal) : undefined;
  return p ? METIER_DE_PRATIQUE[p] : undefined;
};

/** The party plays once per session key (the route's `grown`): true when `cle` is new. */
export const feteDue = (cleSeance: string | undefined, celebree: string | undefined): boolean =>
  cleSeance !== undefined && cleSeance !== "" && cleSeance !== celebree;

/**
 * Reduced motion: where everyone present stands for the party, on the square nearest the fire.
 * Those already on a cell of the square stay on it; the others take the free ones; when the square
 * is full the rest stay where they are.
 */
export function rassembler(
  gens: readonly { id: string; cellule: Case }[],
  carte: Carte,
): Record<string, Case> {
  const [fx, fy] = emplacements.campfire.coin;
  const loin = (c: Case) => Math.abs(c[0] - fx) + Math.abs(c[1] - fy);
  const fixes = new Set((carte.occupees ?? []).map(cle));
  const place = casesDuLieu("place", carte)
    .filter((c) => !fixes.has(cle(c)))
    .sort((a, b) => loin(a) - loin(b));
  const sur = new Set(place.map(cle));
  const gardes = new Set(gens.filter((g) => sur.has(cle(g.cellule))).map((g) => cle(g.cellule)));
  const libres = place.filter((c) => !gardes.has(cle(c)));
  const out: Record<string, Case> = {};
  for (const g of gens) {
    const c = sur.has(cle(g.cellule)) ? g.cellule : libres.shift();
    if (c) out[g.id] = c;
  }
  return out;
}

/** The moment whose pool of lines (`villagers.<role>.<moment>`) a trade speaks from when touched. */
export const MOMENT_REPLIQUE: Record<Role, "rest" | "menu_visit" | "boss_defeated"> = {
  smith: "rest",
  farmer: "rest",
  herbalist: "rest",
  sage: "rest",
  minstrel: "rest",
  watcher: "menu_visit",
  champion: "boss_defeated",
};

/** The line of a pool of `taille`: the same villager says the same one all day. */
export const indiceReplique = (taille: number, jour: number, id: string): number =>
  taille <= 0 ? -1 : Math.floor(hasard(`${jour}:replique:${id}`)() * taille);

// --- Touching a villager --------------------------------------------------------------------------

/** A villager on the map as a touch sees it: its feet and a box above them, in map dp. */
export type CibleVillageois = {
  id: string;
  role: Role;
  habitant: boolean;
  pied: readonly [number, number];
  /** Box width and height, dp, at least a finger's. */
  l: number;
  h: number;
  /** A resting pose's own box on the map, dp (x0, y0, x1, y1): it replaces the standing figure's `l` x `h` above the feet (T40). */
  boite?: readonly [x0: number, y0: number, x1: number, y1: number];
};
/** What the map hands the screen for villagers: who stands where now, and turning one towards a finger. */
export type PriseVillageois = {
  cibles: () => CibleVillageois[];
  tourner: (id: string, sens: 1 | -1) => void;
};
/** A villager's touch box above its feet, dp: the body, not the sprite's 96 dp canvas. */
export const TOUCHE_L = COTE * 0.5;
export const TOUCHE_H = COTE * 0.9;

/** The villager under a map point `p`; the one in front (lowest feet) when boxes overlap. */
export function villageoisAuPoint(
  p: readonly [number, number],
  cibles: readonly CibleVillageois[],
): CibleVillageois | null {
  return (
    cibles
      .filter((c) =>
        c.boite
          ? p[0] >= c.boite[0] && p[0] <= c.boite[2] && p[1] >= c.boite[1] && p[1] <= c.boite[3]
          : Math.abs(p[0] - c.pied[0]) <= c.l / 2 &&
            p[1] <= c.pied[1] + 4 &&
            p[1] >= c.pied[1] - c.h,
      )
      .sort((a, b) => b.pied[1] - a.pied[1] || (a.id < b.id ? -1 : 1))[0] ?? null
  );
}

// The last session key handed to a map. Module state survives a remount of the screen or of the map
// (a ref does not), so a key still in the tab's params never plays the party twice.
let derniereCle: string | undefined;

/** The key itself the first time it is seen, undefined every time after (also after a remount). */
export function prendreFete(cleSeance: string | undefined): string | undefined {
  if (!feteDue(cleSeance, derniereCle)) return undefined;
  derniereCle = cleSeance;
  return cleSeance;
}

/** Depth footprint (T40): a talking pair is drawn between its two cells, so it sorts as the box of both (the companion draws nothing and keeps its own cell). */
export const empriseHabitant = (h: Habitant, autre?: Habitant): Emprise =>
  autre && !h.compagnon
    ? {
        coin: [Math.min(h.cellule[0], autre.cellule[0]), Math.min(h.cellule[1], autre.cellule[1])],
        emprise: [
          Math.abs(h.cellule[0] - autre.cellule[0]) + 1,
          Math.abs(h.cellule[1] - autre.cellule[1]) + 1,
        ],
      }
    : { coin: h.cellule, emprise: [1, 1] };
