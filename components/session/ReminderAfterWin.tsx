import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { AppText } from "@/components/common/AppText";
import { Card } from "@/components/common/Card";
import { Bell } from "@/components/icons";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { reminderPrefs, WEEKDAYS } from "@/db/reminders";
import { useHaptics } from "@/hooks/useHaptics";
import { enableReminders, winReminderOffer } from "@/src/reminders";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

type Offer = NonNullable<Awaited<ReturnType<typeof winReminderOffer>>>;

/**
 * On the victory screen of a hero's 1st and 3rd session: "Train again on Wednesday, Friday?" It
 * writes through `enableReminders`, the same door as Settings' switch. "Not now" is counted, and
 * the second one ends the asking. Mounted by `VictoryView` once the session is saved.
 */
export function ReminderAfterWin() {
  const { t } = useTranslation();
  const haptics = useHaptics();
  const language = useSettingsStore((s) => s.language);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [answer, setAnswer] = useState<"on" | "denied" | null>(null);

  useEffect(() => {
    winReminderOffer()
      .then(setOffer)
      .catch((e: unknown) => reportError("victory.reminderOffer", e));
  }, []);

  if (answer !== null) {
    return (
      <AppText testID={`victory-reminder-${answer}`} fontSize={14} color="textSecondary">
        {t(answer === "on" ? "reminders.win_on" : "reminders.denied")}
      </AppText>
    );
  }
  if (offer === null) return null;

  const weekday = getDateTimeFormat(language, { weekday: "short" });
  // Starting tomorrow, so the first name read is the next day the hero is asked to come back.
  const tomorrow = new Date().getDay() + 1;
  const days = [...offer.days]
    .sort((a, b) => ((order(a) - tomorrow + 7) % 7) - ((order(b) - tomorrow + 7) % 7))
    .map((d) => weekday.format(new Date(2026, 0, 4 + order(d))));

  const yes = () => {
    haptics.selection();
    enableReminders({}, offer.sessions, null)
      .then((granted) => setAnswer(granted ? "on" : "denied"))
      .catch((e: unknown) => reportError("victory.reminderOn", e));
  };
  const notNow = () => {
    haptics.selection();
    setOffer(null);
    reminderPrefs
      .winNotNows()
      .then((n) => reminderPrefs.setWinNotNows(n + 1))
      .catch((e: unknown) => reportError("victory.reminderNotNow", e));
  };

  return (
    <Card testID="victory-reminder-offer" width="100%" maxW={520} gap="3">
      <XStack items="center" gap="2">
        <Bell size={18} color="primaryText" />
        <AppText flex={1} fontWeight="700" color="text">
          {t("reminders.win_ask", { days: days.join(", ") })}
        </AppText>
      </XStack>
      <YStack gap="2">
        <AppButton testID="victory-reminder-yes" variant="outline" onPress={yes}>
          {t("reminders.win_yes")}
        </AppButton>
        <AppButton testID="victory-reminder-not-now" variant="outline" onPress={notNow}>
          {t("common.not_now")}
        </AppButton>
      </YStack>
    </Card>
  );
}

/** Sunday is 0, as `Date.getDay` and `WEEKDAYS` have it. */
function order(day: Offer["days"][number]): number {
  return WEEKDAYS.indexOf(day);
}
