import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { YStack } from "tamagui";
import { AppText } from "@/components/common/AppText";
import { SectionLabel } from "@/components/common/SectionLabel";
import { victoryMilestoneLine } from "@/components/village/milestoneLine";
import { getRecentFeeds, getSessionFed } from "@/db/milestoneFeed";
import { getVillageBuildings, pickNextToRise } from "@/db/village";
import { reportError } from "@/src/reportError";
import type { AppLanguage } from "@/stores/settings";

/**
 * When the building this session fed rises next, said under the feeling question (the Village's
 * "Next to rise" when it fed none with an estimate). Read once the session is saved (the estimate
 * counts it), so nothing is said before; and nothing at all without an estimate.
 */
export function NextMilestone({
  sessionId,
  language,
}: {
  /** Null until the save lands. */
  sessionId: number | null;
  language: AppLanguage;
}) {
  const { t } = useTranslation();
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId === null) return;
    let cancelled = false;
    Promise.all([getVillageBuildings(), getRecentFeeds(), getSessionFed(sessionId)])
      .then(([buildings, feeds, fed]) => {
        if (!cancelled)
          setLine(
            victoryMilestoneLine(
              buildings,
              feeds,
              fed,
              pickNextToRise(buildings, feeds),
              t,
              language,
            ),
          );
      })
      .catch((e) => reportError("victory.next", e));
    return () => {
      cancelled = true;
    };
  }, [sessionId, t, language]);

  if (line === null) return null;
  return (
    <YStack testID="victory-next" width="100%" maxW={520} gap={6} px="$1">
      <SectionLabel>{t("session.next_title")}</SectionLabel>
      <AppText fontSize={14} lineHeight={20} color="$text">
        {line}
      </AppText>
    </YStack>
  );
}
