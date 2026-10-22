import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pause } from "@/components/icons";
import { shortDate } from "@/components/journal/journalFormat";
import { SettingRow } from "@/components/settings/SettingRow";
import { MUSCLE_LABELS } from "@/db/labels";
import { getActivePause, getZone } from "@/db/pause";
import { dayOf } from "@/db/reminders";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/** "Pause and zone" (M-04), saying which of the two is on, opening the screen that sets them. */
export function PauseRow() {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const [value, setValue] = useState<string | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([getActivePause(), getZone()])
        .then(([pause, zone]) => {
          if (cancelled) return;
          if (pause) {
            setValue(t("pause.row_pause", { date: shortDate(language, dayOf(pause.until)) }));
          } else if (zone) {
            setValue(
              t("pause.row_zone", {
                zones: zone.groups.map((m) => MUSCLE_LABELS[m][language]).join(", "),
              }),
            );
          } else {
            setValue(t("pause.row_off"));
          }
        })
        .catch((error) => reportError("settings.pauseRead", error));
      return () => {
        cancelled = true;
      };
    }, [t, language]),
  );

  return (
    <SettingRow
      testID="settings-pause"
      icon={<Pause size={22} color="text" />}
      label={t("pause.title")}
      value={value}
      onPress={() => router.push("/pause" as never)}
    />
  );
}
