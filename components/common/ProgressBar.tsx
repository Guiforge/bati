import type { ColorTokens } from "tamagui";
import { XStack, YStack } from "tamagui";

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
  trackColor = "$surface2",
}: Props) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <XStack
      height={height}
      bg={trackColor as ColorTokens}
      rounded={height / 2}
      overflow="hidden"
      width="100%"
    >
      <YStack height="100%" width={`${clamped}%`} bg={color as ColorTokens} rounded={height / 2} />
    </XStack>
  );
}
