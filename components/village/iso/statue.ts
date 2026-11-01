// The totem statue on the village square (T25), pure: the hero's animal in the material of its stage
// (wood, stone, bronze, gold) on its own painted plinth, which grows with the stage, on the square. Before the
// crest is revealed (`crest === null`) the plinth stands empty: no animal is invented. Statue.tsx
// draws; the caller poses it. The six paintings are the cropped sidecars of
// scripts/iso/recadrer_statues.py (the size below is theirs, a test holds it equal).

import { rawColors } from "@/constants/rawColors";
import type { Animal, CrestStage } from "@/db/crestRules";
import type { CrestShape } from "../Crest";
import { COTE, ecranXY, type Rect } from "./carteDemo";
import type { Case } from "./isoLayout";
import type { Emprise } from "./profondeur";

/** A painting's px to map dp: the 384 px cell edge of isoSpec.json `S` over a cell of 48 dp. */
export const DP_PAR_PX = COTE / 384;
/** The cropped paintings' size, px. Each carries its own plinth: the app draws none under it. */
export const IMAGE_PX = { w: 259, h: 279 } as const;
/** The ground point of the painted plinth in the image (centre of its base, measured), px. */
export const PIED_PX = { x: 130, y: 225 } as const;
/** The plinth grows with the stage: the whole painting is drawn this much larger. */
export const ECHELLES: Readonly<Record<CrestStage, number>> = {
  young: 1,
  adult: 1.1,
  venerable: 1.2,
  legendary: 1.3,
};
export const STADES: readonly CrestStage[] = ["young", "adult", "venerable", "legendary"];
/** The empty plinth, before the reveal (no painting yet): a low block, a diamond this wide, dp. */
export const VIDE_L = 24;
export const VIDE_H = 6;

/** The painting of each animal (assets/images/village/iso/pieces/statue_<name>). */
export const NOM_STATUE: Readonly<Record<Animal, string>> = {
  bear: "ours",
  ermine: "hermine",
  salmon: "saumon",
  stag: "cerf",
  horse: "cheval",
  boar: "sanglier",
};

/**
 * A stage's material: an opaque silhouette of `teinte` under the painting, which keeps `dessin` of its
 * opacity on top (its lines and shading read through the colour, and the base is fully covered).
 * Stone is the painting alone.
 */
export type Matiere = { teinte: string | null; dessin: number };
export const MATIERES: Readonly<Record<CrestStage, Matiere>> = {
  young: { teinte: rawColors.isoStatueBois, dessin: 0.5 },
  adult: { teinte: null, dessin: 1 },
  venerable: { teinte: rawColors.isoStatueBronze, dessin: 0.5 },
  legendary: { teinte: rawColors.resourceGold, dessin: 0.45 },
};

/** The crest the village passes down: its shape, and the stage the data holds (db/crest.ts). */
export type BlasonCrest = CrestShape & { stage?: CrestStage };

/** What the square shows for a crest: null crest, an empty plinth; else the animal at its stage. */
export type EtatStatue = { animal: Animal; stade: CrestStage } | null;
export const etatStatue = (crest: BlasonCrest | null): EtatStatue =>
  crest ? { animal: crest.animal, stade: crest.stage ?? "young" } : null;

/** The cell the statue stands on: the square's paving in front of the fire (rues.ts CASE_PLACE is [12, 11]), on the hall's screen axis, clear of the tent. */
export const CASE_STATUE: Case = [13, 12];
export const EMPRISE_STATUE: Emprise = { coin: CASE_STATUE, emprise: [1, 1] };

/** The plinth's foot on the map, dp: the middle of its cell. */
export function piedStatue(): readonly [number, number] {
  const [x, y] = ecranXY(CASE_STATUE);
  return [x, y + COTE / 4];
}

/** The painting's dp per px at a state's stage. */
export const echelleStatue = (e: NonNullable<EtatStatue>): number => DP_PAR_PX * ECHELLES[e.stade];

/**
 * The statue's box on the map, dp, its plinth's ground point on `pied`: the painting's own box, or
 * the empty block's (top vertex to bottom vertex, its foot a block's height above the bottom).
 */
export function boiteStatue(pied: readonly [number, number], e: EtatStatue): Rect {
  if (!e)
    return {
      x: pied[0] - VIDE_L / 2,
      y: pied[1] - VIDE_H - VIDE_L / 4,
      w: VIDE_L,
      h: VIDE_H + VIDE_L / 2,
    };
  const k = echelleStatue(e);
  return {
    x: pied[0] - PIED_PX.x * k,
    y: pied[1] - PIED_PX.y * k,
    w: IMAGE_PX.w * k,
    h: IMAGE_PX.h * k,
  };
}

/** Whether the statue shows: its cell is on the island. */
export const statueVisible = (visible: readonly (readonly boolean[])[]): boolean =>
  visible[CASE_STATUE[1]]?.[CASE_STATUE[0]] === true;

/** Whether a map point (dp) falls on the statue, when it shows. */
export function statueAuPoint(
  p: readonly [number, number],
  visible: readonly (readonly boolean[])[],
  e: EtatStatue,
): boolean {
  const b = boiteStatue(piedStatue(), e);
  return (
    statueVisible(visible) && p[0] >= b.x && p[0] <= b.x + b.w && p[1] >= b.y && p[1] <= b.y + b.h
  );
}

/**
 * A made-up crest for dev-iso (`?animal=<ours|...>&stade=<young|...>`), so qa can capture every
 * animal and stage; null when the animal is not one of the six.
 */
export function blasonFactice(
  animal: string | undefined,
  stade: string | undefined,
): BlasonCrest | null {
  const a = (Object.keys(NOM_STATUE) as Animal[]).find((k) => NOM_STATUE[k] === animal);
  if (!a) return null;
  return {
    animal: a,
    manual: false,
    quarters: null,
    longestFlame: 0,
    rings: 0,
    second: null,
    stage: STADES.find((x) => x === stade) ?? "young",
  };
}
