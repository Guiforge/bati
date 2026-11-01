// The drawn fire of the map (L5-T03): where a hearth's flame and a chimney's smoke stand on a
// stage (the attach-point index, constants/isoAccroches.json, generated from the blockouts'
// .anchor.json by iso-accroches.test.ts) and how they move on the ambient clock (horloge.ts).
// Pure: FeuxDessines.tsx draws. Every gesture here ends on a cycle boundary at its rest pose, so a map
// that stands still (unfocused, reduced motion, between waves) shows a lit flame and a few puffs.

import raw from "@/constants/isoAccroches.json";
import spec from "@/constants/isoSpec.json";
import type { BuildingCode } from "@/db/schema";
import { CYCLE_MS } from "./horloge";
import type { PointsAccroche, Stade } from "./isoSpec";
import { graine } from "./veilleuses";

type PointSprite = readonly [x: number, y: number];

/** What the app reads of one stage's `pointsAccroche`, in sprite px (origin at the sprite's top left). */
export type AccrochesStade = {
  /** The canvas the points are in: the sprite's `size` (checked against it). */
  size: readonly [w: number, h: number];
  /** Flame base: the hearth's top-face middle, its half-width, its height above the ground (grid units). */
  foyer: { px: PointSprite; z: number; demiLargeur: number } | null;
  /** The chimney's top, where the smoke starts. */
  cheminee: PointSprite | null;
  fenetres: readonly {
    px: PointSprite;
    largeur: number;
    hauteur: number;
    face: "gauche" | "droite";
  }[];
  porte: PointSprite | null;
};

const sansMur: Readonly<Record<string, readonly number[] | string>> = spec.fenetresSansMur;
/** The index, less the windows the painting has no wall for (isoSpec.json `fenetresSansMur`). */
const STADES: Readonly<Record<string, AccrochesStade>> = Object.fromEntries(
  Object.entries(raw.stades as unknown as Readonly<Record<string, AccrochesStade>>).map(
    ([cle, a]) => {
      const exclues = sansMur[cle];
      return [
        cle,
        Array.isArray(exclues)
          ? { ...a, fenetres: a.fenetres.filter((_, i) => !exclues.includes(i)) }
          : a,
      ];
    },
  ),
);

/** The attach points of a stage, `undefined` when it has none (the sails, a plain hut). */
export const accrochesDe = (code: BuildingCode, stade: Stade): AccrochesStade | undefined =>
  STADES[`${code}_${stade}`];

/** One stage's index entry from its export, the shape the index is generated in (and its test checks). */
export function entreeIndex(p: PointsAccroche, size: readonly [number, number]): AccrochesStade {
  return {
    size,
    foyer: p.foyer
      ? { px: p.foyer.px, z: p.foyer.grid[2], demiLargeur: p.foyer.demiLargeur }
      : null,
    cheminee: p.px.cheminee,
    fenetres: p.fenetres.map(({ px, largeur, hauteur, face }) => ({ px, largeur, hauteur, face })),
    porte: p.px.porte,
  };
}

/** Sprite px of a height of one grid unit on the screen: S * sqrt(6) / 4 (pxPerUnit * cos 30 deg). */
export const PX_PAR_HAUTEUR = (spec.S * Math.sqrt(6)) / 4;

/** Flame units: a flame is drawn in a box 100 wide, FLAMME_H tall, its base at the bottom. */
export const FLAMME_H = 170;
/** The flame's height in sprite px per half-width of its hearth (about 0.7 of the hearth's height). */
const HAUTEUR_PAR_DEMI = 1.6;
/** The shortest flame in dp, so a small brazier still reads at the framing. */
export const FLAMME_MIN_DP = 12;
/** Share of the flame's height the base sinks into the hearth. */
const ENFONCE = 0.02;

/** A smoke puff's width in dp, and how far it climbs. E5 (anim-13, T4-07): thicker, readable at the opening framing. */
export const FUMEE_LARGEUR = 36;
/** A puff of smoke (and of a site's dust, Chantier.tsx): a cloud of three lobes in a 100 x 64 box. */
export const VOLUTE =
  "M22 60C4 60 2 38 20 34C18 14 44 6 54 22C66 10 92 20 86 40C100 46 94 62 78 60Z";
export const FUMEE_MONTEE = 46;
const FUMEE_DERIVE = 8;
/** Share of a cycle one puff climbs (AUDIT-DA 6: the climbs end inside the cycle, so at rest none shows). */
const FUMEE_DUREE = 0.7;
// AUDIT-DA 12: near-opaque, so a puff reads as inked smoke, not a grey cloud on the ground.
export const FUMEE_OPACITE = 0.9;

/** The flame's height in dp: it follows its hearth, with a floor. */
export const hauteurFlamme = (demiLargeur: number, k: number): number =>
  Math.max(FLAMME_MIN_DP, demiLargeur * HAUTEUR_PAR_DEMI * k);

