import type { DifficultyCode } from "@/src/db/schema";

export type ComputeSessionXpInput = {
  durationSeconds: number;
  userLevel: DifficultyCode;
};

function clampInt(value: number, min: number, max: number) {
  const n = Math.round(value);
  return Math.min(max, Math.max(min, n));
}

export function computeSessionXp({ durationSeconds, userLevel }: ComputeSessionXpInput): number {
  const s = Math.max(0, Math.round(durationSeconds));

  // Baseline: 1 XP per 5 seconds (~12 XP/min) with a small floor.
  const base = Math.max(10, Math.floor(s / 5));

  const multiplier = userLevel === "easy" ? 0.9 : userLevel === "hard" ? 1.2 : 1.0;

  // Keep XP in a sane range for early game.
  return clampInt(base * multiplier, 0, 5000);
}
