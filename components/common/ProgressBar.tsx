import type { ColorTokens } from "tamagui";
import { XStack, YStack } from "tamagui";

type Props = {
  progress: number; // 0 to 100
  height?: number;
  color?: ColorTokens | string;
  trackColor?: ColorTokens | string;
  /** For screens where the bar's *absence* is the rule — a card must never show two gauges. */
  testID?: string;
};

export function ProgressBar({
  progress,
  height = 8,
  color = "$primary",
  trackColor = "$surface2",
  testID,
}: Props) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <XStack
      testID={testID}
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
