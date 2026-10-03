import { type ColorValue, Text } from "react-native";

/**
 * A bottom tab's label that shrinks to its slot instead of clipping.
 *
 * The default label is one line at a fixed size: at 130 percent font scale "Adventures" was
 * cut to "Advent...". The tab keeps its name; the text gives up to 30 percent of its size to fit.
 */
export function TabLabel({ color, label }: { color: ColorValue; label: string }) {
  return (
    <Text
      testID="tab-label"
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
      style={{ color, fontWeight: "700", fontSize: 12, textAlign: "center", alignSelf: "stretch" }}
    >
      {label}
    </Text>
  );
}
