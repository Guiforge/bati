import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView as RNScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { ScreenBackButton } from "@/components/common/ScreenBackButton";
import { ScrollText } from "@/components/icons";
import { reportError } from "@/src/reportError";
import { appVersion } from "@/src/updateCheck";
import { markNotesSeen, releaseNotes } from "@/src/whatsNew";
import { useSettingsStore } from "@/stores/settings";

/** This version's release notes. Home's card and the version line in Settings both open it. */
export default function WhatsNewScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const language = useSettingsStore((s) => s.language);
  const notes = releaseNotes(language);

  // Reading them is the card's whole job done, whichever door led here.
  useEffect(() => {
    markNotesSeen().catch((error: unknown) => reportError("whatsNew.markSeen", error));
  }, []);

  return (
    <YStack flex={1} bg="$background" pt={insets.top} pb={insets.bottom}>
      <XStack px="$4" py="$3" items="center" gap="$3">
        <ScreenBackButton />
        <XStack flex={1} items="center" gap="$2">
          <ScrollText size={20} color="$primaryText" />
          <Text fontSize={22} fontWeight="700" color="$text">
            {t("whats_new.title", "What's new in {{version}}", { version: appVersion })}
          </Text>
        </XStack>
      </XStack>

      <RNScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Card testID="whats-new-notes" gap="$3">
          {notes.length > 0 ? (
            notes.map((line) => (
              <XStack key={line} gap="$2">
                <Text color="$primaryText">•</Text>
                <Paragraph flex={1} color="$text">
                  {line}
                </Paragraph>
              </XStack>
            ))
          ) : (
            <Paragraph color="$textSecondary">
              {t("whats_new.empty", "No notes for this build.")}
            </Paragraph>
          )}
        </Card>
      </RNScrollView>
    </YStack>
  );
}
