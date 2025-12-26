import type { ReactNode } from "react";
import { Text, XStack, YStack, type YStackProps } from "tamagui";

export type ChipProps = Omit<YStackProps, "children"> & {
  label: string;
  icon?: ReactNode;
  tone?: "default" | "primary" | "secondary" | "success";
};

function toneToBg(tone: ChipProps["tone"]) {
  if (tone === "primary") return "$primary";
  if (tone === "secondary") return "$secondary";
  if (tone === "success") return "$success";
  return "$bgLight";
}

function toneToText(tone: ChipProps["tone"]) {
  if (tone === "secondary") return "white";
  if (tone === "primary" || tone === "success") return "$bgDark";
  return "$color";
}

export function Chip({ label, icon, tone = "default", ...props }: ChipProps) {
  const isPressable = typeof props.onPress === "function";
  const minTapStyle = isPressable ? { minHeight: 44, justifyContent: "center" } : undefined;

  return (
    <YStack
      bg={toneToBg(tone)}
      borderWidth={2}
      borderColor="$color"
      rounded="$10"
      px="$3"
      py="$2"
      {...props}
      style={isPressable ? [minTapStyle, props.style] : props.style}
    >
      <XStack items="center" gap="$2">
        {icon}
        <Text fontWeight="900" fontSize={13} color={toneToText(tone)}>
          {label}
        </Text>
      </XStack>
    </YStack>
  );
}
