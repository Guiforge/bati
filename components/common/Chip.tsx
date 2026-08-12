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
  if (tone === "secondary") return "$white";
  if (tone === "primary" || tone === "success") return "$bgDark";
  return "$text";
}

export function Chip({ label, icon, tone = "default", ...props }: ChipProps) {
  const isPressable = typeof props.onPress === "function";

  return (
    <YStack
      minH={isPressable ? 44 : undefined}
      justify={isPressable ? "center" : undefined}
      bg={toneToBg(tone)}
      borderWidth={isPressable ? 2 : 1}
      borderColor="$borderStrong"
      rounded={isPressable ? "$10" : "$4"}
      px={isPressable ? "$3" : "$2"}
      py={isPressable ? "$2" : "$1"}
      opacity={isPressable ? 1 : 0.92}
      pressStyle={
        isPressable
          ? {
              opacity: 0.92,
              scale: 0.99,
              bg: tone === "default" ? "$background" : toneToBg(tone),
            }
          : undefined
      }
      {...props}
    >
      <XStack items="center" gap="$2">
        {icon}
        <Text fontWeight="700" fontSize={13} color={toneToText(tone)}>
          {label}
        </Text>
      </XStack>
    </YStack>
  );
}
