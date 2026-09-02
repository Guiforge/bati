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
  // Deep nocturnal indigo, not electric blue: the whole world is desaturated night with gold
  // and ember accents, and the old #0D33F2 read as imported from another app (2026-08 audit).
  primary: "#4A3FD6", // Deep Indigo
  /**
   * The same indigo, light enough to read as text on a dark background.
   *
   * `primary` is a fill colour: white on it clears AA comfortably (6.01:1 on the primary
   * button). As *text* on any of our dark surfaces it lands under AA even at large
   * sizes, and under the 3:1 that WCAG asks of meaningful icons. Same hue, same saturation,
   * raised in lightness until it clears AA body on bgDark, surface and surface2 (5.39 / 5.20 /
   * 4.85). Use this for text and icons; keep `primary` for anything you fill.
   */
  primaryText: "#8177F7",
  primaryHover: "#5D53E8",
  primaryPress: "#372FA6",
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
  primaryGlow: "rgba(74, 63, 214, 0.45)",

  // --- Boss phases ---
  // The room the fight happens in, darkening and reddening as the boss loses. Phase 1 uses
  // `bgDark`; these are its wounded, critical and enraged siblings. They live here rather than as
  // rgba literals in bossPhase.ts because the `noRawHexColor` plugin only catches hex — the old
  // tints re-typed `secondary` and `error` by hand and drifted with nothing to stop them.
  bossPhase2: "#170F1D",
  bossPhase3: "#1F0E18",
  bossPhase4: "#280B12",

  // --- The recap map ---
  // Two colours the basemap needs and the palette cannot lend it (docs/designs/map-immersion.md
  // § Where the colours live). Everything else the style draws — ground, roads, buildings,
  // labels — reuses a token above, which is the point of having a palette.
  /**
   * Water must read as *depth* against `bgDark` (#0B0F19), never as the blue every mapping app
   * uses. `shadowColor` is too close to bgDark to read at all, and `surface2` is a UI surface:
   * a lake painted in it looks like a card lying on the map.
   */
  mapWater: "#0E1730",
  /**
   * Wood and park, one wash. The only green in the palette is `success`, which means a *state*,
   * and `pastelGreen` is a legacy safety-net entry. A wood at recap zoom is a texture, not a
   * status.
   */
  mapWood: "#101E1B",

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
