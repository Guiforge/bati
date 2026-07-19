import { Image } from "expo-image";
import { StyleSheet } from "react-native";
import { YStack } from "tamagui";

const backgroundImage = require("../../assets/onboardings/new_city.jpg");

export type AppBackgroundProps = {
  /**
   * Visual strength of the background illustration.
   * Keep this subtle so content remains readable.
   */
  opacity?: number;
};

/**
 * Global NEW_STYLE background layer.
 * UI-only.
 */
export function AppBackground({ opacity = 0.18 }: AppBackgroundProps) {
  return (
    <YStack fullscreen pointerEvents="none" bg="$bgDark">
      <Image
        source={backgroundImage}
        style={[StyleSheet.absoluteFill, { opacity }]}
        contentFit="cover"
      />
    </YStack>
  );
}
