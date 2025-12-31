import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView } from "react-native";
import { H3, Paragraph, Separator, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { getAllPreferences } from "@/db";
import { resetDatabase } from "@/db/client";
import { useUserStore } from "@/stores/user";

export default function DevTools() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<Record<string, string>>({});
  const { setHasFinishedOnboarding, setVillageName } = useUserStore();

  const loadPrefs = useCallback(async () => {
    try {
      const p = await getAllPreferences();
      setPrefs(p);
    } catch (e) {
      console.error("Failed to load preferences:", e);
    }
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  function handleReset() {
    Alert.alert(
      t("dev.reset_database_confirm_title", "Reset Database"),
      t("dev.reset_database_confirm_message", "Are you sure? This will delete ALL local data."),
      [
        { text: t("dev.cancel", "Cancel"), style: "cancel" },
        {
          text: t("dev.reset", "Reset"),
          style: "destructive",
          onPress: async () => {
            try {
              await resetDatabase();
              // Reset store state
              setHasFinishedOnboarding(false);
              setVillageName("");
              Alert.alert(
                t("dev.reset_done_title", "Database Reset"),
                t("dev.reset_done_message", "Please restart the app."),
              );
            } catch (_e) {
              Alert.alert(t("common.error", "Oops!"), t("dev.failed", "Failed"));
            }
          },
        },
      ],
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t("dev.title", "Dev Tools"), presentation: "modal" }} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <YStack gap="$4">
          <H3>{t("dev.database_management", "Database Management")}</H3>
          <AppButton variant="secondary" onPress={handleReset}>
            {t("dev.reset_database_nuke", "Reset Database (Nuke)")}
          </AppButton>

          <Separator />

          <H3>{t("dev.user_preferences", "User Preferences")}</H3>
          <AppButton variant="outline" onPress={loadPrefs} size="$3" fullWidth={false}>
            {t("dev.refresh", "Refresh")}
          </AppButton>

          <YStack
            gap="$2"
            bg="$background"
            p="$4"
            rounded="$4"
            borderWidth={1}
            borderColor="$color"
          >
            {Object.entries(prefs).length === 0 ? (
              <Paragraph>{t("dev.no_preferences", "No preferences found.")}</Paragraph>
            ) : (
              Object.entries(prefs).map(([key, value]) => (
                <YStack key={key} borderBottomWidth={1} borderColor="$color" py="$2">
                  <Paragraph fontWeight="bold">{key}</Paragraph>
                  <Paragraph>{value}</Paragraph>
                </YStack>
              ))
            )}
          </YStack>
        </YStack>
      </ScrollView>
    </>
  );
}
