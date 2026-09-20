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
    if (variant === "secondary") return "$white";
    return "$text";
  };

  return (
    <Button
      mb={marginBottom}
      mt={marginTop}
      bg={getBackgroundColor()}
      color={getColor()}
      size="$4"
      // The floor, not the size. `$4` clears it on its own, but a caller passing `size="$3"`
      // for compact type used to take the hit area down with it: the oath screen's "Custom
      // oath" measured 36 dp tall. Yoga clamps a height to the larger minimum, so the type
      // stays compact and the target does not shrink. Before the spread, so a caller that
      // really wants something shorter still can.
      minH={44}
      width={fullWidth ? "100%" : undefined}
      borderWidth={1}
      rounded="$8"
      borderColor="$borderStrong"
      fontWeight="700"
      fontSize={20}
      transition="quick"
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
      // 44×44 is the default, but callers spread over it — the quest gallery draws this at 36×36,
      // and shrinking the button shrank the tap target with it, under the 44×44 floor DESIGN.md
      // sets. hitSlop restores the hit area without touching the design, and sits before the
      // spread so a caller can still widen or drop it deliberately.
      hitSlop={8}
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
