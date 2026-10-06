import type { ComponentProps, ReactNode } from "react";
import { Button, type ColorTokens, type SpaceTokens } from "tamagui";

type AppButtonVariant = "primary" | "outline";

type TamaguiButtonProps = ComponentProps<typeof Button>;

interface AppButtonProps
  extends Omit<TamaguiButtonProps, "children" | "variant" | "pressStyle" | "rounded" | "bg"> {
  variant?: AppButtonVariant;
  children: ReactNode;
  marginBottom?: SpaceTokens | number;
  marginTop?: SpaceTokens | number;
  backgroundColor?: ColorTokens;
  fullWidth?: boolean;
}

const LIGHT_FILLS: ColorTokens[] = ["$success", "$error", "$warning", "$resourceGold"];

export function AppButton({
  variant = "primary",
  children,
  marginBottom,
  marginTop,
  backgroundColor,
  fullWidth = true,
  ...buttonProps
}: AppButtonProps) {
  // A disabled primary still reads as a button: a quiet surface, an ash label, no edge to press.
  const dimmed = variant === "primary" && buttonProps.disabled === true;
  const getBackgroundColor = (): ColorTokens => {
    if (dimmed) return "$surface2";
    if (backgroundColor) return backgroundColor;
    if (variant === "outline") return "$background";
    return "$primary";
  };

  // The label follows its fill (spec rule 1): onPrimary on the braise, bone on the outline,
  // and ink on the light signal fills, where a pale label measures 3:1.
  const onLightFill = backgroundColor !== undefined && LIGHT_FILLS.includes(backgroundColor);
  const getColor = (): ColorTokens => {
    if (dimmed) return "$textSecondary";
    if (backgroundColor === "$error") return "$onError";
    if (onLightFill) return "$bgDark";
    return variant === "outline" ? "$text" : "$onPrimary";
  };
  // The seal: a bottom edge on the braise only. A braise edge under red would be wrong.
  const seal = variant === "primary" && !backgroundColor && !dimmed;

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
      // A label is never cut: "Comment marche le chiffre…" read as a broken button at 130 % text in French.
      // Tamagui fixes a button's height and its text to one line (`ellipsis` cannot be switched off from
      // the button, measured); the label below wraps instead, and a short one is as tall as before
      // (`minH` is the floor).
      height="auto"
      py="$2"
      width={fullWidth ? "100%" : undefined}
      borderWidth={1}
      rounded="$3"
      borderColor="$borderStrong"
      fontFamily="$heading"
      fontWeight="700"
      fontSize={20}
      // A translate, never a border-width change, so nothing below the button moves. No
      // `transition` anywhere: Tamagui runs its animation hooks only when one is set, so a
      // caller toggling backgroundColor or variant on a mounted button changed the hook shape
      // and threw. Presses are instant.
      {...(seal
        ? {
            borderBottomWidth: 3,
            borderBottomColor: "$primaryEdge",
            pressStyle: { y: 2, borderBottomColor: "$primary", opacity: 0.95 },
          }
        : { pressStyle: { opacity: 0.9, scale: 0.98 } })}
      {...buttonProps}
    >
      {typeof children === "string" ? (
        <Button.Text numberOfLines={0}>{children}</Button.Text>
      ) : (
        children
      )}
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
