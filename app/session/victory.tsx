import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button, Text, XStack, YStack } from "tamagui";
import { useGameIcon } from "@/src/hooks/useGameIcon";
import { useSessionStore } from "@/src/stores/session";

export default function VictoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { GameIcon } = useGameIcon();

  const { sessionSummary, bossFight, clearSession } = useSessionStore();

  const isBossVictory = !!bossFight && bossFight.currentHp <= 0;

  useEffect(() => {
    Haptics.notificationAsync(
      isBossVictory
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Success,
    );
  }, [isBossVictory]);

  const handleContinue = () => {
    clearSession();
    router.replace("/(tabs)");
  };

  if (!sessionSummary) {
    router.replace("/(tabs)");
    return null;
  }

  return (
    <YStack
      flex={1}
      bg={isBossVictory ? "#0A0A0F" : "$bgDark"}
      padding="$6"
      justifyContent="center"
      alignItems="center"
    >
      {isBossVictory ? (
        <>
          {/* Boss Defeat Animation */}
          <YStack
            bg="$error"
            w={100}
            h={100}
            ai="center"
            jc="center"
            borderRadius="$full"
            mb="$4"
            shadowColor="$error"
            shadowOffset={{ width: 0, height: 8 }}
            shadowOpacity={0.8}
            shadowRadius={24}
          >
            <GameIcon name="skull" size={60} color="$text" />
          </YStack>

          <Text fontSize={40} fontWeight="900" color="$error" marginBottom="$2" textAlign="center">
            {t("boss.defeated")}
          </Text>

          <Text fontSize={20} color="$warning" marginBottom="$6" textAlign="center">
            {t("boss.epic_victory")}
          </Text>
        </>
      ) : (
        <>
          <Text
            fontSize={48}
            fontWeight="bold"
            color="$primary"
            marginBottom="$4"
            textAlign="center"
          >
            🎉 {t("session.victory_title")}
          </Text>

          <Text fontSize={18} color="$textSecondary" marginBottom="$8" textAlign="center">
            {t("session.victory_subtitle")}
          </Text>
        </>
      )}

      {/* Stats Cards */}
      <YStack width="100%" gap="$3" marginBottom="$8">
        <XStack gap="$3">
          <YStack
            flex={1}
            bg="$glassBg"
            padding="$4"
            borderRadius="$4"
            borderWidth={1}
            borderColor={isBossVictory ? "$error" : "$glassBorder"}
            alignItems="center"
          >
            <Text fontSize={14} color="$textSecondary" marginBottom="$2">
              {t("session.xp_earned")}
            </Text>
            <Text fontSize={32} fontWeight="bold" color={isBossVictory ? "$warning" : "$primary"}>
              {isBossVictory && "2x "}
              {sessionSummary.xpEarned || 0}
            </Text>
            {isBossVictory && (
              <Text fontSize={12} color="$warning" fontWeight="600">
                {t("boss.enhanced_rewards")}
              </Text>
            )}
          </YStack>

          <YStack
            flex={1}
            bg="$glassBg"
            padding="$4"
            borderRadius="$4"
            borderWidth={1}
            borderColor={isBossVictory ? "$error" : "$glassBorder"}
            alignItems="center"
          >
            <Text fontSize={14} color="$textSecondary" marginBottom="$2">
              {t("session.exercises")}
            </Text>
            <Text fontSize={32} fontWeight="bold" color="$text">
              {sessionSummary.exercisesCompleted || 0}
            </Text>
          </YStack>
        </XStack>

        {isBossVictory && bossFight && (
          <YStack
            bg="$glassBg"
            padding="$4"
            borderRadius="$4"
            borderWidth={1}
            borderColor="$error"
            alignItems="center"
          >
            <Text fontSize={14} color="$textSecondary" marginBottom="$2">
              {t("boss.total_damage")}
            </Text>
            <Text fontSize={28} fontWeight="900" color="$error">
              {bossFight.totalHp}
            </Text>
          </YStack>
        )}

        <YStack
          bg="$glassBg"
          padding="$4"
          borderRadius="$4"
          borderWidth={1}
          borderColor={isBossVictory ? "$error" : "$glassBorder"}
          alignItems="center"
        >
          <Text fontSize={14} color="$textSecondary" marginBottom="$2">
            {t("session.time_taken")}
          </Text>
          <Text fontSize={28} fontWeight="600" color="$text">
            {sessionSummary.duration
              ? `${Math.floor(sessionSummary.duration / 60)}:${(sessionSummary.duration % 60).toString().padStart(2, "0")}`
              : "0:00"}
          </Text>
        </YStack>
      </YStack>

      {/* Actions */}
      <YStack width="100%" gap="$3">
        <Button
          size="$5"
          bg={isBossVictory ? "$error" : "$primary"}
          color="$text"
          onPress={handleContinue}
          pressStyle={{ opacity: 0.8 }}
        >
          {t("session.view_village")}
        </Button>

        <Button
          size="$4"
          variant="outlined"
          borderColor="$borderStrong"
          color="$textSecondary"
          onPress={handleContinue}
        >
          {t("common.done")}
        </Button>
      </YStack>
    </YStack>
  );
}
