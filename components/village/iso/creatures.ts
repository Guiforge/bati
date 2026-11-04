// The map's small painted creatures (LIFE C3 to C7), pure side (drawn by Creatures.tsx): mice by
// the barn and the farm, a cat on the wall, birds that land on a roof, the sleeping dragon of the
// mythic lair. Decoration only: nothing gates on them, nothing taps them. Every pose is a function
// of the ambient clock `c` (horloge.ts) and of the day's seed, never of a timer or of chance.
//
// The clock rests on a multiple of CYCLE_MS, so the timelines are built on whole cycles: an even
// cycle is a pause, an odd one holds at most one walk that starts after 10 % of it and ends before
// the cycle does. Whatever cycle the clock stops on, the creature stands still in a rest pose.

import type { BuildingCode } from "@/db/schema";
import { ecranXY, pose, spriteDe, Z_DP } from "./carteDemo";
import { CYCLE_MS } from "./horloge";
import { type Case, toits } from "./isoLayout";
import type { Ambiance, Stade } from "./isoSpec";
import type { Emprise } from "./profondeur";
import { hasard } from "./vivant";

export type Pt = readonly [x: number, y: number];
export type Espece = "souris" | "chat" | "oiseau" | "dragon";

/** One image of the walking sheets lasts this long: 8 a second. */
const MS_IMAGE = 125;

/**
 * What a villager's figure stands, dp: about 250 of the 768 px of its sprite, which is drawn in a
 * COTE (48 dp) box. The creatures are sized from it, never by eye in dp: a mouse is about 37 % of
 * a villager, the wall cat 60 % (measured 2026-11-04: a mouse was 82 % and the cat 1.7 times).
 */
export const HAUTEUR_VILLAGEOIS = 16;
export const PART_SOURIS = 0.375;
export const PART_CHAT = 0.6;

/**
 * The drawing box of a walking sheet's frame so that its animal stands `part` of a villager: the
 * animal fills `rempli` of its frame's height (read off the strip, alpha above 40), the frame's
 * px ratio kept (`ratio`, width over height).
 */
const boite = (part: number, rempli: number, ratio: number) => {
  const h = (part * HAUTEUR_VILLAGEOIS) / rempli;
  return { l: Math.round(h * ratio * 10) / 10, h: Math.round(h * 10) / 10 };
};

/** Drawing box of one frame on the map, dp (the frames' px ratio kept). */
export const TAILLES: Record<Espece, { l: number; h: number }> = {
  souris: boite(PART_SOURIS, 88 / 109, 155 / 109),
  chat: boite(PART_CHAT, 117 / 128, 157 / 128),
  oiseau: { l: 20, h: 15 },
  dragon: { l: 72, h: 64 },
};

/** The images of a sheet, in order: two of the walk (or of the flight) and the rest one. */
type NumImage = 0 | 1 | 2;
export type Pas = { x: number; y: number; sens: 1 | -1; image: NumImage; opacite: number };

const lisse = (t: number): number => {
  "worklet";
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
};

/** The waypoint `i` of the day: one of `pts`, drawn by the seed. */
function pointDe(jour: number, sel: number, i: number, pts: readonly Pt[]): Pt {
  "worklet";
  const p = pts[Math.min(pts.length - 1, Math.floor(hasard(jour, sel * 1000 + i) * pts.length))];
  return p ?? [0, 0];
}

/** Share of an odd cycle the walk starts and ends at. */
const FENETRE_MARCHE = [0.1, 0.6] as const;

/**
 * A walker between waypoints (feet, dp): a pause in even cycles, in odd ones a walk from the
 * waypoint it stood on to the next (often the same: it stays). Faces the way it last went.
 */
