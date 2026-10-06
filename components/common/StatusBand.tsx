import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YStack } from "tamagui";
import { fade, rawColors } from "@/constants/rawColors";

/**
 * An ink band the height of the status bar, over a scroll view with no art behind it: content
 * slid under the clock as ghost text otherwise. Never on a screen whose art runs under the bar,
 * and it never takes a touch.
 */
export function StatusBand() {
  const insets = useSafeAreaInsets();
  return (
    <YStack
      testID="status-band"
      position="absolute"
      t={0}
      l={0}
      r={0}
      height={insets.top}
      bg={fade(rawColors.bgDark, 0.92)}
      pointerEvents="none"
    />
  );
}
