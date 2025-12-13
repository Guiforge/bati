import { createAnimations } from "@tamagui/animations-react-native";
import { defaultConfig } from "@tamagui/config/v4";
import { createTamagui, createTokens } from "tamagui";

// Custom tokens with Bati color palette
const tokens = createTokens({
  ...defaultConfig.tokens,
  color: {
    primary: "#3A86FF",
    secondary: "#FF6B35",
    success: "#8BC34A",
    accent: "#8E24AA",

    warning: "#FFD700",
    pink: "#FF4081",
    info: "#00BCD4",

    bgLight: "#F5F5F5",
    bgDark: "#121212",

    error: "#FF1744",
    neonGreen: "#76FF03",

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
      color: tokens.color.bgDark,
      primary: tokens.color.primary,
      secondary: tokens.color.secondary,
      success: tokens.color.success,
      accent: tokens.color.accent,
      warning: tokens.color.warning,
      error: tokens.color.error,
      info: tokens.color.info,
    },
    dark: {
      background: tokens.color.bgDark,
      color: tokens.color.bgLight,
      primary: tokens.color.primary,
      secondary: tokens.color.secondary,
      success: tokens.color.success,
      accent: tokens.color.accent,
      warning: tokens.color.warning,
      error: tokens.color.error,
      info: tokens.color.info,
    },
  },
});

type CustomConfig = typeof config;

declare module "tamagui" {
  interface TamaguiCustomConfig extends CustomConfig {}
}

export default config;
