// T27 point 4: the small effects the app draws on the buildings whose trade asks for them, pure.
// Effets.tsx draws. Each rests on the building's `repere` (constants/isoSpec.json
// `batiments.*.repere`): only where its landmark carries the gesture. A wave picks EFFETS_MAX of
// them (seeded by the day and the wave number, as the night lights), one animated node each,
// which plays in a seat the T16 rotation already hands out (`signal`, or `lucioles` for the
// druids' motes): no new family. Nothing at rest, none in reduced motion or the frozen mode (no
// wave then), and richer on a building's last stage (more sparks, one of them gold).

import { createContext } from "react";
import spec from "@/constants/isoSpec.json";
import type { BuildingCode } from "@/db/schema";
import type { Rect } from "./carteDemo";
import type { Tournante } from "./familles";
import { accrochesDe, PX_PAR_HAUTEUR } from "./feux";
import { ECLATS_ANIMES, sommetDp } from "./fierte";
import { batiments, type SpriteIso, type Stade, type TokenCouleur } from "./isoSpec";
import { NOEUDS_RECLAMABLES } from "./reclame";
import { graine } from "./veilleuses";

/** Buildings with an effect in one wave: the animated nodes the map adds, at most. */
export const EFFETS_MAX = 2;

export type GenreEffet = "runes" | "lucioles" | "braise" | "etoile" | "etincelles" | "gouttes";

export type Effet = {
  genre: GenreEffet;
  /** The turning seat the node plays in (familles.ts). */
  siege: Tournante;
  /**
   * Where it starts: the hearth of the stage (forge), the door (the lair's mouth), the water of
   * the basin (the footprint's centre, raised by ZBASSIN) or the top of the painting.
   */
  ancre: "foyer" | "porte" | "bassin" | "faite";
  /** The base tone and the pale one of a spark. */
  tons: readonly [TokenCouleur, TokenCouleur];
  /** The `repere` it rests on (isoSpec), copied so a test keeps the two together. */
  repere: string;
};

export const EFFETS: Readonly<Partial<Record<BuildingCode, Effet>>> = {
  wizard_tower: {
    genre: "runes",
    siege: "signal",
    ancre: "faite",
    tons: ["isoRune", "isoEclat"],
    repere: "tour fine coiffée d'un cône pointu",
  },
  druid_grove: {
    genre: "lucioles",
    siege: "lucioles",
    ancre: "faite",
    tons: ["isoLucioleVerte", "isoEclat"],
    repere: "cercle de pierres levées gravées, mangé de lierre",
  },
  dragon_lair: {
    genre: "braise",
    siege: "signal",
    ancre: "porte",
    tons: ["isoFlamme", "isoFlammeCoeur"],
    repere: "gueule de grotte dans un rocher, ossements devant",
  },
  observatory: {
    genre: "etoile",
    siege: "signal",
    ancre: "faite",
    tons: ["isoEclat", "isoEclat"],
    repere: "dôme fendu sur une tour basse",
  },
  fountain: {
    genre: "gouttes",
    siege: "signal",
    ancre: "bassin",
    tons: ["isoEauNuitCoeur", "isoEclat"],
    repere: "bassin rond autour d'une colonne",
  },
  forge: {
    genre: "etincelles",
    siege: "signal",
    ancre: "foyer",
    tons: ["isoFlamme", "isoFlammeCoeur"],
    repere: "enclume et foyer, la cheminée à partir du stade solid",
  },
};

/**
 * Dev only (dev-iso `Effet : <bâtiment>`): the building whose effect the next wave plays, alone, in
 * place of the seeded draw. null (the default, and every screen but dev-iso) leaves the draw as it
 * is. It writes nothing: no ratchet, no setting, no state of the hero.
 */
export const EffetForceContext = createContext<BuildingCode | null>(null);

/** The effects a wave plays: the forced building alone when dev-iso forces one, else the draw. */
export const effetsJoues = (
  tires: ReadonlySet<BuildingCode> | undefined,
  force: BuildingCode | null,
): ReadonlySet<BuildingCode> | undefined => (force ? new Set([force]) : tires);

/** The EFFETS_MAX buildings of a wave that play an effect: lowest hash of the day, the wave and the code. */
export function effetsDeVague(
  montres: readonly BuildingCode[],
  jour: number,
  numero: number,
): ReadonlySet<BuildingCode> {
  return new Set(
    montres
      .filter((code) => EFFETS[code])
      .map((code) => ({ code, k: graine(`${jour}:${numero}:effet:${code}`) }))
      .sort((a, b) => a.k - b.k || a.code.localeCompare(b.code))
      .slice(0, EFFETS_MAX)
      .map((x) => x.code),
  );
}

