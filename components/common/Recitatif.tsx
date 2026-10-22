import type { ReactNode } from "react";
import { Text, YStack } from "tamagui";

/**
 * The BD caption box: a title over a painting sits in an ink cartouche pinned to an edge of the
 * art, instead of white letters on a gradient. Legible on any illustration, and the image stays
 * whole. The caller positions it (absolute, at the edge it wants); this only draws the box.
 */
export function Recitatif({
  children,
  testID,
  numberOfLines,
  maxFontSizeMultiplier,
  adjustsFontSizeToFit,
}: {
  children: ReactNode;
  testID?: string;
  numberOfLines?: number;
  /** For a caption that repeats text shown larger elsewhere, on a plate too small to scale it. */
  maxFontSizeMultiplier?: number;
  /** With `numberOfLines`, a long title shrinks to its line instead of being cut. */
  adjustsFontSizeToFit?: boolean;
}) {
  return (
    <YStack
      testID={testID}
      self="flex-start"
      bg="bgDark"
      borderWidth={1}
      borderColor="borderStrong"
      rounded="1"
      px="2"
      py="1"
    >
      <Text
        accessibilityRole="header"
        numberOfLines={numberOfLines}
        fontFamily="heading"
        fontWeight="700"
        fontSize="3"
        color="text"
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        adjustsFontSizeToFit={adjustsFontSizeToFit}
      >
        {children}
      </Text>
    </YStack>
  );
}
