import type { ReactNode } from "react";
import { YStack, type YStackProps } from "tamagui";

const SHADOW_OFFSET = { width: 0, height: 6 };
const PRESS_STYLE = { opacity: 0.92, scale: 0.99 };

export type CardProps = Omit<YStackProps, "children"> & {
  children: ReactNode;
  /** Skip the drop shadow — list rows and grid tiles pay a per-frame shadow pass while scrolling. */
  flat?: boolean;
};

export function Card({ children, flat, ...props }: CardProps) {
  return (
    <YStack
      bg="$surface"
      borderWidth={1}
      borderColor="$borderStrong"
      rounded="$8"
      p="$4"
      {...(flat
        ? null
        : {
            shadowColor: "$shadowColor",
            shadowRadius: 12,
            shadowOpacity: 0.14,
            shadowOffset: SHADOW_OFFSET,
          })}
      pressStyle={props.onPress ? PRESS_STYLE : undefined}
      accessibilityRole={props.onPress ? "button" : undefined}
      {...props}
    >
      {children}
    </YStack>
  );
}
