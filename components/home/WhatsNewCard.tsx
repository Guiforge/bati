import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Text, XStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { ChevronRight, X } from "@/components/icons";
import { useHaptics } from "@/hooks/useHaptics";
import { reportError } from "@/src/reportError";
import { appVersion } from "@/src/updateCheck";
import { hasUnseenNotes, markNotesSeen, releaseNotes } from "@/src/whatsNew";
import { useSettingsStore } from "@/stores/settings";

/**
 * After an update, once: the notes of the version just installed. Not a modal, for the reason
 * `UpdateCard` is not one: a patch with two lines of notes must never stand between a hero and
 * the session they opened the app for. One row, so it costs Home's first viewport as little as
 * a card can.
 */
export function WhatsNewCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const haptics = useHaptics();
  const hasNotes = useSettingsStore((s) => releaseNotes(s.language).length > 0);
  const [visible, setVisible] = useState(false);

  // On focus rather than on mount: Home stays mounted under the stack, and notes read from
  // Settings in the meantime must take the card down on the way back.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      hasUnseenNotes()
        .then((unseen) => {
          if (!cancelled) setVisible(unseen);
        })
        .catch((error: unknown) => reportError("whatsNew.card", error));
      return () => {
        cancelled = true;
      };
    }, []),
  );

  if (!visible || !hasNotes) return null;

  const dismiss = () => {
    setVisible(false);
    markNotesSeen().catch((error: unknown) => reportError("whatsNew.dismiss", error));
  };

  return (
    <Card
      testID="home-whats-new-open"
      mx="$4"
      mt="$3"
      py="$2"
      onPress={() => {
        haptics.selection();
        dismiss();
        router.push("/whats-new" as never);
      }}
    >
      <XStack items="center" gap="$2">
        <Text flex={1} fontSize="$4" fontWeight="700" color="$text">
          {t("whats_new.card_title", "Bati is now {{version}}", { version: appVersion })}
        </Text>
        <Text fontSize="$3" color="$primaryText">
          {t("whats_new.card_open", "See what's new")}
        </Text>
        <ChevronRight size={16} color="$primaryText" />
        <Button
          testID="home-whats-new-dismiss"
          size="$2"
          circular
          chromeless
          hitSlop={8}
          onPress={() => {
            haptics.selection();
            dismiss();
          }}
          icon={<X size={18} color="$textSecondary" />}
          accessibilityRole="button"
          accessibilityLabel={t("common.close", "Close")}
        />
      </XStack>
    </Card>
  );
}