export function marche(c: number, jour: number, sel: number, pts: readonly Pt[]): Pas {
  "worklet";
  const k = Math.max(0, Math.floor(c / CYCLE_MS));
  const u = c / CYCLE_MS - k;
  const i = Math.floor(k / 2);
  const impair = k % 2 === 1;
  const de = pointDe(jour, sel, i, pts);
  const vers = impair ? pointDe(jour, sel, i + 1, pts) : de;
  const [a, b] = impair ? [de, vers] : [pointDe(jour, sel, i - 1, pts), de];
  const t = impair ? lisse((u - FENETRE_MARCHE[0]) / (FENETRE_MARCHE[1] - FENETRE_MARCHE[0])) : 0;
  const bouge = impair && (de[0] !== vers[0] || de[1] !== vers[1]) && t > 0 && t < 1;
  const dx = b[0] - a[0];
  return {
    x: de[0] + (vers[0] - de[0]) * t,
    y: de[1] + (vers[1] - de[1]) * t,
    sens: dx === 0 ? (hasard(jour, sel * 1000 + i + 500) < 0.5 ? 1 : -1) : dx > 0 ? 1 : -1,
    image: bouge ? ((Math.floor(c / MS_IMAGE) % 2) as NumImage) : 2,
    opacite: 1,
  };
}

/** A visit of a bird to a roof: 4 cycles, it arrives, stays two, leaves. */
export const CYCLES_VISITE = 4;
/** Where a bird comes from and goes, dp: far, and high. Over a 4 s flight that is 60 dp/s, a calm village's pace. */
const VOL_DX = 210;
const VOL_DY = 110;
/** Share of the visits a roof gets. */
const CHANCE_VISITE = 0.55;

/** Whether the day has a bird visit `v` on the roof `sel`. */
export const visiteLe = (jour: number, sel: number, v: number): boolean => {
  "worklet";
  return hasard(jour, sel * 1000 + 100 + v) < CHANCE_VISITE;
};

/** A bird on a roof at `perche` (its feet): out of sight before and after its visit. */
export function visite(c: number, jour: number, sel: number, perche: Pt): Pas {
  "worklet";
  const k = Math.max(0, Math.floor(c / CYCLE_MS));
  const u = c / CYCLE_MS - k;
  const v = Math.floor(k / CYCLES_VISITE);
  const phase = k % CYCLES_VISITE;
  const sens: 1 | -1 = hasard(jour, sel * 1000 + 200 + v) < 0.5 ? 1 : -1;
  const absent = { x: perche[0], y: perche[1], sens, image: 2 as NumImage, opacite: 0 };
  if (!visiteLe(jour, sel, v)) return absent;
  const posee = { ...absent, opacite: 1 };
  if (phase === 1 || phase === 2) return posee;
  const p = lisse((u - 0.1) / 0.8);
  const vole = (Math.floor(c / MS_IMAGE) % 2) as NumImage;
  if (phase === 0) {
    // Arrives from behind, slowing down onto the roof.
    const e = 1 - (1 - p) * (1 - p);
    return {
      ...absent,
      x: perche[0] - sens * VOL_DX * (1 - e),
      y: perche[1] - VOL_DY * (1 - e),
      image: p >= 1 ? 2 : vole,
      opacite: u < 0.1 ? 0 : Math.min(1, p / 0.25),
    };
  }
  // Leaves ahead of where it came, speeding up.
  const e = p * p;
  return {
    ...absent,
    x: perche[0] + sens * VOL_DX * e,
    y: perche[1] - VOL_DY * e,
    image: p <= 0 ? 2 : vole,
    opacite: u < 0.1 ? 1 : Math.min(1, (1 - p) / 0.25),
  };
}

/** The sleeping dragon's breath, +3 % at the most, one a cycle: 1 on every cycle boundary (the rest pose). */
export function souffle(c: number): number {
  "worklet";
  const s = Math.sin((Math.PI * c) / CYCLE_MS);
  return 1 + 0.03 * s * s;
}

// --- Where they live ----------------------------------------------------------------------------

/** The buildings with a roof point for a bird (isoLayout.json `toits`). */
export const CODES_A_PERCHOIR: ReadonlySet<string> = new Set(
  [...toits.keys()].map((cle) => cle.slice(0, cle.lastIndexOf("_"))),
);

/** Where the bird of a building's stage stands on the map, dp (its feet), or null: no sprite or no point. */
export function perchoirDe(
  code: BuildingCode,
  stade: Stade,
  ambiance: Ambiance = "nuit",
): Pt | null {
  const s = spriteDe(code, stade, ambiance);
  const p = toits.get(`${code}_${stade}`);
  if (!s || !p) return null;
  const r = pose(code, s);
  return [r.x + (p[0] / s.size[0]) * r.w, r.y + (p[1] / s.size[1]) * r.h];
}

