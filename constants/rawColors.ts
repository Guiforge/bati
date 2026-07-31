import type { ColorTokens } from "tamagui";
import type { DifficultyCode } from "@/db/schema";

/**
 * The palette as plain strings.
 *
 * Tamagui tokens are the source of truth for anything Tamagui renders, and product UI should
 * keep using them. But three things in this app cannot take a token and need a real colour:
 * `expo-linear-gradient`, `react-native-gifted-charts`, and React Native's `textShadowColor`.
 *
 * Those call sites were each hand-copying hex, which drifts. The onboarding ended up fading to
 * `#101323` while the surface token said `#101322`, and the journal invented its own green and
 * red for difficulties the progression chart was already drawing from `$success` and `$error`.
 * `tamagui.config.ts` builds its tokens from these same constants, so a colour has one home.
 */
export const rawColors = {
  primary: "#0D33F2",
  success: "#16A34A",
  error: "#FF1744",
  bgDark: "#0B0F19",
  surface: "#101322",
  textSecondary: "#909ACB",
  borderStrong: "#2A3360",
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
