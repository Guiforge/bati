import type { ColorTokens } from "tamagui";
import { rawColors } from "@/constants/rawColors";

/**
 * Boss phase thresholds (HP percentage). Each phase is a *treatment* over the boss's own painting
 * — a dim, a red rim, and the colour the whole screen sits on — not four paintings per boss.
 * See missing-image.md §1c.
 *
 * The treatment used to be one flat fill, ending at `rgba(255, 23, 68, 0.5)`: 50 % red over a
 * painting is not drama, it is a lost painting. Held as opacity *numbers* over token-coloured
 * layers instead, so the art keeps its own colours, the values animate through Tamagui's
 * `transition`, and no colour is invented outside `constants/rawColors.ts`.
 */
const PHASE_THRESHOLDS = [
  { minPercent: 75, phase: 1, label: "Full Power", bg: "bgDark", dim: 0, rim: 0 },
  { minPercent: 50, phase: 2, label: "Wounded", bg: "bossPhase2", dim: 0.1, rim: 0.2 },
  { minPercent: 25, phase: 3, label: "Critical", bg: "bossPhase3", dim: 0.2, rim: 0.35 },
  { minPercent: 0, phase: 4, label: "Enraged", bg: "bossPhase4", dim: 0.32, rim: 0.55 },
] as const;

export type BossPhase = 1 | 2 | 3 | 4;

export type PhaseLook = {
  /** The colour the screen behind the arena is painted, as a Tamagui token. */
  bgToken: ColorTokens;
  /** The same colour as a raw string — the arena's bottom scrim ends on it, so there is no seam. */
  bgRaw: string;
  /** How much `bgDark` is laid over the painting. */
  dim: number;
  /** How hard the red rim burns in from the edges. */
  rim: number;
};

export function getPhaseFromHp(hpPercent: number): BossPhase {
  for (const threshold of PHASE_THRESHOLDS) {
    if (hpPercent >= threshold.minPercent) {
      return threshold.phase;
    }
  }
  return 4;
}

/** How the arena and the screen behind it are treated at this phase. */
export function getPhaseLook(phase: BossPhase): PhaseLook {
  const entry = PHASE_THRESHOLDS.find((t) => t.phase === phase) ?? PHASE_THRESHOLDS[3];
  return {
    bgToken: `$${entry.bg}` as ColorTokens,
    bgRaw: rawColors[entry.bg],
    dim: entry.dim,
    rim: entry.rim,
  };
}

/** 0-100, clamped, and safe when a fight ships with totalHp 0. */
export function getHpPercent(currentHp: number, totalHp: number): number {
  if (totalHp <= 0) return 0;
  return Math.max(0, Math.min(100, (currentHp / totalHp) * 100));
}
