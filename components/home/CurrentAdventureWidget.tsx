import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Button, H3, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { useGameIcons } from "@/hooks/useGameIcon";
import { useSmartAction } from "./useSmartAction";

export function CurrentAdventureWidget() {
  const { t } = useTranslation();
  const { config, isLoading } = useSmartAction();
  const icons = useGameIcons(["scroll", "sword"]);

  if (isLoading) {
    return null; // Or a skeleton
  }

  // If no config or it's just a generic "Start Quest", we might want to show a "Start Adventure" CTA instead
  // But for now, let's use the smart action config.

  // We want to style this as a "Continue Adventure" widget.
  // If the variant is 'adventure', it's perfect.
  // If it's 'plan', it's also good.
  // If it's 'quest', it means no active adventure, so maybe we prompt to start one?

  const isAdventure = config?.variant === "adventure";
  const title = isAdventure
    ? t("home.continue_adventure", "Continue Adventure")
    : t("home.next_step", "Next Step");
  const subtitle = config?.subtext || t("home.start_journey", "Start your journey");
  const label = config?.label || t("home.play", "Play");

  return (
    <Card
      bg="$bgLight"
      borderWidth={3}
      borderColor="$color"
      p={0}
      overflow="hidden"
      onPress={config?.onPress}
      pressStyle={{ scale: 0.98 }}
      animation="bouncy"
    >
      <XStack>
        {/* Left: Image/Icon Area */}
        <YStack
          width={100}
          bg="$primary"
          justify="center"
          items="center"
          borderRightWidth={3}
          borderColor="$color"
        >
          <Image
            source={isAdventure ? icons.scroll : icons.sword}
            style={{ width: 48, height: 48, tintColor: "white" }}
            contentFit="contain"
          />
        </YStack>

        {/* Right: Content */}
        <YStack flex={1} p="$4" justify="center" gap="$1">
          <Text
            fontSize={12}
            fontWeight="bold"
            opacity={0.6}
            textTransform="uppercase"
            color="$color"
          >
            {title}
          </Text>
          <H3 fontSize={20} fontWeight="900" color="$color" numberOfLines={2}>
            {subtitle}
          </H3>

          <XStack mt="$2">
            <Button
              size="$3"
              bg="$color"
              color="$bgLight"
              fontWeight="bold"
              onPress={config?.onPress}
              pressStyle={{ opacity: 0.8 }}
            >
              {label}
            </Button>
          </XStack>
        </YStack>
      </XStack>
    </Card>
  );
}
