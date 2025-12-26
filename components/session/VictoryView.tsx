import { useRouter } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useWindowDimensions } from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, Paragraph, Text, XStack, YStack } from "tamagui";
import { formatTime } from "@/hooks/useSessionTimer";
import { useSessionStore } from "@/stores/session";

export function VictoryView() {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { quest, startTime, totalPausedTime, saveSession, quitSession } =
    useSessionStore();
  const [isSaving, setIsSaving] = useState(false);

  if (!quest || !startTime) return null;

  // Calculate duration for display
  // Note: saveSession recalculates this accurately based on DB timestamp logic,
  // but this is good enough for the UI summary.
  const durationSeconds = Math.floor(
    (Date.now() - startTime - totalPausedTime) / 1000,
  );

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
    <YStack
      flex={1}
      bg="$pastelYellow"
      pt={insets.top + 16}
      pb={insets.bottom + 16}
      px="$4"
      items="center"
      justify="center"
      gap="$6"
    >
      {/* Victory Icon/Illustration */}
      <YStack items="center" gap="$4" mt="$8">
        <Text fontSize={80}>🏆</Text>
        <YStack items="center" gap="$2">
          <H1
            fontWeight="900"
            textTransform="uppercase"
            color="$color"
            fontSize={36}
            lineHeight={40}
            style={{ textAlign: "center" }}
          >
            {t("session.victory_title", "Quest Complete!")}
          </H1>
          <Paragraph
            size="$5"
            fontWeight="700"
            opacity={0.7}
            style={{ textAlign: "center" }}
          >
            {quest.enTitle}
          </Paragraph>
        </YStack>
      </YStack>

      {/* Stats Card */}
      <YStack
        bg="$background"
        p="$6"
        rounded="$6"
        borderWidth={3}
        borderColor="$color"
        width="100%"
        gap="$4"
        shadowColor="black"
        shadowOffset={{ width: 4, height: 4 }}
        shadowOpacity={0.2}
        shadowRadius={0}
      >
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
          <Text
            fontWeight="900"
            fontSize={24}
            color="$color"
            fontFamily="$body"
          >
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
          <Text
            fontWeight="900"
            fontSize={24}
            color="$secondary"
            fontFamily="$body"
          >
            +150 XP
          </Text>
        </XStack>
      </YStack>

      {/* Spacer */}
      <YStack flex={1} />

      {/* Finish Button */}
      <Button
        size="$6"
        bg="$color"
        pressStyle={{ opacity: 0.9, scale: 0.98 }}
        onPress={handleFinish}
        disabled={isSaving}
        rounded="$6"
        width="100%"
        borderWidth={0}
      >
        <Text
          color="$background"
          fontSize={20}
          fontWeight="900"
          textTransform="uppercase"
        >
          {isSaving
            ? t("common.saving", "Saving...")
            : t("session.finish_button", "Collect Loot")}
        </Text>
      </Button>

      <ConfettiCannon
        count={200}
        origin={{ x: width / 2, y: -20 }}
        autoStart={true}
        fadeOut={true}
      />
    </YStack>
  );
}
