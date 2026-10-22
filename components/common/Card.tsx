import type { ReactNode } from "react";
import { YStack, type YStackProps } from "tamagui";

export type CardProps = Omit<YStackProps, "children"> & {
  children: ReactNode;
};

export function Card({ children, ...props }: CardProps) {
  return (
    <YStack
      bg="surface"
      borderWidth={1}
      borderColor="borderStrong"
      rounded="3"
      p="4"
      opacity={props.onPress ? "press:0.92" : undefined}
      scale={props.onPress ? "press:0.99" : undefined}
      accessibilityRole={props.onPress ? "button" : undefined}
      {...props}
    >
      {children}
    </YStack>
  );
}
