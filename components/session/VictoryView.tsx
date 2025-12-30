import { Card } from "@/components/common/Card";
import { formatTime } from "@/hooks/useSessionTimer";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, useWindowDimensions } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, Text, XStack, YStack } from "tamagui";
import { ProgressionChart } from "./ProgressionChart";

export function VictoryView() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { language } = useSettingsStore();
  const { quest, startTime, totalPausedTime, saveSession, quitSession } = useSessionStore();
  const [isSaving, setIsSaving] = useState(false);

  if (!quest || !startTime) return null;

  // Calculate duration for display
  // Note: saveSession recalculates this accurately based on DB timestamp logic,
  // but this is good enough for the UI summary.
  const durationSeconds = Math.floor((Date.now() - startTime - totalPausedTime) / 1000);
  const questTitle = language === "fr" ? quest.frTitle : quest.enTitle;

  const handleFinish = async () => {
    try {
      setIsSaving(true);
      await saveSession();
      quitSession();
      router.replace("/");
    } catch (e) {
      console.error("Failed to save session", e);
      // In a real app, show a toast/alert here
      setIsSaving(false);
    }
  };

  return (
    <YStack flex={1} bg="$background" pt={insets.top + 16} pb={insets.bottom + 16}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 24,
          alignItems: "center",
          gap: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Card bg="$pastelYellow" width="100%" maxW={520} mt="$6">
          <YStack items="center" gap="$3">
            <Text fontSize={72}>🏆</Text>
            <YStack items="center" gap="$1">
              <Text
                fontWeight="900"
                textTransform="uppercase"
                color="$color"
                fontSize={14}
                opacity={0.65}
                style={{ textAlign: "center" }}
              >
                {t("session.victory_title", "Quest Complete!")}
              </Text>
              <H1
                fontWeight="900"
                color="$color"
                fontSize={34}
                lineHeight={38}
                style={{ textAlign: "center" }}
              >
                {questTitle}
              </H1>
            </YStack>
          </YStack>
        </Card>

        <Card width="100%" maxW={520} bg="$bgLight" gap="$4">
          <XStack
            justify="space-between"
            items="center"
            borderBottomWidth={1}
            borderColor="$bgLight"
            pb="$3"
          >
            <Text
              fontWeight="800"
              fontSize={16}
              color="$color"
              opacity={0.6}
              textTransform="uppercase"
            >
              {t("session.total_time", "Total Time")}
            </Text>
            <Text fontWeight="900" fontSize={24} color="$color" fontFamily="$body">
              {formatTime(durationSeconds)}
            </Text>
          </XStack>

          <XStack justify="space-between" items="center">
            <Text
              fontWeight="800"
              fontSize={16}
              color="$color"
              opacity={0.6}
              textTransform="uppercase"
            >
              {t("session.xp_earned", "XP Earned")}
            </Text>
            <Text fontWeight="900" fontSize={24} color="$primary" fontFamily="$body">
              +150 XP
            </Text>
          </XStack>
        </Card>

        {/* Progression Chart */}
        <YStack width="100%" maxW={520}>
          <ProgressionChart
            questId={quest.id}
            limit={10}
            title={t("chart.your_progress", "Your Progress on this Quest")}
          />
        </YStack>

        {/* Finish Button */}
        <Button
          size="$6"
          bg="$color"
          pressStyle={{ opacity: 0.9, scale: 0.98 }}
          onPress={handleFinish}
          disabled={isSaving}
          rounded="$6"
          width="100%"
          maxWidth={520}
          borderWidth={0}
        >
          <Text color="$background" fontSize={20} fontWeight="900" textTransform="uppercase">
            {isSaving
              ? t("common.saving", "Saving...")
              : t("session.finish_button", "Collect Loot")}
          </Text>
        </Button>
      </ScrollView>

      <ConfettiCannon
        count={200}
        origin={{ x: width / 2, y: -20 }}
        autoStart={true}
        fadeOut={true}
      />
    </YStack>
  );
}
