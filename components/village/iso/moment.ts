// The moment a building grows, "Contre-jour" (LIFE U5 stage, U6 rank), pure. Time 0 is the player's
// tap; the film Guillaume chose (scripts/life/u3_films.py `jour_stade`, `jour_rang`) is the timing.
// A large light rises behind the body, the old stage and its scaffold go to ink, the new silhouette
// pops with a small overshoot, dark dust rises at the footprint corners, the lights come on in the
// still-black mass, then the colour returns, the light falls and the dust clears. A rank inside a
// stage: the new piece comes out in ink with a small light behind it and its colour returns; the
// body does not move. One clock (ms from the tap) drives every pose; a skip is that clock at the end.

import type { BuildingCode } from "@/db/schema";
import { emplacements } from "./isoLayout";

export type GenreMoment = "stade" | "rang";

/** How long each moment lasts from the tap, ms. */
export const STADE_MS = 1000;
export const RANG_MS = 450;
export const dureeMoment = (genre: GenreMoment): number => (genre === "stade" ? STADE_MS : RANG_MS);

/** The map holds the finished building this long after the moment, before the view goes back, ms. */
export const TENUE_MS = 1000;

/** The old stage gives way to the new one here, ms (stade). */
export const ECHANGE_MS = 200;
/** The lights come on here, ms (stade). */
export const LUMIERES_MS = 450;

/** The ink of the silhouette: rawColors.isoInk (#0F1518), applied by tintColor. */

const rampe = (t: number, a: number, b: number): number => {
  "worklet";
  return Math.min(1, Math.max(0, (t - a) / (b - a)));
};

export type PoseMoment = {
  /** The light behind the body: opacity 0..1 and its size as a share of full. */
  lueur: number;
  lueurEchelle: number;
  /** The ink over the colour (0 colour, 1 flat ink): shared by every part of the stage that shows. */
  encre: number;
  /** The old stage and its scaffold stand (stade). */
  ancien: boolean;
  /** The new stage's scale, 0 while it is not there yet. For a rank: the piece's scale. */
  nouveau: number;
  /** The lit windows, 0..1. */
  lumieres: number;
  /** The dust's opacity 0..1 and its swelling (1 at full, up to 1.25 as it clears). */
  poussiere: number;
  poussiereEchelle: number;
};

/** The pose at `t` ms from the tap; at or after the end it is the final state: nothing of the effect left. */
export function poseMoment(genre: GenreMoment, t: number): PoseMoment {
  "worklet";
  if (genre === "rang") {
    const fin = t >= RANG_MS;
    return {
      lueur: fin ? 0 : rampe(t, 0, 100) * (1 - rampe(t, 300, 450)),
      lueurEchelle: 1,
      encre: t < 300 ? 1 : 1 - rampe(t, 300, 450),
      ancien: false,
      nouveau: t < 100 ? 0 : t < 200 ? 1.1 * rampe(t, 100, 200) : 1.1 - 0.1 * rampe(t, 200, 300),
      lumieres: 1,
      poussiere: 0,
      poussiereEchelle: 1,
    };
  }
  if (t >= STADE_MS) {
    return {
      lueur: 0,
      lueurEchelle: 1,
      encre: 0,
      ancien: false,
      nouveau: 1,
      lumieres: 1,
      poussiere: 0,
      poussiereEchelle: 1.25,
    };
  }
  const g = rampe(t, 0, 100) - rampe(t, 500, 760);
  const poussiere = t < ECHANGE_MS ? 0 : t < 760 ? 1 : 1 - rampe(t, 760, 1000);
  return {
    lueur: g,
    lueurEchelle: 0.6 + 0.4 * rampe(t, 0, 200),
    encre: g,
    ancien: t < ECHANGE_MS,
    nouveau:
      t < ECHANGE_MS
        ? 0
        : t < 340
          ? 0.88 + 0.18 * rampe(t, 200, 340)
          : 1.06 - 0.06 * rampe(t, 340, 420),
    lumieres: rampe(t, LUMIERES_MS, 530),
    poussiere,
    poussiereEchelle: 1 + 0.25 * (1 - poussiere),
  };
}

/**
 * The clock's value when the layer mounts or is told to skip: the tap restarts at 0, a skip or
 * reduced motion lands on the end at once (no light, no dust, lights on).
 */
export function tempsMoment(
  genre: GenreMoment,
  { saute, reduit }: { saute: boolean; reduit: boolean },
): number {
  return saute || reduit ? dureeMoment(genre) : 0;
}

/** Which moment a growth plays: a stage change (or a building that was not there), else a rank. */
export const genreDeCroissance = (ancien: string | null, nouveau: string): GenreMoment =>
  ancien === null || ancien !== nouveau ? "stade" : "rang";

/** `coinsEmprise` (revelation.ts) lists back, right, front, left: the three visible ones (left, front, right) get a puff. */
export const COINS_BOUFFEES = [3, 2, 1] as const;

/** The scaffold of a footprint: the 1x1 or the 2x2, drawn larger by this factor for a plot beyond 2 cells. */
export function echelleEchafaudage(code: BuildingCode): number {
  const [w, h] = emplacements[code].emprise;
  // shortcut: a 3x3 plot wears the 2x2 scaled up, a painter may supply echafaudage_3x3 (with its json).
  return Math.max(w, h) > 2 ? Math.max(w, h) / 2 : 1;
}
