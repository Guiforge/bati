import type { ColorTokens } from "tamagui";
import type { DifficultyCode } from "@/db/schema";

/**
 * Label colour for a difficulty, as the tokens behind `DIFFICULTY_COLORS`. Medium reads
 * `$primaryText`, the braise lightened to be legible as text. For a chip that stays neutral and
 * lets only its words carry the level.
 */
export const DIFFICULTY_TEXT: Record<DifficultyCode, ColorTokens> = {
  easy: "$success",
  medium: "$primaryText",
  hard: "$error",
};
