import type { ComponentProps, ReactNode } from "react";
import type { GestureResponderEvent } from "react-native";
import { Card } from "tamagui";

export type GlassCardProps = {
  children: ReactNode;
  onPress?: ((event: GestureResponderEvent) => void) | undefined;
} & Omit<ComponentProps<typeof Card>, "children" | "onPress">;

/**
 * NEW_STYLE glassmorphism-ish card.
 * The translucency is encoded in tokens (no rgba/hex in views).
 */
export function GlassCard({ children, onPress, ...props }: GlassCardProps) {
  const defaultPressStyle = { opacity: 0.95, scale: 0.99 };
  const pressStyle = onPress ? (props.pressStyle ?? defaultPressStyle) : props.pressStyle;

  return (
    <Card
      bg="$glassBg"
      borderWidth={1}
      borderColor="$glassBorder"
      rounded="$6"
      p="$4"
      shadowColor="$shadowColor"
      shadowOpacity={0.25}
      shadowRadius={16}
      shadowOffset={{ width: 0, height: 14 }}
      {...props}
      pressStyle={pressStyle}
      onPress={onPress}
    >
      {children}
    </Card>
  );
}
