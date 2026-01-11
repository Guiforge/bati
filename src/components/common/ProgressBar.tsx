import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import type { ColorTokens } from "tamagui";
import { useTheme, XStack } from "tamagui";

type Props = {
  progress: number; // 0 to 100
  height?: number;
  color?: ColorTokens | string;
  trackColor?: ColorTokens | string;
};

export function ProgressBar({
  progress,
  height = 8,
  color = "$primary",
  trackColor = "rgba(0,0,0,0.1)",
}: Props) {
  const clamped = Math.min(100, Math.max(0, progress));
  const theme = useTheme();

  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(`${clamped}%`, { duration: 800 }),
  }));

  // Resolve color token to actual hex value
  const resolvedColor = color.toString().startsWith("$")
    ? theme[color.toString().slice(1) as keyof typeof theme]?.val || color
    : color;

  return (
    <XStack
      height={height}
      bg={trackColor as ColorTokens}
      borderRadius={height / 2}
      overflow="hidden"
      width="100%"
    >
      <Animated.View
        style={[
          animatedStyle,
          {
            height: "100%",
            backgroundColor: resolvedColor as string,
            borderRadius: height / 2,
          },
        ]}
      />
    </XStack>
  );
}
