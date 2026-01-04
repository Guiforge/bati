import { Stack } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView } from "react-native";
import { H3, Paragraph, Separator, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { createCompletedSession, getAllPreferences, listCompletedSessions } from "@/db";
import { listAdventures } from "@/db/adventures";
import {
  type BossFight,
  dealDamage,
  getBossFightByAdventure,
  resetBossFight,
} from "@/db/bossFights";
import { resetDatabase } from "@/db/client";
import { type ThemePreference, useSettingsStore } from "@/stores/settings";
import { useUserStore } from "@/stores/user";

export default function DevTools() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<Record<string, string>>({});
  const [sessionCount, setSessionCount] = useState(0);
  const [bossFights, setBossFights] = useState<
    Array<{ adventureId: number; name: string; fight: BossFight | null }>
  >([]);
  const { setHasFinishedOnboarding, setVillageName } = useUserStore();
  const { theme, setTheme } = useSettingsStore();

  const loadPrefs = useCallback(async () => {
    try {
      const p = await getAllPreferences();
      setPrefs(p);
    } catch {
      // Error handled silently
    }
  }, []);

  const loadSessionCount = useCallback(async () => {
    try {
      const sessions = await listCompletedSessions(100);
      setSessionCount(sessions.length);
    } catch {
      // Error handled silently
    }
  }, []);

  const loadBossFights = useCallback(async () => {
    try {
      const adventures = await listAdventures();
      const bossAdventures = adventures.filter((a) => a.kind === "boss");
      const fights = await Promise.all(
        bossAdventures.map(async (a) => ({
          adventureId: a.id,
          name: a.enTitle,
          fight: await getBossFightByAdventure(a.id),
        })),
      );
      setBossFights(fights);
    } catch {
      // Error handled silently
    }
  }, []);

  useEffect(() => {
    loadPrefs();
    loadSessionCount();
    loadBossFights();
  }, [loadPrefs, loadSessionCount, loadBossFights]);

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

  async function handleAddFakeSession() {
    try {
      await createCompletedSession({
        questId: null,
        userLevel: "medium",
        durationSeconds: 1200,
        xpEarned: 100,
        feedback: "good",
        exercises: [
          {
            exerciseId: 1,
            sortOrder: 0,
            result: { type: "reps", value: 10 },
          },
        ],
        performedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
      });
      await loadSessionCount();
      Alert.alert("Success", "Added fake session (yesterday)");
    } catch {
      Alert.alert("Error", "Failed to add fake session");
    }
  }

  async function handleResetBossFight(bossFightId: number) {
    try {
      await resetBossFight(bossFightId);
      await loadBossFights();
      Alert.alert("Success", "Boss fight reset");
    } catch {
      Alert.alert("Error", "Failed to reset boss fight");
    }
  }

  async function handleDealTestDamage(bossFightId: number) {
    try {
      await dealDamage(bossFightId, {
        exerciseId: 1,
        resultValue: 10,
        targetValue: 10,
        muscle: "arms",
      });
      await loadBossFights();
      Alert.alert("Success", "Dealt 50 test damage");
    } catch {
      Alert.alert("Error", "Failed to deal damage");
    }
  }

  function handleThemeChange(newTheme: ThemePreference) {
    setTheme(newTheme);
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

          {/* Theme Quick Toggle */}
          <H3>🎨 Theme</H3>
          <XStack gap="$2" flexWrap="wrap">
            {(["light", "dark", "system"] as const).map((th) => (
              <AppButton
                key={th}
                variant={theme === th ? "primary" : "outline"}
                size="$3"
                onPress={() => handleThemeChange(th)}
              >
                {th === "light" ? "☀️ Light" : th === "dark" ? "🌙 Dark" : "📱 System"}
              </AppButton>
            ))}
          </XStack>
          <Paragraph opacity={0.6}>Current: {theme}</Paragraph>

          <Separator />

          {/* Streak / Sessions Tools */}
          <H3>🔥 Streak Tools</H3>
          <Paragraph>Completed Sessions: {sessionCount}</Paragraph>
          <XStack gap="$2" flexWrap="wrap">
            <AppButton variant="outline" size="$3" onPress={handleAddFakeSession}>
              Add Fake Session (Yesterday)
            </AppButton>
            <AppButton variant="outline" size="$3" onPress={loadSessionCount}>
              Refresh Count
            </AppButton>
          </XStack>

          <Separator />

          {/* Boss Fight Tools */}
          <H3>👹 Boss Fights</H3>
          <AppButton variant="outline" size="$3" onPress={loadBossFights} fullWidth={false}>
            Refresh Boss Fights
          </AppButton>
          {bossFights.length === 0 ? (
            <Paragraph opacity={0.6}>No boss adventures found</Paragraph>
          ) : (
            bossFights.map((bf) => (
              <YStack
                key={bf.adventureId}
                bg="$bgLight"
                p="$3"
                rounded="$4"
                borderWidth={1}
                borderColor="$color"
                gap="$2"
              >
                <Text fontWeight="bold">{bf.name}</Text>
                {bf.fight ? (
                  <>
                    <Paragraph>
                      HP: {bf.fight.currentHp} / {bf.fight.totalHp}
                    </Paragraph>
                    <Paragraph>
                      Weakness: {bf.fight.weaknessMuscle ?? "None"} | Resistance:{" "}
                      {bf.fight.resistanceMuscle ?? "None"}
                    </Paragraph>
                    <Paragraph>Defeated: {bf.fight.defeatedAt ? "Yes ✅" : "No ❌"}</Paragraph>
                    <XStack gap="$2" flexWrap="wrap">
                      <AppButton
                        variant="outline"
                        size="$2"
                        onPress={() => bf.fight && handleDealTestDamage(bf.fight.id)}
                      >
                        Deal 50 Damage
                      </AppButton>
                      <AppButton
                        variant="secondary"
                        size="$2"
                        onPress={() => bf.fight && handleResetBossFight(bf.fight.id)}
                      >
                        Reset HP
                      </AppButton>
                    </XStack>
                  </>
                ) : (
                  <Paragraph opacity={0.6}>No fight started yet</Paragraph>
                )}
              </YStack>
            ))
          )}

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