/**
 * The effects that may play now. The signal seat holds NOEUDS_RECLAMABLES nodes in all: the ready
 * glows (up to 4) or, when none glows, the legendary glints (ECLATS_ANIMES at most). An effect
 * takes what those leave, so the effects never add to the map's worst case: with 4 ready buildings
 * none plays, with none ready two do next to the two glints. `glows` is how many glow now.
 */
export function effetsPermis(
  effets: ReadonlySet<BuildingCode> | undefined,
  glows: number,
): ReadonlySet<BuildingCode> {
  const libres = NOEUDS_RECLAMABLES - (glows > 0 ? glows : ECLATS_ANIMES);
  return new Set([...(effets ?? [])].slice(0, Math.max(0, libres)));
}

/**
 * The few irregular shapes the sparks are cut from, each in a 10 x 10 box (FIN-MAG: no bare
 * circle). A rune is a filled glyph, so it can wear the ink like the others and stay one node.
 */
export const FORMES_GRAIN = {
  runes: "M4 0H6V3.2L9.4 5.2L8.6 6.6L6 5.1V10H4V7.4L1 5.6L1.8 4.2L4 5.5Z",
  braise: "M5 0L6.6 2.8L10 3.6L7.2 5.8L8 10L4.6 7.6L1.2 9.2L2.6 5.4L0 3.4L3.4 3Z",
  lucioles: "M5 0C8 1.5 10 4 8.4 7C7 9.6 3.4 10 1.6 7.4C0 4.6 2.2 1.8 5 0Z",
  gouttes: "M5 0C6.6 2.8 9 4.6 9 7C9 9 7 10 5 10C3 10 1 9 1 7C1 4.6 3.4 2.8 5 0Z",
  etincelles: "M5 0L6.4 4L9.6 5.4L6.2 6.6L5 10L3.6 6.4L0.4 4.8L3.8 3.8Z",
  etoile: "M5 0L6 4L10 5L6 6L5 10L4 6L0 5L4 4Z",
} as const;

/** Sparks of a stage: three, and six (the last one gold) on the last stage. */
export const PARTICULES_BASE = 3;
export const PARTICULES_RICHE = 6;
/** [x, y, size] in the 100 x 100 box of the effect. */
export const PARTICULES: readonly (readonly [number, number, number])[] = [
  [50, 72, 9],
  [26, 46, 7],
  [74, 52, 7],
  [38, 22, 6],
  [64, 14, 5],
  [18, 78, 5],
];

/** The observatory's glint: one star, large, over the dome (scattered specks read as dust). */
export const PARTICULES_ETOILE: readonly (readonly [number, number, number])[] = [[50, 68, 16]];

/**
 * T41 point 3: what a building adds on its last stage, drawn in the same single animated node
 * (static shapes inside the group, no node more: the 64 budget does not move). 100 x 100 box.
 * Eyes and smoke at the lair's mouth, an orb over the wizard's cone, a jet at the fountain, a beam
 * and two more stars at the observatory, a jet of fire at the forge. Never violet: the orb is pale.
 */
export type Forme =
  | { f: "cercle"; cx: number; cy: number; r: number; ton: TokenCouleur; op?: number }
  | { f: "trace"; d: string; ton: TokenCouleur; w: number }
  | { f: "aplat"; d: string; ton: TokenCouleur; op: number };

