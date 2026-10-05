import type { ReactNode } from "react";
import { YStack, type YStackProps } from "tamagui";

const PRESS_STYLE = { opacity: 0.92, scale: 0.99 };

export type CardProps = Omit<YStackProps, "children"> & {
  children: ReactNode;
};

export function Card({ children, ...props }: CardProps) {
  return (
    <YStack
      bg="$surface"
      borderWidth={1}
      borderColor="$borderStrong"
      rounded="$3"
      p="$4"
      pressStyle={props.onPress ? PRESS_STYLE : undefined}
      accessibilityRole={props.onPress ? "button" : undefined}
      {...props}
    >
      {children}
    </YStack>
  );
}
