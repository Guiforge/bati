import type { ComponentProps, ReactNode } from "react";
import type { GestureResponderEvent } from "react-native";
import { Card } from "tamagui";

export type SolidCardProps = {
  children: ReactNode;
  onPress?: ((event: GestureResponderEvent) => void) | undefined;
} & Omit<ComponentProps<typeof Card>, "children" | "onPress">;

/**
 * NEW_STYLE solid surface card.
 * UI-only (no data loading).
 */
export function SolidCard({ children, onPress, ...props }: SolidCardProps) {
  const defaultPressStyle = { opacity: 0.95, scale: 0.99 };
  const pressStyle = onPress ? (props.pressStyle ?? defaultPressStyle) : props.pressStyle;

  return (
    <Card
      bg="$surface"
      borderWidth={1}
      borderColor="$borderStrong"
      rounded="$6"
      p="$4"
      shadowColor="$shadowColor"
      shadowOpacity={0.35}
      shadowRadius={12}
      shadowOffset={{ width: 0, height: 10 }}
      {...props}
      pressStyle={pressStyle}
      onPress={onPress}
    >
      {children}
    </Card>
  );
}
