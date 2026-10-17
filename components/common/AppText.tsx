import { Text, type TextProps } from "tamagui";
import { type AppTextVariant, FONT_CAPS } from "@/components/common/fontCaps";

/** `Text` with its font-size cap. An explicit `maxFontSizeMultiplier` still wins. */
export function AppText({ variant = "body", ...props }: TextProps & { variant?: AppTextVariant }) {
  return <Text maxFontSizeMultiplier={FONT_CAPS[variant]} {...props} />;
}
