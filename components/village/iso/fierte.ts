// A building's pride (T03, L6-T12, DECISIONS 30/10 "être fier de son village"), pure: on its last
// stage a building flies a banner the app draws (cloth, gold trim, a gold finial) from the top of
// its painting and its windows glow warm all night; at its highest rank the finial carries a small
// glint, which twinkles during a wave on at most ECLATS_ANIMES buildings (one node each) and is a
// still drawing otherwise. Fierte.tsx draws. The top is read from the sprite's tap mask, the
// painting itself, so a banner never floats above a tall empty canvas.

import { ANIMAL_TOKEN } from "@/constants/animalColors";
import { buildingCeiling } from "@/constants/buildingLevels";
import { rawColors } from "@/constants/rawColors";
import { ANIMAL_OF } from "@/db/crestRules";
import type { BuildingCode } from "@/db/schema";
import type { CrestShape } from "../Crest";
import { COTE, type Rect } from "./carteDemo";
import { graine } from "./graine";
import { batiments, type SpriteIso, type Stade } from "./isoSpec";
import type { Masque } from "./tapBatiment";

/** Buildings that wear no banner on their last stage: an open fire, a road. */
export const SANS_BANNIERE: ReadonlySet<BuildingCode> = new Set(["campfire", "high_road"]);

/** Glints that twinkle in one wave (one animated node each); the others stay still drawings. */
export const ECLATS_ANIMES = 2;

/** The banner's box in dp: a pole from the roof's top, its cloth flying to the right. */
export const BANNIERE_L = COTE * 0.5;
export const BANNIERE_H = COTE * 0.56;
/** The pole's foot in the box's 100 x 112 units (x, y), and how far it sinks into the roof, dp. */
const PIED: readonly [number, number] = [12, 112];
const ENFONCE_DP = 3;

/** Whether `stade` is the last one the building has (its painting tops out there). */
export const dernierStade = (code: BuildingCode, stade: Stade): boolean =>
  batiments[code].stades.at(-1) === stade;

/** Whether the building flies a banner at this stage. */
export const avecBanniere = (code: BuildingCode, stade: Stade): boolean =>
  dernierStade(code, stade) && !SANS_BANNIERE.has(code);

/** Banners on one map at most (Guillaume, 30/10: a flag on every building is too many). */
export const BANNIERES_MAX = 3;
/** Who flies one first when more than BANNIERES_MAX are legendary; then the order of isoSpec. */
const PRIORITE: readonly BuildingCode[] = ["heroes_hall", "castle_wall"];

/**
 * The buildings that fly a banner: the legendary ones on their last stage, BANNIERES_MAX at most,
 * by importance. The other last stages keep their lit windows and no pole.
 */
export function bannieres(
  legendaires: Iterable<BuildingCode>,
  stade: (code: BuildingCode) => Stade,
): ReadonlySet<BuildingCode> {
  const rang = (c: BuildingCode) => {
    const i = PRIORITE.indexOf(c);
    return i >= 0 ? i : PRIORITE.length + Object.keys(batiments).indexOf(c);
  };
  return new Set(
    [...legendaires]
      .filter((code) => avecBanniere(code, stade(code)))
      .sort((a, b) => rang(a) - rang(b))
      .slice(0, BANNIERES_MAX),
  );
}

/** Whether a building at `niveau` has reached its highest rank (buildingLevels.ts `buildingCeiling`). */
export const legendaire = (code: BuildingCode, niveau: number): boolean =>
  niveau > 0 && niveau >= buildingCeiling({ tier: batiments[code].tier, code });

/** The widest run of opaque cells of row `r`, [first, end) in cells; null for an empty row. */
function plusLargeSuite(m: Masque, r: number): readonly [number, number] | null {
  const parLigne = Math.ceil(m.w / 4);
  const plein = (c: number) =>
    c < m.w &&
    ((Number.parseInt(m.bits.charAt(r * parLigne + (c >> 2)), 16) >> (3 - (c & 3))) & 1) === 1;
  let best: [number, number] | null = null;
  let debut = -1;
  for (let c = 0; c <= m.w; c++) {
    if (plein(c)) {
      if (debut < 0) debut = c;
    } else if (debut >= 0) {
      if (!best || c - debut > best[1] - best[0]) best = [debut, c];
      debut = -1;
    }
  }
  return best;
}

