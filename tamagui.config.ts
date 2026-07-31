import { createAnimations } from "@tamagui/animations-react-native";
import { defaultConfig } from "@tamagui/config/v4";
import { createFont, createTamagui, createTokens } from "tamagui";
import { rawColors } from "@/constants/rawColors";

// -------------------------------------------------------------------------
// 1. TYPOGRAPHY (The Voice of the RPG)
// -------------------------------------------------------------------------
// Note: You must load these fonts in your root _layout.tsx using expo-font
const headingFont = createFont({
  family: "SpaceGrotesk",
  size: {
    1: 14,
    2: 18,
    3: 24,
    4: 32,
    5: 40, // Hero/Logo size
    6: 48,
    true: 18,
  },
  lineHeight: {
    1: 20,
    2: 26,
    3: 32,
    4: 40,
    5: 50,
  },
  weight: {
    4: "300",
    7: "700",
  },
  letterSpacing: {
    4: 0,
    5: 4, // "tracking-widest" style
  },
  face: {
    300: { normal: "SpaceGrotesk_300Light" },
    700: { normal: "SpaceGrotesk_700Bold" },
  },
});

const bodyFont = createFont({
  family: "NotoSans",
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20,
    6: 24,
    true: 16,
  },
  lineHeight: {
    3: 24,
    5: 28,
    6: 32,
  },
  weight: {
    4: "400",
    5: "500",
    7: "700",
  },
  face: {
    400: { normal: "NotoSans_400Regular" },
    700: { normal: "NotoSans_700Bold" },
  },
});

// -------------------------------------------------------------------------
// 2. ANIMATIONS (Game Feel)
// -------------------------------------------------------------------------
const animations = createAnimations({
  bouncy: {
    type: "spring",
    damping: 14,
    mass: 0.8,
    stiffness: 150,
  },
  // The standard interaction animation (Buttons, Cards). Tuned for ~150-200ms
  // settle, no overshoot: press feedback must never lag behind the tap.
  quick: {
    type: "spring",
    damping: 30,
    mass: 1,
    stiffness: 400,
  },
});

// -------------------------------------------------------------------------
// 3. TOKENS (Palette)
// -------------------------------------------------------------------------
const tokens = createTokens({
  ...defaultConfig.tokens,
  // Every value comes from constants/rawColors.ts. Nothing here is a literal: that file is the
  // one place a colour is written down, which is what makes the no-raw-hex lint rule
  // (.biome/plugins/noRawHexColor.grit) enforceable with no exceptions to remember.
  color: { ...rawColors },
});

// -------------------------------------------------------------------------
// 4. CONFIG EXPORT
// -------------------------------------------------------------------------
export const config = createTamagui({
  ...defaultConfig,
  animations,
  tokens,
  fonts: {
    heading: headingFont,
    body: bodyFont,
  },
  themes: {
    // We force a unified DARK theme structure even for 'light' key
    // to prevent white flash if system theme is light.
    // Every colour token is a theme key: SVG icons (@tamagui/lucide-icons)
    // resolve `color="$x"` against the theme only, never the token map.
    light: {
      ...tokens.color,
      background: tokens.color.bgOverlay,
      color: tokens.color.text,
      danger: tokens.color.error, // alias, no matching token
      muted: tokens.color.textSecondary, // deliberately not tokens.color.muted
    },
    dark: {
      ...tokens.color,
      background: tokens.color.bgOverlay,
      color: tokens.color.text,
      danger: tokens.color.error,
      muted: tokens.color.textSecondary,
    },
  },
});

export default config;
