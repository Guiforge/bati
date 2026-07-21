import type { ComponentProps, ReactNode } from "react";
import { Button, type ColorTokens, type SpaceTokens } from "tamagui";

type AppButtonVariant = "primary" | "secondary" | "outline";

type TamaguiButtonProps = ComponentProps<typeof Button>;

interface AppButtonProps extends Omit<TamaguiButtonProps, "children" | "variant"> {
  variant?: AppButtonVariant;
  children: ReactNode;
  marginBottom?: SpaceTokens | number;
  marginTop?: SpaceTokens | number;
  backgroundColor?: ColorTokens;
  fullWidth?: boolean;
}

export function AppButton({
  variant = "primary",
  children,
  marginBottom,
  marginTop,
  backgroundColor,
  fullWidth = true,
  ...buttonProps
}: AppButtonProps) {
  const getBackgroundColor = (): ColorTokens => {
    if (backgroundColor) return backgroundColor;
    if (variant === "secondary") return "$secondary";
    if (variant === "outline") return "$background";
    return "$primary";
  };

  const getColor = () => {
    if (variant === "outline") return "$text";
    if (variant === "secondary") return "white";
    return "$text";
  };

  return (
    <Button
      mb={marginBottom}
      mt={marginTop}
      bg={getBackgroundColor()}
      color={getColor()}
      size="$4"
      width={fullWidth ? "100%" : undefined}
      borderWidth={1}
      rounded="$8"
      borderColor="$borderStrong"
      fontWeight="700"
      fontSize={20}
      animation="quick"
      pressStyle={{ opacity: 0.9, scale: 0.98 }}
      {...buttonProps}
    >
      {children}
    </Button>
  );
}

type AppIconButtonProps = Omit<TamaguiButtonProps, "children" | "variant"> & {
  children: ReactNode;
};

export function AppIconButton({ children, ...buttonProps }: AppIconButtonProps) {
  return (
    <Button
      width={44}
      height={44}
      p={0}
      rounded={22}
      bg="$bgLight"
      borderWidth={1}
      borderColor="$borderStrong"
      pressStyle={{ opacity: 0.9 }}
      {...buttonProps}
    >
      {children}
    </Button>
  );
}
