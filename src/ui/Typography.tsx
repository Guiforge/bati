import type { ReactNode } from "react";
import { Text } from "tamagui";

export type TypographyProps = {
  children: ReactNode;
  muted?: boolean;
};

/**
 * Title style used across NEW_STYLE screens.
 */
export function RPGTitle({ children, muted }: TypographyProps) {
  return (
    <Text fontSize={22} fontWeight="900" color={muted ? "$muted" : "$color"}>
      {children}
    </Text>
  );
}

/**
 * Body text style used across NEW_STYLE screens.
 */
export function RPGText({ children, muted }: TypographyProps) {
  return (
    <Text fontSize={14} lineHeight={20} color={muted ? "$muted" : "$color"}>
      {children}
    </Text>
  );
}
