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
// ponytail: every screen paints a translucent $background (alpha 0.92) over this
// full-screen image, so the compositor blends the whole viewport each frame. If release
// profiling still shows scroll jank, bake the wash into the asset (image at 0.18 over
// #0B0F19, then the 0.92 overlay) and make $background opaque.
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
