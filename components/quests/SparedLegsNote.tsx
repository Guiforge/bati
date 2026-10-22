import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text } from "tamagui";
import type { Locomotion } from "@/db/schema";
import { getZone } from "@/db/zone";
import { reportError } from "@/src/reportError";

/**
 * The line a hero sparing their legs reads on a run: in the goal sheet, and on the run itself,
 * since a tile starts it in one tap and the sheet is optional. It blocks nothing and costs no tap:
 * a walk or a ride suits a return, a run is the one outing that does not.
 */
export function SparedLegsNote({ locomotion }: { locomotion: Locomotion | null }) {
  const { t } = useTranslation();
  const [sparing, setSparing] = useState(false);
  useEffect(() => {
    if (locomotion !== "run") return;
    getZone()
      .then((zone) => setSparing(zone?.groups.includes("legs") ?? false))
      .catch((e: unknown) => reportError("goalSheet.zone", e));
  }, [locomotion]);
  if (!sparing) return null;
  return (
    <Text testID="goal-zone-legs" fontSize={13} color="textSecondary">
      {t("quests.goal_zone_legs")}
    </Text>
  );
}