/**
 * The Svg of a hearth in dp: flame and ground glow in one box, drawn in flame units (viewBox
 * `50 - rx, 0, 2 rx, hu`). The glow is a hearth wide (3 half-widths each side, at least the flame's
 * height); `sol` is its centre in units, `origine` the flame's base in dp from the box top (the
 * scale pivots there).
 */
export function geometrieFlamme(
  foyer: NonNullable<AccrochesStade["foyer"]>,
  k: number,
): {
  left: number;
  top: number;
  w: number;
  h: number;
  hu: number;
  rx: number;
  sol: number;
  origine: number;
} {
  const unite = hauteurFlamme(foyer.demiLargeur, k) / FLAMME_H;
  const base = FLAMME_H * (1 - ENFONCE);
  const rx = Math.max(3 * foyer.demiLargeur * k, FLAMME_H * unite) / unite;
  const sol = base + (foyer.z * PX_PAR_HAUTEUR * k) / unite;
  const hu = sol + rx / 2;
  return {
    left: foyer.px[0] * k - rx * unite,
    top: foyer.px[1] * k - base * unite,
    w: 2 * rx * unite,
    h: hu * unite,
    hu,
    rx,
    sol,
    origine: base * unite,
  };
}

/**
 * Where a stage's smoke starts, in sprite px: its chimney, else above the flame of a campfire (the
 * other open hearths, the arena's braziers and the lair's, do not smoke). `k` is dp per sprite px.
 */
export function sourceFumee(a: AccrochesStade, code: BuildingCode, k: number): PointSprite | null {
  if (a.cheminee) return a.cheminee;
  if (!a.foyer || code !== "campfire") return null;
  const [x, y] = a.foyer.px;
  return [x, y - hauteurFlamme(a.foyer.demiLargeur, k) / k];
}

/** A small stable number per building, so two fires do not breathe in step. */
export function variante(code: string): number {
  let s = 0;
  for (const ch of code) s += ch.charCodeAt(0);
  return s % 3;
}

/** Whole beats per cycle of the flame's two height sines and of its light (plus `n`, or `2 n` for `vif`). */
const BATTEMENTS_FLAMME = { haut: 6, vif: 9, lueur: 4 } as const;

/** The flame's rest pose, also what a map without a clock shows. */
export const FLAMME_REPOS = { echelle: 1, opacite: 1 } as const;

/**
 * The flame at clock `c`: its height breathes (two sines, BATTEMENTS_FLAMME beats a cycle, so
 * about 1.2 and 1.8 a second: a night fire sways, T27 slowed it from 4 and 6.2) and its light dips
 * a little, slower still. `n` (0 to 2) shifts the beats. Both are 1 at every cycle boundary.
 */
export function flamme(c: number, n: number): { echelle: number; opacite: number } {
  "worklet";
  const u = (c % CYCLE_MS) / CYCLE_MS;
  const t = 2 * Math.PI * u;
  return {
    echelle:
      1 +
      0.08 * Math.sin(t * (BATTEMENTS_FLAMME.haut + n)) +
      0.04 * Math.sin(t * (BATTEMENTS_FLAMME.vif + 2 * n)),
    opacite: 0.9 + 0.1 * Math.cos(t * (BATTEMENTS_FLAMME.lueur + n)),
  };
}

/** The kinds of smoke: thin and straight, round and slow, curling leaning volutes. */
export type SorteFumee = "fine" | "ronde" | "volute";
export const SORTES_FUMEE: readonly SorteFumee[] = ["ronde", "fine", "volute"];

/**
 * How a kind moves: `duree` the share of a sub-cycle one climb lasts, `montee` and `derive` in dp
 * (`penche` curves the drift: a volute leans more as it climbs), `gonfle` the scale at the start
 * and the end. `fois` (below) is a whole divisor of the cycle, so a map at rest on a boundary shows
 * no smoke, whatever the kind.
 */
export const MOUVEMENT_FUMEE: Readonly<
  Record<
    SorteFumee,
    {
      duree: number;
      montee: number;
      derive: number;
      penche: number;
      gonfle: readonly [number, number];
    }
  >
> = {
  ronde: {
    duree: FUMEE_DUREE,
    montee: FUMEE_MONTEE,
    derive: FUMEE_DERIVE,
    penche: 0,
    gonfle: [0.7, 1.6],
  },
  fine: { duree: 0.5, montee: 50, derive: 2, penche: 0, gonfle: [0.9, 1.2] },
  volute: { duree: 0.6, montee: 46, derive: 4, penche: 16, gonfle: [0.8, 1.5] },
};

// shortcut: a puff's period is the 5 s cycle (rest on every boundary needs a divisor of CYCLE_MS),
// so the pattern comes back every 5 s; move to a longer ambient clock if a
// player sees the repetition.
/**
 * One smoke puff at clock `c`: `phase` is when in its sub-cycle (share of it) the climb starts, and
 * it ends `duree` later, before the boundary; `fois` sub-cycles make a cycle. It rises, drifts to
 * the wind, swells and fades in and out. At every cycle boundary (the rest pose) its opacity is 0:
 * smoke only shows in a wave.
 */
