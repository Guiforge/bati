// The dev screen's "grow" button (app/dev-iso.tsx): a `grown` route string that shows a real stage
// change on one of the hero's built buildings. The string is the real one (formatGrown's
// `code:old:new`) plus a replay suffix: parseGrown ignores a fourth part, so the ranks shown do
// not move from one press to the next while the string, hence the play, is new.

import { buildingStage } from "@/constants/buildingLevels";
import type { BuildingCode } from "@/db/schema";
import { stadeReel } from "./carteDemo";
import { batiments } from "./isoSpec";

const stadeAu = (code: BuildingCode, niveau: number) => stadeReel(code, buildingStage(niveau));

/**
 * A building whose real stage is not its first, with the highest earlier level that had a lower
 * stage; none such falls back to the first built building rising from level 0 (a fade from
 * nothing). Null when nothing is built.
 */
export function croissanceDemo(
  buildings: readonly { code: BuildingCode; level: number }[],
  rejeu: number,
): string | null {
  const construits = buildings.filter((b) => b.level > 0);
  for (const { code, level } of construits) {
    if (stadeAu(code, level) === batiments[code].stades[0]) continue;
    for (let ancien = level - 1; ancien >= 1; ancien--)
      if (stadeAu(code, ancien) !== stadeAu(code, level))
        return `${code}:${ancien}:${level}:${rejeu}`;
  }
  const premier = construits[0];
  return premier ? `${premier.code}:0:${premier.level}:${rejeu}` : null;
}
