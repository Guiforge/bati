import { Calendar, Dumbbell, Map as MapIcon, Play } from "@tamagui/lucide-icons";
import { Button, Text, XStack, YStack } from "tamagui";
import { useSmartAction } from "./useSmartAction";

export function ContinueAdventureFab() {
  const { config, isLoading } = useSmartAction();

  if (isLoading || !config) {
    return null;
  }

  const Icon =
    config.variant === "plan"
      ? Calendar
      : config.variant === "adventure"
        ? MapIcon
        : config.variant === "event"
          ? Dumbbell
          : Play;

  return (
    <Button
      position="absolute"
      b={80}
      r="$4"
      size="$6"
      bg="$primary"
      borderColor="$color"
      borderWidth={3}
      rounded="$8"
      elevation="$4"
      pressStyle={{ scale: 0.95, rotate: "-2deg" }}
      onPress={config.onPress}
      px="$4"
      height={64}
    >
      <XStack items="center" gap="$3">
        <YStack>
          <Text color="white" fontSize="$2" fontWeight="bold" opacity={0.9}>
            {config.label}
          </Text>
          <Text color="white" fontSize={18} fontWeight="900" textTransform="uppercase">
            {config.subtext}
          </Text>
        </YStack>
        <Icon fill="white" color="white" size={28} />
      </XStack>
    </Button>
  );
}