/** A wall's top, in units of height (rempart.ts PIERRE.h): a cat sits on it. */
const HAUT_MUR = 1.15;
/** The palisade of the first stage is too thin and too tall for a cat. */
export const chatSurMur = (stade: Stade): boolean => stade !== "rough";
/** The stretch of wall the day's cat lives on, or -1 with no stretch. */
export const tronconDuChat = (jour: number, nombre: number): number =>
  nombre === 0 ? -1 : Math.floor(hasard(jour, 77) * nombre);
/** Whether the day has a cat at all. */
const CHANCE_CHAT = 0.8;
export const chatLe = (jour: number): boolean => hasard(jour, 78) < CHANCE_CHAT;

/** The top of the wall along the cells of a stretch, dp (a cat's feet). */
export const surLeMur = (cases: readonly Case[]): Pt[] =>
  cases.map(([gx, gy]) => {
    const [x, y] = ecranXY([gx + 0.5, gy + 0.5]);
    return [x, y - HAUT_MUR * Z_DP] as const;
  });

type Station = {
  id: string;
  espece: "souris" | "dragon";
  /** Its one footprint in the depth order. */
  e: Emprise;
  /** The waypoints of its feet, dp. */
  pts: readonly Pt[];
  sel: number;
  /** Whether the day has it out: it is mounted either way (the map's node count never moves with the day), hidden when not. */
  present: boolean;
};

/** The mice's ground: grass between the barn and the farm, and along the farm's west side. */
const SOURIS = [
  {
    id: "ferme-nord",
    sel: 1,
    e: { coin: [3, 6], emprise: [3, 1] },
    gx: [3.3, 4, 4.7],
    gy: [6.5],
    chance: 0.7,
    avec: ["barn", "farm"],
  },
  {
    id: "ferme-ouest",
    sel: 2,
    e: { coin: [3, 7], emprise: [1, 3] },
    gx: [3.5],
    gy: [7.4, 8.2, 9],
    chance: 0.5,
    avec: ["farm"],
  },
] as const satisfies readonly {
  id: string;
  sel: number;
  e: Emprise;
  gx: readonly number[];
  gy: readonly number[];
  chance: number;
  avec: readonly BuildingCode[];
}[];

/**
 * The dragon's cell: open grass at the lair's left, outside the stone and clear of the cave's
 * mouth (the painting already has a sleeping one inside and a carved one on the roof).
 */
export const CASE_DRAGON: Case = [13, 2];

const cellsVisibles = (e: Emprise, visible: readonly (readonly boolean[])[]): boolean =>
  Array.from({ length: e.emprise[0] }, (_, i) =>
    Array.from(
      { length: e.emprise[1] },
      (_, j) => visible[e.coin[1] + j]?.[e.coin[0] + i] === true,
    ),
  )
    .flat()
    .every(Boolean);

/**
 * The creatures that live on the ground and have a place of their own (the cat, the birds and the
 * wall are the wall's and the roofs': Creatures.tsx). `mythique`: the lair stands at its mythic stage.
 */
export function stations(
  visible: readonly (readonly boolean[])[],
  montres: readonly BuildingCode[],
  mythique: boolean,
  jour: number,
): Station[] {
  const souris = SOURIS.filter(
    (s) => s.avec.some((code) => montres.includes(code)) && cellsVisibles(s.e, visible),
  ).map(
    (s): Station => ({
      id: s.id,
      espece: "souris",
      e: s.e,
      sel: s.sel,
      present: hasard(jour, 60 + s.sel) < s.chance,
      pts: s.gy.flatMap((gy) => s.gx.map((gx) => ecranXY([gx, gy]))),
    }),
  );
  const dragon: Station[] =
    mythique &&
    montres.includes("dragon_lair") &&
    cellsVisibles({ coin: CASE_DRAGON, emprise: [1, 1] }, visible)
      ? [
          {
            id: "dragon",
            espece: "dragon",
            e: { coin: CASE_DRAGON, emprise: [1, 1] },
            sel: 3,
            present: true,
            pts: [ecranXY([CASE_DRAGON[0] + 0.5, CASE_DRAGON[1] + 0.5])],
          },
        ]
      : [];
  return [...souris, ...dragon];
}
