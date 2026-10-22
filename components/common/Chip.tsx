import type { ReactNode } from "react";
import { type ColorTokens, Text, XStack, YStack, type YStackProps } from "tamagui";
import { Check } from "@/components/icons";

export type ChipProps = Omit<YStackProps, "children"> & {
  label: string;
  icon?: ReactNode;
  tone?: "default" | "primary" | "success";
  /** Overrides the label colour only: a metric that wears its own role (gold XP). */
  textColor?: ColorTokens;
  /**
   * A choice among options: true fills the chip, puts a check before the label and tells
   * TalkBack it is selected, so the pick is never carried by the fill alone. Absent for a chip
   * that is not one of several (a plain action, a filter that reads its own state).
   */
  selected?: boolean;
};

function toneToBg(tone: ChipProps["tone"]) {
  if (tone === "primary") return "primary";
  if (tone === "success") return "success";
  return "bgLight";
}

function toneToText(tone: ChipProps["tone"]) {
  if (tone === "primary") return "onPrimary";
  if (tone === "success") return "bgDark";
  return "text";
}

/** A chip that does nothing is metadata: flat, small, a little dimmed. */
const FLAT_FRAME = {
  borderWidth: 1,
  rounded: "1",
  px: "2",
  py: "1",
  opacity: 0.92,
} as const;

/**
 * One that can be pressed is a button: 44 dp, a heavier edge, and a press response. A caller's
 * numeric opacity is its resting value: passed through as a prop it would replace the whole
 * program and lose the press dim (v2 kept `pressStyle` on top of it).
 */
function pressableFrame(tone: NonNullable<ChipProps["tone"]>, resting: number) {
  return {
    minH: 44,
    justify: "center",
    borderWidth: 2,
    rounded: "3",
    px: "3",
    py: "2",
    opacity: `${resting} press:0.92`,
    scale: "press:0.99",
    bg: `${toneToBg(tone)} press:${tone === "default" ? "background" : toneToBg(tone)}`,
  } as const;
}

export function Chip({
  label,
  icon: iconProp,
  tone: toneProp = "default",
  textColor,
  selected,
  opacity,
  ...props
}: ChipProps) {
  const isPressable = typeof props.onPress === "function";
  const merged = isPressable && typeof opacity === "number";
  const picked = selected === true;
  const tone = picked ? "primary" : toneProp;
  const icon = picked ? <Check size={14} color={toneToText(tone)} /> : iconProp;

  return (
    <YStack
      bg={toneToBg(tone)}
      borderColor="borderStrong"
      {...(isPressable ? pressableFrame(tone, merged ? opacity : 1) : FLAT_FRAME)}
      {...(merged || opacity === undefined ? {} : { opacity })}
      // Every chip that can be pressed says so; the state rides along when it is a choice.
      accessible={isPressable ? true : undefined}
      accessibilityRole={isPressable ? "button" : undefined}
      accessibilityState={selected === undefined ? undefined : { selected }}
      {...props}
    >
      <XStack items="center" gap="2">
        {icon}
        <Text fontWeight="700" fontSize={13} color={textColor ?? toneToText(tone)}>
          {label}
        </Text>
      </XStack>
    </YStack>
  );
}
