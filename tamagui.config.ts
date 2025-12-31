import { createAnimations } from "@tamagui/animations-react-native";
import { defaultConfig } from "@tamagui/config/v4";
import { createTamagui, createTokens } from "tamagui";

// RPG-fun palette (light-first): keep punchy accents but avoid neon overload.
const tokens = createTokens({
  ...defaultConfig.tokens,
  color: {
    // Core palette
    primary: "#2563EB", // royal blue
    secondary: "#DB2777", // magenta
    success: "#16A34A", // green

    // Keep for error states
    error: "#FF1744",

    // Backgrounds (slightly warm to feel more "fantasy parchment" than "app gray")
    bgLight: "#F6F4EF",
    bgDark: "#141416",

    // Pastels (muted surfaces, not accents)
    pastelBlue: "#EAF2FF",
    pastelPink: "#FCEAF1",
    pastelGreen: "#EAF7EF",
    pastelYellow: "#FFF6D8",
    pastelPurple: "#F1E9FF",

    white: "#FFFFFF",
    black: "#000000",
  },
});

const animations = createAnimations({
  bouncy: {
    type: "spring",
    damping: 14,
    mass: 0.8,
    stiffness: 150,
  },
  lazy: {
    type: "spring",
    damping: 20,
    stiffness: 60,
  },
  quick: {
    type: "spring",
    damping: 20,
    mass: 1.2,
    stiffness: 250,
  },
});

export const config = createTamagui({
  ...defaultConfig,
  tokens,
  animations,
  themes: {
    light: {
      background: tokens.color.bgLight,
      cardBackground: tokens.color.white,
      bgLight: tokens.color.bgLight,
      color: tokens.color.bgDark,
      primary: tokens.color.primary,
      secondary: tokens.color.secondary,
      success: tokens.color.success,
      error: tokens.color.error,
      pastelBlue: tokens.color.pastelBlue,
      pastelPink: tokens.color.pastelPink,
      pastelGreen: tokens.color.pastelGreen,
      pastelYellow: tokens.color.pastelYellow,
      pastelPurple: tokens.color.pastelPurple,
    },
    dark: {
      background: "#121212",
      cardBackground: "#1E1E1E",
      bgLight: "#252525",
      color: "#E0E0E0",
      primary: tokens.color.primary,
      secondary: tokens.color.secondary,
      success: tokens.color.success,
      error: tokens.color.error,
      pastelBlue: "#1A2633",
      pastelPink: "#331A22",
      pastelGreen: "#1A3320",
      pastelYellow: "#33301A",
      pastelPurple: "#261A33",
    },
  },
});
export default config;
