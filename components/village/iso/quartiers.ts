// The small buildings between the monuments (T44, point 1): houses, shops, workshops and wall
// sections, grouped in districts round the building whose trade names them, along the existing
// streets, on free cells. Pure and deterministic: the whole plan (which cell is built at which
// tier) is computed once per seed from the fixed layout, then filtered by what the village shows.
// Nothing recedes: a piece keeps its cell, and its size only goes up with the tier and the stage
// of its birth. A piece is one cell; `taille` 2 is how big it is drawn, not a second cell taken.
// The vocation (G1: the hero's dominant practice, db/village.ts `vocationDeBlason`) re-skins the
// pieces near the hall of heroes into its family and anchor: never a cell, a count or a size, so a
// vocation that changes takes nothing built away.

import { createContext } from "react";
import type { Practice } from "@/db/crestRules";
import type { BuildingCode } from "@/db/schema";
import type { VillageTier } from "@/db/village";
import { ecranXY } from "./carteDemo";
import { type Case, cle, emplacements, paliers, sol, TAILLE } from "./isoLayout";
import { batiments } from "./isoSpec";
import { noeud, SENTIERS } from "./rues";
import { hasard } from "./solVarie";

export type Famille = "artisans" | "entrainement" | "calme" | "rempart";
export type Genre = "maison" | "echoppe" | "atelier" | "rempart";
export type Construction = {
  case: Case;
  famille: Famille;
  genre: Genre;
  /** Drawn size: 1 or 2, never goes down. */
  taille: 1 | 2;
  /** The tier the piece first stands at. */
  nee: VillageTier;
  /** The building it gathers round (none for the wall). */
  ancre: BuildingCode | null;
};

export type EtatQuartiers = {
  palier: VillageTier;
  graine: number;
  /** The journal's dominant practice, if any. */
  vocation?: Practice | null;
};

/** What each vocation makes of the district round the hall of heroes: its family and the building it gathers round. */
export const QUARTIER_DE_VOCATION: Readonly<
  Record<Practice, { famille: Famille; ancre: BuildingCode }>
> = {
  strength: { famille: "artisans", ancre: "forge" },
  calisthenics: { famille: "entrainement", ancre: "training_dummy" },
  run: { famille: "entrainement", ancre: "watchtower" },
  yoga: { famille: "calme", ancre: "druid_grove" },
  ride: { famille: "artisans", ancre: "barn" },
};
/** The vocation's district: pieces this close (cells) to the hall of heroes. */
const RAYON_VOCATION = 7;

const METIER: Partial<Record<BuildingCode, Famille>> = {
  forge: "artisans",
  armory: "artisans",
  quarry: "artisans",
  farm: "artisans",
  barn: "artisans",
  windmill: "artisans",
  tent: "entrainement",
  training_dummy: "entrainement",
  archery_range: "entrainement",
  champion_arena: "entrainement",
  watchtower: "entrainement",
  castle_wall: "entrainement",
  dragon_lair: "entrainement",
  druid_grove: "calme",
  wizard_tower: "calme",
  observatory: "calme",
  well: "calme",
  fountain: "calme",
  heroes_hall: "calme",
};

/** Total pieces standing at each tier (index 0 = tier 1): about 6, 25 and 50 at tiers 1, 6 and 12. */
const TOTAL = [6, 10, 14, 18, 22, 25, 29, 33, 37, 41, 46, 50] as const;
/** How many of them are wall sections. */
const REMPART = [0, 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12] as const;
const TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const satisfies readonly VillageTier[];
/** A district reaches this far (cells) from its building's footprint. */
const PORTEE = 5;

const estRue = ([gx, gy]: Case) => sol[gy]?.[gx] === "chemin" || sol[gy]?.[gx] === "pont";
const VOISINS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** Cells a piece never takes: footprints, their path to the square, footpaths, the square. Decor is told by the ground. */
function reservees(): Set<number> {
  const r = new Set<number>();
  for (const e of Object.values(emplacements)) {
    for (const c of e.cases) r.add(cle(c));
    for (const c of e.acces) r.add(cle(c));
  }
  for (const s of SENTIERS) {
    const [a, b] = [s.porte, noeud(s.fin)];
    for (let i = 0; i <= 8; i++) {
      const x = a[0] + ((b[0] - a[0]) * i) / 8;
      const y = a[1] + ((b[1] - a[1]) * i) / 8;
      r.add(cle([Math.floor(x), Math.floor(y)]));
    }
  }
  const [fx, fy] = emplacements.campfire.coin;
  for (let x = fx - 2; x <= fx + 2; x++) for (let y = fy - 2; y <= fy + 2; y++) r.add(cle([x, y]));
  return r;
}

type Candidat = { c: Case; ancre: BuildingCode; famille: Famille; score: number };

/** Distance in cells from a cell to a building's footprint. */
function distance([gx, gy]: Case, code: BuildingCode): number {
  const [x, y] = emplacements[code].coin;
  const [w, d] = emplacements[code].emprise;
  return Math.hypot(Math.max(x - gx, 0, gx - (x + w - 1)), Math.max(y - gy, 0, gy - (y + d - 1)));
}

type Plan = Construction & { grandit: boolean };
const plans = new Map<number, readonly Plan[]>();

