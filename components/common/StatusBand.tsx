import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YStack } from "tamagui";

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
      // Opaque: at 0.92 the white of a heading still showed through as ghost text by the clock.
      bg="$bgDark"
      pointerEvents="none"
    />
  );
}
