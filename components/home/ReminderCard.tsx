import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { Button, Text, XStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Bell, ChevronRight, X } from "@/components/icons";
import { dayKey } from "@/db/dates";
import { reminderPrefs } from "@/db/reminders";
import { useHaptics } from "@/hooks/useHaptics";
import * as Reminders from "@/modules/bati-reminders";
import { type ReminderCardKind, reminderCardKind, replanRemindersNow } from "@/src/reminders";
import { reportError } from "@/src/reportError";

/**
 * A link under the scene, never a filled button beside Start: the one filled button on Home is the
 * scene's. Same family as `UpdateCard` and `WhatsNewCard`: a line, a cross.
 */
export function ReminderCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const haptics = useHaptics();
  const [kind, setKind] = useState<ReminderCardKind>(null);

  // On focus: coming back from Settings with days chosen takes the offer down.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      reminderCardKind()
        .then((next) => {
          if (!cancelled) setKind(next);
        })
        .catch((error: unknown) => reportError("reminders.card", error));
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (kind === null) return null;

  const today = dayKey(new Date());
  const openSettings = () => router.push("/settings" as never);
  const answered = () => {
    setKind(null);
    reminderPrefs
      .setAskedAt(today)
      .catch((error: unknown) => reportError("reminders.asked", error));
  };

  const close = () => {
    haptics.selection();
    // The cross on the question means "they're fine"; on the offer, "not interested".
    if (kind === "check") {
      answered();
      return;
    }
    setKind(null);
    reminderPrefs.dismissOffer().catch((error: unknown) => reportError("reminders.dismiss", error));
  };

  const open = () => {
    haptics.selection();
    if (kind === "offer") {
      setKind(null);
      reminderPrefs
        .dismissOffer()
        .catch((error: unknown) => reportError("reminders.dismiss", error));
      openSettings();
      return;
    }
    // ponytail: Android's own dialog rather than a Tamagui sheet, whose drag and whose
    //           onOpenChange have both shipped bugs in this app. Three answers is its limit, and
    //           three is what the question has. A sheet if a fourth answer ever joins.
    Alert.alert(t("reminders.check"), undefined, [
      {
        text: t("reminders.check_change"),
        onPress: () => {
          answered();
          openSettings();
        },
      },
      {
        text: t("reminders.check_off"),
        onPress: () => {
          answered();
          Reminders.setEnabled(false);
          reminderPrefs
            .setStreakFrom(today)
            .then(replanRemindersNow)
            .catch((error: unknown) => reportError("reminders.checkOff", error));
        },
      },
      { text: t("reminders.check_fine"), onPress: answered },
    ]);
  };

  return (
    <Card testID={`home-reminder-${kind}`} mx="$4" mt="$3" py="$2" onPress={open}>
      <XStack items="center" gap="$2">
        <Bell size={16} color="$primaryText" />
        <Text flex={1} fontSize="$3" color="$primaryText">
          {t(kind === "check" ? "reminders.check" : "reminders.offer")}
        </Text>
        <ChevronRight size={16} color="$primaryText" />
        <Button
          testID="home-reminder-dismiss"
          size="$2"
          circular
          chromeless
          hitSlop={8}
          onPress={close}
          icon={<X size={18} color="$textSecondary" />}
          accessibilityRole="button"
          accessibilityLabel={t("common.close", "Close")}
        />
      </XStack>
    </Card>
  );
}
