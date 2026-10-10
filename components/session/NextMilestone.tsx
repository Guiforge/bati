import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, YStack } from "tamagui";
import { SectionLabel } from "@/components/common/SectionLabel";
import { buildingMilestoneLine } from "@/components/village/milestoneLine";
import { getRecentFeeds } from "@/db/milestoneFeed";
import { getVillageBuildings, pickNextToRise } from "@/db/village";
import { reportError } from "@/src/reportError";
import type { AppLanguage } from "@/stores/settings";

/**
 * When the building "Next to rise" names next rises, said under the feeling question: the village
 * card and this line read the same building. Read once the session is saved (the estimate counts
 * it), so nothing is said before; and nothing at all without an estimate.
 */
export function NextMilestone({ saved, language }: { saved: boolean; language: AppLanguage }) {
  const { t } = useTranslation();
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    if (!saved) return;
    let cancelled = false;
    Promise.all([getVillageBuildings(), getRecentFeeds()])
      .then(([buildings, feeds]) => {
        const next = pickNextToRise(buildings);
        if (!cancelled && next) setLine(buildingMilestoneLine(next, feeds, t, language, true));
      })
      .catch((e) => reportError("victory.next", e));
    return () => {
      cancelled = true;
    };
  }, [saved, t, language]);

  if (line === null) return null;
  return (
    <YStack testID="victory-next" width="100%" maxW={520} gap={6} px="$1">
      <SectionLabel>{t("session.next_title")}</SectionLabel>
      <Text fontSize={14} lineHeight={20} color="$text">
        {line}
      </Text>
    </YStack>
  );
}