export function fumee(
  c: number,
  phase: number,
  sorte: SorteFumee = "ronde",
  fois = 1,
  force = 1,
): { y: number; x: number; echelle: number; opacite: number } {
  "worklet";
  // The motion table is read inline: a worklet captures only what it names, and it is a constant.
  const m = MOUVEMENT_FUMEE[sorte];
  const u = ((c % CYCLE_MS) / CYCLE_MS) * fois;
  const v = Math.min(1, Math.max(0, (u - Math.floor(u) - phase) / m.duree));
  return {
    y: -v * m.montee,
    x: v * m.derive + v * v * m.penche,
    echelle: m.gonfle[0] + (m.gonfle[1] - m.gonfle[0]) * v,
    // An early crest, strongest right above the chimney (H2-06), then thinning as it climbs; 1.8 brings the peak back near FUMEE_OPACITE.
    opacite: FUMEE_OPACITE * force * 1.8 * Math.sin(Math.PI * v) ** 2 * (1 - v),
  };
}

/** The buildings that smoke, in a fixed order: a chimney on some stage, or the campfire's own flame. */
const FUMEURS: readonly string[] = [
  ...new Set(
    Object.keys(STADES)
      .filter((cle) => STADES[cle]?.cheminee || cle.startsWith("campfire_"))
      .map((cle) => cle.replace(/_(rough|solid|grand)$/, "")),
  ),
].sort();

/** `force` scales the opacity: the first puff of a plume is full, the second a pale trail. */
export type Fumee = { sorte: SorteFumee; fois: number; phase: number; force: number };

// E5: the trail stays under the full puff's peak (iso-accroches) but no longer fades into the roofs.
const FORCE_PALE = 0.6;

const tirage = (cle: string) => (graine(`${graine(cle)}#${cle}`) * 0.6180339887) % 1;

/** Where in the cycle (share of it) a puff peaks. */
export const sommet = ({ phase, sorte, fois }: Fumee): number =>
  (phase + MOUVEMENT_FUMEE[sorte].duree / 2) / fois;

/** The distance of two shares of the cycle, on the loop. */
const ecart = (a: number, b: number) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b));

/** The wait that fits a kind's climb inside the cycle, off its ends, for a share `u` of the room. */
const attente = (sorte: SorteFumee, u: number) =>
  0.02 + (1 - MOUVEMENT_FUMEE[sorte].duree - 0.04) * u;

/**
 * The two puffs of a chimney. The seed says the kind of the first (the second is the next kind, so
 * the two never move alike); every puff climbs once a cycle, over 2.5 to 3.5 s. The first one's
 * wait goes where its peak lies farthest from the peaks of the full puffs already placed in the
 * village (FUMEURS, in order); the second is a pale trail whose peak comes half a cycle after.
 */
function tire(code: string, libres: readonly number[]): readonly [Fumee, Fumee] {
  const i = Math.floor(tirage(`${code}:sorte`) * SORTES_FUMEE.length);
  const sorte = SORTES_FUMEE[i] ?? "ronde";
  const suite = SORTES_FUMEE[(i + 1) % SORTES_FUMEE.length] ?? "fine";
  let meilleur = { phase: 0.02, d: -1 };
  for (let k = 0; k < 24; k++) {
    const phase = attente(sorte, (k + 0.5) / 24);
    const d = Math.min(
      ...libres.map((y) => ecart(sommet({ sorte, fois: 1, phase, force: 1 }), y)),
      1,
    );
    if (d > meilleur.d) meilleur = { phase, d };
  }
  const a: Fumee = { sorte, fois: 1, phase: meilleur.phase, force: 1 };
  const m = MOUVEMENT_FUMEE[suite];
  // Half a cycle after the first, kept inside the cycle.
  const phase = Math.min(Math.max(0.02, ((sommet(a) + 0.5) % 1) - m.duree / 2), 0.96 - m.duree);
  return [a, { sorte: suite, fois: 1, phase, force: FORCE_PALE }];
}

/** The two puffs of every chimney of the village, placed one after the other: no two full puffs peak together. */
const PLUMES: ReadonlyMap<string, readonly [Fumee, Fumee]> = (() => {
  const placees: number[] = [];
  const m = new Map<string, readonly [Fumee, Fumee]>();
  for (const code of FUMEURS) {
    const p = tire(code, placees);
    placees.push(sommet(p[0]));
    m.set(code, p);
  }
  return m;
})();

/** The two puffs of a chimney (a code that does not smoke gets its own, placed alone). */
export const plume = (code: string): readonly [Fumee, Fumee] => PLUMES.get(code) ?? tire(code, []);
