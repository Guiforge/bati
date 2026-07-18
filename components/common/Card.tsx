import type { ReactNode } from "react";
import { YStack, type YStackProps } from "tamagui";

export type CardProps = Omit<YStackProps, "children"> & {
  children: ReactNode;
};

export function Card({ children, ...props }: CardProps) {
  return (
    <YStack
      bg="$surface"
      borderWidth={1}
      borderColor="$borderStrong"
      rounded="$8"
      p="$4"
      shadowColor="$shadowColor"
      shadowRadius={12}
      shadowOpacity={0.14}
      shadowOffset={{ width: 0, height: 6 }}
      pressStyle={props.onPress ? { opacity: 0.92, scale: 0.99 } : undefined}
      accessibilityRole={props.onPress ? "button" : undefined}
      {...props}
    >
      {children}
    </YStack>
  );
}
