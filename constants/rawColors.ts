import type { ColorTokens } from "tamagui";
import type { DifficultyCode } from "@/db/schema";

/**
 * The palette, as plain strings. Every colour in the app is defined here exactly once.
 *
 * `tamagui.config.ts` builds its tokens from this object, so product UI keeps using tokens
 * (`bg="$primary"`) and never sees a hex. The reason the raw values need a home of their own is
 * that three things cannot take a Tamagui token and need a real string: `expo-linear-gradient`,
 * `react-native-gifted-charts`, and React Native's `textShadowColor`.
 *
 * Those call sites used to hand-copy hex, and it drifted: the onboarding faded to `#101323`
 * while the surface token read `#101322`, and the journal invented its own green and red for the
 * difficulties the progression chart already drew from `$success` and `$error`. A lint rule
 * (`.biome/plugins/noRawHexColor.grit`) now rejects raw hex everywhere but this file — which is
 * only enforceable because there is nothing left outside it.
 */
export const rawColors = {
  // --- Core ---
  primary: "#0D33F2", // Electric Blue
  /**
   * The same blue, light enough to read as text on a dark background.
   *
   * `primary` is a fill colour: white on it clears AA comfortably (6.44:1 on the primary
   * button). As *text* on any of our dark surfaces it lands at 2.53:1 — under AA even at large
   * sizes, and under the 3:1 that WCAG asks of meaningful icons. Same hue, same saturation,
   * raised in lightness until it clears AA body on bgDark, surface and surface2 (5.26 / 5.07 /
   * 4.73). Use this for text and icons; keep `primary` for anything you fill.
   */
  primaryText: "#647CF7",
  primaryHover: "#2E5CFF",
  primaryPress: "#0A25B0",
  secondary: "#DB2777", // Magenta
  success: "#16A34A",
  warning: "#F59E0B", // Amber (difficulty MEDIUM, cautions)
  error: "#FF1744",

  // --- Immersive backgrounds ---
  bgDark: "#0B0F19", // The Void
  bgOverlay: "rgba(11, 15, 25, 0.92)",

  // --- Surfaces (glass & tech) ---
  surface: "#101322",
  surface2: "#151A2E",

  // --- Glassmorphism ---
  glassBg: "rgba(16, 19, 34, 0.65)",
  glassBorder: "rgba(232, 236, 255, 0.14)",

  // --- Text ---
  text: "#E8ECFF", // Almost white
  textSecondary: "#909ACB", // Muted Blue-Grey
  muted: "#64748B",

  // --- Effects ---
  borderStrong: "#2A3360",
  shadowColor: "#060812",
  primaryGlow: "rgba(13, 51, 242, 0.45)",

  // --- Boss phases ---
  // The room the fight happens in, darkening and reddening as the boss loses. Phase 1 uses
  // `bgDark`; these are its wounded, critical and enraged siblings. They live here rather than as
  // rgba literals in bossPhase.ts because the `noRawHexColor` plugin only catches hex — the old
  // tints re-typed `secondary` and `error` by hand and drifted with nothing to stop them.
  bossPhase2: "#170F1D",
  bossPhase3: "#1F0E18",
  bossPhase4: "#280B12",

  // --- Legacy mapping (safety net) ---
  bgLight: "#101322",
  pastelBlue: "#1A2633", // Mapped to dark
  pastelPink: "#331A22",
  pastelGreen: "#1A3320",
  pastelYellow: "#33301A",
  pastelPurple: "#261A33",
  pastelOrange: "#332618",

  // --- Resources ---
  resourceGold: "#FFD700",
  resourceWood: "#8B4513",
  resourceStone: "#808080",
  resourceFire: "#FF6B35",
  resourceWater: "#4ECDC4",
  resourceWind: "#C9B1FF",
  resourceGrain: "#DAA520",

  white: "#FFFFFF",
  black: "#000000",
} as const;

/**
 * Difficulty has one colour per level, everywhere.
 *
 * The progression chart used `$success`/`$primary`/`$error`; the journal's stats used `#22C55E`
 * and `#EF4444` — a different green and a different red for the same three words, on two screens
 * a tab apart.
 */
export const DIFFICULTY_COLORS: Record<DifficultyCode, string> = {
  easy: rawColors.success,
  medium: rawColors.primary,
  hard: rawColors.error,
};

/**
 * The same three levels for Tamagui components, which take tokens and should keep taking them —
 * raw strings are only for the libraries that cannot. Kept beside `DIFFICULTY_COLORS` so the
 * pair cannot drift; `tamagui.config.ts` resolves these tokens to those exact values.
 */
export const DIFFICULTY_COLOR_TOKENS: Record<DifficultyCode, ColorTokens> = {
  easy: "$success",
  medium: "$primary",
  hard: "$error",
};