const TOUTES: readonly Case[] = Array.from(
  { length: TAILLE * TAILLE },
  (_, i): Case => [i % TAILLE, Math.floor(i / TAILLE)],
);
const palierDe = ([gx, gy]: Case) => paliers[gy]?.[gx] ?? null;
/** Whether a cell touches a cell the island of tier `t` does not hold. */
const bordDe = (c: Case, t: number) =>
  VOISINS.some(([dx, dy]) => {
    const p = palierDe([c[0] + dx, c[1] + dy]);
    return p === null || p > t;
  });

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one greedy pass per tier (wall, then houses), split it and the shared state (pris, sortie) has to travel through every piece
function plan(graine: number): readonly Plan[] {
  const connu = plans.get(graine);
  if (connu) return connu;
  const interdit = reservees();
  const pris = new Set<number>();
  const sortie: Plan[] = [];
  const ancres = (Object.keys(METIER) as BuildingCode[]).filter((c) => METIER[c]);
  const libre = (c: Case) =>
    sol[c[1]]?.[c[0]] === "herbe" && !interdit.has(cle(c)) && !pris.has(cle(c));

  for (const t of TIERS) {
    // wall: edge cells of this tier's island, each new one as far as possible from the others
    const murs = sortie.filter((p) => p.genre === "rempart");
    const voulus = (REMPART[t - 1] ?? 0) - murs.length;
    for (let n = 0; n < voulus; n++) {
      const mesure = (c: Case) =>
        Math.min(99, ...murs.map((m) => Math.hypot(m.case[0] - c[0], m.case[1] - c[1]))) +
        hasard(c[0], c[1], 7, graine);
      const meilleur = TOUTES.filter(
        (c) => libre(c) && (palierDe(c) ?? 99) <= t && bordDe(c, t),
      ).sort((a, b) => mesure(b) - mesure(a))[0];
      if (!meilleur) break;
      pris.add(cle(meilleur));
      const m: Plan = {
        case: meilleur,
        famille: "rempart",
        genre: "rempart",
        taille: 1,
        nee: t,
        ancre: null,
        grandit: true,
      };
      murs.push(m);
      sortie.push(m);
    }
    // houses: free cells beside a street, near an anchor that stands at this tier
    const candidats: Candidat[] = TOUTES.flatMap((c): Candidat[] => {
      const p = palierDe(c);
      if (p === null || p > t || !libre(c)) return [];
      if (!VOISINS.some(([dx, dy]) => estRue([c[0] + dx, c[1] + dy]))) return [];
      const proche = ancres
        .filter((a) => (batiments[a].tier ?? 99) <= t)
        .map((a) => ({ a, d: distance(c, a) }))
        .sort((x, y) => x.d - y.d)[0];
      const famille = proche && METIER[proche.a];
      if (!proche || !famille || proche.d > PORTEE) return [];
      return [{ c, ancre: proche.a, famille, score: proche.d + 3 * hasard(c[0], c[1], 3, graine) }];
    });
    candidats.sort((a, b) => a.score - b.score);
    for (const k of candidats) {
      if (sortie.length >= (TOTAL[t - 1] ?? 0)) break;
      pris.add(cle(k.c));
      const h = hasard(k.c[0], k.c[1], 5, graine);
      const genre: Genre =
        k.famille === "artisans"
          ? h < 0.5
            ? "atelier"
            : "echoppe"
          : h < 0.3
            ? "echoppe"
            : "maison";
      sortie.push({
        case: k.c,
        famille: k.famille,
        genre,
        taille: 1,
        nee: t,
        ancre: k.ancre,
        grandit: hasard(k.c[0], k.c[1], 9, graine) < 0.5,
      });
    }
  }
  plans.set(graine, sortie);
  return sortie;
}

/**
 * The small buildings of a village tier. Same tier and seed, same list; a later tier keeps every
 * piece, its cell and its size. Only the tier and the seed count: what is shown or at which stage
 * must not make a piece vanish or shrink (B6), and the anchor was fixed when the plan was made.
 */
export function construire({ palier, graine, vocation }: EtatQuartiers): Construction[] {
  const sien = vocation ? QUARTIER_DE_VOCATION[vocation] : null;
  return plan(graine).flatMap(({ grandit, ...p }): Construction[] => {
    if (p.nee > palier) return [];
    const grand = grandit && palier - p.nee >= (p.genre === "rempart" ? 2 : 3);
    const centre =
      sien && p.genre !== "rempart" && distance(p.case, "heroes_hall") <= RAYON_VOCATION;
    return [{ ...p, taille: grand ? 2 : 1, ...(centre ? sien : {}) }];
  });
}

/** Dev only (dev-iso): draw the pieces as colour blocks. Off by default, nothing provides it in the tab. */
export const QuartiersContext = createContext(false);

const HAUTEUR_BLOC = 9;
const MARGE_BLOC = 0.14;
const r1 = (n: number) => Math.round(n * 10) / 10;

/** A block's three faces (`d` in map dp): a flat diamond on the cell, lifted, and the two front sides of the low prism under it. */
export function blocD({ case: [gx, gy], taille }: Construction): {
  haut: string;
  gauche: string;
  droite: string;
} {
  const [a, b] = [gx + MARGE_BLOC, gx + 1 - MARGE_BLOC];
  const [c, d] = [gy + MARGE_BLOC, gy + 1 - MARGE_BLOC];
  const h = HAUTEUR_BLOC * (taille === 2 ? 1.6 : 1);
  const p = ([x, y]: readonly [number, number], dy = 0) => {
    const [sx, sy] = ecranXY([x, y]);
    return `${r1(sx)},${r1(sy - dy)}`;
  };
  return {
    haut: `M${p([a, c], h)}L${p([b, c], h)}L${p([b, d], h)}L${p([a, d], h)}Z`,
    gauche: `M${p([a, d], h)}L${p([b, d], h)}L${p([b, d])}L${p([a, d])}Z`,
    droite: `M${p([b, d], h)}L${p([b, c], h)}L${p([b, c])}L${p([b, d])}Z`,
  };
}
