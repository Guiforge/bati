import type { ReactNode } from "react";
import { type ColorTokens, Text, XStack, YStack, type YStackProps } from "tamagui";
export type TagProps = Omit<YStackProps, "children"> & {
  label: string;
  icon?: ReactNode;
  tone?: "default" | "primary" | "success";
  /** Overrides the label colour only: a metric that wears its own role (gold XP, a difficulty). */
  textColor?: ColorTokens;
};

function toneToBg(tone: TagProps["tone"]): ColorTokens {
  if (tone === "primary") return "$pastelBlue";
  if (tone === "success") return "$pastelGreen";
  return "$bgLight";
}

function toneToText(tone: TagProps["tone"]): ColorTokens {
  if (tone === "primary") return "$text";
  if (tone === "success") return "$text";
  return "$text";
}

/**
 * Non-interactive metadata label.
 * Use this for info that is NOT clickable (so it shouldn't look like a button/pill).
 */
export function Tag({ label, icon, tone = "default", textColor, ...props }: TagProps) {
  return (
    <YStack
      bg={toneToBg(tone)}
      // Intentionally NOT pill-like (non-clickable metadata).
      // Keep it flatter and less "buttony" than Chip.
      opacity={0.92}
      rounded="$1"
      px="$2"
      py="$1"
      {...props}
    >
      <XStack items="center" gap="$1">
        {icon}
        <Text
          fontWeight="700"
          fontSize={12}
          color={textColor ?? toneToText(tone)}
          // A role colour keeps the container's 0.92 only: at 0.82 more, `$error` falls to 3.6:1
          // on the tag (4.75:1 without), under AA for 12 px text.
          opacity={textColor ? 1 : 0.82}
        >
          {label}
        </Text>
      </XStack>
    </YStack>
  );
}
