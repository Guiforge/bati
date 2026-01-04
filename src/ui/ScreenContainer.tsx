import type { ReactNode } from "react";
import { type Edge, SafeAreaView } from "react-native-safe-area-context";
import { YStack } from "tamagui";

export type ScreenContainerProps = {
  children: ReactNode;
  /**
   * Safe area edges to apply.
   * Defaults to ["top", "bottom"].
   */
  edges?: Edge[];
  /**
   * If true, removes default horizontal padding.
   */
  noGutter?: boolean;
};

/**
 * UI-only container.
 * - Owns safe areas
 * - Applies the NEW_STYLE background
 * - Standardizes screen padding
 */
export function ScreenContainer({ children, edges, noGutter }: ScreenContainerProps) {
  return (
    <SafeAreaView edges={edges ?? ["top", "bottom"]} style={{ flex: 1 }}>
      <YStack flex={1} bg="$background" px={noGutter ? 0 : "$4"} py="$3">
        {children}
      </YStack>
    </SafeAreaView>
  );
}
