import { addWeeks } from "date-fns";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { Chip } from "@/components/common/Chip";
import { ScreenBackButton } from "@/components/common/ScreenBackButton";
import { Pause } from "@/components/icons";
import { shortDate } from "@/components/journal/journalFormat";
import {
  PAUSE_MAX_DAYS,
  type PausePeriod,
  ZONE_MAX_GROUPS,
  ZONE_MAX_WEEKS,
} from "@/constants/pause";
import { dayKey } from "@/db/dates";
import { MUSCLE_LABELS } from "@/db/labels";
import {
  endPause,
  endZone,
  getActivePause,
  getZone,
  startPause,
  startZone,
  type Zone,
} from "@/db/pause";
import { dayOf } from "@/db/reminders";
import { type MuscleCode, muscleCodes } from "@/db/schema";
import { replanRemindersNow } from "@/src/reminders";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

const PAUSE_WEEKS = Array.from({ length: PAUSE_MAX_DAYS / 7 }, (_, i) => i + 1);
const ZONE_WEEKS = Array.from({ length: ZONE_MAX_WEEKS }, (_, i) => i + 1);

/**
 * M-04: "Je fais une pause" and "Je ménage une zone", one screen and two cards.
 *
 * The return date is picked in weeks from today (up to eight), the same unit the zone uses: the
 * hero says how long, and the screen says the day it lands on.
 *
 * ponytail: no free calendar picker. Ceiling: a hero who wants a return date that is not a whole
 * number of weeks away. Add one when someone asks; `startPause` already takes any day.
 *
 * On return there is no card of its own: the NoticeSlot (P-05) does not exist yet, so the pause
 * ends silently on its date and Home speaks as it always does. Give it a line there when it lands.
 */
export default function PauseScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const [pause, setPause] = useState<PausePeriod | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [pauseWeeks, setPauseWeeks] = useState(2);
  const [zoneWeeks, setZoneWeeks] = useState(2);
  const [groups, setGroups] = useState<MuscleCode[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      Promise.all([getActivePause(), getZone()])
        .then(([p, z]) => {
          setPause(p);
          setZone(z);
        })
        .catch((error) => reportError("pause.load", error)),
    [],
  );

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  // One door for every write: the buttons are off while it runs, then the screen reads back what
  // the database says and the reminders replan with it.
  const run = (action: () => Promise<unknown>, context: string) => {
    if (busy) return;
    setBusy(true);
    action()
      .then(() => replanRemindersNow())
      .then(() => load())
      .catch((error) => reportError(context, error))
      .finally(() => setBusy(false));
  };

  const date = (key: string) => shortDate(language, dayOf(key));
  const zoneNames = (z: readonly MuscleCode[]) =>
    z.map((m) => MUSCLE_LABELS[m][language]).join(", ");
  const toggle = (m: MuscleCode) =>
    setGroups((g) =>
      g.includes(m) ? g.filter((x) => x !== m) : g.length < ZONE_MAX_GROUPS ? [...g, m] : g,
    );

  return (
    <YStack flex={1} bg="$background" pt={insets.top} pb={insets.bottom}>
      <XStack px="$4" py="$3" items="center" gap="$3">
        <ScreenBackButton />
        <XStack flex={1} items="center" gap="$2">
          <Pause size={20} color="$primaryText" />
          <Text fontFamily="$heading" fontSize={22} fontWeight="700" color="$text">
            {t("pause.title")}
          </Text>
        </XStack>
      </XStack>

      <RNScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        <Card gap="$3">
          <Text fontSize="$4" fontWeight="700" color="$text">
            {t("pause.pause_title")}
          </Text>
          {pause ? (
            <>
              <Paragraph testID="pause-active" color="$textSecondary">
                {t("pause.pause_active", { date: date(pause.until) })}
              </Paragraph>
              <AppButton
                testID="pause-end"
                fullWidth={false}
                variant="outline"
                disabled={busy}
                onPress={() => run(() => endPause(), "pause.end")}
              >
                {t("pause.pause_end")}
              </AppButton>
            </>
          ) : (
            <>
              <Paragraph color="$textSecondary">{t("pause.pause_body")}</Paragraph>
              <Text fontSize="$3" color="$text">
                {t("pause.pause_weeks")}
              </Text>
              <XStack gap="$2" flexWrap="wrap">
                {PAUSE_WEEKS.map((w) => (
                  <Chip
                    key={w}
                    testID={`pause-weeks-${w}`}
                    label={String(w)}
                    tone={w === pauseWeeks ? "primary" : "default"}
                    onPress={() => setPauseWeeks(w)}
                  />
                ))}
              </XStack>
              <Text fontSize="$3" color="$textSecondary">
                {t("pause.pause_back_on", {
                  date: shortDate(language, addWeeks(new Date(), pauseWeeks)),
                })}
              </Text>
              <AppButton
                testID="pause-start"
                fullWidth={false}
                disabled={busy}
                onPress={() =>
                  run(() => startPause(dayKey(addWeeks(new Date(), pauseWeeks))), "pause.start")
                }
              >
                {t("pause.pause_start")}
              </AppButton>
            </>
          )}
        </Card>

        <Card gap="$3">
          <Text fontSize="$4" fontWeight="700" color="$text">
            {t("pause.zone_title")}
          </Text>
          {zone ? (
            <>
              <Paragraph testID="zone-active" color="$textSecondary">
                {t("pause.zone_active", { zones: zoneNames(zone.groups), date: date(zone.until) })}
              </Paragraph>
              <Paragraph color="$text">
                {t("pause.zone_line", { zones: zoneNames(zone.groups) })}
              </Paragraph>
              <AppButton
                testID="zone-end"
                fullWidth={false}
                variant="outline"
                disabled={busy}
                onPress={() => run(() => endZone(), "pause.zoneEnd")}
              >
                {t("pause.zone_end")}
              </AppButton>
            </>
          ) : (
            <>
              <Paragraph color="$textSecondary">{t("pause.zone_body")}</Paragraph>
              <Text fontSize="$3" color="$text">
                {t("pause.zone_pick")}
              </Text>
              <XStack gap="$2" flexWrap="wrap">
                {muscleCodes.map((m) => (
                  <Chip
                    key={m}
                    testID={`zone-group-${m}`}
                    label={MUSCLE_LABELS[m][language]}
                    tone={groups.includes(m) ? "primary" : "default"}
                    onPress={() => toggle(m)}
                  />
                ))}
              </XStack>
              <Text fontSize="$3" color="$text">
                {t("pause.zone_weeks")}
              </Text>
              <XStack gap="$2" flexWrap="wrap">
                {ZONE_WEEKS.map((w) => (
                  <Chip
                    key={w}
                    testID={`zone-weeks-${w}`}
                    label={String(w)}
                    tone={w === zoneWeeks ? "primary" : "default"}
                    onPress={() => setZoneWeeks(w)}
                  />
                ))}
              </XStack>
              <AppButton
                testID="zone-start"
                fullWidth={false}
                disabled={busy || groups.length === 0}
                onPress={() => run(() => startZone(groups, zoneWeeks), "pause.zoneStart")}
              >
                {t("pause.zone_start")}
              </AppButton>
            </>
          )}
        </Card>

        <Paragraph color="$textSecondary" size="$2" px="$1">
          {t("pause.safety")}
        </Paragraph>
        <AppButton
          testID="pause-safety"
          fullWidth={false}
          variant="outline"
          onPress={() => router.push("/safety" as never)}
        >
          {t("pause.safety_link")}
        </AppButton>
      </RNScrollView>
    </YStack>
  );
}
