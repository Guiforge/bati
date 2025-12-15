import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView } from "react-native";
import { Button, H3, Paragraph, Separator, YStack } from "tamagui";
import { getAllPreferences } from "@/db";
import { resetDatabase } from "@/db/client";
import { useUserStore } from "@/stores/user";

export default function DevTools() {
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
      "Reset Database",
      "Are you sure? This will delete all data. You MUST restart the app manually after this.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              resetDatabase();
              // Reset store state
              setHasFinishedOnboarding(false);
              setVillageName("");
              Alert.alert("Database Reset", "Please restart the app now to recreate the database.");
            } catch (_e) {
              Alert.alert("Error", "Failed to reset database");
            }
          },
        },
      ],
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Dev Tools", presentation: "modal" }} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <YStack gap="$4">
          <H3>Database Management</H3>
          <Button bg="$secondary" color="white" onPress={handleReset}>
            Reset Database (Nuke)
          </Button>

          <Separator />

          <H3>User Preferences</H3>
          <Button onPress={loadPrefs} size="$3">
            Refresh
          </Button>

          <YStack
            gap="$2"
            bg="$background"
            p="$4"
            rounded="$4"
            borderWidth={1}
            borderColor="$color"
          >
            {Object.entries(prefs).length === 0 ? (
              <Paragraph>No preferences found.</Paragraph>
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
