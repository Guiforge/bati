import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { AppText } from "@/components/common/AppText";
import { Card } from "@/components/common/Card";
import {
  acceptLightWeek,
  type LightWeekReason,
  lightWeekReason,
  refuseLightWeek,
} from "@/db/lightWeek";
import { useHaptics } from "@/hooks/useHaptics";
import { reportError } from "@/src/reportError";

/**
 * The offer of a light week (E-03): one round fewer, same variations, and a no that is heard.
 * Either answer takes the card down at once; the writes are `db/lightWeek.ts`'s, the choice of who
 * gets the slot is `NoticeSlot`'s.
 */
export function LightWeekCard() {
  const { t } = useTranslation();
  const haptics = useHaptics();
  const [reason, setReason] = useState<LightWeekReason | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      lightWeekReason(new Date())
        .then((next) => {
          if (!cancelled) setReason(next);
        })
        .catch((error: unknown) => reportError("lightWeek.card", error));
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (reason === null) return null;

  const answer = (write: (now: Date) => Promise<void>) => {
    haptics.selection();
    setReason(null);
    write(new Date()).catch((error: unknown) => reportError("lightWeek.answer", error));
  };

  return (
    <Card testID="home-light-week" mx="$4" mt="$3" py="$2">
      <YStack gap="$2">
        <AppText fontSize="$3" color="$primaryText">
          {t(reason === "under" ? "home.light_week_under" : "home.light_week_busy")}
        </AppText>
        <XStack gap="$2" flexWrap="wrap">
          <AppButton
            testID="home-light-week-accept"
            fullWidth={false}
            minH={40}
            onPress={() => answer(acceptLightWeek)}
          >
            {t("home.light_week_accept")}
          </AppButton>
          <AppButton
            testID="home-light-week-refuse"
            variant="outline"
            fullWidth={false}
            minH={40}
            onPress={() => answer(refuseLightWeek)}
          >
            {t("home.light_week_refuse")}
          </AppButton>
        </XStack>
      </YStack>
    </Card>
  );
}
