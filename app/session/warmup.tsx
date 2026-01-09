import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, Text, YStack } from "tamagui";
import { useGameIcon } from "@/src/hooks/useGameIcon";

/**
 * Warm-Up Screen
 *
 * Goal: Mental preparation. The "Calm before the storm."
 * This screen sets the mood and allows experienced users to skip if already ready.
 */
export default function WarmupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { GameIcon } = useGameIcon();

  const handleStartWarmup = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Start warm-up countdown (could add a separate warm-up timer here if needed)
    // For now, skip directly to main countdown
    router.replace("/session");
  };

  const handleSkipWarmup = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    router.replace("/session");
  };

  return (
    <YStack
      flex={1}
      bg="$bgDark"
      justifyContent="space-between"
      paddingTop="$6"
      paddingBottom="$8"
      paddingHorizontal="$6"
    >
      {/* Top Safe Area - Status Bar Space */}
      <YStack height={16} />

      {/* Hero Preparing Imagery / Inspirational Visual */}
      <YStack alignItems="center" justifyContent="center" gap="$4" flex={1}>
        {/* Hero Icon - Preparing/Stretching */}
        <YStack
          bg="$primary"
          width={140}
          height={140}
          alignItems="center"
          justifyContent="center"
          borderRadius="$6"
          shadowColor="$primaryGlow"
          shadowOffset={{ width: 0, height: 8 }}
          shadowOpacity={0.7}
          shadowRadius={20}
        >
          <GameIcon name="lorc/flying-flag" size={80} tintColor="$text" />
        </YStack>

        {/* Motivational Text */}
        <YStack alignItems="center" gap="$2">
          <Text
            color="$textSecondary"
            fontSize="$3"
            fontWeight="600"
            textTransform="uppercase"
            letterSpacing={2}
            textAlign="center"
          >
            {t("session.prepare_for_battle")}
          </Text>

          <Text color="$text" fontSize={32} fontWeight="bold" textAlign="center" numberOfLines={3}>
            {t("session.warmup_title")}
          </Text>
        </YStack>

        {/* Inspirational Message */}
        <YStack
          bg="$glassBg"
          borderColor="$borderStrong"
          borderWidth={1}
          p="$5"
          borderRadius="$4"
          maxWidth={320}
        >
          <Text color="$textSecondary" fontSize="$4" textAlign="center" lineHeight={24}>
            {t("session.warmup_message")}
          </Text>
        </YStack>
      </YStack>

      {/* Action Buttons - Bottom Safe Area */}
      <YStack gap="$3" paddingBottom="$4">
        <Button
          size="$6"
          bg="$primary"
          color="$text"
          fontSize={18}
          fontWeight="900"
          onPress={handleStartWarmup}
          pressStyle={{ opacity: 0.9, scale: 0.98 }}
          shadowColor="$primaryGlow"
          shadowOffset={{ width: 0, height: 8 }}
          shadowOpacity={0.7}
          shadowRadius={16}
        >
          {t("session.start_warmup")}
        </Button>

        <Button
          size="$4"
          chromeless
          color="$textSecondary"
          onPress={handleSkipWarmup}
          pressStyle={{ opacity: 0.7 }}
        >
          {t("session.skip_warmup")}
        </Button>
      </YStack>

      {/* Bottom Safe Area - Home Indicator Space */}
      <YStack height={12} />
    </YStack>
  );
}
