import { styled, Paragraph as TamaguiParagraph } from "tamagui";

/**
 * Tamagui's `Paragraph`, not selectable. Its stock `userSelect: "auto"` did nothing on native in
 * v2; Tamagui 3 turns it into RN's `selectable`, so every paragraph opened a selection on a long
 * press and could take the touch from a pressable around it. `select="text"` still opts one in.
 */
export const Paragraph = styled(TamaguiParagraph, { select: "none" });
