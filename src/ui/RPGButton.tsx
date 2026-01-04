import type { ReactNode } from "react";
import type { GestureResponderEvent } from "react-native";
import { Button } from "tamagui";

export type RPGButtonVariant = "primary" | "secondary" | "ghost";

export type RPGButtonProps = {
  children: ReactNode;
  variant?: RPGButtonVariant;
  onPress?: ((event: GestureResponderEvent) => void) | undefined;
  disabled?: boolean;
};

/**
 * NEW_STYLE button.
 * UI-only.
 */
export function RPGButton({ children, variant = "primary", onPress, disabled }: RPGButtonProps) {
  const isGhost = variant === "ghost";
  const isSecondary = variant === "secondary";

  return (
    <Button
      bg={isGhost ? "transparent" : isSecondary ? "$surface2" : "$primary"}
      borderWidth={1}
      borderColor={isGhost ? "$borderStrong" : "$borderStrong"}
      color={isGhost ? "$color" : "$color"}
      fontWeight="800"
      rounded="$10"
      height={48}
      pressStyle={{ opacity: 0.92, scale: 0.98 }}
      disabled={disabled}
      onPress={onPress}
      shadowColor={variant === "primary" ? "$primaryGlow" : "$shadowColor"}
      shadowOpacity={variant === "primary" ? 0.8 : 0.25}
      shadowRadius={variant === "primary" ? 18 : 10}
      shadowOffset={{ width: 0, height: 12 }}
    >
      {children}
    </Button>
  );
}
