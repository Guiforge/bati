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

// The braise as text: one value, three roles. Fire is the brand's light, and a caution in amber
// was indistinguishable from the gold under deuteranopia (spec 2026-10-05, rule table).
const BRAISE_LIGHT = "#F08A4B";

export const rawColors = {
  // --- Core ---
  // The braise: the warm light every illustration already has (an axe in a sunbeam, a window,
  // a forge), on the cold ink night around it. A fill colour; text on it is `onPrimary`.
  primary: "#C2410C",
  /**
   * The braise light enough to read as text or an icon on any of our dark surfaces (6.5:1 at
   * worst, on surface2). `primary` itself is a fill: 3.75:1 on bgDark, fine for a shape, never
   * for a sentence.
   */
  primaryText: BRAISE_LIGHT,
  primaryHover: "#D4501A",
  primaryPress: "#9A3412",
  /** The seal button's bottom edge: the fill in shadow. */
  primaryEdge: "#7A2905",
  /** The label on a `primary` fill: 4.77:1. */
  onPrimary: "#FFF4E6",
  // Removed in Task 2 of the 2026-10 refresh; kept until its last consumer moves.
  secondary: "#DB2777",
  success: "#6DB57A",
  warning: BRAISE_LIGHT,
  error: "#F0595D",

  // --- Immersive backgrounds ---
  // Ink, barely cool: measured on the art (quest #373637, Ombre-Lovée #282A35) and the logo
  // (#3B4D5E). A warm or saturated ground makes the paintings look dirty or imported.
  bgDark: "#0C0D11", // The Void
  bgOverlay: "rgba(12, 13, 17, 0.92)",
  // Lighter than the one above, for what has to sit on artwork and still let it through: the
  // scrim that keeps the status bar readable over the village painting.
  bgOverlaySoft: "rgba(12, 13, 17, 0.72)",
  // Behind a bottom sheet that asks something (components/common/FormSheet.tsx).
  sheetScrim: "rgba(0, 0, 0, 0.5)",

  // --- Surfaces ---
  surface: "#15171C",
  surface2: "#1D2027",

  // --- Glass ---
  glassBg: "rgba(21, 23, 28, 0.65)",
  glassBorder: "rgba(236, 228, 212, 0.14)",
  // `resourceGold` at a fifth: the hairline that marks the oath strip as progression on Home
  // without a full gold rule competing with the XP bar.
  goldHairline: "rgba(226, 181, 74, 0.22)",

  // --- Text ---
  text: "#ECE4D4", // Bone
  textSecondary: "#A89C88", // Ash
  // Icons and tints only (widget, recap trace, village rows): 4.08:1 on bgDark, under body AA.
  muted: "#6B707B",

  // --- Effects ---
  borderStrong: "#363A44",
  shadowColor: "#000000",
  primaryGlow: "rgba(194, 65, 12, 0.45)",

  // --- Boss phases ---
  // The room the fight happens in, darkening and reddening as the boss loses. Phase 1 uses
  // `bgDark`; these are its wounded, critical and enraged siblings.
  bossPhase2: "#170F1D",
  bossPhase3: "#1F0E18",
  bossPhase4: "#280B12",

  // --- The recap map ---
  /** Water must read as depth against `bgDark`, never as the blue every mapping app uses. */
  mapWater: "#0E1730",
  /** Wood and park, one wash: a texture at recap zoom, not a status. */
  mapWood: "#101E1B",

  // --- Legacy mapping (safety net) ---
  bgLight: "#15171C",
  pastelBlue: "#18202A",
  pastelPink: "#2A1719", // an error tint since the magenta left
  pastelGreen: "#16261B",
  pastelYellow: "#2A2413",
  pastelPurple: "#261A33",
  pastelOrange: "#2B1B12",

  // --- Resources ---
  // Only the two that are drawn. The other resources are white game-icons glyphs, like inked
  // vignettes; their five colours had no consumer and were removed (2026-10).
  resourceGold: "#E2B54A", // patinated gold: progression, XP, rewards
  resourceFire: BRAISE_LIGHT,

  white: "#FFFFFF",
  black: "#000000",

  // --- The Journal's ramps ---
  // The Journal is drawn with Nocturne's structure (Inter, borderless surfaces, fading rules,
  // one accent) on Bati's own colours. Five steps of its gold, two inks for empty marks.
  gold100: "#F7ECCF",
  gold300: "#EDCB76",
  gold600: "#B08A2E",
  gold700: "#5E4A1E",
  gold800: "#362C15",
  gold900: "#211B0E",
  ink800: "#262A33",
  ink900: "#101217",
  /** `glassBorder` at nothing: the ends of a fading rule. Transparent black would grey it. */
  glassBorderClear: "rgba(236, 228, 212, 0)",
  /** `bgDark` at nothing: where a painting's fade starts. */
  bgDarkClear: "rgba(12, 13, 17, 0)",
} as const;

/**
 * A palette colour (`#rrggbb`) at `alpha`, for the few consumers that need a string rather than
 * a token: gradients and React Native text shadows. One source per value: a hand-typed rgba of
 * the ground is how the old fades kept the 2025 blue after the palette moved.
 */
export function fade(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * Difficulty has one colour per level, everywhere: easy success, medium the braise, hard error.
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
