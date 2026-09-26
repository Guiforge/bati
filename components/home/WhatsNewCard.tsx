import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Text, XStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { X } from "@/components/icons";
import { useHaptics } from "@/hooks/useHaptics";
import { reportError } from "@/src/reportError";
import { appVersion } from "@/src/updateCheck";
import { hasUnseenNotes, markNotesSeen, releaseNotes } from "@/src/whatsNew";
import { useSettingsStore } from "@/stores/settings";

/**
 * After an update, once: the notes of the version just installed. Not a modal, for the reason
 * `UpdateCard` is not one: a patch with two lines of notes must never stand between a hero and
 * the session they opened the app for.
 */
export function WhatsNewCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const haptics = useHaptics();
  const hasNotes = useSettingsStore((s) => releaseNotes(s.language).length > 0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hasUnseenNotes()
      .then((unseen) => {
        if (!cancelled) setVisible(unseen);
      })
      .catch((error: unknown) => reportError("whatsNew.card", error));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible || !hasNotes) return null;

  const dismiss = () => {
    setVisible(false);
    markNotesSeen().catch((error: unknown) => reportError("whatsNew.dismiss", error));
  };

  return (
    <Card mx="$4" mt="$3" gap="$3">
      <XStack items="flex-start" gap="$2">
        <Text flex={1} fontSize="$5" fontWeight="700" color="$text">
          {t("whats_new.card_title", "Bati is now {{version}}", { version: appVersion })}
        </Text>
        <Button
          testID="home-whats-new-dismiss"
          size="$2"
          circular
          chromeless
          onPress={() => {
            haptics.selection();
            dismiss();
          }}
          icon={<X size={18} color="$textSecondary" />}
          accessibilityRole="button"
          accessibilityLabel={t("home.update_later", "Later")}
        />
      </XStack>

      <AppButton
        testID="home-whats-new-open"
        variant="outline"
        onPress={() => {
          haptics.selection();
          dismiss();
          router.push("/whats-new" as never);
        }}
      >
        {t("whats_new.card_open", "See what's new")}
      </AppButton>
    </Card>
  );
}
