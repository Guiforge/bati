import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { AppText } from "@/components/common/AppText";
import { Card } from "@/components/common/Card";
import { shortDate } from "@/components/journal/journalFormat";
import { endLightWeek, lightWeekUntil } from "@/db/lightWeek";
import { useHaptics } from "@/hooks/useHaptics";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/**
 * The accepted light week, said out loud (E-03): until when it runs, and the way back to the
 * normal rhythm. Without it a quest dropped a round with nothing on screen to say why. Nothing
 * when no week runs. `onEnded` lets a screen that priced its rounds off the week read them again.
 */
export function LightWeekNote({
  onEnded,
  onHome = true,
}: {
  onEnded?: () => void;
  onHome?: boolean;
}) {
  const { t } = useTranslation();
  const haptics = useHaptics();
  const language = useSettingsStore((s) => s.language);
  const [until, setUntil] = useState<Date | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      lightWeekUntil(new Date())
        .then((next) => {
          if (!cancelled) setUntil(next);
        })
        .catch((error: unknown) => reportError("lightWeek.note", error));
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (until === null) return null;

  const end = () => {
    haptics.selection();
    setUntil(null);
    endLightWeek(new Date())
      .then(() => onEnded?.())
      .catch((error: unknown) => reportError("lightWeek.end", error));
  };

  return (
    <Card testID="light-week-note" py="$2" {...(onHome ? { mx: "$4", mt: "$3" } : {})}>
      <YStack gap="$2">
        <AppText fontSize="$3" color="$primaryText">
          {t("home.light_week_on", { date: shortDate(language, until) })}
        </AppText>
        <XStack gap="$2" flexWrap="wrap">
          <AppButton
            testID="light-week-end"
            variant="outline"
            fullWidth={false}
            minH={40}
            onPress={end}
          >
            {t("home.light_week_end")}
          </AppButton>
        </XStack>
      </YStack>
    </Card>
  );
}
