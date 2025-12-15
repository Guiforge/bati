import type { ReactNode } from "react";
import { Button, type ColorTokens, type SpaceTokens } from "tamagui";

type AppButtonVariant = "primary" | "secondary" | "outline";

interface AppButtonProps {
  variant?: AppButtonVariant;
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  opacity?: number;
  marginBottom?: SpaceTokens | number;
  marginTop?: SpaceTokens | number;
  backgroundColor?: ColorTokens;
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
  const getBackgroundColor = (): ColorTokens => {
    if (backgroundColor) return backgroundColor;
    if (variant === "secondary") return "$secondary";
    if (variant === "outline") return "$background";
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
      mb={marginBottom}
      mt={marginTop}
      size="$6"
      width="100%"
      borderWidth={3}
      rounded="$8"
      borderColor={variant === "outline" ? "$color" : "$color"}
      fontWeight="900"
      fontSize={20}
      shadowColor="$color"
      shadowRadius={0}
      shadowOffset={{ width: 4, height: 4 }}
      pressStyle={{ scale: 0.98, opacity: 0.92, shadowOffset: { width: 0, height: 0 } }}
      animation="quick"
      bg={getBackgroundColor()}
      color={getColor()}
    >
      {children}
    </Button>
  );
}
