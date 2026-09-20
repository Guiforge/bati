import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Paragraph, Text, XStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { ExternalLink, X } from "@/components/icons";
import { preferences } from "@/db/preferences";
import { useHaptics } from "@/hooks/useHaptics";
import { reportError } from "@/src/reportError";
import { appVersion, checkForUpdate, RELEASES_URL } from "@/src/updateCheck";
import { useSettingsStore } from "@/stores/settings";

/**
 * One card, once per release, and only for a hero who asked to be told.
 *
 * Everything about it is sized to that: it is not a modal, it never interrupts a session, and
 * closing it answers for that version for good. The whole point of the feature is the APK
 * installed by hand, which has no store behind it to notice a release; the price of getting that
 * right is that this must never become the thing you close every time you open the app.
 */
export function UpdateCard() {
  const { t } = useTranslation();
  const haptics = useHaptics();
  const enabled = useSettingsStore((s) => s.updateCheckEnabled);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Turning the row off while the card is up takes it down with it.
      setVersion(null);
      return;
    }

    let cancelled = false;
    checkForUpdate()
      .then((found) => {
        if (!cancelled) setVersion(found);
      })
      // A failed preference read leaves Home exactly as it was. Worth a breadcrumb: unlike the
      // request itself, this one failing means the database is in trouble.
      .catch((error: unknown) => reportError("update.card", error));

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!version) return null;

  // Both buttons answer for this version: a hero who went to look and did not update has seen
  // the card do its whole job, and the next release is what earns the next one.
  const dismiss = () => {
    setVersion(null);
    preferences.setUpdateDismissed(version).catch((error: unknown) => {
      // It comes back on the next launch, which is annoying rather than wrong.
      reportError("update.dismiss", error);
    });
  };

  return (
    <Card mx="$4" mt="$3" gap="$3">
      <XStack items="flex-start" gap="$2">
        <Text flex={1} fontSize="$5" fontWeight="700" color="$text">
          {t("home.update_title", "Version {{version}} is out", { version })}
        </Text>
        <Button
          testID="home-update-dismiss"
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

      <Paragraph color="$textSecondary" fontSize="$3">
        {t("home.update_body", "You are on {{current}}.", { current: appVersion })}
      </Paragraph>

      <AppButton
        testID="home-update-open"
        variant="outline"
        iconAfter={<ExternalLink size={16} color="$textSecondary" />}
        onPress={() => {
          haptics.selection();
          dismiss();
          // The release page in the hero's own browser. This app downloads nothing and
          // installs nothing, which is the line that keeps a Play build inside Play's rules.
          Linking.openURL(RELEASES_URL).catch((error: unknown) => {
            reportError("update.open", error);
          });
        }}
      >
        {t("home.update_open", "See the release")}
      </AppButton>
    </Card>
  );
}
