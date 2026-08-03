import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, YStack } from "tamagui";

import { VillageEmbers } from "@/components/village/VillageEmbers";
import { getVillageTierAsset } from "@/constants/assetMap";
import { rawColors } from "@/constants/rawColors";
import type { VillageTier } from "@/db/village";
import { useAnimationProps } from "@/hooks/useReducedMotion";

/**
 * The tier illustration, full screen and whole.
 *
 * The scene in the page is square because the art is, and it fills the width — so there is no
 * room left to make it bigger there without cropping, which is the bug this screen had until
 * recently. This is the other way to give it room: leave the layout alone and let the hero open
 * the picture when they want to look at it.
 *
 * `contain`, never `cover`. The whole point is that nothing is cut, on any screen shape.
 */
export function VillageSceneViewer({
  tier,
  title,
  onClose,
}: {
  tier: VillageTier;
  title: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // Scales up as it fades in, so the picture reads as *opening* out of the tapped scene rather
  // than a new screen appearing over it. "bouncy" is the app's reveal spring (SessionRewards,
  // the village sections); a plain fade made the tap feel like it had missed.
  const anim = useAnimationProps("bouncy", { opacity: 0, scale: 0.92 });

  return (
    <YStack
      testID="village-scene-viewer"
      position="absolute"
      t={0}
      l={0}
      r={0}
      b={0}
      // The literal, not `$background`: that token is not opaque here, and a `contain` fit
      // letterboxes, so the building tiles read straight through the bars behind the picture.
      style={{ backgroundColor: rawColors.bgDark }}
      items="center"
      justify="center"
      onPress={onClose}
      accessibilityRole="button"
      accessibilityLabel={t("village.close_scene", "Close")}
      {...anim}
    >
      <Image
        source={getVillageTierAsset(tier)}
        style={{ width: "100%", height: "100%" }}
        contentFit="contain"
        transition={200}
      />

      {/* The same motes as the scene, over the picture's own area rather than the whole screen:
          `contain` letterboxes a square source on a tall phone, and embers drifting through the
          bars would give away where the image stops. They mount with the viewer, so the tap that
          opens it is answered by something moving, not just a still frame appearing. */}
      <YStack
        position="absolute"
        width={width}
        height={width}
        pointerEvents="none"
        style={{ top: (height - width) / 2 }}
      >
        <VillageEmbers heroHeight={width} heroWidth={width} tier={tier} />
      </YStack>

      <YStack position="absolute" b={insets.bottom + 24} px="$4" gap="$1" items="center">
        <Text fontWeight="700" fontSize={22} color="$text">
          {title}
        </Text>
        <Text fontSize={13} color="$muted">
          {t("village.tap_to_close", "Tap anywhere to close")}
        </Text>
      </YStack>
    </YStack>
  );
}
