import { createAnimations } from "@tamagui/animations-react-native";
import { defaultConfig } from "@tamagui/config/v4";
import { createFont, createTamagui, createTokens } from "tamagui";
import { rawColors } from "@/constants/rawColors";

// -------------------------------------------------------------------------
// 1. TYPOGRAPHY (The Voice of the RPG)
// -------------------------------------------------------------------------
// Note: You must load these fonts in your root _layout.tsx using expo-font
// Alegreya: a calligraphic book serif, the voice of a chronicle rather than a dashboard (design
// review 2026-10-05). Its x-height is small, so the scale sits about one step above Space
// Grotesk's. Never tracked, never used for a digit: its figures are old-style and a timer set in
// it jumps. Numbers stay in the body font.
const headingFont = createFont({
  family: "Alegreya",
  size: {
    1: 15,
    2: 20,
    3: 26,
    4: 35,
    5: 44,
    6: 52,
    true: 20,
  },
  lineHeight: {
    1: 20,
    2: 26,
    3: 32,
    4: 42,
    5: 52,
  },
  weight: {
    4: "400",
    7: "700",
  },
  letterSpacing: {
    4: 0,
    5: 0,
  },
  face: {
    400: { normal: "Alegreya_400Regular" },
    700: { normal: "Alegreya_700Bold" },
    800: { normal: "Alegreya_800ExtraBold" },
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

// Inter, the Nocturne design system's one family, for the Journal. Components opt in with `fontFamily="$nocturne"`: a
// sub-theme recolours, but a font is not a theme value.
const nocturneFont = createFont({
  family: "Inter",
  size: { 1: 11, 2: 13, 3: 15, 4: 18, 5: 22, 6: 28, true: 15 },
  lineHeight: { 1: 16, 2: 19, 3: 22, 4: 24, 5: 28, 6: 34 },
  weight: { 4: "400", 5: "500", 6: "600" },
  letterSpacing: { 4: 0 },
  face: {
    400: { normal: "Inter_400Regular" },
    500: { normal: "Inter_500Medium" },
    600: { normal: "Inter_600SemiBold" },
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
// Default export only: app/_layout.tsx and tamagui.d.ts both take the default, and a named
// twin of the same object is one more thing that can be imported inconsistently.
const config = createTamagui({
  ...defaultConfig,
  animations,
  tokens,
  // Every Input, so a field never shows the platform's default grey: next to typed text it read as
  // a filled name and the quest editor refused to save it.
  defaultProps: { Input: { placeholderTextColor: "$textSecondary", rounded: "$3" } },
  fonts: {
    heading: headingFont,
    body: bodyFont,
    nocturne: nocturneFont,
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
      onPrimary: tokens.color.onPrimary,
      danger: tokens.color.error, // alias, no matching token
      muted: tokens.color.textSecondary, // deliberately not tokens.color.muted
      // Stock primitives ask the theme for `borderColor`, and Tamagui logged a missing token for
      // each at every launch. The app's one border colour answers, in every state.
      borderColor: tokens.color.borderStrong,
      borderColorHover: tokens.color.borderStrong,
      borderColorPress: tokens.color.borderStrong,
      borderColorFocus: tokens.color.borderStrong,
    },
    dark: {
      ...tokens.color,
      background: tokens.color.bgOverlay,
      color: tokens.color.text,
      // What is written on a `$primary` fill: light on the app's braise, dark on the Journal's gold.
      onPrimary: tokens.color.onPrimary,
      danger: tokens.color.error,
      muted: tokens.color.textSecondary,
      borderColor: tokens.color.borderStrong,
      borderColorHover: tokens.color.borderStrong,
      borderColorPress: tokens.color.borderStrong,
      borderColorFocus: tokens.color.borderStrong,
    },
    // The Journal (`<Theme name="journal">` in app/(tabs)/journal/_layout.tsx). The app's own keys
    // are remapped rather than left alone, so a shared component the Journal still mounts (the
    // achievements list, the balance card, a history row) takes its ground and its one accent
    // without knowing it is on another tab. Indigo, green and red fold into the gold ramp.
    dark_journal: {
      ...tokens.color,
      background: tokens.color.bgDark,
      color: tokens.color.text,
      danger: tokens.color.ink800,
      bgLight: tokens.color.surface2,
      bgOverlay: tokens.color.bgDark,
      surface: tokens.color.surface2,
      primary: tokens.color.resourceGold,
      primaryText: tokens.color.resourceGold,
      primaryHover: tokens.color.gold300,
      primaryPress: tokens.color.gold600,
      success: tokens.color.resourceGold,
      warning: tokens.color.gold300,
      error: tokens.color.borderStrong,
      // Surfaces carry no border here: a shared card's outline takes the surface's own colour.
      borderStrong: tokens.color.surface2,
      // Same for a stock primitive's (it would inherit dark's visible border otherwise).
      borderColor: tokens.color.surface2,
      borderColorHover: tokens.color.surface2,
      borderColorPress: tokens.color.surface2,
      borderColorFocus: tokens.color.surface2,
      onPrimary: tokens.color.bgDark,
      // The shared Tag's tones: flat inks here, where the history rows used to carry a red and a
      // brown that meant nothing on a one-accent page.
      pastelGreen: tokens.color.gold900,
      pastelPink: tokens.color.ink800,
      pastelBlue: tokens.color.ink800,
    },
  },
});

export default config;
