import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components/common/AppText";
import { Card } from "@/components/common/Card";
import { LightWeekNote } from "@/components/home/LightWeekNote";
import { shortDate } from "@/components/journal/journalFormat";
import { getActivePause } from "@/db/pause";
import { dayOf } from "@/db/reminders";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/**
 * What the hero set up for the weeks, said on Home: a pause that is running (with its end date,
 * opening the screen that ends it), else a light week that is. A pause outranks the week: the
 * offer is not made inside one (`lightWeekReason`). A week accepted before the pause keeps
 * running and still lightens quests; only Home stops saying so, and the quest screen's own note
 * still offers the way back.
 */
export function RhythmLine({ onLightWeekEnded }: { onLightWeekEnded?: () => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  // Null until the read lands: a loading line asserts nothing.
  const [pauseUntil, setPauseUntil] = useState<string | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getActivePause()
        .then((pause) => {
          if (!cancelled) setPauseUntil(pause ? pause.until : null);
        })
        .catch((error: unknown) => reportError("home.rhythmLine", error));
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (pauseUntil === undefined) return null;
  if (pauseUntil === null)
    return <LightWeekNote {...(onLightWeekEnded ? { onEnded: onLightWeekEnded } : {})} />;

  return (
    <Card
      testID="home-pause-line"
      mx="4"
      mt="3"
      py="2"
      accessibilityRole="button"
      onPress={() => router.push("/pause" as never)}
    >
      <AppText fontSize="3" color="primaryText">
        {t("home.pause_on", { date: shortDate(language, dayOf(pauseUntil)) })}
      </AppText>
    </Card>
  );
}
