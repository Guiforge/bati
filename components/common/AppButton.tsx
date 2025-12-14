import type { ReactNode } from "react";
import { Button } from "tamagui";

type AppButtonVariant = "primary" | "secondary" | "outline";

interface AppButtonProps {
  variant?: AppButtonVariant;
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  opacity?: number;
  marginBottom?: string;
  backgroundColor?: string;
}

export function AppButton({
  variant = "primary",
  children,
  onPress,
  disabled,
  opacity,
  marginBottom,
  backgroundColor,
}: AppButtonProps) {
  const getBackgroundColor = () => {
    if (backgroundColor) return backgroundColor;
    if (variant === "secondary") return "$secondary";
    if (variant === "outline") return "transparent";
    return "$primary";
  };

  const getColor = () => {
    if (variant === "outline") return "$color";
    return "white";
  };

  return (
    <Button
      onPress={onPress}
      disabled={disabled}
      opacity={opacity}
      marginBottom={marginBottom}
      size="$6"
      width="100%"
      borderWidth={3}
      borderRadius="$8"
      borderColor={variant === "outline" ? "$color" : "$color"}
      fontWeight="900"
      fontSize={20}
      shadowColor="$color"
      shadowRadius={0}
      shadowOffset={{ width: 4, height: 4 }}
      pressStyle={{ x: 4, y: 4, shadowOffset: { width: 0, height: 0 } }}
      animation="quick"
      backgroundColor={getBackgroundColor()}
      color={getColor()}
    >
      {children}
    </Button>
  );
}