// shortcut: the coordinates below (eyes, arcs, beam, orb) and MONTEE_GRAND are set by hand on the
// current sprites (lair/grand, fountain/solid, observatory/solid, wizard_tower/grand); redo them if
// those sprites are repainted.
export const DECOR_GRAND: Readonly<Partial<Record<GenreEffet, readonly Forme[]>>> = {
  // Anchored on the door: the mouth's middle is about 70 sprite px above it. Two almond eyes in a
  // cream the embers do not have, and dark ash (isoRock) climbing from the mouth.
  // FIN-MAG: measured on the 0.125 dp per sprite px of the lair/grand pose (the old y of 48 was 21
  // dp over the door, on the roof): the dark mouth is about 47 units wide and 35 tall, its middle 8
  // dp (20 units) over the door. Two almond eyes 20 units wide, each with a slit pupil in ink,
  // centred at cy 70, 12 dp (30 units) over the box's foot; the 3 dp climb brings them to the mouth.
  braise: [
    { f: "cercle", cx: 44, cy: 28, r: 8, ton: "isoRock", op: 0.85 },
    { f: "cercle", cx: 56, cy: 13, r: 9, ton: "isoRock", op: 0.7 },
    { f: "aplat", d: "M25 70Q35 58 45 70Q35 82 25 70Z", ton: "isoEclat", op: 1 },
    { f: "aplat", d: "M49 70Q59 58 69 70Q59 82 49 70Z", ton: "isoEclat", op: 1 },
    { f: "aplat", d: "M35 62Q37.6 70 35 78Q32.4 70 35 62Z", ton: "isoInk", op: 1 },
    { f: "aplat", d: "M59 62Q61.6 70 59 78Q56.4 70 59 62Z", ton: "isoInk", op: 1 },
  ],
  // The orb sits on the cone's tip (the box's bottom is the tip), its halo around it.
  runes: [
    { f: "cercle", cx: 50, cy: 86, r: 14, ton: "isoEclat", op: 0.3 },
    { f: "cercle", cx: 50, cy: 90, r: 8, ton: "isoEclat" },
  ],
  // A column from the water that arches over and falls in drops on both sides.
  gouttes: [
    { f: "trace", d: "M50 100C49 76 51 54 50 36", ton: "isoEauVive", w: 4 },
    { f: "trace", d: "M50 36C60 28 72 42 77 76", ton: "isoEauVive", w: 3 },
    { f: "trace", d: "M50 36C40 28 28 42 23 76", ton: "isoEauVive", w: 3 },
    { f: "cercle", cx: 77, cy: 84, r: 3.5, ton: "isoEauVive" },
    { f: "cercle", cx: 23, cy: 84, r: 3.5, ton: "isoEauVive" },
    { f: "cercle", cx: 68, cy: 94, r: 3, ton: "isoEclat" },
    { f: "cercle", cx: 32, cy: 94, r: 3, ton: "isoEclat" },
  ],
  // The beam leaves the dome's slit (about 40 sprite px under the tip, a little to its left).
  etoile: [
    { f: "aplat", d: "M42 100L52 100L66 34L34 34Z", ton: "isoEclat", op: 0.22 },
    { f: "cercle", cx: 22, cy: 56, r: 5, ton: "isoEclat" },
    { f: "cercle", cx: 78, cy: 50, r: 4, ton: "isoEclat" },
  ],
  etincelles: [{ f: "trace", d: "M50 100C48 84 52 74 50 62", ton: "isoFlamme", w: 4 }],
};

/** How far a last-stage group climbs, per genre: it stays near what it hangs on. */
const MONTEE_GRAND: Readonly<Partial<Record<GenreEffet, number>>> = {
  braise: 3,
  runes: 3,
  gouttes: 3,
  etoile: 2,
};

/**
 * Sprite px a genre's box sits under the painting's top (the box's bottom is its anchor): the
 * observatory's beam leaves the dome's slit, about 40 px under the tip, not the tip.
 */
const ENFONCE_PX: Readonly<Partial<Record<GenreEffet, number>>> = { etoile: 40 };
export const montee = (genre: GenreEffet, riche: boolean): number =>
  (riche ? MONTEE_GRAND[genre] : undefined) ?? EFFET_MONTEE;

/** The box of an effect in dp, and how far it climbs. */
export const EFFET_TAILLE = 40;
export const EFFET_MONTEE = 26;

/**
 * Where the effect's box sits on the map, dp (its bottom-centre on the anchor), or null when the
 * stage has no anchor: no hearth for the forge and the lair, no mask for the others.
 */
export function boiteEffet(
  code: BuildingCode,
  stade: Stade,
  s: SpriteIso,
  corps: Rect,
): { x: number; y: number } | null {
  const e = EFFETS[code];
  if (!e) return null;
  const k = corps.w / s.size[0];
  const px = (p: readonly [number, number]) => [corps.x + p[0] * k, corps.y + p[1] * k] as const;
  const a = accrochesDe(code, stade);
  const p =
    e.ancre === "foyer"
      ? a?.foyer && px(a.foyer.px)
      : e.ancre === "porte"
        ? a?.porte && px(a.porte)
        : e.ancre === "bassin"
          ? px(centreBassin(code, s))
          : null;
  const pt = p ?? sommetDp(s, corps);
  const enfonce = p ? 0 : (ENFONCE_PX[e.genre] ?? 0) * k;
  return pt ? { x: pt[0] - EFFET_TAILLE / 2, y: pt[1] - EFFET_TAILLE + enfonce } : null;
}

// shortcut: ZBASSIN and centreBassin are measured on fountain/solid only (the one basin); redo them
// if the basin's painting or footprint changes.
/** Height of a basin's water above the ground, grid units (measured on fountain/solid: 113 sprite px). */
export const ZBASSIN = 0.48;

/** The middle of a basin's water in sprite px: its footprint's centre (from the bottom corner), raised. */
export function centreBassin(code: BuildingCode, s: SpriteIso): readonly [number, number] {
  const [ex, ey] = batiments[code]?.emprise ?? [1, 1];
  // The nominal anchor (canvas bottom minus the margin): the stage's own anchor sits on its painting's foot.
  return [
    s.anchor[0],
    s.size[1] - spec.anchorMarginPx - ((ex + ey) / 2) * (spec.S / 4) - ZBASSIN * PX_PAR_HAUTEUR,
  ];
}
