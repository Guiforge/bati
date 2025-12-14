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
  marginTop?: string;
  backgroundColor?: string;
}

export function AppButton({
  variant = "primary",
  children,
  onPress,
  disabled,
  opacity,
  marginBottom,
  marginTop,
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
      marginTop={marginTop}
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
      pressStyle={{ scale: 0.98, opacity: 0.92, shadowOffset: { width: 0, height: 0 } }}
      animation="quick"
      backgroundColor={getBackgroundColor()}
      color={getColor()}
    >
      {children}
    </Button>
  );
}
