import { createAnimations } from "@tamagui/animations-react-native";
import { defaultConfig } from "@tamagui/config/v4";
import { createTamagui, createTokens } from "tamagui";

// Minimalist 3-core color palette: neon blue, hot pink, lime green
const tokens = createTokens({
  ...defaultConfig.tokens,
  color: {
    // Core palette
    primary: "#00D9FF", // neon electric blue
    secondary: "#FF4081", // hot pink
    success: "#76FF03", // lime green

    // Keep for error states
    error: "#FF1744",

    // Backgrounds
    bgLight: "#F5F5F5",
    bgDark: "#0D0D0D",

    white: "#FFFFFF",
    black: "#000000",
  },
});

const animations = createAnimations({
  bouncy: {
    type: "spring",
    damping: 10,
    mass: 0.9,
    stiffness: 100,
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
      bgLight: tokens.color.bgLight,
      color: tokens.color.bgDark,
      primary: tokens.color.primary,
      secondary: tokens.color.secondary,
      success: tokens.color.success,
      error: tokens.color.error,
    },
    dark: {
      background: tokens.color.bgDark,
      bgLight: "#1A1A1A",
      color: tokens.color.bgLight,
      primary: tokens.color.primary,
      secondary: tokens.color.secondary,
      success: tokens.color.success,
      error: tokens.color.error,
    },
  },
});

type CustomConfig = typeof config;

declare module "tamagui" {
  interface TamaguiCustomConfig extends CustomConfig {}
}

export default config;
