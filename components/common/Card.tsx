import type { ReactNode } from "react";
import { YStack, type YStackProps } from "tamagui";

export type CardProps = Omit<YStackProps, "children"> & {
  children: ReactNode;
};

export function Card({ children, ...props }: CardProps) {
  return (
    <YStack
      bg="$cardBackground"
      borderWidth={3}
      borderColor="$color"
      rounded="$8"
      p="$4"
      shadowColor="$color"
      shadowRadius={0}
      shadowOffset={{ width: 0, height: 6 }}
      pressStyle={props.onPress ? { opacity: 0.92, scale: 0.99 } : undefined}
      {...props}
    >
      {children}
    </YStack>
  );
}
