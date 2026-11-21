import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { AppText } from "@/components/common/AppText";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { shortDate } from "@/components/journal/journalFormat";
import { ZONE_MAX_GROUPS } from "@/constants/pause";
import { MUSCLE_LABELS } from "@/db/labels";
import { getZone, startZone } from "@/db/pause";
import { dayOf } from "@/db/reminders";
import { type MuscleCode, muscleCodes } from "@/db/schema";
import { useHaptics } from "@/hooks/useHaptics";
import { formatList } from "@/src/i18n/list";
import { replanRemindersNow } from "@/src/reminders";
import { reportError } from "@/src/reportError";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";

const WEEKS = [1, 2];

/**
 * After "I'm stopping, it hurts", once the session is kept: rest the zone of the exercise that
 * hurt for a week or two. It writes through `startZone`, as `app/pause.tsx` does. Silent when a
 * zone is already being spared (Home says so), and the preselection can be changed before the tap.
 */
export function SparedZoneOffer() {
  const { t } = useTranslation();
  const haptics = useHaptics();
  const language = useSettingsStore((s) => s.language);
  // The exercise under way when the hero stopped: `stopForPain` leaves the index where it stood.
  const [hurt] = useState<MuscleCode[]>(() => {
    const { quest, currentExerciseIndex } = useSessionStore.getState();
    return (quest?.exercises[currentExerciseIndex]?.exercise.muscles ?? []).slice(
      0,
      ZONE_MAX_GROUPS,
    );
  });
  const [groups, setGroups] = useState<MuscleCode[]>(hurt);
  const [weeks, setWeeks] = useState(1);
  const [state, setState] = useState<"checking" | "open" | "done" | "closed">("checking");
  const [until, setUntil] = useState("");

  useEffect(() => {
    getZone()
      .then((zone) => setState(zone ? "closed" : "open"))
      .catch((e: unknown) => reportError("painStop.zone", e));
  }, []);

  if (state === "done") {
    return (
      <AppText testID="pain-stop-zone-done" color="textSecondary">
        {t("pause.zone_offer_done", { date: until })}
      </AppText>
    );
  }
  if (state !== "open") return null;

  const toggle = (m: MuscleCode) =>
    setGroups((g) =>
      g.includes(m) ? g.filter((x) => x !== m) : g.length < ZONE_MAX_GROUPS ? [...g, m] : g,
    );
  const spare = () => {
    haptics.selection();
    startZone(groups, weeks)
      .then((zone) => {
        setUntil(shortDate(language, dayOf(zone.until)));
        return replanRemindersNow();
      })
      .then(() => setState("done"))
      .catch((e: unknown) => reportError("painStop.zoneStart", e));
  };

  return (
    <Card testID="pain-stop-zone-offer" gap="3">
      <AppText fontWeight="700" color="text">
        {groups.length > 0
          ? t("pause.zone_offer_title", {
              zones: formatList(
                groups.map((m) => MUSCLE_LABELS[m][language]),
                language,
              ),
            })
          : t("pause.zone_offer_title_none")}
      </AppText>
      <XStack gap="2" flexWrap="wrap">
        {muscleCodes.map((m) => (
          <Chip
            key={m}
            testID={`pain-stop-zone-${m}`}
            label={MUSCLE_LABELS[m][language]}
            tone={groups.includes(m) ? "primary" : "default"}
            selected={groups.includes(m)}
            onPress={() => toggle(m)}
          />
        ))}
      </XStack>
      <XStack gap="2">
        {WEEKS.map((w) => (
          <Chip
            key={w}
            testID={`pain-stop-zone-weeks-${w}`}
            label={t("reminders.pause_weeks", { count: w })}
            tone={w === weeks ? "primary" : "default"}
            selected={w === weeks}
            onPress={() => setWeeks(w)}
          />
        ))}
      </XStack>
      <YStack gap="2">
        <AppButton testID="pain-stop-zone-yes" disabled={groups.length === 0} onPress={spare}>
          {t("pause.zone_offer_start")}
        </AppButton>
        <AppButton testID="pain-stop-zone-no" variant="outline" onPress={() => setState("closed")}>
          {t("common.not_now")}
        </AppButton>
      </YStack>
    </Card>
  );
}
