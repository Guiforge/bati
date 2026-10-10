import { useTranslation } from "react-i18next";
import type { Crest } from "@/db/crest";
import type { Animal } from "@/db/crestRules";
import { dayKey } from "@/db/dates";
import { PRACTICE_KEY, sentence } from "./crestText";

type Line = Pick<Crest, "animal" | "second" | "quarters" | "stage" | "manual">;

/** Whether the reveal happened on the hero's own calendar day: local time, never UTC. */
export const revealedToday = (revealedAt: Date, now: Date): boolean =>
  dayKey(revealedAt) === dayKey(now);

/**
 * The line under the title: whole sentences, one per shape, so no language agrees a part with a
 * whole. A stage is said only when it is "venerable" (the mockups' state C), and "from today"
 * only on the day the 8th session revealed the crest. No crest yet: the glow's sentence.
 */
export function useCrestLine(
  crest: Line | null,
  villageName: string,
  revealedToday: boolean,
): string {
  const { t } = useTranslation();
  const place = villageName || t("village.crest_place");
  if (crest === null) return t("village.crest_line_glow", { place });

  const name = (a: Animal, venerable: boolean) =>
    t(venerable ? `village.crest_${a}_venerable` : `village.crest_${a}`);
  const first = sentence(name(crest.animal, crest.stage === "venerable"));
  // A hand-picked animal is not what the 8th session revealed: "from today" would date the wrong thing.
  const suffix = revealedToday && !crest.manual ? "_t" : "";
  if (crest.animal === "boar" && crest.quarters) {
    const [a, b] = crest.quarters;
    if (a !== b) {
      return t(`village.crest_line_boar${suffix}`, {
        animal: first,
        first: t(PRACTICE_KEY[a]),
        second: t(PRACTICE_KEY[b]),
        place,
      });
    }
  }
  if (crest.second) {
    return t(`village.crest_line_pair${suffix}`, {
      first,
      second: name(crest.second.animal, crest.second.stage === "venerable"),
      place,
    });
  }
  return t(`village.crest_line_one${suffix}`, { animal: first, place });
}
