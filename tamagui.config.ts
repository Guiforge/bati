import { createAnimations } from "@tamagui/animations-react-native";
import { defaultConfig } from "@tamagui/config/v4";
import { createFont, createMedia, createTamagui, createTokens } from "tamagui";

// -------------------------------------------------------------------------
// 1. MEDIA QUERIES (Responsive)
// -------------------------------------------------------------------------
const media = createMedia({
  xs: { maxWidth: 660 },
  sm: { maxWidth: 800 },
  md: { maxWidth: 1020 },
  lg: { maxWidth: 1280 },
  xl: { maxWidth: 1420 },
  xxl: { maxWidth: 1600 },
  gtXs: { minWidth: 660 + 1 },
  gtSm: { minWidth: 800 + 1 },
  gtMd: { minWidth: 1020 + 1 },
  gtLg: { minWidth: 1280 + 1 },
  short: { maxHeight: 820 },
  tall: { minHeight: 820 },
  hover: { hover: "none" },
  pointerCoarse: { pointer: "coarse" },
});

// -------------------------------------------------------------------------
// 2. TYPOGRAPHY
// -------------------------------------------------------------------------
const headingFont = createFont({
  family: "SpaceGrotesk",
  size: {
    1: 14,
    2: 18,
    3: 24,
    4: 32,
    5: 40,
    6: 48,
    true: 24, // Mapped to size 3 logic internally usually, but explicitly safe here
  },
  lineHeight: {
    1: 20,
    2: 26,
    3: 32,
    4: 40,
    5: 50,
    6: 60, // Added consistency
  },
  weight: {
    4: "300",
    7: "700",
  },
  letterSpacing: {
    4: 0,
    5: 4,
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
    7: 28,
    8: 32,
    9: 40,
    10: 48,
    true: 16, // Default size
  },
  lineHeight: {
    1: 16, // Added missing scale
    2: 20,
    3: 24,
    4: 28,
    5: 30,
    6: 34,
    7: 38,
    8: 42,
    9: 52,
    10: 60,
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
// 3. ANIMATIONS
// -------------------------------------------------------------------------
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
  pulse: {
    type: "spring",
    damping: 10,
    mass: 0.9,
    stiffness: 100,
  },
  // Added: "Tooltip" or small UI element entrance
  kindaBouncy: {
    type: "spring",
    damping: 15,
    mass: 1,
    stiffness: 200,
  },
});

// -------------------------------------------------------------------------
// 4. TOKENS (Palette definition)
// -------------------------------------------------------------------------

// Define raw colors first for easier reuse
const palette = {
  electricBlue: "#0D33F2",
  electricBlueHover: "#2E5CFF",
  electricBluePress: "#0A25B0",
  magenta: "#DB2777",
  void: "#0B0F19",
  voidDeeper: "#050505",
  voidOverlay: "rgba(11, 15, 25, 0.92)",
  surface1: "#101322",
  surface2: "#151A2E",
  textMain: "#E8ECFF",
  textMuted: "#909ACB",
  etherealBlue: "#6E45E2",
};

const tokens = createTokens({
  ...defaultConfig.tokens,
  color: {
    // --- CORE BRAND ---
    primary: palette.electricBlue,
    primaryHover: palette.electricBlueHover,
    primaryPress: palette.electricBluePress,
    secondary: palette.magenta,

    // --- FUNCTIONAL ---
    success: "#16A34A",
    error: "#FF1744",
    warning: "#FF6B35",

    // --- BACKGROUNDS ---
    bgDark: palette.void,
    bgDarker: palette.voidDeeper,
    bgOverlay: palette.voidOverlay,
    surface: palette.surface1,
    surface2: palette.surface2,

    // --- GLASS ---
    glassBg: "rgba(16, 19, 34, 0.65)",
    glassBorder: "rgba(232, 236, 255, 0.14)",

    // --- TEXT ---
    text: palette.textMain,
    textSecondary: palette.textMuted,
    muted: "#64748B",

    // --- EFFECTS ---
    borderStrong: "#2A3360",
    shadowColor: "#060812",
    primaryGlow: "rgba(13, 51, 242, 0.45)",

    // --- NEO DARK FANTASY ACCENTS ---
    purple: "#8B5CF6",
    purpleGlow: "rgba(139, 92, 246, 0.45)",
    ethereal: palette.etherealBlue,
    etherealGlow: "rgba(110, 69, 226, 0.45)",
    metallicBlue: "#3B82F6",
    metallicBlueGlow: "rgba(59, 130, 246, 0.35)",
    gold: "#FFD700",
    goldGlow: "rgba(255, 215, 0, 0.35)",
    crimson: "#DC2626",
    crimsonGlow: "rgba(220, 38, 38, 0.35)",

    // --- RPG RESOURCES ---
    resourceMana: "#9B59B6",
    resourceLeaf: "#2ECC71",
    resourceBossToken: "#E74C3C",
    resourceGold: "#FFD700",
    resourceWood: "#8B4513",
    resourceStone: "#808080",
    resourceFire: "#FF6B35",
    resourceWater: "#4ECDC4",
    resourceWind: "#C9B1FF",
    resourceGrain: "#DAA520",

    // --- PASTEL COLORS ---
    pastelPink: "#FFB6C1",
    pastelBlue: "#87CEEB",
    pastelGreen: "#98FB98",
    pastelYellow: "#FFFACD",
    pastelPurple: "#DDA0DD",
    pastelOrange: "#FFDAB9",
    bgLight: "rgba(255, 255, 255, 0.1)",

    white: "#FFFFFF",
    black: "#000000",
  },
});

// -------------------------------------------------------------------------
// 5. THEME DEFINITION
// -------------------------------------------------------------------------

// Define the "Immersive Dark" theme once
const immersiveDarkTheme = {
  background: tokens.color.bgOverlay,
  color: tokens.color.text,

  // Semantic mappings
  primary: tokens.color.primary,
  secondary: tokens.color.secondary,

  // Surface
  surface: tokens.color.surface,
  surface2: tokens.color.surface2,
  borderStrong: tokens.color.borderStrong,

  // Glass
  glassBg: tokens.color.glassBg,
  glassBorder: tokens.color.glassBorder,
  primaryGlow: tokens.color.primaryGlow,
  shadowColor: tokens.color.shadowColor,

  // Text
  muted: tokens.color.textSecondary,
  placeholderColor: tokens.color.muted,
};

// -------------------------------------------------------------------------
// 6. CONFIG EXPORT
// -------------------------------------------------------------------------
export const config = createTamagui({
  ...defaultConfig,
  settings: {
    ...defaultConfig.settings,
    onlyAllowShorthands: false,
    // Add this for better performance in production
    disableSSR: false,
  },
  animations,
  tokens,
  media, // Don't forget media!
  fonts: {
    heading: headingFont,
    body: bodyFont,
  },
  themes: {
    // Both themes point to the same definition to enforce "Always Dark"
    light: immersiveDarkTheme,
    dark: immersiveDarkTheme,
  },
});

export default config;

// -------------------------------------------------------------------------
// 7. TYPE AUGMENTATION (Critique pour l'autocomplétion)
// -------------------------------------------------------------------------
type Conf = typeof config;

declare module "tamagui" {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface TamaguiCustomConfig extends Conf {}
}
