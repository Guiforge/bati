// Which buildings wait for a tap to rise (PROMPT.md §6, "every rank is a gift"), pure.
// Today the app marks a rise by STAGE: db/village.ts `claimable` compares `stageRank` (rough, solid,
// grand) of the derived level and of the claimed one. The claimed key stores a RANK per building
// (`ClaimedStages`, written by `claimStage` at the building's level), so marking every rank needs no
// new data: only this predicate changes. An upgrade whose look follows its base (rule B) has its own
// marker, from the base rank claimed beside it (`claimableBases`). All of it is behind
// `MONTEE_PAR_RANG`, which rides with the engine flag: off in every published build.

import { BATIMENT_MOTEUR } from "@/constants/isoPoc";
import type { BuildingCode } from "@/db/schema";
import {
  type ClaimedBases,
  type ClaimedStages,
  claimable,
  claimableBases,
  drawnLevel,
  type VillageBuilding,
} from "@/db/village";

export const MONTEE_PAR_RANG: boolean = BATIMENT_MOTEUR;

type Niveaux = readonly Pick<VillageBuilding, "code" | "level">[];

/** Built buildings whose rank is above the claimed one: a rank inside a stage waits for a tap too. */
export function claimableParRang(buildings: Niveaux, claimed: ClaimedStages): BuildingCode[] {
  return buildings
    .filter((b) => b.level > 0 && b.level > drawnLevel(b, claimed))
    .map((b) => b.code);
}

/**
 * The pending list the map uses: today's by stage, or by rank once the flag is on, plus the
 * upgrades whose base rank changed their look. `bases` is only read with the flag on.
 */
export function enAttente(
  buildings: Niveaux,
  claimed: ClaimedStages,
  parRang: boolean = MONTEE_PAR_RANG,
  bases: ClaimedBases = {},
): BuildingCode[] {
  if (!parRang) return claimable(buildings, claimed);
  const codes = new Set([
    ...claimableParRang(buildings, claimed),
    ...claimableBases(buildings, claimed, bases),
  ]);
  return buildings.map((b) => b.code).filter((c) => codes.has(c));
}

/**
 * What the visit's automatic claim writes (VI-29). Flag off: a building that was ready before the
 * session evolves by itself, and a code the key does not know is written at its pre-session level.
 * Flag on: nothing evolves by itself ("nothing changes without a tap"); only the unknown codes are
 * primed, so switching the flag on changes nothing on screen.
 * shortcut: the flag-on behaviour is Guillaume's call to confirm.
 */
export function amorce(
  previous: Niveaux,
  claimed: ClaimedStages,
  {
    avant,
    session,
    parRang = MONTEE_PAR_RANG,
  }: { avant: ReadonlySet<BuildingCode>; session: boolean; parRang?: boolean },
) {
  const vide = Object.keys(claimed).length === 0;
  const pret = new Set(session && !parRang ? claimable(previous, claimed) : []);
  return previous.filter(
    (b) =>
      pret.has(b.code) ||
      (b.level > 0 && claimed[b.code] === undefined && (vide || avant.has(b.code))),
  );
}