/**
 * The top of the painting in sprite px: the middle of the widest opaque run of the highest row of
 * the mask that has any (two posts at the same height, F2's campfire, have no top between them),
 * one cell down so a pole stands in the roof. Null for an empty mask.
 */
export function sommet(m: Masque): readonly [x: number, y: number] | null {
  for (let r = 0; r < m.h; r++) {
    const s = plusLargeSuite(m, r);
    if (s) return [((s[0] + s[1]) / 2) * m.pas, (r + 1) * m.pas];
  }
  return null;
}

/** The top of a building's painting on the map, in dp, or null when its sprite has no mask. */
export function sommetDp(s: SpriteIso, corps: Rect): readonly [x: number, y: number] | null {
  const p = s.masque ? sommet(s.masque) : null;
  if (!p) return null;
  const k = corps.w / s.size[0];
  return [corps.x + p[0] * k, corps.y + p[1] * k];
}

/** The banner's box on the map, its pole's foot planted at the painting's top. */
export function boiteBanniere(haut: readonly [number, number]): Rect {
  return {
    x: haut[0] - (PIED[0] / 100) * BANNIERE_L,
    y: haut[1] + ENFONCE_DP - BANNIERE_H,
    w: BANNIERE_L,
    h: BANNIERE_H,
  };
}

/** The highest point a stage draws (its banner's finial, else its painting's top), dp: where the hammer sits. */
export function hautDessine(
  code: BuildingCode,
  stade: Stade,
  s: SpriteIso,
  corps: Rect,
): readonly [x: number, y: number] | null {
  const haut = sommetDp(s, corps);
  if (!haut || !avecBanniere(code, stade)) return haut;
  return [haut[0], boiteBanniere(haut).y];
}

const MARTEAU_MIN = 22;
const MARTEAU_PART_DU_CORPS = 0.18;

/** The hammer's box above a ready building, dp: Reclame draws it there and tapBatiment makes it a target. */
export function boiteMarteau(code: BuildingCode, stade: Stade, s: SpriteIso, corps: Rect): Rect {
  const d = Math.max(MARTEAU_MIN, corps.w * MARTEAU_PART_DU_CORPS);
  const haut = hautDessine(code, stade, s, corps);
  // Centred on the top of the painting, not above its canvas (T02b-qa).
  return {
    x: (haut ? haut[0] : corps.x + corps.w / 2) - d / 2,
    y: haut ? haut[1] - d / 2 : corps.y - d * 0.4,
    w: d,
    h: d,
  };
}

/** The legendary buildings whose glint twinkles in a wave: the first ECLATS_ANIMES that fly a banner. */
export function eclatsAnimes(
  legendaires: Iterable<BuildingCode>,
  stade: (code: BuildingCode) => Stade,
): ReadonlySet<BuildingCode> {
  return new Set(
    [...legendaires].filter((code) => avecBanniere(code, stade(code))).slice(0, ECLATS_ANIMES),
  );
}

/**
 * The colour a last-stage banner takes from the crest: the animal's fill, the boar's first quarter,
 * null before the crest exists (the banner keeps its own cloth). Only the colour: at a banner's size
 * (about 27 dp) an animal glyph is a smudge.
 */
export function tissuBlason(crest: CrestShape | null): string | null {
  if (!crest) return null;
  if (crest.animal === "boar")
    return rawColors[ANIMAL_TOKEN[crest.quarters ? ANIMAL_OF[crest.quarters[0]] : "bear"]];
  return rawColors[ANIMAL_TOKEN[crest.animal]];
}

/** Half-turns of a banner's slow sway per 5 s cycle (1 to 3 by building, so two never move in step), and its reach in radians. */
const BALANCE_MAX = 0.07;
export const balancement = (code: string): number => 1 + (graine(code) % 3);

/**
 * A banner's tilt about its pole's foot at clock `c`: two sines of whole beats per cycle, so it is
 * 0 at every cycle boundary (the rest pose) and never in step with another building's.
 */
export function inclinaisonBanniere(c: number, battements: number): number {
  "worklet";
  const t = 2 * Math.PI * ((c % 5000) / 5000);
  return BALANCE_MAX * (0.7 * Math.sin(t * battements) + 0.3 * Math.sin(t * (battements + 1)));
}
