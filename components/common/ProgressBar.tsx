import { useWindowDimensions } from "react-native";
import type { ColorTokens } from "tamagui";
import { Text, XStack, YStack } from "tamagui";

/** One end of the scale: "level 5 · 1,000 XP" is a `lead` and a `value`; "3,000 reps" is a value. */
export type BarEnd = { lead?: string; value: string };

/** From this font scale up the ends stack, lead over value, rather than wrap in the middle. */
// Not 1.3: Android's 130 % option reaches JS as a float32, 1.29999995, which a `>= 1.3` misses.
const STACK_FROM_SCALE = 1.29;
const NBSP = "\u00a0";

type Props = {
  progress: number; // 0 to 100
  height?: number;
  color?: ColorTokens | string;
  trackColor?: ColorTokens | string;
  /** For screens where the bar's *absence* is the rule — a card must never show two gauges. */
  testID?: string;
  /** What is done or what is left, above the bar, in gold. */
  caption?: string;
  /** The two ends, under the bar: a bar is never a measure without its unit. */
  ends?: { left: BarEnd; right: BarEnd };
};

function End({ end, stacked, right }: { end: BarEnd; stacked: boolean; right: boolean }) {
  // Spaces inside a part never break: the line may only break between lead and value.
  const solid = (text: string) => text.replaceAll(" ", NBSP);
  const parts = (end.lead === undefined ? [end.value] : [end.lead, end.value]).map(solid);
  const shown = stacked ? parts : [parts.join(" · ")];
  return (
    <YStack shrink={1} items={right ? "flex-end" : "flex-start"}>
      {shown.map((line) => (
        <Text
          key={line}
          fontFamily="$body"
          fontSize={11.5}
          fontWeight="600"
          color="$textSecondary"
          style={{ textAlign: right ? "right" : "left" }}
        >
          {line}
        </Text>
      ))}
    </YStack>
  );
}

export function ProgressBar({
  progress,
  height = 8,
  color = "$primary",
  trackColor = "$surface2",
  testID,
  caption,
  ends,
}: Props) {
  const clamped = Math.min(100, Math.max(0, progress));
  const { fontScale } = useWindowDimensions();

  const bar = (
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
  if (caption === undefined && ends === undefined) return bar;

  const stacked = fontScale >= STACK_FROM_SCALE;
  return (
    <YStack gap={6} width="100%">
      {caption === undefined ? null : (
        <Text fontFamily="$body" fontSize={13} fontWeight="700" color="$resourceGold">
          {caption}
        </Text>
      )}
      {bar}
      {ends === undefined ? null : (
        <XStack justify="space-between" gap="$2">
          <End end={ends.left} stacked={stacked} right={false} />
          <End end={ends.right} stacked={stacked} right />
        </XStack>
      )}
    </YStack>
  );
}
