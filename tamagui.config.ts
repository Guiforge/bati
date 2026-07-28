import { createAnimations } from "@tamagui/animations-react-native";
import { defaultConfig } from "@tamagui/config/v4";
import { createFont, createTamagui, createTokens } from "tamagui";

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
  color: {
    // --- NEW_STYLE CORE ---
    primary: "#0D33F2", // Electric Blue
    primaryHover: "#2E5CFF",
    primaryPress: "#0A25B0",

    secondary: "#DB2777", // Magenta
    success: "#16A34A",
    warning: "#F59E0B", // Amber (difficulty MEDIUM, cautions)
    error: "#FF1744",

    // --- IMMERSIVE BACKGROUNDS ---
    bgDark: "#0B0F19", // The Void
    bgOverlay: "rgba(11, 15, 25, 0.92)",

    // --- SURFACES (Glass & Tech) ---
    surface: "#101322",
    surface2: "#151A2E",

    // --- GLASSMORPHISM SYSTEM ---
    glassBg: "rgba(16, 19, 34, 0.65)",
    glassBorder: "rgba(232, 236, 255, 0.14)",

    // --- TEXT ---
    text: "#E8ECFF", // Almost white
    textSecondary: "#909ACB", // Muted Blue-Grey
    muted: "#64748B",

    // --- EFFECTS ---
    borderStrong: "#2A3360",
    shadowColor: "#060812",
    primaryGlow: "rgba(13, 51, 242, 0.45)",

    // --- LEGACY MAPPING (Safety Net) ---
    bgLight: "#101322",
    pastelBlue: "#1A2633", // Mapped to dark
    pastelPink: "#331A22",
    pastelGreen: "#1A3320",
    pastelYellow: "#33301A",
    pastelPurple: "#261A33",
    pastelOrange: "#332618",

    // --- RESOURCES ---
    resourceGold: "#FFD700",
    resourceWood: "#8B4513",
    resourceStone: "#808080",
    resourceFire: "#FF6B35",
    resourceWater: "#4ECDC4",
    resourceWind: "#C9B1FF",
    resourceGrain: "#DAA520",

    white: "#FFFFFF",
    black: "#000000",
  },
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
