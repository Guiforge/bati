import { useWindowDimensions } from "react-native";

/**
 * A height cap sized in lines of text, kept in step with the system font scale.
 *
 * A fixed `maxHeight` is a line count only at scale 1: at 1.3 the same box holds four and a half
 * lines and the last one is cut mid-glyph. Never below the base, so a small-text setting does not
 * shrink what was designed at 1.
 */
export function useFontScaled(dp: number): number {
  const { fontScale } = useWindowDimensions();
  return Math.ceil(dp * Math.max(1, fontScale));
}
