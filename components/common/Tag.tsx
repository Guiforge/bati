import type { ReactNode } from "react";
import { type ColorTokens, Text, XStack, YStack, type YStackProps } from "tamagui";

export type TagProps = Omit<YStackProps, "children"> & {
  label: string;
  icon?: ReactNode;
  tone?: "default" | "primary" | "secondary" | "success";
};

function toneToBg(tone: TagProps["tone"]): ColorTokens {
  if (tone === "primary") return "$pastelBlue";
  if (tone === "secondary") return "$pastelPink";
  if (tone === "success") return "$pastelGreen";
  return "$bgLight";
}

function toneToText(tone: TagProps["tone"]): ColorTokens {
  if (tone === "primary") return "$text";
  if (tone === "secondary") return "$text";
  if (tone === "success") return "$text";
  return "$text";
}

/**
 * Non-interactive metadata label.
 * Use this for info that is NOT clickable (so it shouldn't look like a button/pill).
 */
export function Tag({ label, icon, tone = "default", ...props }: TagProps) {
  return (
    <YStack
      bg={toneToBg(tone)}
      // Intentionally NOT pill-like (non-clickable metadata).
      // Keep it flatter and less "buttony" than Chip.
      opacity={0.92}
      rounded="$3"
      px="$2"
      py="$1"
      {...props}
    >
      <XStack items="center" gap="$1">
        {icon}
        <Text fontWeight="700" fontSize={12} color={toneToText(tone)} opacity={0.82}>
          {label}
        </Text>
      </XStack>
    </YStack>
  );
}
